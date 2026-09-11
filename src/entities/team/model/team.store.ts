import { useMemo } from "react";
import { create } from "zustand";
import { type TeamEvent, type RosterTeam } from "../types";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "disconnected";

type GameMeta = {
  season: number;
  gameNumber: number;
};

type TeamState = {
  teams: Map<string, RosterTeam>;

  gameMeta: GameMeta;

  status: ConnectionStatus;
  error: string | null;

  setGameMeta: (season: number, gameNumber: number) => void;

  setStatus: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;

  setInitial: (teams: RosterTeam[]) => void;
  applyEvent: (event: TeamEvent) => void;
  applyEvents: (events: TeamEvent[]) => void;
  clear: () => void;
};

function samePasses(a?: string[], b?: string[]): boolean {
  if (a === b) return true;
  if (!a || !b) return (a?.length ?? 0) === (b?.length ?? 0);

  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function sameTeam(a: RosterTeam, b: RosterTeam): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.tg === b.tg &&
    a.captain === b.captain &&
    a.players_count === b.players_count &&
    a.is_ready_to_accept_players === b.is_ready_to_accept_players &&
    a.division === b.division &&
    samePasses(a.passes, b.passes)
  );
}

function reduce(
  teams: Map<string, RosterTeam>,
  event: TeamEvent,
): Map<string, RosterTeam> | null {
  switch (event.type) {
    case "new_team": {
      const incoming = event.body.team;
      const existing = teams.get(incoming.id);
      if (existing && sameTeam(existing, incoming)) return null;

      const next = new Map(teams);
      next.set(incoming.id, incoming);
      return next;
    }

    case "change_players_count": {
      const team = teams.get(event.body.team_id);
      if (!team || team.players_count === event.body.players_count) return null;

      const next = new Map(teams);
      next.set(event.body.team_id, {
        ...team,
        players_count: event.body.players_count,
      });
      return next;
    }

    case "update_passes": {
      const team = teams.get(event.body.team_id);
      if (!team || samePasses(team.passes, event.body.passes)) return null;

      const next = new Map(teams);
      next.set(event.body.team_id, { ...team, passes: event.body.passes });
      return next;
    }

    case "remove_team": {
      if (!teams.has(event.body.team_id)) return null;

      const next = new Map(teams);
      next.delete(event.body.team_id);
      return next;
    }
  }
}

export const useTeamStore = create<TeamState>((set, get) => ({
  teams: new Map(),

  gameMeta: {
    season: 0,
    gameNumber: 0,
  },

  status: "idle",
  error: null,

  setStatus: (status) => set({ status }),
  setError: (message) => set({ error: message }),

  setGameMeta: (season, gameNumber) => {
    const current = get().gameMeta;

    if (current.season === season && current.gameNumber === gameNumber) {
      return;
    }

    set({
      gameMeta: { season, gameNumber },
    });
  },

  setInitial: (teamsArray: RosterTeam[]) => {
    const map = new Map<string, RosterTeam>();
    teamsArray.forEach((team) => map.set(team.id, team));
    set({ teams: map });
  },

  applyEvent: (event: TeamEvent) => get().applyEvents([event]),

  applyEvents: (events: TeamEvent[]) => {
    let teams = get().teams;
    let changed = false;

    for (const event of events) {
      const next = reduce(teams, event);

      if (next) {
        teams = next;
        changed = true;
      }
    }

    if (changed) {
      set({ teams });
    }
  },

  clear: () => set({ teams: new Map(), status: "idle", error: null }),
}));

// Команды всё ещё выбираются в UI по имени (комбобоксы, ручки правок);
// стор ключуется по id, поэтому имя -> команда собирается отдельно.
export function useTeamsByName(): Map<string, RosterTeam> {
  const teams = useTeamStore((s) => s.teams);

  return useMemo(() => {
    const byName = new Map<string, RosterTeam>();
    teams.forEach((team) => byName.set(team.name, team));
    return byName;
  }, [teams]);
}
