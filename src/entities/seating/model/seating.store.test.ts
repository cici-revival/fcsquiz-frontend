import { beforeEach, describe, expect, it } from "vitest";

import { useSeatingStore } from "./seating.store";
import type { SeatingTeam } from "../types";

function seatingTeam(overrides: Partial<SeatingTeam> & { team_id: string }): SeatingTeam {
  return {
    size: 4,
    color: "#3B82F6",
    position: null,
    revision: 0,
    ...overrides,
  };
}

describe("useSeatingStore", () => {
  beforeEach(() => {
    useSeatingStore.getState().clear();
  });

  it("снимок с teams: null не роняет стор", () => {
    useSeatingStore.getState().applySnapshot({ is_published: false, teams: null });

    expect(useSeatingStore.getState().teams.size).toBe(0);
    expect(useSeatingStore.getState().isPublished).toBe(false);
  });

  it("снимок null трактуется как пустая рассадка", () => {
    useSeatingStore.getState().applySnapshot(null);

    expect(useSeatingStore.getState().teams.size).toBe(0);
  });

  it("снимок заменяет состояние целиком", () => {
    const store = useSeatingStore.getState();

    store.applySnapshot({
      is_published: false,
      teams: [seatingTeam({ team_id: "a", position: { x: 1, y: 2 } })],
    });
    store.applySnapshot({
      is_published: true,
      teams: [seatingTeam({ team_id: "b" })],
    });

    const teams = useSeatingStore.getState().teams;
    expect(teams.has("a")).toBe(false);
    expect(teams.has("b")).toBe(true);
    expect(useSeatingStore.getState().isPublished).toBe(true);
  });

  it("повторный upserted с теми же данными не меняет ссылку на Map", () => {
    const store = useSeatingStore.getState();
    store.applyEvent({
      type: "seating.team.upserted",
      game_id: { season: 1, game_number: 1 },
      team: seatingTeam({ team_id: "a", position: { x: 10, y: 20 }, revision: 3 }),
    });

    const before = useSeatingStore.getState().teams;

    store.applyEvent({
      type: "seating.team.upserted",
      game_id: { season: 1, game_number: 1 },
      team: seatingTeam({ team_id: "a", position: { x: 10, y: 20 }, revision: 3 }),
    });

    expect(useSeatingStore.getState().teams).toBe(before);
  });

  it("новая ревизия обновляет команду", () => {
    const store = useSeatingStore.getState();
    store.applyEvent({
      type: "seating.team.upserted",
      game_id: { season: 1, game_number: 1 },
      team: seatingTeam({ team_id: "a", position: { x: 10, y: 20 }, revision: 3 }),
    });

    const before = useSeatingStore.getState().teams;

    store.applyEvent({
      type: "seating.team.upserted",
      game_id: { season: 1, game_number: 1 },
      team: seatingTeam({ team_id: "a", position: { x: 11, y: 20 }, revision: 4 }),
    });

    expect(useSeatingStore.getState().teams).not.toBe(before);
    expect(useSeatingStore.getState().teams.get("a")?.revision).toBe(4);
  });

  it("removed для отсутствующей команды не меняет ссылку на Map", () => {
    const store = useSeatingStore.getState();
    store.applySnapshot({ is_published: false, teams: [seatingTeam({ team_id: "a" })] });

    const before = useSeatingStore.getState().teams;

    store.applyEvent({
      type: "seating.team.removed",
      game_id: { season: 1, game_number: 1 },
      team_id: "b",
    });

    expect(useSeatingStore.getState().teams).toBe(before);
  });

  it("removed удаляет команду", () => {
    const store = useSeatingStore.getState();
    store.applySnapshot({ is_published: false, teams: [seatingTeam({ team_id: "a" })] });

    store.applyEvent({
      type: "seating.team.removed",
      game_id: { season: 1, game_number: 1 },
      team_id: "a",
    });

    expect(useSeatingStore.getState().teams.has("a")).toBe(false);
  });

  it("published выставляет флаг один раз", () => {
    const store = useSeatingStore.getState();

    store.applyEvent({
      type: "seating.published",
      game_id: { season: 1, game_number: 1 },
    });

    expect(useSeatingStore.getState().isPublished).toBe(true);

    const before = useSeatingStore.getState().teams;

    store.applyEvent({
      type: "seating.published",
      game_id: { season: 1, game_number: 1 },
    });

    expect(useSeatingStore.getState().teams).toBe(before);
  });
});
