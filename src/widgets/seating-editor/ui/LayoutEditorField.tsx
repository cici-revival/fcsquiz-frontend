import { useCallback, useEffect, useRef, useState } from "react";

import { HALL, type SeatSlot } from "@entities/seating/config/hall";
import { clientToField, getFieldScale } from "@entities/seating/lib/fieldCoords";
import type { SeatingPosition } from "@entities/seating/types";

import styles from "./LayoutEditorField.module.css";

type LayoutEditorFieldProps = {
  slots: SeatSlot[];
  onAddSlot: (position: SeatingPosition) => void;
  onBeginMove: () => void;
  onMoveSlot: (slotId: string, position: SeatingPosition, alignToGrid: boolean) => void;
  onRemoveSlot: (slotId: string) => void;
};

const DRAG_THRESHOLD = 4;

export function LayoutEditorField({
  slots,
  onAddSlot,
  onBeginMove,
  onMoveSlot,
  onRemoveSlot,
}: LayoutEditorFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const dragState = useRef<{ slotId: string; moved: boolean } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(getFieldScale(entry.contentRect.width));
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  const toFieldPoint = useCallback(
    (event: { clientX: number; clientY: number }): SeatingPosition | null => {
      const field = fieldRef.current;
      if (!field) return null;

      return clientToField(event, field.getBoundingClientRect(), scale);
    },
    [scale],
  );

  const handleFieldPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.button !== 0) return;

    const point = toFieldPoint(event);
    if (point) onAddSlot(point);
  };

  const handleSlotPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    slot: SeatSlot,
  ) => {
    if (event.button !== 0) return;

    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { slotId: slot.id, moved: false };
    onBeginMove();
  };

  const handleSlotPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state) return;

    if (!state.moved) {
      const movedEnough =
        Math.abs(event.movementX) > DRAG_THRESHOLD ||
        Math.abs(event.movementY) > DRAG_THRESHOLD;

      if (!movedEnough) return;
      state.moved = true;
    }

    const point = toFieldPoint(event);
    if (point) onMoveSlot(state.slotId, point, event.shiftKey);
  };

  const handleSlotPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragState.current = null;
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={styles.field}
        ref={fieldRef}
        onPointerDown={handleFieldPointerDown}
        style={{
          width: HALL.width,
          height: HALL.height,
          transform: `scale(${scale})`,
        }}
      >
        <div className={styles.stage} style={{ height: HALL.stageHeight }}>
          Сцена
        </div>

        {slots.map((slot) => (
          <button
            key={slot.id}
            type="button"
            className={styles.slot}
            style={{
              left: slot.x - HALL.slotRadius,
              top: slot.y - HALL.slotRadius,
              width: HALL.slotRadius * 2,
              height: HALL.slotRadius * 2,
            }}
            onPointerDown={(event) => handleSlotPointerDown(event, slot)}
            onPointerMove={handleSlotPointerMove}
            onPointerUp={handleSlotPointerUp}
            onPointerCancel={handleSlotPointerUp}
            onContextMenu={(event) => {
              event.preventDefault();
              onRemoveSlot(slot.id);
            }}
          >
            {slot.id}
          </button>
        ))}
      </div>

      <div
        className={styles.spacer}
        style={{ width: HALL.width * scale, height: HALL.height * scale }}
      />
    </div>
  );
}
