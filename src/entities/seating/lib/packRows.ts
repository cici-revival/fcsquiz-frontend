import {
  HALL_GEOMETRY,
  getHallBounds,
  getTableRadius,
  TABLE,
  TABLE_GAP,
  TABLE_RING,
} from "../config/hall";
import type { LayoutTeam } from "./layoutTypes";
import type { PackedCircle } from "./layoutTypes";

/**
 * Раскладка рядами для команд, которым не хватило вкоммиченных мест.
 *
 * В отличие от поиска свободного места, здесь у каждой команды своя ячейка
 * в ряду, поэтому наложения невозможны по построению, а ряды получаются
 * ровными. Глубина не ограничена: ряды идут вниз, пока есть команды.
 */

/** Шаг между рядами: самый крупный стол плюс зазор и кольца. */
const ROW_STEP = TABLE.maxRadius * 2 + TABLE_GAP + TABLE_RING * 2;

type SideKey = "left" | "right";

function sideRange(y: number, isLeft: boolean): { from: number; to: number } {
  const hall = getHallBounds(y);

  return isLeft
    ? { from: hall.left, to: HALL_GEOMETRY.aisleLeft }
    : { from: HALL_GEOMETRY.aisleRight, to: hall.right };
}

/** Сколько столов влезает в ряд на этой глубине. */
function capacity(y: number, isLeft: boolean): number {
  const { from, to } = sideRange(y, isLeft);
  const cell = TABLE.maxRadius * 2 + TABLE_GAP;

  return Math.max(1, Math.floor((to - from) / cell));
}

export function packRows(
  teams: LayoutTeam[],
  startY: number,
): { packed: PackedCircle[]; overflow: LayoutTeam[] } {
  const packed: PackedCircle[] = [];

  if (teams.length === 0) {
    return { packed, overflow: [] };
  }

  // Крупные ближе к сцене.
  const ordered = [...teams].sort(
    (a, b) => b.size - a.size || a.teamId.localeCompare(b.teamId),
  );

  const queue = [...ordered];
  let rowIndex = 0;

  while (queue.length > 0) {
    const y = startY + rowIndex * ROW_STEP + TABLE.maxRadius;

    // Ряд заполняем с обеих сторон сразу, чтобы зал наполнялся симметрично.
    for (const side of ["left", "right"] as SideKey[]) {
      const isLeft = side === "left";
      const slots = capacity(y, isLeft);

      if (slots === 0) continue;

      const row = queue.splice(0, slots);
      if (row.length === 0) break;

      const { from, to } = sideRange(y, isLeft);
      const step = (to - from) / row.length;

      row.forEach((team, index) => {
        const radius = getTableRadius(team.size);
        const x = from + step * (index + 0.5);

        packed.push({ teamId: team.teamId, x: Math.round(x), y: Math.round(y), radius });
      });
    }

    rowIndex += 1;

    // Страховка от бесконечного цикла, если ряд вдруг не принял ни одной команды.
    if (rowIndex > teams.length) break;
  }

  // Мёртвая зона под колонками кончается заметно выше первого ряда
  // авторасстановки, поэтому здесь её проверять не нужно.
  return { packed, overflow: [] };
}
