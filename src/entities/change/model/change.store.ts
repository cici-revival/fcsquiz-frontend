import { create } from "zustand";
import type { StoredChange } from "../types";

type ChangesState = {
  changes: Map<string, StoredChange>;

  error: string | null;

  setError: (message: string | null) => void;

  setInitial: (changes: StoredChange[]) => void;
  upsertChange: (change: StoredChange) => void;
  removeChange: (id: string) => void;
  clear: () => void;
};

export const useChangesStore = create<ChangesState>((set, get) => ({
  changes: new Map(),

  error: null,

  setError: (message) => set({ error: message }),

  setInitial: (changes: StoredChange[]) => {
    const newMap = new Map<string, StoredChange>();
    changes.forEach((change) => newMap.set(change.id, change));
    set({ changes: newMap });
  },

  upsertChange: (incomingChange: StoredChange) => {
    const newMap = new Map(get().changes);
    newMap.set(incomingChange.id, incomingChange);

    set({ changes: newMap });
  },

  removeChange: (id: string) => {
    const newMap = new Map(get().changes);
    const deleted = newMap.delete(id);

    if (deleted) {
      set({ changes: newMap });
    }
  },

  clear: () => {
    set({ changes: new Map(), error: null });
  },
}));
