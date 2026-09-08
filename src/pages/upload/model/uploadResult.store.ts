import { create } from "zustand";
import type { RegistrationImportResult } from "@/types/api";

type UploadResultState = {
  result: RegistrationImportResult | null;
  setResult: (result: RegistrationImportResult | null) => void;
  clear: () => void;
};

export const useUploadResultStore = create<UploadResultState>((set) => ({
  result: null,
  setResult: (result) => set({ result }),
  clear: () => set({ result: null }),
}));
