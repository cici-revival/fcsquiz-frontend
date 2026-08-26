import { create } from "zustand";
import { type ConnectionStatus } from "@entities/team/model/team.store";
import { type SignEvent } from "../types";

type SignState = {
  signedTeamIds: Set<string>;
  status: ConnectionStatus;
  error: string | null;

  setInitial: (ids: string[]) => void;
  applyEvent: (event: SignEvent) => void;
  setStatus: (status: ConnectionStatus) => void;
  setError: (message: string | null) => void;
  clear: () => void;
};

export const useSignStore = create<SignState>((set, get) => ({
  signedTeamIds: new Set(),
  status: "idle",
  error: null,

  setStatus: (status) => set({ status }),
  setError: (message) => set({ error: message }),

  setInitial: (ids) => set({ signedTeamIds: new Set(ids) }),

  applyEvent: (event) => {
    const prev = get().signedTeamIds;

    if (event.type === "sign_added") {
      if (prev.has(event.team_id)) return;
      const next = new Set(prev);
      next.add(event.team_id);
      set({ signedTeamIds: next });
      return;
    }

    if (event.type === "sign_removed") {
      if (!prev.has(event.team_id)) return;
      const next = new Set(prev);
      next.delete(event.team_id);
      set({ signedTeamIds: next });
    }
  },

  clear: () => set({ signedTeamIds: new Set(), status: "idle", error: null }),
}));
