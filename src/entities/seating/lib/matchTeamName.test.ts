import { describe, expect, it } from "vitest";
import { normalizeTeamName, teamNameDistance } from "./matchTeamName";

const TARGET = "Мальчик, сними шляпу";

describe("teamNameDistance", () => {
  it.each([
    "Мальчик, сними шляпу",
    "мальчик сними шляпу",
    "МАЛЬЧИК, СНИМИ ШЛЯПУ!",
    "Мальчик сними шляпу)",
    "Мальчик, сними шляпy",
    "Малчик, сними шляпу",
    "Мальчик, снимм шляпу",
    "Мальчик, сними шляпку",
    "Мальчки, сними шляпу",
    "Мальчик,сними шляпу ",
    "Мальчик, сними шляпу 🎩",
  ])("узнаёт «%s»", (name) => {
    expect(teamNameDistance(name, TARGET)).not.toBeNull();
  });

  it.each([
    "Мальчик, надень шляпу",
    "Девочка, сними шляпу",
    "Шляпа",
    "Ак Барс",
    "",
  ])("не путает с «%s»", (name) => {
    expect(teamNameDistance(name, TARGET)).toBeNull();
  });
});

describe("normalizeTeamName", () => {
  it("убирает пунктуацию, регистр и латинские двойники", () => {
    expect(normalizeTeamName("Мальчик, сними шляпy!")).toBe("мальчикснимишляпу");
  });
});
