import {
  FIXED_SLOT_POINTS,
  getSeatingTop,
  getTableRadius,
  TABLE_GAP,
  type SeatSlot,
} from "../config/hall";
import { PINNED_SEATS, type PinnedSeat } from "../config/pinnedSeats";
import { assignRows } from "./assignRows";
import { teamNameDistance } from "./matchTeamName";
import type { LayoutTeam } from "./layoutTypes";
import { packRows } from "./packRows";
import { relaxPhysics } from "./relaxPhysics";
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
  pins: PinnedSeat[] = PINNED_SEATS,
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

  const pinned = placePinnedTeams(ordered, occupied, takenPoints, pins);
  const pinnedIds = new Set(pinned.map((circle) => circle.teamId));
  for (const circle of pinned) {
    takenPoints.add(`${circle.x}:${circle.y}`);
  }
  const free = ordered.filter((team) => !pinnedIds.has(team.teamId));

  const fixedPoints = orderFixedPoints().filter(
    (point) => !takenPoints.has(`${point.x}:${point.y}`),
  );
  const fixedCount = Math.min(fixedPoints.length, free.length);

  const fixed: PackedCircle[] = [
    ...pinned,
    ...free.slice(0, fixedCount).map((team, index) => ({
      teamId: team.teamId,
      x: fixedPoints[index].x,
      y: fixedPoints[index].y,
      radius: getTableRadius(team.size),
    })),
  ];

  const rest = free.slice(fixedCount);

  // Ряды начинаем ниже всего, что уже стоит: и вкоммиченной сетки, и столов,
  // которые админ поставил руками.
  const standing = [...fixed, ...occupied];
  const startY = standing.reduce(
    (lowest, circle) => Math.max(lowest, circle.y + circle.radius + TABLE_GAP),
    getSeatingTop(),
  );

  const rows = packRows(rest, startY);

  // Плотную укладку утрясаем физикой: столы расталкивают друг друга и
  // подстраиваются под соседей. Уже стоящие — препятствия, их не двигаем.
  const relaxed = relaxPhysics(rows.packed, standing);

  return {
    placements: withIdentifiers([...fixed, ...relaxed]),
    overflow: rows.overflow,
  };
}

function placePinnedTeams(
  teams: LayoutTeam[],
  occupied: PackedCircle[],
  takenPoints: Set<string>,
  pins: PinnedSeat[],
): PackedCircle[] {
  const placed: PackedCircle[] = [];
  const usedTeams = new Set<string>();

  for (const pin of pins) {
    const key = `${pin.point.x}:${pin.point.y}`;
    if (takenPoints.has(key)) continue;

    let best: { team: LayoutTeam; distance: number } | null = null;
    for (const team of teams) {
      if (!team.name || usedTeams.has(team.teamId)) continue;

      const distance = teamNameDistance(team.name, pin.teamName);
      if (distance === null) continue;
      if (!best || distance < best.distance) best = { team, distance };
    }
    if (!best) continue;

    const radius = getTableRadius(best.team.size);
    const blocked = occupied.some(
      (circle) =>
        Math.hypot(circle.x - pin.point.x, circle.y - pin.point.y) <
        circle.radius + radius,
    );
    if (blocked) continue;

    usedTeams.add(best.team.teamId);
    placed.push({ teamId: best.team.teamId, x: pin.point.x, y: pin.point.y, radius });
  }

  return placed;
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
