import { HALL } from "../config/hall";
import type { SeatingPosition } from "../types";

type ClientPoint = {
  clientX: number;
  clientY: number;
};

type Rect = {
  left: number;
  top: number;
};

export function clientToField(
  point: ClientPoint,
  rect: Rect,
  scale: number,
): SeatingPosition {
  return {
    x: (point.clientX - rect.left) / scale,
    y: (point.clientY - rect.top) / scale,
  };
}

export function getFieldScale(containerWidth: number): number {
  if (containerWidth <= 0) {
    return 1;
  }

  return Math.min(containerWidth / HALL.width, 1);
}

export function clampToField(position: SeatingPosition): SeatingPosition {
  return {
    x: Math.min(Math.max(position.x, 0), HALL.width),
    y: Math.min(Math.max(position.y, 0), HALL.height),
  };
}

export function snapToGrid(position: SeatingPosition, step: number): SeatingPosition {
  return {
    x: Math.round(position.x / step) * step,
    y: Math.round(position.y / step) * step,
  };
}
