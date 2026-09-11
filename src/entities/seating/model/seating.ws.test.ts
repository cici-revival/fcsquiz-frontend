import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const issueWebSocketTicket = vi.fn();
const getCurrentGame = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    issueWebSocketTicket: () => issueWebSocketTicket(),
    getCurrentGame: () => getCurrentGame(),
  },
}));

import {
  connectSeatingWS,
  disconnectSeatingWS,
  publishSeating,
  updateTeamSeating,
} from "./seating.ws";
import { useSeatingStore } from "./seating.store";
import { useTeamStore } from "@entities/team/model/team.store";

class FakeSocket {
  static instances: FakeSocket[] = [];

  readyState = 0;
  sent: string[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  close = vi.fn(() => {
    this.readyState = 3;
  });

  constructor(public url: string) {
    FakeSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }

  parsed() {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

function lastSocket(): FakeSocket {
  return FakeSocket.instances[FakeSocket.instances.length - 1];
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("seating.ws", () => {
  beforeEach(() => {
    FakeSocket.instances = [];
    issueWebSocketTicket.mockReset();
    issueWebSocketTicket.mockResolvedValue({ ticket: "t-1", expires_in: 60 });
    getCurrentGame.mockReset();
    getCurrentGame.mockResolvedValue({ season: 2026, game_number: 1 });

    vi.stubGlobal("WebSocket", FakeSocket);
    Object.defineProperty(FakeSocket, "OPEN", { value: 1, configurable: true });

    vi.stubGlobal("crypto", {
      ...globalThis.crypto,
      randomUUID: (() => {
        let counter = 0;
        return () => `req-${(counter += 1)}`;
      })(),
    });

    useSeatingStore.getState().clear();
    useTeamStore.getState().clear();
    useTeamStore.getState().setGameMeta(2026, 1);
  });

  afterEach(() => {
    disconnectSeatingWS();
    vi.unstubAllGlobals();
  });

  it("берёт тикет и шлёт select_game первым сообщением", async () => {
    connectSeatingWS();
    await flush();

    expect(issueWebSocketTicket).toHaveBeenCalledTimes(1);
    expect(lastSocket().url).toContain("ticket=t-1");

    lastSocket().open();

    const [first] = lastSocket().parsed();
    expect(first.type).toBe("select_game");
    expect(first.game_id).toEqual({ season: 2026, game_number: 1 });
  });

  it("game_selected применяет снимок и переводит статус в connected", async () => {
    connectSeatingWS();
    await flush();
    lastSocket().open();

    lastSocket().receive({
      type: "game_selected",
      game_id: { season: 2026, game_number: 1 },
      snapshot: {
        is_published: false,
        teams: [
          {
            team_id: "a",
            size: 4,
            color: "#3B82F6",
            position: { x: 5, y: 6 },
            revision: 2,
          },
        ],
      },
    });

    expect(useSeatingStore.getState().status).toBe("connected");
    expect(useSeatingStore.getState().teams.get("a")?.revision).toBe(2);
  });

  it("строит ws-адрес с учётом относительного API_BASE_URL", async () => {
    window.__CSQUIZ_CONFIG = { API_BASE_URL: "/api" };

    connectSeatingWS();
    await flush();

    const url = new URL(lastSocket().url);
    expect(url.protocol).toBe("ws:");
    expect(url.pathname).toBe("/api/v1/adminka/seating/ws");
    expect(url.searchParams.get("ticket")).toBe("t-1");

    delete window.__CSQUIZ_CONFIG;
  });

  it("дозапрашивает номер игры по REST, если SSE его ещё не принёс", async () => {
    // clear() не трогает gameMeta, поэтому обнуляем номер игры явно.
    useTeamStore.getState().setGameMeta(0, 0);

    connectSeatingWS();
    await flush();

    expect(getCurrentGame).toHaveBeenCalledTimes(1);
    expect(useTeamStore.getState().gameMeta).toEqual({ season: 2026, gameNumber: 1 });

    lastSocket().open();

    const [first] = lastSocket().parsed();
    expect(first.game_id).toEqual({ season: 2026, game_number: 1 });
  });

  it("не подключается, если текущую игру определить не удалось", async () => {
    useTeamStore.getState().setGameMeta(0, 0);
    getCurrentGame.mockRejectedValue(new Error("нет игры"));

    connectSeatingWS();
    await flush();

    expect(issueWebSocketTicket).not.toHaveBeenCalled();
    expect(FakeSocket.instances).toHaveLength(0);
  });

  it("update_team резолвится по command.accepted", async () => {
    connectSeatingWS();
    await flush();
    lastSocket().open();

    const promise = updateTeamSeating({
      teamId: "a",
      color: "#3B82F6",
      position: { x: 1, y: 2 },
      expectedRevision: 0,
    });

    const command = lastSocket()
      .parsed()
      .find((message) => message.type === "command.update_team");

    expect(command.expected_revision).toBe(0);

    lastSocket().receive({ type: "command.accepted", request_id: command.request_id });

    await expect(promise).resolves.toEqual({ ok: true });
  });

  it("revision_conflict возвращает авторитетную команду", async () => {
    connectSeatingWS();
    await flush();
    lastSocket().open();

    const promise = updateTeamSeating({
      teamId: "a",
      color: "#3B82F6",
      position: { x: 1, y: 2 },
      expectedRevision: 0,
    });

    const command = lastSocket()
      .parsed()
      .find((message) => message.type === "command.update_team");

    const current = {
      team_id: "a",
      size: 4,
      color: "#3B82F6",
      position: { x: 9, y: 9 },
      revision: 7,
    };

    lastSocket().receive({
      type: "command.rejected",
      request_id: command.request_id,
      code: "revision_conflict",
      details: { current },
    });

    await expect(promise).resolves.toEqual({
      ok: false,
      code: "revision_conflict",
      details: { current },
    });
  });

  it("команда без соединения не виснет", async () => {
    await expect(publishSeating()).resolves.toEqual({
      ok: false,
      code: "disconnected",
    });
  });

  it("закрытие сокета отклоняет незавершённые команды", async () => {
    connectSeatingWS();
    await flush();
    lastSocket().open();

    const promise = publishSeating();
    lastSocket().onclose?.();

    await expect(promise).resolves.toEqual({ ok: false, code: "disconnected" });
  });
});
