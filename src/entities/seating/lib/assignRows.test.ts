import { describe, expect, it } from "vitest";

import { assignRows } from "./assignRows";
import type { SeatSlot } from "../config/hall";

function slot(x: number, y: number): SeatSlot {
  return { id: "", x, y, row: 0, order: 0 };
}

describe("assignRows", () => {
  it("собирает слоты в ряды и нумерует слева направо", () => {
    const result = assignRows([slot(300, 100), slot(100, 100), slot(200, 100)]);

    expect(result.map((s) => s.id)).toEqual(["A1", "A2", "A3"]);
    expect(result.map((s) => s.x)).toEqual([100, 200, 300]);
  });

  it("разделяет ряды по расстоянию между ними", () => {
    const result = assignRows([slot(100, 100), slot(100, 400), slot(200, 400)]);

    expect(result.map((s) => s.id)).toEqual(["A1", "B1", "B2"]);
    expect(result.map((s) => s.row)).toEqual([1, 2, 2]);
  });

  it("терпит разброс по вертикали внутри ряда", () => {
    const result = assignRows([slot(100, 100), slot(200, 118), slot(300, 92)]);

    expect(result.every((s) => s.row === 1)).toBe(true);
    expect(result.map((s) => s.order)).toEqual([1, 2, 3]);
  });

  it("нумерует ряды сверху вниз, первый ряд ближе к сцене", () => {
    const result = assignRows([slot(100, 500), slot(100, 100)]);

    expect(result.find((s) => s.y === 100)?.row).toBe(1);
    expect(result.find((s) => s.y === 500)?.row).toBe(2);
  });

  it("возвращает пустой массив для пустого входа", () => {
    expect(assignRows([])).toEqual([]);
  });

  it("не мутирует исходный массив", () => {
    const input = [slot(300, 100), slot(100, 100)];
    const before = input.map((s) => s.x);

    assignRows(input);

    expect(input.map((s) => s.x)).toEqual(before);
  });
});
