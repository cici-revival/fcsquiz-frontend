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
 * Плотная начальная укладка для команд, которым не хватило вкоммиченных мест.
 *
 * Столы кладутся впритык слева направо, стороны чередуются для баланса.
 * Ровных рядов тут не получается и не нужно: результат потом утрясает
 * relaxPhysics, и рассадка выходит «живой», а не расчерченной по линейке.
 * Глубина не ограничена: ряды идут вниз, пока есть команды.
 */

/**
 * Шаг между рядами берём по среднему столу, а не по самому крупному: ряды
 * заходят друг на друга, и физике есть что расталкивать. Из этого и рождается
 * «живая» рассадка вместо расчерченной сетки.
 */
const ROW_STEP = (TABLE.maxRadius + TABLE.minRadius) * 0.9;

type SideKey = "left" | "right";

function sideRange(y: number, isLeft: boolean): { from: number; to: number } {
  const hall = getHallBounds(y);

  return isLeft
    ? { from: hall.left, to: HALL_GEOMETRY.aisleLeft }
    : { from: HALL_GEOMETRY.aisleRight, to: hall.right };
}

/** Сколько столов влезает в ряд на этой глубине. */
/**
 * Сколько столов реально влезает в ряд. Считаем по финальному размеру
 * (диаметр + зазор + кольца), а не по плотной укладке: иначе в ряд попадает
 * больше столов, чем сторона может вместить, и физике их некуда раздвинуть —
 * они остаются внахлёст.
 */
function capacity(y: number, isLeft: boolean): number {
  const { from, to } = sideRange(y, isLeft);
  const cell = TABLE.maxRadius * 2 + TABLE_GAP + TABLE_RING * 2;

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

      const { from } = sideRange(y, isLeft);
      let cursor = from;

      row.forEach((team) => {
        const radius = getTableRadius(team.size);

        // Впритык, а не по равным ячейкам: физика потом раздвинет как нужно,
        // а равные ячейки давали бы искусственно ровные ряды.
        cursor += radius;
        packed.push({ teamId: team.teamId, x: Math.round(cursor), y: Math.round(y), radius });
        cursor += radius;
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
