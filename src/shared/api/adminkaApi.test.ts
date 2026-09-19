import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminkaApi } from "./adminkaApi";
import { adminkaApiClient } from "./client";

vi.mock("./client", () => ({
  adminkaApiClient: { request: vi.fn() },
}));

describe("single change API requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const game = { season: 1, game_number: 2 };
  const player = { team_id: "team-id", name: "Иван" };
  const pass = { team_id: "team-id", pass: "regular" };
  const change = { team_id: "team-id", type: "new_count" as const, count: 3 };

  it.each([
    ["addPlayer", "/v1/changes/player/add", { ...game, player }, () => adminkaApi.addPlayer({ ...game, player })],
    ["removePlayer", "/v1/changes/player/remove", { ...game, player }, () => adminkaApi.removePlayer({ ...game, player })],
    ["addPass", "/v1/changes/pass/add", { ...game, pass }, () => adminkaApi.addPass({ ...game, pass })],
    ["removePass", "/v1/changes/pass/remove", { ...game, pass }, () => adminkaApi.removePass({ ...game, pass })],
    ["changePlayerCount", "/v1/changes/player/count", { ...game, change }, () => adminkaApi.changePlayerCount({ ...game, change })],
  ] as const)("%s sends one item", async (_operation, path, payload, call) => {
    await call();

    expect(adminkaApiClient.request).toHaveBeenCalledOnce();
    expect(adminkaApiClient.request).toHaveBeenCalledWith(path, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  });

  it("keeps the existing resolve route", async () => {
    await adminkaApi.markResolved({ change_id: "change-id" });

    expect(adminkaApiClient.request).toHaveBeenCalledWith(
      "/v1/changes/mark_resolved?change_id=change-id",
      { method: "PUT" },
    );
  });
});
