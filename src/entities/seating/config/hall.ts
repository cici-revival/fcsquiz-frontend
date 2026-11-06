export type SeatSlot = {
  id: string;
  x: number;
  y: number;
  row: number;
  order: number;
  radius: number;
};

export const DEFAULT_SEATING_COLOR = "#3B82F6";

export const HALL = {
  // Ширина задаёт масштаб: поле вписывается в контейнер по ширине, поэтому чем
  // уже зал, тем крупнее столы на экране.
  width: 1500,
  height: 900,
  stageHeight: 64,
  stageBulge: 38,
} as const;

// Столы отсчитываются от нижней точки выпуклости сцены, а не от её прямого
// края: раньше нижняя дуга налезала на первый ряд. FIXED_SLOT_POINTS заданы
// вручную и начинаются с y=156, поэтому запас держим ниже их верхней кромки.
export const STAGE_CLEARANCE = HALL.stageBulge;

export function getSeatingTop(): number {
  return HALL.stageHeight + STAGE_CLEARANCE;
}

// Размеры столов у сцены: 40 точек FIXED_SLOT_POINTS расставлены вручную под
// реальный зал, поэтому столы на них должны плотно занимать сетку — просветы
// там заданы самой разметкой, а не алгоритмом.
export const TABLE = {
  minRadius: 30,
  maxRadius: 43,
  radiusPerPlayer: 2.9,
  baseRadius: 25,
} as const;

// Шкала одна на всех. Раньше столы вне сетки были мельче, но радиус при этом
// зависел от того, каким путём стол попал на поле: команда, сохранённая по
// координатам из одной раскладки, после смены состава рисовалась радиусом из
// другой — и наезжала на соседей.
export const PACKED_TABLE = TABLE;

/** Минимальное расстояние между вкоммиченными точками зала. */
export const FIXED_POINT_SPACING = 90.1;

/** Кольцо .tableMoved рисуется снаружи круга — учитываем в зазорах. */
export const TABLE_RING = 1;

/**
 * Зазор между краями столов, которые расставляет алгоритм.
 * К вкоммиченным FIXED_SLOT_POINTS он не применяется — там расстояние задано
 * жёстко (FIXED_POINT_SPACING), и зазор регулируется только через maxRadius.
 */
export const TABLE_GAP = 12;

/**
 * Основные ручки формы зала.
 *
 * `top` и `lowerGuide` — два горизонтальных среза одной трапеции. Между ними
 * и ниже `lowerGuide` боковые стены идут по одной прямой. Поэтому, чтобы
 * сделать зал шире или уже, достаточно двигать left/right у этих двух срезов.
 *
 * `lowerGuide` — не нижняя граница зала, а только опорная линия для наклона.
 */
export const HALL_GEOMETRY = {
  top: {
    y: HALL.stageHeight,
    left: 185,
    right: 1315,
  },
  lowerGuide: {
    y: 600,
    left: 81,
    right: 1419,
  },
  aisle: {
    left: 700,
    right: 800,
  },
  bottomMargin: 40,
} as const;

export const DEAD_ZONE = {
  left: 682,
  right: 974,
  top: HALL.stageHeight,
  bottom: 214,
} as const;

export function isInDeadZone(x: number, y: number, radius: number): boolean {
  return (
    x + radius > DEAD_ZONE.left &&
    x - radius < DEAD_ZONE.right &&
    y + radius > DEAD_ZONE.top &&
    y - radius < DEAD_ZONE.bottom
  );
}

export function getHallBounds(y: number): { left: number; right: number } {
  const { top, lowerGuide } = HALL_GEOMETRY;
  // Сверху контур начинается у сцены, а снизу намеренно не ограничивается 1:
  // после lowerGuide трапеция продолжает расширяться с тем же наклоном.
  const progress = Math.max(0, (y - top.y) / (lowerGuide.y - top.y));

  return {
    left: Math.max(0, top.left + (lowerGuide.left - top.left) * progress),
    right: Math.min(HALL.width, top.right + (lowerGuide.right - top.right) * progress),
  };
}

export const FIXED_SLOT_POINTS: { x: number; y: number }[] = [
  { x: 235, y: 156 },
  { x: 332, y: 161 },
  { x: 429, y: 164 },
  { x: 529, y: 167 },
  { x: 629, y: 173 },
  { x: 1027, y: 172 },
  { x: 1129, y: 166 },
  { x: 1229, y: 159 },
  { x: 208, y: 253 },
  { x: 313, y: 252 },
  { x: 420, y: 263 },
  { x: 522, y: 267 },
  { x: 635, y: 277 },
  { x: 842, y: 263 },
  { x: 941, y: 266 },
  { x: 1047, y: 273 },
  { x: 1144, y: 271 },
  { x: 1249, y: 265 },
  { x: 152, y: 330 },
  { x: 245, y: 349 },
  { x: 343, y: 354 },
  { x: 440, y: 363 },
  { x: 536, y: 367 },
  { x: 636, y: 373 },
  { x: 836, y: 366 },
  { x: 942, y: 369 },
  { x: 1043, y: 363 },
  { x: 1144, y: 370 },
  { x: 1246, y: 362 },
  { x: 131, y: 426 },
  { x: 228, y: 446 },
  { x: 330, y: 451 },
  { x: 427, y: 465 },
  { x: 533, y: 475 },
  { x: 638, y: 473 },
  { x: 842, y: 472 },
  { x: 941, y: 469 },
  { x: 1040, y: 458 },
  { x: 1148, y: 464 },
  { x: 1249, y: 455 },
];

function radiusFrom(
  scale: { baseRadius: number; radiusPerPlayer: number; minRadius: number; maxRadius: number },
  playersCount: number,
): number {
  const size = Math.max(0, playersCount);
  const radius = scale.baseRadius + size * scale.radiusPerPlayer;

  return Math.min(scale.maxRadius, Math.max(scale.minRadius, radius));
}

/** Радиус стола на вкоммиченной точке у сцены. */
export function getTableRadius(playersCount: number): number {
  return radiusFrom(TABLE, playersCount);
}

/** Радиус стола, который расставляет алгоритм за пределами сетки. */
export function getPackedTableRadius(playersCount: number): number {
  return radiusFrom(PACKED_TABLE, playersCount);
}
