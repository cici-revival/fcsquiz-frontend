import type { LayoutTeam } from "./layoutTypes";

export function layoutSignature(teams: LayoutTeam[]): string {
  return teams
    .map((team) => `${team.teamId}:${team.size}`)
    .sort()
    .join("|");
}

export function teamSetSignature(teams: readonly { teamId: string }[]): string {
  return teams
    .map((team) => team.teamId)
    .sort()
    .join("|");
}
