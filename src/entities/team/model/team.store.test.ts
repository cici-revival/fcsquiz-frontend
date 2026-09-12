import { describe, it, expect, beforeEach } from "vitest";
import { useTeamStore } from "./team.store";
import { type RosterTeam } from "../types";

function team(overrides: Partial<RosterTeam> & { id: string }): RosterTeam {
  return {
    name: "",
    tg: "",
    captain: "",
    players_count: 0,
    passes: [],
    ...overrides,
  };
}

describe("useTeamStore — team_id addressing", () => {
  beforeEach(() => {
    useTeamStore.getState().clear();
  });

  it("new_team upserts by team.id, not by name", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const store = useTeamStore.getState();

    store.applyEvent({ type: "new_team", body: { team: team({ id, name: "alpha", players_count: 3 }) } });
    store.applyEvent({ type: "new_team", body: { team: team({ id, name: "beta", players_count: 5 }) } });

    const teams = useTeamStore.getState().teams;
    expect(teams.size).toBe(1);
    expect(teams.get(id)?.name).toBe("beta");
    expect(teams.get(id)?.players_count).toBe(5);
  });

  it("keeps two teams with the same (or empty) name as separate entries, keyed by id", () => {
    const id1 = "11111111-1111-1111-1111-111111111111";
    const id2 = "22222222-2222-2222-2222-222222222222";
    const store = useTeamStore.getState();

    store.applyEvent({ type: "new_team", body: { team: team({ id: id1, name: "", players_count: 2 }) } });
    store.applyEvent({ type: "new_team", body: { team: team({ id: id2, name: "", players_count: 3 }) } });

    const teams = useTeamStore.getState().teams;
    expect(teams.size).toBe(2);

    const stats = statsFromTeams(teams);
    expect(stats.teamsCount).toBe(2);
    expect(stats.playersCount).toBe(5);
  });

  it("change_players_count updates the team matched by team_id", () => {
    const id1 = "11111111-1111-1111-1111-111111111111";
    const id2 = "22222222-2222-2222-2222-222222222222";
    const store = useTeamStore.getState();

    store.applyEvent({ type: "new_team", body: { team: team({ id: id1, name: "alpha", players_count: 2 }) } });
    store.applyEvent({ type: "new_team", body: { team: team({ id: id2, name: "alpha", players_count: 2 }) } });

    store.applyEvent({ type: "change_players_count", body: { team_id: id2, team_name: "alpha", players_count: 7 } });

    const teams = useTeamStore.getState().teams;
    expect(teams.get(id1)?.players_count).toBe(2);
    expect(teams.get(id2)?.players_count).toBe(7);
  });

  it("update_passes updates the team matched by team_id", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const store = useTeamStore.getState();

    store.applyEvent({ type: "new_team", body: { team: team({ id, name: "alpha", passes: ["p1"] }) } });
    store.applyEvent({ type: "update_passes", body: { team_id: id, team_name: "alpha", passes: ["p1", "p2"] } });

    expect(useTeamStore.getState().teams.get(id)?.passes).toEqual(["p1", "p2"]);
  });

  it("remove_team removes the team matched by team_id", () => {
    const id1 = "11111111-1111-1111-1111-111111111111";
    const id2 = "22222222-2222-2222-2222-222222222222";
    const store = useTeamStore.getState();

    store.applyEvent({ type: "new_team", body: { team: team({ id: id1, name: "alpha" }) } });
    store.applyEvent({ type: "new_team", body: { team: team({ id: id2, name: "beta" }) } });

    store.applyEvent({ type: "remove_team", body: { team_id: id1, team_name: "alpha" } });

    const teams = useTeamStore.getState().teams;
    expect(teams.size).toBe(1);
    expect(teams.has(id1)).toBe(false);
    expect(teams.has(id2)).toBe(true);
  });

  it("ignores deltas with an unknown team_id without throwing", () => {
    const id = "11111111-1111-1111-1111-111111111111";
    const unknownId = "99999999-9999-9999-9999-999999999999";
    const store = useTeamStore.getState();

    store.applyEvent({ type: "new_team", body: { team: team({ id, name: "alpha", players_count: 2 }) } });

    expect(() => {
      store.applyEvent({ type: "change_players_count", body: { team_id: unknownId, team_name: "alpha", players_count: 9 } });
      store.applyEvent({ type: "update_passes", body: { team_id: unknownId, team_name: "alpha", passes: ["x"] } });
      store.applyEvent({ type: "remove_team", body: { team_id: unknownId, team_name: "alpha" } });
    }).not.toThrow();

    const teams = useTeamStore.getState().teams;
    expect(teams.size).toBe(1);
    expect(teams.get(id)?.players_count).toBe(2);
  });

  it("setInitial keys the snapshot by id", () => {
    const id1 = "11111111-1111-1111-1111-111111111111";
    const id2 = "22222222-2222-2222-2222-222222222222";

    useTeamStore.getState().setInitial([
      team({ id: id1, name: "" }),
      team({ id: id2, name: "" }),
    ]);

    const teams = useTeamStore.getState().teams;
    expect(teams.size).toBe(2);
    expect(teams.has(id1)).toBe(true);
    expect(teams.has(id2)).toBe(true);
  });

  it("re-applying the same snapshot is idempotent", () => {
    const id1 = "11111111-1111-1111-1111-111111111111";
    const id2 = "22222222-2222-2222-2222-222222222222";
    const snapshot = [
      team({ id: id1, name: "alpha", players_count: 4, passes: ["p1"] }),
      team({ id: id2, name: "beta", players_count: 3, passes: [] }),
    ];

    const store = useTeamStore.getState();
    for (const t of snapshot) {
      store.applyEvent({ type: "new_team", body: { team: t } });
    }

    const before = statsFromTeams(useTeamStore.getState().teams);

    for (const t of snapshot) {
      store.applyEvent({ type: "new_team", body: { team: t } });
    }

    const after = statsFromTeams(useTeamStore.getState().teams);

    expect(after).toEqual(before);
    expect(useTeamStore.getState().teams.size).toBe(2);
  });
});

