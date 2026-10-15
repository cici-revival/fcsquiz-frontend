import type { GameTeamSummary, StatsTeamScores } from "@/types/api";

type NamedTeam = { name?: string | null };

export function createTeamNameLookup(
  gameTeams: GameTeamSummary[],
  roster: ReadonlyMap<string, NamedTeam>,
): (teamId: string) => string {
  const names = new Map(gameTeams.map((team) => [team.id, team.name]));

  return (teamId) =>
    names.get(teamId)?.trim() || roster.get(teamId)?.name?.trim() || "";
}

export function sortByPlace(results: StatsTeamScores[]): StatsTeamScores[] {
  return [...results].sort((a, b) => a.place - b.place);
}
