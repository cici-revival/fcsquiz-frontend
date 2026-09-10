import { describe, expect, it } from "vitest";

import { resolveDrop } from "./movePlacement";
import { DEAD_ZONE, HALL, HALL_GEOMETRY, isInDeadZone } from "../config/hall";
import type { PackedCircle } from "./packSide";

function circle(x: number, y: number, radius = 40): PackedCircle {
  return { teamId: "moved", x, y, radius };
}

describe("resolveDrop", () => {
  it("ставит команду туда, где отпустили", () => {
    const result = resolveDrop(circle(200, 400), { x: 300, y: 500 }, []);

    expect(result).toEqual({ x: 300, y: 500 });
  });

  it("не выпускает команду за границы зала", () => {
    const result = resolveDrop(circle(200, 400), { x: -500, y: 400 }, []);

    expect(result.x).toBeGreaterThan(0);
  });

  it("не пускает команду в центральный проход", () => {
    const target = (HALL_GEOMETRY.aisleLeft + HALL_GEOMETRY.aisleRight) / 2;
    const result = resolveDrop(circle(200, 400), { x: target - 10, y: 400 }, []);

    expect(result.x + 40).toBeLessThanOrEqual(HALL_GEOMETRY.aisleLeft);
  });

  it("не пускает команду под колонки", () => {
    const middle = (DEAD_ZONE.left + DEAD_ZONE.right) / 2;
    const result = resolveDrop(circle(200, 400), { x: middle, y: 150 }, []);

    expect(isInDeadZone(result.x, result.y, 40)).toBe(false);
  });

  it("сдвигает команду, если место занято", () => {
    const occupied: PackedCircle[] = [{ teamId: "other", x: 300, y: 500, radius: 40 }];
    const result = resolveDrop(circle(200, 400), { x: 300, y: 500 }, occupied);

    const distance = Math.hypot(result.x - 300, result.y - 500);
    expect(distance).toBeGreaterThanOrEqual(80);
  });

  it("выбирает ближайшее свободное место", () => {
    const occupied: PackedCircle[] = [{ teamId: "other", x: 300, y: 500, radius: 40 }];
    const result = resolveDrop(circle(200, 400), { x: 310, y: 500 }, occupied);

    expect(Math.hypot(result.x - 310, result.y - 500)).toBeLessThan(120);
  });

  it("не опускает команду ниже пола зала", () => {
    const result = resolveDrop(circle(200, 400), { x: 300, y: HALL.height + 500 }, []);

    expect(result.y + 40).toBeLessThanOrEqual(HALL.height);
  });
});
