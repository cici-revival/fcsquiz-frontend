import { describe, expect, it } from "vitest";

import { findSlotAt, SNAP_TOLERANCE } from "./snapToSlot";
import type { SeatSlot } from "../config/hall";

const slots: SeatSlot[] = [
  { id: "A1", x: 100, y: 100, row: 1, order: 1, radius: 30 },
  { id: "A2", x: 300, y: 100, row: 1, order: 2, radius: 30 },
  { id: "B1", x: 100, y: 300, row: 2, order: 1, radius: 30 },
];

describe("findSlotAt", () => {
  it("находит слот по точному совпадению координат", () => {
    expect(findSlotAt({ x: 300, y: 100 }, slots)?.id).toBe("A2");
  });

  it("находит слот при смещении в пределах допуска", () => {
    expect(findSlotAt({ x: 120, y: 115 }, slots)?.id).toBe("A1");
  });

  it("возвращает null, если ближайший слот дальше допуска", () => {
    expect(findSlotAt({ x: 200, y: 200 }, slots)).toBeNull();
  });

  it("возвращает null для пустого набора слотов", () => {
    expect(findSlotAt({ x: 100, y: 100 }, [])).toBeNull();
  });

  it("при равном расстоянии выбирает первый по порядку", () => {
    const middle = { x: 200, y: 100 };
    const wide: SeatSlot[] = [
      { id: "A1", x: 190, y: 100, row: 1, order: 1, radius: 30 },
      { id: "A2", x: 210, y: 100, row: 1, order: 2, radius: 30 },
    ];

    expect(findSlotAt(middle, wide)?.id).toBe("A1");
  });

  it("считает границу допуска включительно", () => {
    const position = { x: 100 + SNAP_TOLERANCE, y: 100 };

    expect(findSlotAt(position, slots)?.id).toBe("A1");
  });
});
