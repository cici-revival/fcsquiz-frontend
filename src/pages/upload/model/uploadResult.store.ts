import { create } from "zustand";
import type { GameStateUploadResponse } from "@/types/api";

type UploadResultState = {
  result: GameStateUploadResponse | null;
  setResult: (result: GameStateUploadResponse | null) => void;
  clear: () => void;
};

export const useUploadResultStore = create<UploadResultState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
