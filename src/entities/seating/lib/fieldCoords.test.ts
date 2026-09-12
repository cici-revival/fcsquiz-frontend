import { describe, expect, it } from "vitest";

import { clampToField, clientToField, getFieldScale, snapToGrid } from "./fieldCoords";
import { HALL } from "../config/hall";

describe("clientToField", () => {
  it("переводит координаты курсора в координаты поля без масштаба", () => {
    const result = clientToField({ clientX: 150, clientY: 220 }, { left: 50, top: 20 }, 1);

    expect(result).toEqual({ x: 100, y: 200 });
  });

  it("делит на масштаб, а не умножает", () => {
    const result = clientToField({ clientX: 100, clientY: 100 }, { left: 0, top: 0 }, 0.5);

    expect(result).toEqual({ x: 200, y: 200 });
  });

  it("учитывает смещение контейнера при масштабе", () => {
    const result = clientToField({ clientX: 260, clientY: 160 }, { left: 60, top: 60 }, 0.5);

    expect(result).toEqual({ x: 400, y: 200 });
  });
});

describe("getFieldScale", () => {
  it("уменьшает поле, если контейнер уже зала", () => {
    expect(getFieldScale(HALL.width / 2)).toBeCloseTo(0.5);
  });

  it("не увеличивает поле сверх натуральной величины", () => {
    expect(getFieldScale(HALL.width * 3)).toBe(1);
  });

  it("возвращает 1 для нулевой ширины", () => {
    expect(getFieldScale(0)).toBe(1);
  });
});

describe("clampToField", () => {
  it("прижимает координаты к границам зала", () => {
    expect(clampToField({ x: -30, y: HALL.height + 500 })).toEqual({
      x: 0,
      y: HALL.height,
    });
  });

  it("не трогает координаты внутри зала", () => {
    expect(clampToField({ x: 100, y: 200 })).toEqual({ x: 100, y: 200 });
  });
});

describe("snapToGrid", () => {
  it("округляет к ближайшему узлу сетки", () => {
    expect(snapToGrid({ x: 103, y: 117 }, 10)).toEqual({ x: 100, y: 120 });
  });
});
