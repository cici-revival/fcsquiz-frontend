import { create } from "zustand";

import type {
  SeatingConnectionStatus,
  SeatingEvent,
  SeatingSnapshot,
  SeatingTeam,
} from "../types";

type SeatingState = {
  teams: Map<string, SeatingTeam>;
  isPublished: boolean;

  status: SeatingConnectionStatus;
  error: string | null;

  setStatus: (status: SeatingConnectionStatus) => void;
  setError: (message: string | null) => void;

  applySnapshot: (snapshot: SeatingSnapshot | null) => void;
  applyEvent: (event: SeatingEvent) => void;
  upsertTeam: (team: SeatingTeam) => void;
  clear: () => void;
};

function samePosition(a: SeatingTeam["position"], b: SeatingTeam["position"]): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  return a.x === b.x && a.y === b.y;
}

function sameSeatingTeam(a: SeatingTeam, b: SeatingTeam): boolean {
  return (
    a.team_id === b.team_id &&
    a.size === b.size &&
    a.color === b.color &&
    a.revision === b.revision &&
    samePosition(a.position, b.position)
  );
}

export const useSeatingStore = create<SeatingState>((set, get) => ({
  teams: new Map(),
  isPublished: false,

  status: "idle",
  error: null,

  setStatus: (status) => set({ status }),
  setError: (message) => set({ error: message }),

  applySnapshot: (snapshot) => {
    const teams = new Map<string, SeatingTeam>();

    // teams приходит null, а не [], когда на бэке ещё нет ни одной строки.
    for (const team of snapshot?.teams ?? []) {
      teams.set(team.team_id, team);
    }

    set({ teams, isPublished: snapshot?.is_published ?? false });
  },

  upsertTeam: (team) => {
    const current = get().teams;
    const existing = current.get(team.team_id);

    if (existing && sameSeatingTeam(existing, team)) return;

    const next = new Map(current);
    next.set(team.team_id, team);
    set({ teams: next });
  },

  applyEvent: (event) => {
    switch (event.type) {
      case "seating.snapshot":
        get().applySnapshot(event.snapshot);
        break;

      case "seating.team.upserted":
        get().upsertTeam(event.team);
        break;

      case "seating.team.removed": {
        const current = get().teams;
        if (!current.has(event.team_id)) return;

        const next = new Map(current);
        next.delete(event.team_id);
        set({ teams: next });
        break;
      }

      case "seating.published":
        if (get().isPublished) return;
        set({ isPublished: true });
        break;
    }
  },

  clear: () =>
    set({
      teams: new Map(),
      isPublished: false,
      status: "idle",
      error: null,
    }),
}));
