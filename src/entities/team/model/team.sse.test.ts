import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connectTeamsSSE, disconnectTeamsSSE } from "./team.sse";
import { useTeamStore } from "./team.store";

type FakeSource = {
  close: ReturnType<typeof vi.fn>;
  onopen?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => void;
};

let created: FakeSource[] = [];

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

describe("connectTeamsSSE", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    created = [];
    window.__CSQUIZ_CONFIG = { API_BASE_URL: "/api" };
    vi.stubGlobal(
      "EventSource",
      vi.fn(() => {
        const source: FakeSource = { close: vi.fn() };
        created.push(source);

        return source;
      }),
    );
  });

  afterEach(() => {
    disconnectTeamsSSE();
    setHidden(false);
    window.__CSQUIZ_CONFIG = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("подключается к эндпоинту состояния игры", () => {
    connectTeamsSSE();

    expect(EventSource).toHaveBeenCalledWith("/api/v1/game/state");
    expect(useTeamStore.getState().status).toBe("connecting");
  });

  it("не открывает второе соединение поверх живого", () => {
    connectTeamsSSE();
    connectTeamsSSE();

    expect(created).toHaveLength(1);
  });

  it("переподключается после обрыва с растущей задержкой", () => {
    connectTeamsSSE();
    lastSource().onopen?.();
    expect(useTeamStore.getState().status).toBe("connected");

    lastSource().onerror?.();
    expect(useTeamStore.getState().status).toBe("connecting");

    // Задержка с джиттером не превышает 625 мс на первой попытке.
    vi.advanceTimersByTime(700);
    expect(created).toHaveLength(2);

    // Вторая попытка ждёт дольше первой: за те же 700 мс не срабатывает.
    lastSource().onerror?.();
    vi.advanceTimersByTime(700);
    expect(created).toHaveLength(2);

    vi.advanceTimersByTime(1000);
    expect(created).toHaveLength(3);
  });

  it("продолжает переподключаться после серии быстрых попыток", () => {
    connectTeamsSSE();

    for (let i = 0; i < 6; i += 1) {
      lastSource().onerror?.();
      vi.advanceTimersByTime(40_000);
    }

    // Старое поведение сдавалось после пятой попытки; теперь соединение
    // продолжает восстанавливаться, чтобы вернуться само.
    expect(useTeamStore.getState().status).toBe("error");
    expect(created.length).toBeGreaterThan(6);
  });

  it("закрывает соединение, когда вкладка уходит в фон", () => {
    connectTeamsSSE();
    const source = lastSource();

    setHidden(true);

    expect(source.close).toHaveBeenCalled();
    expect(useTeamStore.getState().status).toBe("disconnected");
    expect(created).toHaveLength(1);
  });

  it("переподключается при возврате вкладки", () => {
    connectTeamsSSE();
    setHidden(true);
    setHidden(false);

    expect(created).toHaveLength(2);
    expect(useTeamStore.getState().status).toBe("connecting");
  });

  it("не переподключается по ошибке, если вкладка в фоне", () => {
    connectTeamsSSE();
    setHidden(true);

    lastSource().onerror?.();
    vi.advanceTimersByTime(60_000);

    expect(created).toHaveLength(1);
  });

  it("применяет события и запоминает игру", () => {
    connectTeamsSSE();

    lastSource().onmessage?.({
      data: JSON.stringify([
        {
          type: "new_team",
          body: {
            team: { id: "t1", name: "Альфа", players_count: 4 },
            game_id: { season: 3, game_number: 7 },
          },
        },
      ]),
    });

    const state = useTeamStore.getState();
    expect(state.gameMeta).toEqual({ season: 3, gameNumber: 7 });
    expect(state.teams.get("t1")?.name).toBe("Альфа");
  });

  it("переживает битое событие", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    connectTeamsSSE();

    expect(() => lastSource().onmessage?.({ data: "не json" })).not.toThrow();
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
