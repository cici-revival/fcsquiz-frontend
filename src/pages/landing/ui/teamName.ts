import type { RosterTeam } from "@/entities/team/types";

const _UNNAMED_TEAM_PLACEHOLDER = "Без названия";

/** Название команды или заглушка, если оно не заполнено. */
export function displayName(team: RosterTeam): string {
  return team.name || _UNNAMED_TEAM_PLACEHOLDER;
}
