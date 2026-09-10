import { HALL, type SeatSlot } from "../config/hall";

const ROW_TOLERANCE = HALL.slotRadius * 1.5;

export function assignRows(slots: SeatSlot[]): SeatSlot[] {
  const sorted = [...slots].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: SeatSlot[][] = [];

  for (const slot of sorted) {
    const lastRow = rows[rows.length - 1];

    if (lastRow && Math.abs(slot.y - lastRow[0].y) <= ROW_TOLERANCE) {
      lastRow.push(slot);
    } else {
      rows.push([slot]);
    }
  }

  return rows.flatMap((row, rowIndex) =>
    [...row]
      .sort((a, b) => a.x - b.x)
      .map((slot, orderIndex) => ({
        ...slot,
        row: rowIndex + 1,
        order: orderIndex + 1,
        id: `${rowLetter(rowIndex)}${orderIndex + 1}`,
      })),
  );
}

function rowLetter(rowIndex: number): string {
  const alphabetSize = 26;

  if (rowIndex < alphabetSize) {
    return String.fromCharCode(65 + rowIndex);
  }

  const first = Math.floor(rowIndex / alphabetSize) - 1;
  const second = rowIndex % alphabetSize;

  return `${String.fromCharCode(65 + first)}${String.fromCharCode(65 + second)}`;
}
