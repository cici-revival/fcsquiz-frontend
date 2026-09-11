import { describe, expect, it } from "vitest";

import {
  FIXED_POINT_SPACING,
  FIXED_SLOT_POINTS,
  PACKED_TABLE,
  TABLE,
  TABLE_RING,
  getPackedTableRadius,
  getTableRadius,
} from "./hall";

describe("геометрия зала", () => {
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

  it("столы вне сетки мельче — им нужен видимый зазор", () => {
    expect(PACKED_TABLE.maxRadius).toBeLessThan(TABLE.maxRadius);
    expect(getPackedTableRadius(8)).toBeLessThan(getTableRadius(8));
  });

  it("радиус растёт с размером команды и упирается в границы", () => {
    expect(getTableRadius(0)).toBe(TABLE.minRadius);
    expect(getTableRadius(8)).toBe(TABLE.maxRadius);
    expect(getTableRadius(4)).toBeGreaterThan(getTableRadius(2));
  });
});
