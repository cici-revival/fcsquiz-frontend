import { useCallback, useRef, useState } from "react";

import { assignRows } from "@entities/seating/lib/assignRows";
import { clampToField, snapToGrid } from "@entities/seating/lib/fieldCoords";
import { FIXED_SLOT_POINTS, TABLE, type SeatSlot } from "@entities/seating/config/hall";
import type { SeatingPosition } from "@entities/seating/types";

const UNDO_LIMIT = 50;
const GRID_STEP = 10;
const DRAFT_RADIUS = TABLE.minRadius;

export function useSlotDraft() {
  const [slots, setSlots] = useState<SeatSlot[]>(() =>
    assignRows(
      FIXED_SLOT_POINTS.map((point) => ({
        ...point,
        id: "",
        row: 0,
        order: 0,
        radius: DRAFT_RADIUS,
      })),
    ),
  );
  const history = useRef<SeatSlot[][]>([]);

  const addSlot = useCallback(
    (position: SeatingPosition) => {
      setSlots((previous) => {
        const point = clampToField(position);
        const next = assignRows([
          ...previous,
          {
            id: "",
            x: Math.round(point.x),
            y: Math.round(point.y),
            row: 0,
            order: 0,
            radius: DRAFT_RADIUS,
          },
        ]);

        history.current = [...history.current, previous].slice(-UNDO_LIMIT);

        return next;
      });
    },
    [],
  );

  const moveSlot = useCallback(
    (slotId: string, position: SeatingPosition, alignToGrid: boolean) => {
      setSlots((previous) => {
        const point = clampToField(
          alignToGrid ? snapToGrid(position, GRID_STEP) : position,
        );

        return previous.map((slot) =>
          slot.id === slotId
            ? { ...slot, x: Math.round(point.x), y: Math.round(point.y) }
            : slot,
        );
      });
    },
    [],
  );

  const beginMove = useCallback(() => {
    history.current = [...history.current, slots].slice(-UNDO_LIMIT);
  }, [slots]);

  const renumber = useCallback(() => {
    setSlots((previous) => {
      history.current = [...history.current, previous].slice(-UNDO_LIMIT);

      return assignRows(previous);
    });
  }, []);

  const removeSlot = useCallback(
    (slotId: string) => {
      setSlots((previous) => {
        history.current = [...history.current, previous].slice(-UNDO_LIMIT);

        return assignRows(previous.filter((slot) => slot.id !== slotId));
      });
    },
    [],
  );

  const replaceAll = useCallback((next: SeatSlot[]) => {
    setSlots((previous) => {
      history.current = [...history.current, previous].slice(-UNDO_LIMIT);

      return assignRows(next);
    });
  }, []);

  const clear = useCallback(() => {
    setSlots((previous) => {
      history.current = [...history.current, previous].slice(-UNDO_LIMIT);

      return [];
    });
  }, []);

  const undo = useCallback(() => {
    const previous = history.current[history.current.length - 1];

    if (!previous) {
      return;
    }

    history.current = history.current.slice(0, -1);
    setSlots(previous);
  }, []);

  return {
    slots,
    addSlot,
    beginMove,
    moveSlot,
    removeSlot,
    replaceAll,
    renumber,
    clear,
    undo,
    canUndo: history.current.length > 0,
  };
}
