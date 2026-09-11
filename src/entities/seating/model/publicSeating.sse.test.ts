import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  connectPublicSeatingSSE,
  disconnectPublicSeatingSSE,
} from "./publicSeating.sse";
import { useSeatingStore } from "./seating.store";
import { FAST_RECONNECT_ATTEMPTS, HIDDEN_GRACE_MS } from "@shared/lib/sseBackoff";

type FakeSource = {
  close: ReturnType<typeof vi.fn>;
  onopen?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => void;
};

let created: FakeSource[] = [];
let urls: string[] = [];

function lastSource(): FakeSource {
  return created[created.length - 1];
}

/** Уводит вкладку в фон или возвращает её. */
function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function seatingTeam(teamId: string, x: number, y: number) {
  return {
    team_id: teamId,
    size: 6,
    color: "#3B82F6",
    position: { x, y },
    revision: 1,
  };
}

describe("connectPublicSeatingSSE", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    urls = [];
    window.__CSQUIZ_CONFIG = { API_BASE_URL: "/api" };
    vi.stubGlobal(
      "EventSource",
      vi.fn((url: string) => {
        urls.push(url);
        const source: FakeSource = { close: vi.fn() };
        created.push(source);

        return source;
      }),
    );
  });

  afterEach(() => {
    disconnectPublicSeatingSSE();
    setHidden(false);
    window.__CSQUIZ_CONFIG = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("подключается к публичному стриму рассадки", () => {
    connectPublicSeatingSSE();

    expect(urls).toEqual(["/api/v1/seating/stream"]);
    expect(useSeatingStore.getState().status).toBe("connecting");
  });

  it("не открывает второе соединение", () => {
    connectPublicSeatingSSE();
    connectPublicSeatingSSE();

    expect(created).toHaveLength(1);
  });

  it("применяет снимок из массива событий", () => {
    connectPublicSeatingSSE();
    lastSource().onopen?.();

    lastSource().onmessage?.({
      data: JSON.stringify([
        {
          type: "seating.snapshot",
          game_id: { season: 2026, game_number: 1 },
          snapshot: {
            is_published: true,
            teams: [seatingTeam("a", 100, 200)],
          },
        },
      ]),
    });

    const state = useSeatingStore.getState();
    expect(state.status).toBe("connected");
    expect(state.isPublished).toBe(true);
    expect(state.teams.get("a")?.position).toEqual({ x: 100, y: 200 });
  });

  it("применяет несколько событий из одного кадра", () => {
    connectPublicSeatingSSE();

    lastSource().onmessage?.({
      data: JSON.stringify([
        {
          type: "seating.snapshot",
          game_id: { season: 2026, game_number: 1 },
          snapshot: { is_published: true, teams: [seatingTeam("a", 10, 20)] },
        },
        {
          type: "seating.team.upserted",
          game_id: { season: 2026, game_number: 1 },
          team: seatingTeam("b", 30, 40),
        },
      ]),
    });

    expect(useSeatingStore.getState().teams.size).toBe(2);
  });

  it("переживает мусор в сообщении", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    connectPublicSeatingSSE();
    lastSource().onmessage?.({ data: "не json" });

    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it("переподключается после обрыва с растущей задержкой", () => {
    connectPublicSeatingSSE();
    lastSource().onopen?.();

    lastSource().onerror?.();
    expect(useSeatingStore.getState().status).toBe("connecting");

    vi.advanceTimersByTime(700);
    expect(created).toHaveLength(2);

    lastSource().onerror?.();
    vi.advanceTimersByTime(700);
    expect(created).toHaveLength(2);
  });

  it("после серии попыток статус становится error, но попытки идут", () => {
    connectPublicSeatingSSE();

    for (let attempt = 0; attempt <= FAST_RECONNECT_ATTEMPTS + 1; attempt += 1) {
      lastSource().onerror?.();
      vi.advanceTimersByTime(40_000);
    }

    expect(useSeatingStore.getState().status).toBe("error");
    expect(created.length).toBeGreaterThan(FAST_RECONNECT_ATTEMPTS);
  });

  it("закрывает соединение, когда вкладка ушла в фон надолго", () => {
    connectPublicSeatingSSE();
    const source = lastSource();

    setHidden(true);
    vi.advanceTimersByTime(HIDDEN_GRACE_MS);

    expect(source.close).toHaveBeenCalled();
    expect(useSeatingStore.getState().status).toBe("disconnected");
  });

  it("не трогает соединение, если вкладка вернулась до конца отсрочки", () => {
    connectPublicSeatingSSE();
    const source = lastSource();

    setHidden(true);
    vi.advanceTimersByTime(HIDDEN_GRACE_MS - 1000);
    setHidden(false);
    vi.advanceTimersByTime(HIDDEN_GRACE_MS);

    expect(source.close).not.toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });

  it("не переподключается по ошибке, пока вкладка в фоне", () => {
    connectPublicSeatingSSE();
    setHidden(true);
    vi.advanceTimersByTime(HIDDEN_GRACE_MS);

    lastSource().onerror?.();
    vi.advanceTimersByTime(60_000);

    expect(created).toHaveLength(1);
  });
});
