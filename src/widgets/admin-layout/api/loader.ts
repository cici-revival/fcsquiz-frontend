// src/widgets/admin-layout/api/loader.ts
import { adminkaApi } from '@/shared/api/adminkaApi'
import type { AdminkaGameState, StatsData } from '@/types/api'
import { ApiError } from '@/shared/api/errors'

export async function loadStatsData(): Promise<StatsData> {
  try {
    const gameState: AdminkaGameState = await adminkaApi.getGameState()

    return {
      teamsCount: gameState.teams_count,
      playersCount: gameState.players_count,
      passesCount: gameState.passes_count,
    }
  } catch (error) {


    if (error instanceof ApiError) {
      throw error
    }

    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0,
      'Network Error',
    )
  }
}
