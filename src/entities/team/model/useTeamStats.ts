import { useMemo } from 'react'
import { useTeamStore } from './team.store'

export function useTeamStats() {
  const teams = useTeamStore((s) => s.teams)
  const status = useTeamStore((s) => s.status)
  const error = useTeamStore((s) => s.error)

  return useMemo(() => {
    const list = Array.from(teams.values())

    return {
      status,
      error,
      teamsCount: list.length,
      playersCount: list.reduce((sum, t) => sum + (t.players_count ?? 0), 0),
      passesCount: list.reduce((sum, t) => sum + (t.passes?.length ?? 0), 0),
    }
  }, [teams, status, error])
}
