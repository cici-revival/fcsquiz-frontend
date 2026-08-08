import { describe, it, expect } from "vitest";
import { displayName } from "./TeamTable";
import { type RosterTeam } from "@/entities/team/types";

function team(overrides: Partial<RosterTeam> = {}): RosterTeam {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "",
    tg: "",
    captain: "",
    players_count: 0,
    passes: [],
    ...overrides,
  };
}

describe("displayName", () => {
  it("returns the team name when it is set", () => {
    expect(displayName(team({ name: "alpha" }))).toBe("alpha");
  });

  it("returns a placeholder when the name is empty", () => {
    expect(displayName(team({ name: "" }))).toBe("Без названия");
  });
});
