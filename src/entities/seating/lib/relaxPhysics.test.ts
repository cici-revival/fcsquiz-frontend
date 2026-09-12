import { describe, expect, it } from "vitest";

import { relaxPhysics } from "./relaxPhysics";
import { getSeatingTop, TABLE_GAP, TABLE_RING } from "../config/hall";
import type { PackedCircle } from "./layoutTypes";

function circle(teamId: string, x: number, y: number, radius = 40): PackedCircle {
  return { teamId, x, y, radius };
}

function minGap(circles: PackedCircle[]): number {
  let min = Infinity;

  for (let a = 0; a < circles.length; a += 1) {
    for (let b = a + 1; b < circles.length; b += 1) {
      const distance = Math.hypot(
        circles[a].x - circles[b].x,
        circles[a].y - circles[b].y,
      );

      min = Math.min(min, distance - circles[a].radius - circles[b].radius);
    }
  }

  return min;
}

describe("relaxPhysics", () => {
  it("расталкивает наложенные столы", () => {
    const result = relaxPhysics([
      circle("a", 300, 600),
      circle("b", 310, 605),
      circle("c", 305, 595),
    ]);

    expect(minGap(result)).toBeGreaterThanOrEqual(TABLE_GAP + TABLE_RING * 2 - 1);
  });

  it("разводит столы с совпавшими центрами", () => {
    const result = relaxPhysics([circle("a", 300, 600), circle("b", 300, 600)]);

    expect(minGap(result)).toBeGreaterThan(0);
  });

  it("не двигает то, что уже стоит свободно", () => {
    const input = [circle("a", 250, 600), circle("b", 500, 600)];
    const result = relaxPhysics(input);

    expect(result[0].x).toBe(input[0].x);
    expect(result[1].x).toBe(input[1].x);
  });

  it("обходит неподвижные препятствия", () => {
    const frozen = [circle("fixed", 300, 600, 43)];
    const result = relaxPhysics([circle("a", 305, 600)], frozen);

    const distance = Math.hypot(result[0].x - 300, result[0].y - 600);
    expect(distance).toBeGreaterThanOrEqual(result[0].radius + 43 - 1);
  });

  it("не поднимает столы на сцену", () => {
    const result = relaxPhysics([circle("a", 300, -200)]);

    expect(result[0].y - result[0].radius).toBeGreaterThanOrEqual(
      getSeatingTop() - 1,
    );
  });

  it("пустой список не ломает", () => {
    expect(relaxPhysics([])).toHaveLength(0);
  });
});
