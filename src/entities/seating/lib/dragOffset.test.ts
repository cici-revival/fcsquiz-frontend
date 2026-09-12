import { describe, expect, it } from "vitest";

import { applyGrabOffset, getGrabOffset } from "./dragOffset";

describe("getGrabOffset", () => {
  it("считает смещение от центра стола", () => {
    expect(getGrabOffset({ x: 110, y: 205 }, { x: 100, y: 200 })).toEqual({
      x: 10,
      y: 5,
    });
  });

  it("без данных возвращает нулевое смещение", () => {
    expect(getGrabOffset(null, { x: 100, y: 200 })).toEqual({ x: 0, y: 0 });
    expect(getGrabOffset({ x: 1, y: 2 }, null)).toEqual({ x: 0, y: 0 });
  });
});

describe("applyGrabOffset", () => {
  it("стол не прыгает: при нулевом движении центр остаётся на месте", () => {
    const center = { x: 100, y: 200 };
    const cursor = { x: 110, y: 205 };
    const grab = getGrabOffset(cursor, center);

    expect(applyGrabOffset(cursor, grab)).toEqual(center);
  });

  it("центр смещается ровно на столько, на сколько уехал курсор", () => {
    const center = { x: 100, y: 200 };
    const grab = getGrabOffset({ x: 110, y: 205 }, center);

    expect(applyGrabOffset({ x: 150, y: 225 }, grab)).toEqual({ x: 140, y: 220 });
  });

  it("без смещения стол встаёт центром под курсор", () => {
    expect(applyGrabOffset({ x: 150, y: 225 }, { x: 0, y: 0 })).toEqual({
      x: 150,
      y: 225,
    });
  });
});
