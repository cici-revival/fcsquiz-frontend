import type { GameStateUploadResponse } from "@/types/api";
import { adminkaApi } from "@/shared/api/adminkaApi";

export function uploadGameStateTable(
  file: File,
  season: number,
  game_number: number,
): Promise<GameStateUploadResponse> {
  return adminkaApi.postGameState({
    season,
    game_number,
    file,
  });
}
