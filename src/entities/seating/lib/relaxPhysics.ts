import {
  HALL_GEOMETRY,
  getHallBounds,
  getSeatingTop,
  TABLE_GAP,
  TABLE_RING,
} from "../config/hall";
import type { PackedCircle } from "./layoutTypes";

/**
 * Физическая утряска: столы расталкивают друг друга, пока не перестанут
 * пересекаться. В отличие от жёсткой сетки, рассадка получается «живой» —
 * столы подстраиваются под соседей по размеру, а не стоят по линейке.
 *
 * Отличие от простого затухания: расталкиваем оба круга симметрично и
 * повторяем, пока пересечения не кончатся, а не фиксированное число шагов
 * с коэффициентом — иначе круги успокаиваются, не добрав зазор.
 */

const MAX_ITERATIONS = 400;
/** Доля перекрытия, которую гасим за один шаг. 0.5 на каждый из двух кругов. */
const PUSH = 0.5;

type Movable = PackedCircle;

/** Минимальное расстояние между центрами с учётом зазора и колец. */
function minDistance(a: PackedCircle, b: PackedCircle): number {
  return a.radius + b.radius + TABLE_GAP + TABLE_RING * 2;
}

function clampToHall(circle: Movable): boolean {
  const hall = getHallBounds(circle.y);
  const middle = (HALL_GEOMETRY.aisle.left + HALL_GEOMETRY.aisle.right) / 2;
  const isLeft = circle.x <= middle;

  const from = (isLeft ? hall.left : HALL_GEOMETRY.aisle.right) + circle.radius;
  const to = (isLeft ? HALL_GEOMETRY.aisle.left : hall.right) - circle.radius;
  const top = getSeatingTop() + circle.radius;

  let moved = false;

  if (circle.x < from) {
    circle.x = from;
    moved = true;
  }

  if (circle.x > to) {
    circle.x = to;
    moved = true;
  }

  if (circle.y < top) {
    circle.y = top;
    moved = true;
  }

  return moved;
}

export function relaxPhysics(
  circles: PackedCircle[],
  frozen: PackedCircle[] = [],
): PackedCircle[] {
  const moving: Movable[] = circles.map((circle) => ({ ...circle }));

  for (let step = 0; step < MAX_ITERATIONS; step += 1) {
    let collided = false;

    for (let i = 0; i < moving.length; i += 1) {
      const a = moving[i];

      // Столы, которые уже стоят (сетка, ручная посадка), не двигаем —
      // расталкиваем только то, что расставляем сами.
      for (const other of frozen) {
        const dx = a.x - other.x;
        const dy = a.y - other.y;
        const distance = Math.hypot(dx, dy);
        const needed = minDistance(a, other);

        if (distance >= needed || distance === 0) continue;

        collided = true;
        const overlap = needed - distance;
        a.x += (dx / distance) * overlap;
        a.y += (dy / distance) * overlap;
      }

      for (let j = i + 1; j < moving.length; j += 1) {
        const b = moving[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        const needed = minDistance(a, b);

        if (distance >= needed) continue;

        collided = true;

        if (distance === 0) {
          // Совпавшие центры разводим по горизонтали, иначе делить на ноль.
          a.x -= needed / 2;
          b.x += needed / 2;
          continue;
        }

        const overlap = (needed - distance) * PUSH;
        const nx = dx / distance;
        const ny = dy / distance;

        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
      }

      if (clampToHall(a)) {
        collided = true;
      }
    }

    if (!collided) break;
  }

  return moving.map(({ teamId, x, y, radius }) => ({
    teamId,
    x: Math.round(x),
    y: Math.round(y),
    radius,
  }));
}
