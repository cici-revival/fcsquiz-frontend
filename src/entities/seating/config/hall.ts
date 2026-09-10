export type SeatSlot = {
  id: string;
  x: number;
  y: number;
  row: number;
  order: number;
};

export const DEFAULT_SEATING_COLOR = "#3B82F6";

export const HALL = {
  width: 1550,
  height: 1200,
  stageHeight: 80,
  slotRadius: 46,
} as const;

export const HALL_VERSION = "draft-1";

function buildDraftSlots(): SeatSlot[] {
  const rows = 6;
  const perRow = 8;
  const marginX = 180;
  const firstRowY = HALL.stageHeight + 160;
  const rowGap = 150;
  const stepX = (HALL.width - marginX * 2) / (perRow - 1);

  const slots: SeatSlot[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let order = 0; order < perRow; order += 1) {
      slots.push({
        id: `${String.fromCharCode(65 + row)}${order + 1}`,
        x: Math.round(marginX + stepX * order),
        y: firstRowY + rowGap * row,
        row: row + 1,
        order: order + 1,
      });
    }
  }

  return slots;
}

export const SEAT_SLOTS: SeatSlot[] = buildDraftSlots();
