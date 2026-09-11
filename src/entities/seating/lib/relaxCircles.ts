import {
  DEAD_ZONE,
  HALL,
  HALL_GEOMETRY,
  getHallBounds,
  isInDeadZone,
  getSeatingTop,
} from "../config/hall";
import { PACK_MARGIN, type PackedCircle } from "./packSide";

const ITERATIONS = 600;
// Разводим почти на всю величину перекрытия: при 0.5 круги успокаивались, не
// добрав зазор до PACK_MARGIN, и визуально слипались.
const REPULSION = 0.9;
const STAGE_PULL = 0.05;
const SETTLE_EPSILON = 0.5;

export function relaxCircles(
  circles: PackedCircle[],
  frozen: PackedCircle[],
  isLeft: boolean,
): PackedCircle[] {
  const moving = circles.map((circle) => ({ ...circle }));

  for (let step = 0; step < ITERATIONS; step += 1) {
    let settled = true;

    for (const circle of moving) {
      const pull = pullToStage(circle);

      if (pull) {
        settled = false;
      }

      for (const other of moving) {
        if (other !== circle && separate(circle, other, true)) {
          settled = false;
        }
      }

      for (const other of frozen) {
        if (separate(circle, other, false)) {
          settled = false;
        }
      }

      if (clampToHall(circle, isLeft)) {
        settled = false;
      }

      if (pushOutOfDeadZone(circle)) {
        settled = false;
      }
    }

    if (settled) {
      break;
    }
  }

  resolveStuck(moving, frozen, isLeft);

  return moving.map((circle) => ({
    ...circle,
    x: Math.round(circle.x),
    y: Math.round(circle.y),
  }));
}

function pullToStage(circle: PackedCircle): boolean {
  const target = getSeatingTop() + PACK_MARGIN + circle.radius;

  if (circle.y <= target) {
    return false;
  }

  circle.y -= (circle.y - target) * STAGE_PULL;

  return true;
}

function separate(
  circle: PackedCircle,
  other: PackedCircle,
  otherIsMoving: boolean,
): boolean {
  const dx = circle.x - other.x;
  const dy = circle.y - other.y;
  const distance = Math.hypot(dx, dy);
  const minDistance = circle.radius + other.radius + PACK_MARGIN;

  if (distance >= minDistance - SETTLE_EPSILON || distance === 0) {
    return false;
  }

  const overlap = minDistance - distance;
  const share = otherIsMoving ? 0.5 : 1;
  const nx = dx / distance;
  const ny = dy / distance;

  circle.x += nx * overlap * REPULSION * share;
  circle.y += ny * overlap * REPULSION * share;

  return true;
}

function pushOutOfDeadZone(circle: PackedCircle): boolean {
  if (!isInDeadZone(circle.x, circle.y, circle.radius)) {
    return false;
  }

  circle.y = DEAD_ZONE.bottom + circle.radius;

  return true;
}

function clampToHall(circle: PackedCircle, isLeft: boolean): boolean {
  const hall = getHallBounds(circle.y);
  const from = isLeft ? hall.left : HALL_GEOMETRY.aisleRight;
  const to = isLeft ? HALL_GEOMETRY.aisleLeft : hall.right;

  let adjusted = false;

  if (circle.x - circle.radius < from) {
    circle.x = from + circle.radius;
    adjusted = true;
  }

  if (circle.x + circle.radius > to) {
    circle.x = to - circle.radius;
    adjusted = true;
  }

  const topLimit = getSeatingTop() + PACK_MARGIN + circle.radius;
  const bottomLimit = HALL.height - HALL_GEOMETRY.bottomMargin - circle.radius;

  if (circle.y < topLimit) {
    circle.y = topLimit;
    adjusted = true;
  }

  if (circle.y > bottomLimit) {
    circle.y = bottomLimit;
    adjusted = true;
  }

  return adjusted;
}

function resolveStuck(
  moving: PackedCircle[],
  frozen: PackedCircle[],
  isLeft: boolean,
): void {
  for (const circle of moving) {
    const others = [...frozen, ...moving.filter((other) => other !== circle)];

    if (!overlapsAny(circle, others)) {
      continue;
    }

    const spot = findFreeSpot(circle, others, isLeft);

    if (spot) {
      circle.x = spot.x;
      circle.y = spot.y;
    }
  }
}

function overlapsAny(circle: PackedCircle, others: PackedCircle[]): boolean {
  return others.some((other) => {
    const distance = Math.hypot(circle.x - other.x, circle.y - other.y);

    return distance < circle.radius + other.radius + PACK_MARGIN - SETTLE_EPSILON;
  });
}

function findFreeSpot(
  circle: PackedCircle,
  others: PackedCircle[],
  isLeft: boolean,
): { x: number; y: number } | null {
  const step = 8;
  const bottom = HALL.height - HALL_GEOMETRY.bottomMargin - circle.radius;

  for (let y = circle.y; y <= bottom; y += step) {
    const hall = getHallBounds(y);
    const from = (isLeft ? hall.left : HALL_GEOMETRY.aisleRight) + circle.radius;
    const to = (isLeft ? HALL_GEOMETRY.aisleLeft : hall.right) - circle.radius;

    for (let x = from; x <= to; x += step) {
      const candidate = { ...circle, x, y };

      if (isInDeadZone(x, y, circle.radius)) {
        continue;
      }

      if (!overlapsAny(candidate, others)) {
        return { x, y };
      }
    }
  }

  return null;
}
