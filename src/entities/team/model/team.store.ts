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
  clear: () => void;
};

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

  applyEvent: (event: TeamEvent) => {
    const current = new Map(get().teams);

    switch (event.type) {
      case "new_team":
        current.set(event.body.team.id, event.body.team);
        break;

      case "change_players_count": {
        const team = current.get(event.body.team_id);
        if (team) {
          current.set(event.body.team_id, {
            ...team,
            players_count: event.body.players_count,
          });
        }
        break;
      }

      case "update_passes": {
        const team = current.get(event.body.team_id);
        if (team) {
          current.set(event.body.team_id, {
            ...team,
            passes: event.body.passes,
          });
        }
        break;
      }

      case "remove_team":
        current.delete(event.body.team_id);
        break;
    }

    set({ teams: current });
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
