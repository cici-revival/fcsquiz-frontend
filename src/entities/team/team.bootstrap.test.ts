import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bootstrapTeams, restartTeams, shutdownTeams } from "./team.bootstrap";
import { connectTeamsSSE, disconnectTeamsSSE } from "./model/team.sse";

vi.mock("./model/team.sse", () => ({
  connectTeamsSSE: vi.fn(),
  disconnectTeamsSSE: vi.fn(),
}));

describe("bootstrapTeams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Возвращаем счётчик к нулю, чтобы тесты не влияли друг на друга.
    for (let i = 0; i < 5; i += 1) {
      shutdownTeams();
    }
    vi.clearAllMocks();
  });

  it("открывает соединение один раз на нескольких потребителей", () => {
    bootstrapTeams();
    bootstrapTeams();

    expect(connectTeamsSSE).toHaveBeenCalledTimes(1);
  });

  it("держит соединение, пока остаётся хотя бы один потребитель", () => {
    bootstrapTeams();
    bootstrapTeams();

    // Выход из админки не должен оставлять лендинг без данных.
    shutdownTeams();

    expect(disconnectTeamsSSE).not.toHaveBeenCalled();
  });

  it("закрывает соединение, когда потребителей не осталось", () => {
    bootstrapTeams();
    bootstrapTeams();
    shutdownTeams();
    shutdownTeams();

    expect(disconnectTeamsSSE).toHaveBeenCalledTimes(1);
  });

  it("не уводит счётчик в минус при лишнем shutdown", () => {
    shutdownTeams();
    shutdownTeams();

    bootstrapTeams();

    expect(connectTeamsSSE).toHaveBeenCalledTimes(1);
  });

  it("переподключает, пока есть потребители", () => {
    bootstrapTeams();
    vi.clearAllMocks();

    restartTeams();

    expect(disconnectTeamsSSE).toHaveBeenCalledTimes(1);
    expect(connectTeamsSSE).toHaveBeenCalledTimes(1);
  });

  it("не поднимает соединение, если потребителей нет", () => {
    restartTeams();

    expect(connectTeamsSSE).not.toHaveBeenCalled();
  });
});
