import type { RosterTeam } from "../types";

const _UNNAMED_TEAM_PLACEHOLDER = "Без названия";

export function displayName(team: RosterTeam): string {
  return team.name || _UNNAMED_TEAM_PLACEHOLDER;
}
