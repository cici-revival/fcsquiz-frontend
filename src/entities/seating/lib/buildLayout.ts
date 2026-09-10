import {
  FIXED_SLOT_POINTS,
  HALL_GEOMETRY,
  getTableRadius,
  type SeatSlot,
} from "../config/hall";
import { assignRows } from "./assignRows";
import type { LayoutTeam } from "./layoutTypes";
import { packSide, type PackedCircle } from "./packSide";
import { relaxCircles } from "./relaxCircles";

export type { LayoutTeam };

export type LayoutPlacement = {
  teamId: string;
  slot: SeatSlot;
};

export type BuildLayoutResult = {
  placements: LayoutPlacement[];
  overflow: LayoutTeam[];
};

export function buildLayout(teams: LayoutTeam[]): BuildLayoutResult {
  const ordered = [...teams].sort(
    (a, b) => b.size - a.size || a.teamId.localeCompare(b.teamId),
  );

  const fixedPoints = orderFixedPoints();
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
  const { left, right } = splitBySide(rest);

  const leftObstacles = fixed.filter((circle) => onSide(circle, true));
  const rightObstacles = fixed.filter((circle) => onSide(circle, false));

  const leftPack = packSide(left, { isLeft: true }, leftObstacles);
  const rightPack = packSide(right, { isLeft: false }, rightObstacles);

  const leftPacked = relaxCircles(leftPack.packed, leftObstacles, true);
  const rightPacked = relaxCircles(rightPack.packed, rightObstacles, false);

  return {
    placements: withIdentifiers([...fixed, ...leftPacked, ...rightPacked]),
    overflow: [...leftPack.overflow, ...rightPack.overflow],
  };
}

function onSide(circle: PackedCircle, isLeft: boolean): boolean {
  const middle = (HALL_GEOMETRY.aisleLeft + HALL_GEOMETRY.aisleRight) / 2;
  const overlapsLeft = circle.x - circle.radius < middle;
  const overlapsRight = circle.x + circle.radius > middle;

  return isLeft ? overlapsLeft : overlapsRight;
}

function splitBySide(teams: LayoutTeam[]): {
  left: LayoutTeam[];
  right: LayoutTeam[];
} {
  const left: LayoutTeam[] = [];
  const right: LayoutTeam[] = [];

  let leftLoad = 0;
  let rightLoad = 0;

  for (const team of teams) {
    const load = getTableRadius(team.size) ** 2;

    if (leftLoad <= rightLoad) {
      left.push(team);
      leftLoad += load;
    } else {
      right.push(team);
      rightLoad += load;
    }
  }

  return { left, right };
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
