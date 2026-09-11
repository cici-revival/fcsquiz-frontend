import { describe, expect, it } from "vitest";

import { buildLayout, type LayoutTeam } from "./buildLayout";
import {
  FIXED_SLOT_POINTS,
  HALL,
  HALL_GEOMETRY,
  getTableRadius,
  isInDeadZone,
  TABLE,
  TABLE_RING,
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
    expect(getTableRadius(0)).toBe(TABLE.minRadius);
  });

  it("не превышает максимум, заданный разметкой", () => {
    expect(getTableRadius(8)).toBe(TABLE.maxRadius);
    expect(getTableRadius(20)).toBe(TABLE.maxRadius);
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
        right > HALL_GEOMETRY.aisleLeft + 1 && left < HALL_GEOMETRY.aisleRight - 1;

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

    // Порог в абсолютных пикселях: раньше он был завязан на maxRadius и
    // «двигался» вместе с ним, маскируя реальное расползание раскладки.
    expect(lowestGenerated - lowestFixed).toBeLessThan(330);
  });

  it("не выпускает столы за границы зала", () => {
    const result = buildLayout(teams(FIXED_SLOT_POINTS.length + 40, 8));

    for (const { slot } of result.placements) {
      expect(slot.y + slot.radius).toBeLessThanOrEqual(HALL.height);
      expect(slot.x - slot.radius).toBeGreaterThanOrEqual(0);
      expect(slot.x + slot.radius).toBeLessThanOrEqual(HALL.width);
    }
  });

  it("не ставит столы в мёртвую зону под колонками", () => {
    const sizes = [8, 6, 4, 3, 2];
    const mixed = Array.from({ length: 80 }, (_, i) => ({
      teamId: `team-${String(i).padStart(3, "0")}`,
      size: sizes[i % sizes.length],
    }));

    const result = buildLayout(mixed);

    for (const { slot } of result.placements) {
      expect(isInDeadZone(slot.x, slot.y, slot.radius)).toBe(false);
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


  it("не сажает пул поверх уже занятых мест", () => {
    const teams = Array.from({ length: 12 }, (_, i) => ({
      teamId: `t${i}`,
      size: 8,
    }));

    // Половина уже сидит по своим координатам — алгоритм не должен ни
    // переставлять их, ни сажать остальных на эти места.
    const occupied = teams.slice(0, 6).map((team, i) => ({
      teamId: team.teamId,
      x: 300 + i * 95,
      y: 300,
      radius: 45,
    }));

    const result = buildLayout(teams, occupied);

    const placedIds = result.placements.map((p) => p.teamId);
    for (const circle of occupied) {
      expect(placedIds).not.toContain(circle.teamId);
    }

    for (const placement of result.placements) {
      for (const circle of occupied) {
        const distance = Math.hypot(
          placement.slot.x - circle.x,
          placement.slot.y - circle.y,
        );

        expect(distance).toBeGreaterThanOrEqual(
          placement.slot.radius + circle.radius - 1,
        );
      }
    }
  });

  it("раскладка влезает в зал и столы не слипаются", () => {
    const sizes = [
      8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8,
      8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 4, 4, 3, 3, 3, 3, 2,
    ];
    const result = buildLayout(
      sizes.map((size, index) => ({ teamId: `t${index}`, size })),
    );

    const lowest = Math.max(
      ...result.placements.map((placement) => placement.slot.y + placement.slot.radius),
    );

    expect(lowest).toBeLessThan(HALL.height - HALL_GEOMETRY.bottomMargin);
    expect(result.overflow).toHaveLength(0);

    const points = result.placements;
    const onGrid = new Set(
      FIXED_SLOT_POINTS.map((point) => `${point.x}:${point.y}`),
    );

    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        const distance = Math.hypot(
          points[a].slot.x - points[b].slot.x,
          points[a].slot.y - points[b].slot.y,
        );
        const gap =
          distance - points[a].slot.radius - points[b].slot.radius - TABLE_RING * 2;

        // Сетка у сцены намеренно плотная — там хватает отсутствия наложения.
        // Столам вне сетки нужен видимый зазор, иначе они читаются слипшимися.
        const bothOnGrid =
          onGrid.has(`${points[a].slot.x}:${points[a].slot.y}`) &&
          onGrid.has(`${points[b].slot.x}:${points[b].slot.y}`);

        expect(gap).toBeGreaterThan(bothOnGrid ? 0 : 6);
      }
    }
  });


});
