import {
  HALL,
  HALL_GEOMETRY,
  getHallBounds,
  isInDeadZone,
  getSeatingTop,
} from "../config/hall";
import { PACK_MARGIN, type PackedCircle } from "./packSide";

const SEARCH_STEP = 6;
const MAX_SEARCH_RADIUS = 400;

export function resolveDrop(
  circle: PackedCircle,
  target: { x: number; y: number },
  others: PackedCircle[],
): { x: number; y: number } {
  const clamped = clampToHall(target, circle.radius);

  if (isFree(clamped, circle.radius, others)) {
    return clamped;
  }

  return findNearestFree(clamped, circle.radius, others) ?? { x: circle.x, y: circle.y };
}

function clampToHall(
  point: { x: number; y: number },
  radius: number,
): { x: number; y: number } {
  const hall = getHallBounds(point.y);

  const y = Math.min(
    Math.max(point.y, getSeatingTop() + PACK_MARGIN + radius),
    HALL.height - HALL_GEOMETRY.bottomMargin - radius,
  );

  const middle = (HALL_GEOMETRY.aisleLeft + HALL_GEOMETRY.aisleRight) / 2;
  const isLeft = point.x <= middle;

  const from = (isLeft ? hall.left : HALL_GEOMETRY.aisleRight) + radius;
  const to = (isLeft ? HALL_GEOMETRY.aisleLeft : hall.right) - radius;

  return { x: Math.min(Math.max(point.x, from), to), y };
}

function isFree(
  point: { x: number; y: number },
  radius: number,
  others: PackedCircle[],
): boolean {
  if (isInDeadZone(point.x, point.y, radius)) {
    return false;
  }

  return others.every((other) => {
    const distance = Math.hypot(other.x - point.x, other.y - point.y);

    return distance >= other.radius + radius + PACK_MARGIN;
  });
}

function findNearestFree(
  point: { x: number; y: number },
  radius: number,
  others: PackedCircle[],
): { x: number; y: number } | null {
  for (let ring = SEARCH_STEP; ring <= MAX_SEARCH_RADIUS; ring += SEARCH_STEP) {
    const steps = Math.max(8, Math.round((2 * Math.PI * ring) / SEARCH_STEP));

    for (let index = 0; index < steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      const candidate = clampToHall(
        {
          x: point.x + Math.cos(angle) * ring,
          y: point.y + Math.sin(angle) * ring,
        },
        radius,
      );

      if (isFree(candidate, radius, others)) {
        return candidate;
      }
    }
  }

  return null;
}
