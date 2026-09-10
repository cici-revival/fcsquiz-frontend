import {
  HALL,
  HALL_GEOMETRY,
  getHallBounds,
  getTableRadius,
  isInDeadZone,
} from "../config/hall";
import type { LayoutTeam } from "./layoutTypes";

export type PackedCircle = {
  teamId: string;
  x: number;
  y: number;
  radius: number;
};

export const PACK_MARGIN = 2;
const SCAN_STEP = 6;

export type SideBounds = {
  isLeft: boolean;
};

export function packSide(
  teams: LayoutTeam[],
  side: SideBounds,
  obstacles: PackedCircle[] = [],
): { packed: PackedCircle[]; overflow: LayoutTeam[] } {
  const packed: PackedCircle[] = [];
  const overflow: LayoutTeam[] = [];
  const tiers: PackedCircle[][] = [];

  for (const team of teams) {
    const radius = getTableRadius(team.size);
    const circle = placeCircle(radius, team.teamId, tiers, side, [
      ...obstacles,
      ...packed,
    ]);

    if (circle) {
      packed.push(circle);
    } else {
      overflow.push(team);
    }
  }

  return { packed, overflow };
}

function sideBounds(y: number, radius: number, isLeft: boolean) {
  const hall = getHallBounds(y);

  return isLeft
    ? { from: hall.left + radius, to: HALL_GEOMETRY.aisleLeft - radius }
    : { from: HALL_GEOMETRY.aisleRight + radius, to: hall.right - radius };
}

function placeCircle(
  radius: number,
  teamId: string,
  tiers: PackedCircle[][],
  side: SideBounds,
  existing: PackedCircle[],
): PackedCircle | null {
  const topY = HALL.stageHeight + PACK_MARGIN + radius;

  for (const tier of tiers) {
    const last = tier[tier.length - 1];
    const x = last.x + last.radius + radius + PACK_MARGIN;
    const y = restingY(x, radius, existing, topY);
    const bounds = sideBounds(y, radius, side.isLeft);

    if (x <= bounds.to && fits(x, y, radius, existing)) {
      const circle = { teamId, x: Math.round(x), y: Math.round(y), radius };
      tier.push(circle);

      return circle;
    }
  }

  const startBounds = sideBounds(topY, radius, side.isLeft);

  for (let x = startBounds.from; x <= startBounds.to; x += SCAN_STEP) {
    const y = restingY(x, radius, existing, topY);
    const bounds = sideBounds(y, radius, side.isLeft);

    if (x < bounds.from || x > bounds.to) {
      continue;
    }

    if (fits(x, y, radius, existing)) {
      const circle = {
        teamId,
        x: Math.round(x),
        y: Math.round(y),
        radius,
      };

      tiers.push([circle]);

      return circle;
    }
  }

  return null;
}

function restingY(
  x: number,
  radius: number,
  existing: PackedCircle[],
  topY: number,
): number {
  let y = topY;

  for (const other of existing) {
    const dx = Math.abs(other.x - x);
    const reach = other.radius + radius + PACK_MARGIN;

    if (dx < reach) {
      y = Math.max(y, other.y + Math.sqrt(reach * reach - dx * dx));
    }
  }

  return y;
}

function fits(
  x: number,
  y: number,
  radius: number,
  existing: PackedCircle[],
): boolean {
  if (y + radius > HALL.height - HALL_GEOMETRY.bottomMargin) {
    return false;
  }

  if (isInDeadZone(x, y, radius)) {
    return false;
  }

  return existing.every((other) => {
    const distance = Math.hypot(other.x - x, other.y - y);

    return distance >= other.radius + radius + PACK_MARGIN - 0.5;
  });
}
