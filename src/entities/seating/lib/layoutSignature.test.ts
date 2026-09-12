import { describe, expect, it } from "vitest";

import { layoutSignature, teamSetSignature } from "./layoutSignature";
import type { LayoutTeam } from "./layoutTypes";

describe("layoutSignature", () => {
  it("не зависит от порядка команд", () => {
    const a = [
      { teamId: "a", size: 4 },
      { teamId: "b", size: 6 },
    ];
    const b = [
      { teamId: "b", size: 6 },
      { teamId: "a", size: 4 },
    ];

    expect(layoutSignature(a)).toBe(layoutSignature(b));
  });

  it("меняется при смене размера команды", () => {
    const before = layoutSignature([{ teamId: "a", size: 4 }]);
    const after = layoutSignature([{ teamId: "a", size: 5 }]);

    expect(after).not.toBe(before);
  });

  it("стабильна для пересозданного массива с тем же содержимым", () => {
    const teams = [{ teamId: "a", size: 4 }];

    expect(layoutSignature(teams)).toBe(layoutSignature([{ teamId: "a", size: 4 }]));
  });

  it("не мутирует исходный массив", () => {
    const teams = [
      { teamId: "b", size: 6 },
      { teamId: "a", size: 4 },
    ];

    layoutSignature(teams);

    expect(teams[0].teamId).toBe("b");
  });
});

describe("teamSetSignature", () => {
  it("не меняется, если поменялся только размер", () => {
    const before: LayoutTeam[] = [{ teamId: "a", size: 4 }];
    const after: LayoutTeam[] = [{ teamId: "a", size: 9 }];

    expect(teamSetSignature(after)).toBe(teamSetSignature(before));
    expect(layoutSignature(after)).not.toBe(layoutSignature(before));
  });

  it("меняется при добавлении команды", () => {
    const before = teamSetSignature([{ teamId: "a" }]);
    const after = teamSetSignature([{ teamId: "a" }, { teamId: "b" }]);

    expect(after).not.toBe(before);
  });

  it("не зависит от порядка", () => {
    expect(teamSetSignature([{ teamId: "b" }, { teamId: "a" }])).toBe(
      teamSetSignature([{ teamId: "a" }, { teamId: "b" }]),
    );
  });
});
