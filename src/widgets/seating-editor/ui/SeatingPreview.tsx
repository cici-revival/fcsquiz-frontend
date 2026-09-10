import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { HALL, HALL_GEOMETRY } from "@entities/seating/config/hall";
import { buildLayout, type LayoutTeam } from "@entities/seating/lib/buildLayout";
import { clientToField } from "@entities/seating/lib/fieldCoords";
import { resolveDrop } from "@entities/seating/lib/movePlacement";
import type { PackedCircle } from "@entities/seating/lib/packSide";
import { useFieldScale } from "./useFieldScale";

import styles from "./SeatingPreview.module.css";

type SeatingTeamInput = {
  teamId: string;
  name: string;
  size: number;
};

type SeatingPreviewProps = {
  teams: SeatingTeamInput[];
  onDirtyChange?: (isDirty: boolean) => void;
  resetToken?: number;
};

const DRAG_THRESHOLD = 3;

export function SeatingPreview({
  teams,
  onDirtyChange,
  resetToken = 0,
}: SeatingPreviewProps) {
  const computed = useMemo(
    () => buildLayout(teams.map(({ teamId, size }): LayoutTeam => ({ teamId, size }))),
    [teams],
  );

  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const { containerRef, fieldRef, scale } = useFieldScale();
  const dragState = useRef<{ teamId: string; moved: boolean } | null>(null);

  useEffect(() => {
    setMoved({});
  }, [resetToken, computed]);

  useEffect(() => {
    onDirtyChange?.(Object.keys(moved).length > 0);
  }, [moved, onDirtyChange]);

  const circles = useMemo<PackedCircle[]>(
    () =>
      computed.placements.map(({ teamId, slot }) => ({
        teamId,
        x: moved[teamId]?.x ?? slot.x,
        y: moved[teamId]?.y ?? slot.y,
        radius: slot.radius,
      })),
    [computed.placements, moved],
  );

  const names = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team])),
    [teams],
  );

  const toFieldPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const field = fieldRef.current;
      if (!field) return null;

      return clientToField(event, field.getBoundingClientRect(), scale);
    },
    [fieldRef, scale],
  );

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    teamId: string,
  ) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { teamId, moved: false };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state) return;

    if (
      !state.moved &&
      Math.abs(event.movementX) <= DRAG_THRESHOLD &&
      Math.abs(event.movementY) <= DRAG_THRESHOLD
    ) {
      return;
    }

    state.moved = true;

    const point = toFieldPoint(event);
    if (!point) return;

    setMoved((previous) => ({ ...previous, [state.teamId]: point }));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    dragState.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!state?.moved) return;

    const dragged = circles.find((circle) => circle.teamId === state.teamId);
    const point = toFieldPoint(event);

    if (!dragged || !point) return;

    const others = circles.filter((circle) => circle.teamId !== state.teamId);
    const resolved = resolveDrop(dragged, point, others);

    setMoved((previous) => ({
      ...previous,
      [state.teamId]: { x: Math.round(resolved.x), y: Math.round(resolved.y) },
    }));
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={styles.field}
        ref={fieldRef}
        style={{ width: HALL.width, height: HALL.height, transform: `scale(${scale})` }}
      >
        <div className={styles.stage} style={{ height: HALL.stageHeight }}>
          Сцена
        </div>

        <div
          className={styles.aisle}
          style={{
            left: HALL_GEOMETRY.aisleLeft,
            width: HALL_GEOMETRY.aisleRight - HALL_GEOMETRY.aisleLeft,
            top: HALL.stageHeight,
            height: HALL.height - HALL.stageHeight,
          }}
        />

        {circles.map((circle) => {
          const team = names.get(circle.teamId);
          const isMoved = circle.teamId in moved;

          return (
            <button
              key={circle.teamId}
              type="button"
              className={`${styles.table} ${isMoved ? styles.tableMoved : ""}`.trim()}
              style={{
                left: circle.x - circle.radius,
                top: circle.y - circle.radius,
                width: circle.radius * 2,
                height: circle.radius * 2,
              }}
              onPointerDown={(event) => handlePointerDown(event, circle.teamId)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <span className={styles.tableName} title={team?.name ?? circle.teamId}>
                {team?.name ?? "—"}
              </span>
              <span className={styles.tableSize}>{team?.size ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div
        className={styles.spacer}
        style={{ width: HALL.width * scale, height: HALL.height * scale }}
      />
    </div>
  );
}
