import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiClient } from "./ApiClient";
import { authEvents } from "@shared/events/authEvents";

type FetchCall = {
  url: string;
  init: RequestInit;
};

function mockFetchSequence(responses: Array<{ status: number; body?: unknown; headers?: Record<string, string> }>) {
  const calls: FetchCall[] = [];
  let i = 0;
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    calls.push({ url: String(input), init });
    const r = responses[i] ?? responses[responses.length - 1];
    i++;
    return new Response(
      r.body !== undefined ? JSON.stringify(r.body) : null,
      {
        status: r.status,
        headers: { "Content-Type": "application/json", ...(r.headers ?? {}) },
      },
    );
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fetch: fn };
}

describe("ApiClient — secure cookie storage contract", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("adds X-Requested-By: csquiz-admin to every request", async () => {
    const { calls, fetch } = mockFetchSequence([{ status: 200, body: { ok: true } }]);
    const client = new ApiClient("http://api");

    await client.get("/v1/games/current");

    expect(fetch).toHaveBeenCalledTimes(1);
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("X-Requested-By")).toBe("csquiz-admin");
  });

  it("uses credentials: include so the browser sends the refresh_token cookie", async () => {
    const { calls } = mockFetchSequence([{ status: 200, body: { ok: true } }]);
    const client = new ApiClient("http://api");

    await client.get("/v1/games/current");

    expect(calls[0].init.credentials).toBe("include");
  });

  it("does not store the access token in localStorage during a normal request", async () => {
    mockFetchSequence([{ status: 200, body: { ok: true } }]);
    const client = new ApiClient("http://api");

    await client.get("/v1/games/current");

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("revokes the refresh cookie and clears the in-memory access token on logout", async () => {
    const { calls } = mockFetchSequence([
      { status: 200, body: { access_token: "access-token" } },
      { status: 200 },
      { status: 200, body: { ok: true } },
    ]);
    const client = new ApiClient("http://api");

    await client.tryRestoreSession();
    await client.logoutRequest();
    await client.get("/v1/games/current");

    expect(calls[1].url).toBe("http://api/v1/adminka/logout");
    expect(calls[1].init.method).toBe("POST");
    expect(calls[1].init.credentials).toBe("include");
    expect(new Headers(calls[1].init.headers).get("X-Requested-By")).toBe("csquiz-admin");
    expect(new Headers(calls[2].init.headers).get("Authorization")).toBeNull();
  });

  it("intercept 401 → call /refresh (cookie-based) → retry original request with new access", async () => {
    const { calls } = mockFetchSequence([
      { status: 401, body: { details: "expired" } },
      { status: 200, body: { access_token: "new-access" } },
      { status: 200, body: { data: "ok" } },
    ]);
    const client = new ApiClient("http://api");

    const result = await client.get<{ data: string }>("/v1/changes/add_team");

    expect(result.data).toBe("ok");
    expect(calls).toHaveLength(3);

    const refresh = calls[1];
    expect(refresh.url).toContain("/v1/adminka/refresh");
    expect(refresh.init.method).toBe("POST");
    expect(refresh.init.credentials).toBe("include");
    expect(refresh.init.body).toBeUndefined();
    const refreshHeaders = new Headers(refresh.init.headers);
    expect(refreshHeaders.get("X-Requested-By")).toBe("csquiz-admin");
    expect(refreshHeaders.get("Authorization")).toBeNull();

    const retried = calls[2];
    expect(retried.url).toContain("/v1/changes/add_team");
    const retriedHeaders = new Headers(retried.init.headers);
    expect(retriedHeaders.get("Authorization")).toBe("Bearer new-access");
    expect(retriedHeaders.get("X-Requested-By")).toBe("csquiz-admin");

    expect(localStorage.getItem("refresh_token")).toBeNull();
    expect(localStorage.getItem("access_token")).toBeNull();
  });

  it("clears the session (dispatches logout) and does not retry when refresh itself 401s", async () => {
    mockFetchSequence([
      { status: 401, body: { details: "expired" } },
      { status: 401, body: { details: "refresh invalid" } },
    ]);

    const logoutSpy = vi.fn();
    authEvents.addEventListener("logout", logoutSpy);

    const client = new ApiClient("http://api");

    await expect(client.get("/v1/games/current")).rejects.toThrow();

    expect(logoutSpy).toHaveBeenCalled();
    expect(localStorage.getItem("access_token")).toBeNull();
    expect(localStorage.getItem("refresh_token")).toBeNull();
  });

  it("serializes concurrent 401s through a single refresh call", async () => {
    const perPath = new Map<string, number>();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/v1/adminka/refresh")) {
        return new Response(JSON.stringify({ access_token: "new-access" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const n = (perPath.get(url) ?? 0) + 1;
      perPath.set(url, n);
      if (n === 1) {
        return new Response(JSON.stringify({ details: "expired" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ data: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const client = new ApiClient("http://api");
    const [a, b] = await Promise.all([
      client.get<{ data: string }>("/v1/a"),
      client.get<{ data: string }>("/v1/b"),
    ]);

    expect(a.data).toBe("ok");
    expect(b.data).toBe("ok");

    const refreshCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).endsWith("/v1/adminka/refresh"),
    );
    expect(refreshCalls).toHaveLength(1);
  });
});
