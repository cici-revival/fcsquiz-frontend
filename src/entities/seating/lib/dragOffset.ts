type Point = { x: number; y: number };

/**
 * Смещение точки захвата от центра стола. Нужно, чтобы стол тащился за то
 * место, за которое его взяли, а не прыгал центром под курсор.
 */
export function getGrabOffset(cursor: Point | null, center: Point | null): Point {
  if (!cursor || !center) return { x: 0, y: 0 };

  return { x: cursor.x - center.x, y: cursor.y - center.y };
}

/** Позиция центра стола при текущем положении курсора. */
export function applyGrabOffset(cursor: Point, grab: Point): Point {
  return { x: cursor.x - grab.x, y: cursor.y - grab.y };
}
