import { describe, expect, it } from "vitest";

import { buildLayout, type LayoutTeam } from "./buildLayout";
import {
  FIXED_SLOT_POINTS,
  HALL,
  HALL_GEOMETRY,
  getTableRadius,
} from "../config/hall";

function teams(count: number, size = 5): LayoutTeam[] {
  return Array.from({ length: count }, (_, i) => ({
    teamId: `team-${String(i).padStart(3, "0")}`,
    size,
  }));
}

describe("getTableRadius", () => {
  it("растёт вместе с числом участников", () => {
    expect(getTableRadius(8)).toBeGreaterThan(getTableRadius(4));
  });

  it("не опускается ниже минимума для пустых команд", () => {
    expect(getTableRadius(0)).toBe(getTableRadius(1));
  });
});

describe("buildLayout", () => {
  it("сажает крупные команды на фиксированные места у сцены", () => {
    const result = buildLayout([
      { teamId: "small", size: 2 },
      { teamId: "big", size: 8 },
    ]);

    const big = result.placements.find((p) => p.teamId === "big");
    const small = result.placements.find((p) => p.teamId === "small");

    expect(big?.slot.y).toBeLessThan(small?.slot.y ?? Infinity);
  });

  it("использует размеченные координаты для первых команд", () => {
    const result = buildLayout(teams(FIXED_SLOT_POINTS.length));

    const known = new Set(FIXED_SLOT_POINTS.map((p) => `${p.x}:${p.y}`));

    for (const placement of result.placements) {
      expect(known.has(`${placement.slot.x}:${placement.slot.y}`)).toBe(true);
    }
  });

  it("достраивает ряды для команд сверх размеченных мест", () => {
    const total = FIXED_SLOT_POINTS.length + 20;
    const result = buildLayout(teams(total));

    expect(result.placements).toHaveLength(total);
    expect(result.overflow).toHaveLength(0);
  });

  it("не ставит столы в центральный проход", () => {
    const result = buildLayout(teams(FIXED_SLOT_POINTS.length + 30));
    const generated = result.placements.slice(FIXED_SLOT_POINTS.length);

    for (const { slot } of generated) {
      const left = slot.x - slot.radius;
      const right = slot.x + slot.radius;
      const inAisle =
        right > HALL_GEOMETRY.aisleLeft && left < HALL_GEOMETRY.aisleRight;

      expect(inAisle).toBe(false);
    }
  });

  it("не допускает наложения столов", () => {
    const sizes = [8, 8, 8, 7, 6, 6, 5, 4, 3, 2];
    const mixed = Array.from({ length: 70 }, (_, i) => ({
      teamId: `team-${String(i).padStart(3, "0")}`,
      size: sizes[i % sizes.length],
    }));

    const result = buildLayout(mixed);
    const all = result.placements;

    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i].slot;
        const b = all[j].slot;
        const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;

        expect(gap).toBeGreaterThan(-1);
      }
    }
  });

  it("укладывает столы плотнее сетки", () => {
    const extra = 24;
    const result = buildLayout(teams(FIXED_SLOT_POINTS.length + extra, 6));
    const generated = result.placements.slice(FIXED_SLOT_POINTS.length);

    const lowestFixed = Math.max(
      ...result.placements
        .slice(0, FIXED_SLOT_POINTS.length)
        .map((placement) => placement.slot.y),
    );
    const lowestGenerated = Math.max(
      ...generated.map((placement) => placement.slot.y),
    );

    expect(lowestGenerated - lowestFixed).toBeLessThan(280);
  });

  it("не выпускает столы за границы зала", () => {
    const result = buildLayout(teams(FIXED_SLOT_POINTS.length + 40, 8));

    for (const { slot } of result.placements) {
      expect(slot.y + slot.radius).toBeLessThanOrEqual(HALL.height);
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(HALL.width);
    }
  });

  it("сообщает о командах, которым не хватило места", () => {
    const result = buildLayout(teams(400, 8));

    expect(result.overflow.length).toBeGreaterThan(0);
    expect(result.placements.length + result.overflow.length).toBe(400);
  });

  it("даёт одинаковый результат при одинаковом входе", () => {
    const input = teams(60);

    expect(buildLayout(input)).toEqual(buildLayout(input));
  });

  it("не зависит от порядка команд на входе", () => {
    const input = teams(50);
    const shuffled = [...input].reverse();

    expect(buildLayout(shuffled)).toEqual(buildLayout(input));
  });

  it("возвращает пустой результат для пустого списка", () => {
    expect(buildLayout([])).toEqual({ placements: [], overflow: [] });
  });
});
