import { describe, expect, it } from "vitest";

import { packRows } from "./packRows";
import { relaxPhysics } from "./relaxPhysics";
import { HALL_GEOMETRY, TABLE_RING, getTableRadius } from "../config/hall";

function teams(count: number, size = 6) {
  return Array.from({ length: count }, (_, index) => ({
    teamId: `t${String(index).padStart(3, "0")}`,
    size,
  }));
}

const START_Y = 520;

describe("packRows", () => {
  it("сажает всех: глубина не ограничена", () => {
    const result = packRows(teams(200), START_Y);

    expect(result.packed).toHaveLength(200);
    expect(result.overflow).toHaveLength(0);
  });

  it("после утряски физикой столы не накладываются", () => {
    // packRows кладёт вплотную и намеренно внахлёст — раздвигает их
    // relaxPhysics. Проверяем связку целиком, она и работает в buildLayout.
    const circles = relaxPhysics(packRows(teams(120, 8), START_Y).packed);

    for (let a = 0; a < circles.length; a += 1) {
      for (let b = a + 1; b < circles.length; b += 1) {
        const distance = Math.hypot(
          circles[a].x - circles[b].x,
          circles[a].y - circles[b].y,
        );

        expect(distance).toBeGreaterThan(
          circles[a].radius + circles[b].radius + TABLE_RING * 2,
        );
      }
    }
  });

  it("укладывает ровными рядами", () => {
    const result = packRows(teams(30), START_Y);
    const rows = new Set(result.packed.map((circle) => circle.y));

    // Все столы одного ряда стоят на одной глубине, а не по случайным щелям.
    expect(rows.size).toBeLessThanOrEqual(4);
    expect(result.packed.every((circle) => circle.y >= START_Y)).toBe(true);
  });

  it("крупные команды ближе к сцене", () => {
    const mixed = [
      ...teams(10, 2).map((t) => ({ ...t, teamId: `small-${t.teamId}` })),
      ...teams(10, 8).map((t) => ({ ...t, teamId: `big-${t.teamId}` })),
    ];

    const result = packRows(mixed, START_Y);
    const sizeById = new Map(mixed.map((team) => [team.teamId, team.size]));

    // Ряд добирается более мелкими, если крупных не хватило на всю ширину —
    // это нормально. Проверяем само свойство: мелкая команда не может стоять
    // ближе к сцене, чем крупная.
    for (const circle of result.packed) {
      const size = sizeById.get(circle.teamId)!;

      for (const other of result.packed) {
        const otherSize = sizeById.get(other.teamId)!;
        if (otherSize <= size) continue;

        expect(circle.y).toBeGreaterThanOrEqual(other.y);
      }
    }

    const firstRow = Math.min(...result.packed.map((circle) => circle.y));
    const inFirstRow = result.packed
      .filter((circle) => circle.y === firstRow)
      .map((circle) => sizeById.get(circle.teamId));

    expect(inFirstRow).toContain(8);
  });

  it("не заезжает в проход между сторонами", () => {
    const result = packRows(teams(60, 8), START_Y);

    for (const circle of result.packed) {
      const crossesAisle =
        circle.x + circle.radius > HALL_GEOMETRY.aisleLeft &&
        circle.x - circle.radius < HALL_GEOMETRY.aisleRight;

      expect(crossesAisle).toBe(false);
    }
  });

  it("радиус берётся от размера команды", () => {
    const result = packRows([{ teamId: "a", size: 8 }], START_Y);

    expect(result.packed[0].radius).toBe(getTableRadius(8));
  });

  it("пустой список не ломает раскладку", () => {
    expect(packRows([], START_Y).packed).toHaveLength(0);
  });
});
