import { assignRows } from "@entities/seating/lib/assignRows";
import type { SeatSlot } from "@entities/seating/config/hall";

export function serializeSlots(slots: SeatSlot[]): string {
  const lines = slots.map(
    (slot) =>
      `  { id: "${slot.id}", x: ${slot.x}, y: ${slot.y}, row: ${slot.row}, order: ${slot.order} },`,
  );

  return `[\n${lines.join("\n")}\n]`;
}

export function parseSlots(raw: string): SeatSlot[] {
  const numbers = extractPairs(raw);

  if (numbers.length === 0) {
    throw new Error("Не найдено ни одной пары координат");
  }

  return assignRows(
    numbers.map(({ x, y }) => ({ id: "", x, y, row: 0, order: 0 })),
  );
}

function extractPairs(raw: string): { x: number; y: number }[] {
  const pattern = /x"?\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*"?y"?\s*:\s*(-?\d+(?:\.\d+)?)/g;
  const result: { x: number; y: number }[] = [];

  for (const match of raw.matchAll(pattern)) {
    result.push({ x: Math.round(Number(match[1])), y: Math.round(Number(match[2])) });
  }

  return result;
}
