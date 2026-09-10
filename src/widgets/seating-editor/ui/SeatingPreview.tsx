import { useMemo } from "react";

import { HALL, HALL_GEOMETRY } from "@entities/seating/config/hall";
import { buildLayout, type LayoutTeam } from "@entities/seating/lib/buildLayout";
import { useFieldScale } from "./useFieldScale";

import styles from "./SeatingPreview.module.css";

type SeatingPreviewProps = {
  teams: { teamId: string; name: string; size: number }[];
};

export function SeatingPreview({ teams }: SeatingPreviewProps) {
  const layout = useMemo(
    () => buildLayout(teams.map(({ teamId, size }): LayoutTeam => ({ teamId, size }))),
    [teams],
  );

  const names = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team])),
    [teams],
  );

  const { containerRef, fieldRef, scale } = useFieldScale();

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

        {layout.placements.map(({ teamId, slot }) => {
          const team = names.get(teamId);

          return (
            <div
              key={teamId}
              className={styles.table}
              style={{
                left: slot.x - slot.radius,
                top: slot.y - slot.radius,
                width: slot.radius * 2,
                height: slot.radius * 2,
              }}
              title={`${team?.name ?? teamId} — ${team?.size ?? 0} чел., стол ${slot.id}`}
            >
              <span className={styles.tableName}>{team?.name ?? "—"}</span>
              <span className={styles.tableSize}>{team?.size ?? 0}</span>
            </div>
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
