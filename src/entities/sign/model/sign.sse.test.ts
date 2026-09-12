import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Перед каждой повторной попыткой клиент обновляет сессию — в тесте она
// должна резолвиться сразу, иначе переподключение не дойдёт до EventSource.
vi.mock("@shared/api/client", () => ({
  adminkaApiClient: { tryRestoreSession: () => Promise.resolve(null) },
}));

import { connectSignsSSE, disconnectSignsSSE } from "./sign.sse";
import { useSignStore } from "./sign.store";

type FakeSource = {
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
    window.__CSQUIZ_CONFIG = { API_BASE_URL: "https://api.fcsquiz.ru/api" };
    vi.stubGlobal(
      "EventSource",
      Object.assign(
        vi.fn(() => {
          const source: FakeSource = { close: vi.fn(), readyState: 0 };
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

  it("подключается с куками к API-поддомену", () => {
    connectSignsSSE();

    expect(EventSource).toHaveBeenCalledWith(
      "https://api.fcsquiz.ru/api/v1/signs/stream",
      { withCredentials: true },
    );
  });

  it("не долбится в сервер, если тот отверг подключение", () => {
    connectSignsSSE();

    // Поток не открывался, соединение закрыто — это отказ (401), а не обрыв.
    lastSource().readyState = 2;
    lastSource().onerror?.();

    vi.advanceTimersByTime(60_000);

    expect(created).toHaveLength(1);
    expect(useSignStore.getState().status).toBe("error");
  });

  it("переподключается, если оборвался уже живой поток", async () => {
    connectSignsSSE();
    lastSource().onopen?.();

    lastSource().readyState = 2;
    lastSource().onerror?.();

    await vi.advanceTimersByTimeAsync(60_000);

    expect(created.length).toBeGreaterThan(1);
  });
});
