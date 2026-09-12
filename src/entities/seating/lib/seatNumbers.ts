import type { SeatingTeam } from "../types";

const ROW_TOLERANCE = 60;

type Numbered = {
  team_id: string;
  x: number;
  y: number;
};

export function buildSeatNumbers(
  teams: Iterable<SeatingTeam>,
): Map<string, number> {
  const seated: Numbered[] = [];

  for (const team of teams) {
    if (!team.position) continue;

    seated.push({
      team_id: team.team_id,
      x: team.position.x,
      y: team.position.y,
    });
  }

  seated.sort((a, b) => {
    if (Math.abs(a.y - b.y) > ROW_TOLERANCE) return a.y - b.y;
    if (a.x !== b.x) return a.x - b.x;

    return a.team_id.localeCompare(b.team_id);
  });

  return new Map(seated.map((team, index) => [team.team_id, index + 1]));
}
