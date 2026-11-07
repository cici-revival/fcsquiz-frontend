import { describe, expect, it } from "vitest";

import {
  BALCONY,
  BALCONY_SLOT_POINTS,
  FIXED_POINT_SPACING,
  FIXED_SLOT_POINTS,
  HALL,
  HALL_GEOMETRY,
  PACKED_TABLE,
  TABLE,
  TABLE_RING,
  getHallBounds,
  getPackedTableRadius,
  getTableRadius,
} from "./hall";

describe("геометрия зала", () => {
  it("задаёт на балконе ровно 15 фиксированных мест", () => {
    expect(BALCONY_SLOT_POINTS).toHaveLength(15);

    for (const point of BALCONY_SLOT_POINTS) {
      expect(point.x).toBeGreaterThan(BALCONY.left);
      expect(point.x).toBeLessThan(BALCONY.right);
      expect(point.y).toBe(BALCONY.seatY);
    }
  });

  it("внешний контур и проход симметричны относительно центра поля", () => {
    const center = HALL.width / 2;

    expect((HALL_GEOMETRY.aisle.left + HALL_GEOMETRY.aisle.right) / 2).toBe(center);

    for (const y of [
      HALL_GEOMETRY.top.y,
      HALL_GEOMETRY.lowerGuide.y,
      HALL.height,
    ]) {
      const bounds = getHallBounds(y);

      expect(center - bounds.left).toBeCloseTo(bounds.right - center);
    }
  });

  it("продолжает расширять трапецию ниже нижней опорной линии", () => {
    const { top, lowerGuide } = HALL_GEOMETRY;

    expect(getHallBounds(top.y)).toEqual({ left: top.left, right: top.right });
    expect(getHallBounds(lowerGuide.y)).toEqual({
      left: lowerGuide.left,
      right: lowerGuide.right,
    });

    const below = getHallBounds(lowerGuide.y + 100);

    expect(below.left).toBeLessThan(lowerGuide.left);
    expect(below.right).toBeGreaterThan(lowerGuide.right);
  });

  it("FIXED_POINT_SPACING совпадает с реальным минимумом между точками", () => {
    let min = Infinity;

    for (let a = 0; a < FIXED_SLOT_POINTS.length; a += 1) {
      for (let b = a + 1; b < FIXED_SLOT_POINTS.length; b += 1) {
        const distance = Math.hypot(
          FIXED_SLOT_POINTS[a].x - FIXED_SLOT_POINTS[b].x,
          FIXED_SLOT_POINTS[a].y - FIXED_SLOT_POINTS[b].y,
        );

        min = Math.min(min, distance);
      }
    }

    expect(min).toBeCloseTo(FIXED_POINT_SPACING, 1);
  });

  it("два крупных стола помещаются на соседних точках сетки", () => {
    // Сетка у сцены расставлена вручную под реальный зал и намеренно плотная:
    // здесь достаточно, чтобы столы не налезали друг на друга с учётом кольца.
    const gap = FIXED_POINT_SPACING - TABLE.maxRadius * 2 - TABLE_RING * 2;

    expect(gap).toBeGreaterThan(0);
  });

  it("шкала радиусов одна: размер стола не зависит от способа расстановки", () => {
    // Иначе команда, сохранённая по координатам одной раскладки, после смены
    // состава рисовалась бы радиусом другой — и наезжала на соседей.
    expect(PACKED_TABLE.maxRadius).toBe(TABLE.maxRadius);
    expect(getPackedTableRadius(8)).toBe(getTableRadius(8));
    expect(getPackedTableRadius(3)).toBe(getTableRadius(3));
  });

  it("радиус растёт с размером команды и упирается в границы", () => {
    expect(getTableRadius(0)).toBe(TABLE.minRadius);
    expect(getTableRadius(8)).toBe(TABLE.maxRadius);
    expect(getTableRadius(4)).toBeGreaterThan(getTableRadius(2));
  });
});
