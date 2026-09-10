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

export const ZOOM_LEVELS = [0.75, 1, 1.5, 2] as const;

export function getFieldScale(containerWidth: number, zoom = 1): number {
  if (containerWidth <= 0) {
    return zoom;
  }

  return Math.min(containerWidth / HALL.width, 1) * zoom;
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
