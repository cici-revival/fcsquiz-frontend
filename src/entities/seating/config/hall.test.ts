import { describe, expect, it } from "vitest";

import { HALL, SEAT_SLOTS } from "./hall";

describe("SEAT_SLOTS", () => {
  it("содержит все столы зала", () => {
    expect(SEAT_SLOTS.length).toBe(106);
  });

  it("повторяет размеченные вручную первые ряды", () => {
    const byRow = new Map<number, number>();
    for (const slot of SEAT_SLOTS) {
      byRow.set(slot.row, (byRow.get(slot.row) ?? 0) + 1);
    }

    expect([byRow.get(1), byRow.get(2), byRow.get(3), byRow.get(4)]).toEqual([
      8, 10, 11, 11,
    ]);
  });

  it("даёт каждому столу уникальный id", () => {
    expect(new Set(SEAT_SLOTS.map((slot) => slot.id)).size).toBe(SEAT_SLOTS.length);
  });

  it("укладывается в границы зала", () => {
    for (const slot of SEAT_SLOTS) {
      expect(slot.x).toBeGreaterThanOrEqual(HALL.slotRadius);
      expect(slot.x).toBeLessThanOrEqual(HALL.width - HALL.slotRadius);
      expect(slot.y).toBeGreaterThanOrEqual(HALL.stageHeight);
      expect(slot.y).toBeLessThanOrEqual(HALL.height - HALL.slotRadius);
    }
  });

  it("не допускает наложения столов", () => {
    const minDistance = HALL.slotRadius * 2;

    for (let i = 0; i < SEAT_SLOTS.length; i += 1) {
      for (let j = i + 1; j < SEAT_SLOTS.length; j += 1) {
        const distance = Math.hypot(
          SEAT_SLOTS[i].x - SEAT_SLOTS[j].x,
          SEAT_SLOTS[i].y - SEAT_SLOTS[j].y,
        );

        expect(distance).toBeGreaterThan(minDistance);
      }
    }
  });

  it("нумерует столы в ряду слева направо", () => {
    const firstRow = SEAT_SLOTS.filter((slot) => slot.row === 1);

    for (let i = 1; i < firstRow.length; i += 1) {
      expect(firstRow[i].x).toBeGreaterThan(firstRow[i - 1].x);
      expect(firstRow[i].order).toBe(firstRow[i - 1].order + 1);
    }
  });
});
