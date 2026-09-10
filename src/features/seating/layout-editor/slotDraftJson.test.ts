import { describe, expect, it } from "vitest";

import { parseSlots, serializeSlots } from "./slotDraftJson";
import type { SeatSlot } from "@entities/seating/config/hall";

const slots: SeatSlot[] = [
  { id: "A1", x: 100, y: 100, row: 1, order: 1, radius: 30 },
  { id: "A2", x: 300, y: 100, row: 1, order: 2, radius: 30 },
];

describe("serializeSlots", () => {
  it("выдаёт литерал, готовый к вставке в код", () => {
    const result = serializeSlots(slots);

    expect(result).toContain("{ x: 100, y: 100 },");
    expect(result.startsWith("[")).toBe(true);
    expect(result.endsWith("]")).toBe(true);
  });
});

describe("parseSlots", () => {
  it("читает собственный формат обратно", () => {
    const result = parseSlots(serializeSlots(slots));

    expect(result.map((slot) => [slot.x, slot.y])).toEqual([
      [100, 100],
      [300, 100],
    ]);
  });

  it("читает обычный JSON", () => {
    const result = parseSlots('[{"x": 10, "y": 20}, {"x": 30, "y": 20}]');

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("A1");
  });

  it("перенумеровывает слоты при загрузке", () => {
    const result = parseSlots('[{"x": 300, "y": 20}, {"x": 100, "y": 20}]');

    expect(result.map((slot) => slot.id)).toEqual(["A1", "A2"]);
    expect(result.map((slot) => slot.x)).toEqual([100, 300]);
  });

  it("округляет дробные координаты", () => {
    const result = parseSlots('[{"x": 10.6, "y": 20.2}]');

    expect(result[0]).toMatchObject({ x: 11, y: 20 });
  });

  it("сообщает об ошибке, если координат нет", () => {
    expect(() => parseSlots("совсем не разметка")).toThrow();
  });
});
