import {
  FIXED_SLOT_POINTS,
  getSeatingTop,
  getTableRadius,
  TABLE_GAP,
  type SeatSlot,
} from "../config/hall";
import { assignRows } from "./assignRows";
import type { LayoutTeam } from "./layoutTypes";
import { packRows } from "./packRows";
import type { PackedCircle } from "./layoutTypes";

export type { LayoutTeam };

export type LayoutPlacement = {
  teamId: string;
  slot: SeatSlot;
};

export type BuildLayoutResult = {
  placements: LayoutPlacement[];
  overflow: LayoutTeam[];
};

export function buildLayout(
  teams: LayoutTeam[],
  occupied: PackedCircle[] = [],
): BuildLayoutResult {
  // Уже посаженные столы стоят по своим координатам, а не по слотам алгоритма.
  // Их нужно и исключить из расстановки, и передать как препятствия — иначе
  // алгоритм посадит пул на места, которые на самом деле заняты.
  const occupiedIds = new Set(occupied.map((circle) => circle.teamId));

  const ordered = [...teams]
    .filter((team) => !occupiedIds.has(team.teamId))
    .sort((a, b) => b.size - a.size || a.teamId.localeCompare(b.teamId));

  const takenPoints = new Set<string>();
  for (const circle of occupied) {
    for (const point of FIXED_SLOT_POINTS) {
      if (Math.hypot(point.x - circle.x, point.y - circle.y) < circle.radius) {
        takenPoints.add(`${point.x}:${point.y}`);
      }
    }
  }

  const fixedPoints = orderFixedPoints().filter(
    (point) => !takenPoints.has(`${point.x}:${point.y}`),
  );
  const fixedCount = Math.min(fixedPoints.length, ordered.length);

  const fixed: PackedCircle[] = ordered
    .slice(0, fixedCount)
    .map((team, index) => ({
      teamId: team.teamId,
      x: fixedPoints[index].x,
      y: fixedPoints[index].y,
      radius: getTableRadius(team.size),
    }));

  const rest = ordered.slice(fixedCount);

  // Ряды начинаем ниже всего, что уже стоит: и вкоммиченной сетки, и столов,
  // которые админ поставил руками.
  const standing = [...fixed, ...occupied];
  const startY = standing.reduce(
    (lowest, circle) => Math.max(lowest, circle.y + circle.radius + TABLE_GAP),
    getSeatingTop(),
  );

  const rows = packRows(rest, startY);

  return {
    placements: withIdentifiers([...fixed, ...rows.packed]),
    overflow: rows.overflow,
  };
}

function orderFixedPoints(): { x: number; y: number }[] {
  return [...FIXED_SLOT_POINTS].sort((a, b) => a.y - b.y || a.x - b.x);
}

function withIdentifiers(circles: PackedCircle[]): LayoutPlacement[] {
  const numbered = assignRows(
    circles.map((circle) => ({
      id: "",
      x: circle.x,
      y: circle.y,
      row: 0,
      order: 0,
      radius: circle.radius,
    })),
  );

  const byPosition = new Map(
    numbered.map((slot) => [`${slot.x}:${slot.y}`, slot]),
  );

  return circles.map((circle) => {
    const slot = byPosition.get(`${circle.x}:${circle.y}`);

    return {
      teamId: circle.teamId,
      slot: slot ?? {
        id: "",
        x: circle.x,
        y: circle.y,
        row: 0,
        order: 0,
        radius: circle.radius,
      },
    };
  });
}
