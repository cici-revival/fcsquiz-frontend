import {
  FIXED_SLOT_POINTS,
  HALL,
  HALL_GEOMETRY,
  TABLE,
  getTableRadius,
  type SeatSlot,
} from "../config/hall";
import { assignRows } from "./assignRows";

export type LayoutTeam = {
  teamId: string;
  size: number;
};

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

  const fixed = orderFixedPoints();
  const placements: LayoutPlacement[] = [];

  const fixedCount = Math.min(fixed.length, ordered.length);

  for (let index = 0; index < fixedCount; index += 1) {
    const team = ordered[index];
    const point = fixed[index];

    placements.push({
      teamId: team.teamId,
      slot: {
        id: "",
        x: point.x,
        y: point.y,
        row: 0,
        order: 0,
        radius: getTableRadius(team.size),
      },
    });
  }

  const rest = ordered.slice(fixedCount);
  const startY = fixed.length > 0 ? lowestFixedY(fixed) : HALL.stageHeight;
  const { placed, overflow } = flowRemaining(rest, startY);

  return {
    placements: withIdentifiers([...placements, ...placed]),
    overflow,
  };
}

function orderFixedPoints(): { x: number; y: number }[] {
  return [...FIXED_SLOT_POINTS].sort((a, b) => a.y - b.y || a.x - b.x);
}

function lowestFixedY(points: { x: number; y: number }[]): number {
  let lowest: number = HALL.stageHeight;

  for (const point of points) {
    lowest = Math.max(lowest, point.y);
  }

  return lowest;
}

function flowRemaining(
  teams: LayoutTeam[],
  startY: number,
): { placed: LayoutPlacement[]; overflow: LayoutTeam[] } {
  const placed: LayoutPlacement[] = [];
  const queue = [...teams];

  let previousRowBottom = startY + maxFixedRadius();

  while (queue.length > 0) {
    const row = takeRow(queue);

    if (row.length === 0) {
      break;
    }

    const rowRadius = Math.max(...row.map((team) => getTableRadius(team.size)));
    const centerY = previousRowBottom + HALL_GEOMETRY.rowGap + rowRadius;

    if (centerY + rowRadius > HALL.height - HALL_GEOMETRY.bottomMargin) {
      return { placed, overflow: row.concat(queue) };
    }

    placeRow(row, centerY, placed);
    previousRowBottom = centerY + rowRadius;
  }

  return { placed, overflow: [] };
}

function maxFixedRadius(): number {
  return TABLE.baseRadius + 8 * TABLE.radiusPerPlayer;
}

function takeRow(queue: LayoutTeam[]): LayoutTeam[] {
  const leftWidth = HALL_GEOMETRY.aisleLeft - HALL_GEOMETRY.marginLeft;
  const rightWidth = HALL_GEOMETRY.marginRight - HALL_GEOMETRY.aisleRight;

  const left = takeSide(queue, leftWidth);
  const right = takeSide(queue, rightWidth);

  return [...left, ...right];
}

function takeSide(queue: LayoutTeam[], available: number): LayoutTeam[] {
  const side: LayoutTeam[] = [];
  let used = 0;

  while (queue.length > 0) {
    const width = getTableRadius(queue[0].size) * 2;
    const next = used === 0 ? width : used + TABLE.gap + width;

    if (next > available) {
      break;
    }

    used = next;
    side.push(queue.shift() as LayoutTeam);
  }

  return side;
}

function placeRow(row: LayoutTeam[], centerY: number, placed: LayoutPlacement[]) {
  const leftWidth = HALL_GEOMETRY.aisleLeft - HALL_GEOMETRY.marginLeft;
  const half = splitBySide(row, leftWidth);

  layoutSide(half.left, HALL_GEOMETRY.marginLeft, HALL_GEOMETRY.aisleLeft, centerY, placed);
  layoutSide(half.right, HALL_GEOMETRY.aisleRight, HALL_GEOMETRY.marginRight, centerY, placed);
}

function splitBySide(row: LayoutTeam[], leftWidth: number) {
  const left: LayoutTeam[] = [];
  const right: LayoutTeam[] = [];
  let used = 0;

  for (const team of row) {
    const width = getTableRadius(team.size) * 2;
    const next = used === 0 ? width : used + TABLE.gap + width;

    if (next <= leftWidth && right.length === 0) {
      used = next;
      left.push(team);
    } else {
      right.push(team);
    }
  }

  return { left, right };
}

function layoutSide(
  teams: LayoutTeam[],
  from: number,
  to: number,
  centerY: number,
  placed: LayoutPlacement[],
) {
  if (teams.length === 0) {
    return;
  }

  const totalWidth = teams.reduce(
    (sum, team, index) =>
      sum + getTableRadius(team.size) * 2 + (index > 0 ? TABLE.gap : 0),
    0,
  );

  let cursor = from + (to - from - totalWidth) / 2;

  for (const team of teams) {
    const radius = getTableRadius(team.size);

    placed.push({
      teamId: team.teamId,
      slot: {
        id: "",
        x: Math.round(cursor + radius),
        y: Math.round(centerY),
        row: 0,
        order: 0,
        radius,
      },
    });

    cursor += radius * 2 + TABLE.gap;
  }
}

function withIdentifiers(placements: LayoutPlacement[]): LayoutPlacement[] {
  const numbered = assignRows(placements.map((placement) => placement.slot));

  return placements.map((placement, index) => ({
    teamId: placement.teamId,
    slot: numbered[index] ?? placement.slot,
  }));
}