describe("useTeamStore — стабильность ссылок при переигрывании событий", () => {
  const id = "11111111-1111-1111-1111-111111111111";

  beforeEach(() => {
    useTeamStore.getState().clear();
  });

  function seed() {
    useTeamStore.getState().applyEvent({
      type: "new_team",
      body: { team: team({ id, name: "alpha", players_count: 4, passes: ["p1"] }) },
    });
  }

  it("повторный new_team с теми же данными не меняет ссылку на Map", () => {
    seed();
    const before = useTeamStore.getState().teams;

    useTeamStore.getState().applyEvent({
      type: "new_team",
      body: { team: team({ id, name: "alpha", players_count: 4, passes: ["p1"] }) },
    });

    expect(useTeamStore.getState().teams).toBe(before);
  });

  it("update_passes с новым массивом того же содержимого не меняет ссылку на Map", () => {
    seed();
    const before = useTeamStore.getState().teams;

    useTeamStore.getState().applyEvent({
      type: "update_passes",
      body: { team_id: id, team_name: "alpha", passes: ["p1"] },
    });

    expect(useTeamStore.getState().teams).toBe(before);
  });

  it("change_players_count с тем же числом не меняет ссылку на Map", () => {
    seed();
    const before = useTeamStore.getState().teams;

    useTeamStore.getState().applyEvent({
      type: "change_players_count",
      body: { team_id: id, team_name: "alpha", players_count: 4 },
    });

    expect(useTeamStore.getState().teams).toBe(before);
  });

  it("remove_team для отсутствующей команды не меняет ссылку на Map", () => {
    seed();
    const before = useTeamStore.getState().teams;

    useTeamStore.getState().applyEvent({
      type: "remove_team",
      body: { team_id: "22222222-2222-2222-2222-222222222222", team_name: "beta" },
    });

    expect(useTeamStore.getState().teams).toBe(before);
  });

  it("реальное изменение состава ссылку меняет", () => {
    seed();
    const before = useTeamStore.getState().teams;

    useTeamStore.getState().applyEvent({
      type: "change_players_count",
      body: { team_id: id, team_name: "alpha", players_count: 7 },
    });

    expect(useTeamStore.getState().teams).not.toBe(before);
    expect(useTeamStore.getState().teams.get(id)?.players_count).toBe(7);
  });

  it("applyEvents применяет пачку за одно обновление стора", () => {
    let notifications = 0;
    const unsubscribe = useTeamStore.subscribe(() => {
      notifications += 1;
    });

    useTeamStore.getState().applyEvents([
      { type: "new_team", body: { team: team({ id: "a", name: "a" }) } },
      { type: "new_team", body: { team: team({ id: "b", name: "b" }) } },
      { type: "new_team", body: { team: team({ id: "c", name: "c" }) } },
    ]);

    unsubscribe();

    expect(notifications).toBe(1);
    expect(useTeamStore.getState().teams.size).toBe(3);
  });

  it("переигрывание всего состава не трогает стор", () => {
    const roster = [
      team({ id: "a", name: "alpha", players_count: 4, passes: ["p1"] }),
      team({ id: "b", name: "beta", players_count: 3, passes: [] }),
    ];
    const events = roster.map(
      (t) => ({ type: "new_team", body: { team: t } }) as const,
    );

    useTeamStore.getState().applyEvents(events);
    const before = useTeamStore.getState().teams;

    let notifications = 0;
    const unsubscribe = useTeamStore.subscribe(() => {
      notifications += 1;
    });

    useTeamStore.getState().applyEvents(
      roster.map((t) => ({ type: "new_team", body: { team: { ...t } } }) as const),
    );

    unsubscribe();

    expect(notifications).toBe(0);
    expect(useTeamStore.getState().teams).toBe(before);
  });
});

function statsFromTeams(teams: Map<string, RosterTeam>) {
  const list = Array.from(teams.values());
  return {
    teamsCount: list.length,
    playersCount: list.reduce((sum, t) => sum + (t.players_count ?? 0), 0),
    passesCount: list.reduce((sum, t) => sum + (t.passes?.length ?? 0), 0),
  };
}
