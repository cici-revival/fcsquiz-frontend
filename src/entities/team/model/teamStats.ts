import type { Team } from "@/types/api";

export type RosterBucket = {
  size: number;
  count: number;
};

export type GameTotals = {
  teamsCount: number;
  playersCount: number;
  passesCount: number;
};

const MAX_ROSTER_SIZE = 8;

export function getRosterDistribution(teams: Team[]): RosterBucket[] {
  const counts = new Map<number, number>();
  for (let size = 1; size <= MAX_ROSTER_SIZE; size += 1) {
    counts.set(size, 0);
  }

  for (const team of teams) {
    const raw = team.players_count ?? 0;
    if (raw <= 0) continue;

    const size = Math.min(raw, MAX_ROSTER_SIZE);
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => a.size - b.size);
}

export function getGameTotals(teams: Team[]): GameTotals {
  return {
    teamsCount: teams.length,
    playersCount: teams.reduce((sum, t) => sum + (t.players_count ?? 0), 0),
    passesCount: teams.reduce((sum, t) => sum + (t.passes?.length ?? 0), 0),
  };
}
