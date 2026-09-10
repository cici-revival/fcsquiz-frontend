import { HALL, SEAT_SLOTS, type SeatSlot } from "../config/hall";
import type { SeatingPosition } from "../types";

export const SNAP_TOLERANCE = HALL.slotRadius;

export function findSlotAt(
  position: SeatingPosition,
  slots: SeatSlot[] = SEAT_SLOTS,
): SeatSlot | null {
  let best: SeatSlot | null = null;
  let bestDistance = Infinity;

  for (const slot of slots) {
    const distance = Math.hypot(slot.x - position.x, slot.y - position.y);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot;
    }
  }

  return best && bestDistance <= SNAP_TOLERANCE ? best : null;
}

export function slotPosition(slot: SeatSlot): SeatingPosition {
  return { x: slot.x, y: slot.y };
}
