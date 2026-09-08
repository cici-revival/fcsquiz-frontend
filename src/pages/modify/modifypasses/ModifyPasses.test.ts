import { describe, expect, it } from "vitest";

import { createEmptyPassBlock } from "./passBlock";

describe("createEmptyPassBlock", () => {
  it("не наследует команду в служебную пустую строку", () => {
    expect(createEmptyPassBlock("pass-1", "remove")).toEqual({
      id: "pass-1",
      playerName: "",
      team: "",
      mode: "remove",
    });
  });
});
