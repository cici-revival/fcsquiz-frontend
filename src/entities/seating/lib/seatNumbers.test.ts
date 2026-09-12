import { describe, expect, it } from "vitest";

import { buildSeatNumbers } from "./seatNumbers";
import type { SeatingTeam } from "../types";

function team(
  teamId: string,
  position: { x: number; y: number } | null,
): SeatingTeam {
  return {
    team_id: teamId,
    size: 6,
    color: "#3B82F6",
    position,
    revision: 1,
  };
}

describe("buildSeatNumbers", () => {
  it("нумерует рядами сверху вниз, внутри ряда — слева направо", () => {
    const numbers = buildSeatNumbers([
      team("c", { x: 100, y: 500 }),
      team("b", { x: 700, y: 100 }),
      team("a", { x: 200, y: 100 }),
    ]);

    expect(numbers.get("a")).toBe(1);
    expect(numbers.get("b")).toBe(2);
    expect(numbers.get("c")).toBe(3);
  });

  it("считает одним рядом столы с небольшой разницей по высоте", () => {
    const numbers = buildSeatNumbers([
      team("right", { x: 800, y: 110 }),
      team("left", { x: 100, y: 140 }),
    ]);

    expect(numbers.get("left")).toBe(1);
    expect(numbers.get("right")).toBe(2);
  });

  it("пропускает команды без позиции", () => {
    const numbers = buildSeatNumbers([
      team("seated", { x: 100, y: 100 }),
      team("pooled", null),
    ]);

    expect(numbers.get("seated")).toBe(1);
    expect(numbers.has("pooled")).toBe(false);
    expect(numbers.size).toBe(1);
  });

  it("нумерует подряд без пропусков", () => {
    const numbers = buildSeatNumbers(
      Array.from({ length: 5 }, (_, i) => team(`t${i}`, { x: i * 100, y: 0 })),
    );

    expect([...numbers.values()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("даёт одинаковый результат на любом порядке входа", () => {
    const teams = [
      team("a", { x: 100, y: 100 }),
      team("b", { x: 500, y: 100 }),
      team("c", { x: 300, y: 400 }),
    ];

    const straight = buildSeatNumbers(teams);
    const reversed = buildSeatNumbers([...teams].reverse());

    expect([...reversed.entries()]).toEqual([...straight.entries()]);
  });
});
