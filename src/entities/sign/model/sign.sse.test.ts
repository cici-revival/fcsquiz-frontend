import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const issueWebSocketTicket = vi.fn();

vi.mock("@shared/api/client", () => ({
  adminkaApiClient: { tryRestoreSession: () => Promise.resolve(null) },
}));

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: { issueWebSocketTicket: () => issueWebSocketTicket() },
}));

import { connectSignsSSE, disconnectSignsSSE } from "./sign.sse";
import { useSignStore } from "./sign.store";
import { ForbiddenError } from "@shared/api/errors";

type FakeSource = {
  url: string;
  close: ReturnType<typeof vi.fn>;
  readyState: number;
  onopen?: () => void;
  onerror?: () => void;
};

let created: FakeSource[] = [];

function lastSource(): FakeSource {
  return created[created.length - 1];
}

describe("connectSignsSSE", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    let counter = 0;
    issueWebSocketTicket.mockReset();
    issueWebSocketTicket.mockImplementation(() => {
      counter += 1;

      return Promise.resolve({ ticket: `t${counter}`, expires_in: 60 });
    });
    window.__CSQUIZ_CONFIG = { API_BASE_URL: "https://api.fcsquiz.ru/api" };
    vi.stubGlobal(
      "EventSource",
      Object.assign(
        vi.fn((url: string) => {
          const source: FakeSource = { url, close: vi.fn(), readyState: 0 };
          created.push(source);

          return source;
        }),
        { CONNECTING: 0, OPEN: 1, CLOSED: 2 },
      ),
    );
  });

  afterEach(() => {
    disconnectSignsSSE();
    window.__CSQUIZ_CONFIG = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("подключается с одноразовым тикетом в URL", async () => {
    connectSignsSSE();
    await vi.advanceTimersByTimeAsync(0);

    expect(issueWebSocketTicket).toHaveBeenCalledTimes(1);
    expect(EventSource).toHaveBeenCalledWith(
      "https://api.fcsquiz.ru/api/v1/signs/stream?ticket=t1",
      { withCredentials: true },
    );
  });

  it("после разрыва берёт новый тикет", async () => {
    connectSignsSSE();
    await vi.advanceTimersByTimeAsync(0);
    lastSource().onopen?.();

    lastSource().readyState = 2;
    lastSource().onerror?.();

    await vi.advanceTimersByTimeAsync(5_000);

    expect(created).toHaveLength(2);
    expect(created[0].close).toHaveBeenCalled();
    expect(lastSource().url).toContain("ticket=t2");
  });

  it("не открывает поток, если тикет не выдали, и ретраит с задержкой", async () => {
    issueWebSocketTicket.mockRejectedValue(new Error("network"));

    connectSignsSSE();
    await vi.advanceTimersByTimeAsync(0);

    expect(created).toHaveLength(0);
    expect(issueWebSocketTicket).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);

    expect(issueWebSocketTicket).toHaveBeenCalledTimes(2);
    expect(created).toHaveLength(0);
  });

  it("прекращает попытки, если нет прав на тикет", async () => {
    issueWebSocketTicket.mockRejectedValue(new ForbiddenError());

    connectSignsSSE();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(issueWebSocketTicket).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(0);
    expect(useSignStore.getState().status).toBe("error");
  });

  it("не открывает поток, если отключились во время выдачи тикета", async () => {
    let resolveTicket: (value: { ticket: string; expires_in: number }) => void = () => {};
    issueWebSocketTicket.mockImplementation(
      () => new Promise((resolve) => { resolveTicket = resolve; }),
    );

    connectSignsSSE();
    disconnectSignsSSE();
    resolveTicket({ ticket: "late", expires_in: 60 });
    await vi.advanceTimersByTimeAsync(60_000);

    expect(created).toHaveLength(0);
  });

  it("не запускает параллельные подключения", async () => {
    connectSignsSSE();
    connectSignsSSE();
    await vi.advanceTimersByTimeAsync(0);

    expect(issueWebSocketTicket).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
  });
});
