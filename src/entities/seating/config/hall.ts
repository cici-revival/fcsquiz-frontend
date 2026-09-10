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
  width: 1550,
  height: 1200,
  stageHeight: 80,
} as const;

export const TABLE = {
  minRadius: 30,
  radiusPerPlayer: 3.5,
  baseRadius: 22,
  gap: 14,
} as const;

export const HALL_GEOMETRY = {
  aisleLeft: 700,
  aisleRight: 800,
  marginLeft: 131,
  marginRight: 1249,
  bottomMargin: 60,
  rowGap: 26,
} as const;

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

export function getTableRadius(playersCount: number): number {
  const size = Math.max(0, playersCount);

  return Math.max(
    TABLE.minRadius,
    TABLE.baseRadius + size * TABLE.radiusPerPlayer,
  );
}
