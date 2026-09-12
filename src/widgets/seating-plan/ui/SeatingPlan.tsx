import { useMemo } from "react";

import {
  getTableRadius,
  HALL,
  HALL_GEOMETRY,
} from "@entities/seating/config/hall";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import { useFieldScale } from "@widgets/seating-editor/ui/useFieldScale";

import styles from "./SeatingPlan.module.css";

type SeatingPlanTeam = {
  teamId: string;
  name: string;
};

type SeatingPlanProps = {
  /** Названия команд: в стриме рассадки их нет, только team_id. */
  teams: SeatingPlanTeam[];
  /** Поиск с лендинга: совпавшие столы подсвечиваются, остальные гаснут. */
  query?: string;
};

type PlanCircle = {
  teamId: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  isFound: boolean;
};

export function SeatingPlan({ teams, query = "" }: SeatingPlanProps) {
  const seatingTeams = useSeatingStore((state) => state.teams);
  const { containerRef, fieldRef, scale } = useFieldScale();

  const nameById = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team.name])),
    [teams],
  );

  const trimmedQuery = query.trim().toLowerCase();

  const circles = useMemo<PlanCircle[]>(() => {
    const result: PlanCircle[] = [];

    for (const team of seatingTeams.values()) {
      if (!team.position) continue;

      const name = nameById.get(team.team_id) ?? "—";

      result.push({
        teamId: team.team_id,
        name,
        x: team.position.x,
        y: team.position.y,
        radius: getTableRadius(team.size),
        isFound:
          trimmedQuery.length > 0 && name.toLowerCase().includes(trimmedQuery),
      });
    }

    return result;
  }, [seatingTeams, nameById, trimmedQuery]);

  // Зал растягивается под раскладку: ряды авторасстановки уходят ниже
  // номинальной высоты, и обрезать их нельзя.
  const fieldHeight = useMemo(() => {
    const lowest = circles.reduce(
      (bottom, circle) => Math.max(bottom, circle.y + circle.radius),
      0,
    );

    return Math.max(HALL.height, Math.ceil(lowest + HALL_GEOMETRY.bottomMargin));
  }, [circles]);

  const found = useMemo(
    () => circles.filter((circle) => circle.isFound),
    [circles],
  );

  const hasFound = found.length > 0;

  return (
    <div>
      <div className={styles.container} ref={containerRef}>
        <div
          className={styles.field}
          ref={fieldRef}
          style={{
            width: HALL.width,
            height: fieldHeight,
            transform: `scale(${scale})`,
          }}
        >
          <div
            className={styles.stage}
            style={{
              height: HALL.stageHeight + HALL.stageBulge,
              borderRadius: `0 0 50% 50% / 0 0 ${HALL.stageBulge}px ${HALL.stageBulge}px`,
            }}
          />

          <div
            className={styles.aisle}
            style={{
              left: HALL_GEOMETRY.aisleLeft,
              width: HALL_GEOMETRY.aisleRight - HALL_GEOMETRY.aisleLeft,
              top: HALL.stageHeight + 40,
              height: fieldHeight - HALL.stageHeight,
            }}
          />

          {circles.map((circle) => {
            const className = [
              styles.table,
              circle.isFound ? styles.tableFound : "",
              hasFound && !circle.isFound ? styles.tableDimmed : "",
            ]
              .filter(Boolean)
              .join(" ");

            return (
              <div
                key={circle.teamId}
                className={className}
                style={{
                  left: circle.x - circle.radius,
                  top: circle.y - circle.radius,
                  width: circle.radius * 2,
                  height: circle.radius * 2,
                }}
              >
                <span className={styles.tableName}>{circle.name}</span>
              </div>
            );
          })}
        </div>

        <div
          className={styles.spacer}
          style={{ width: HALL.width * scale, height: fieldHeight * scale }}
        />
      </div>

      {/* На мобильном подписи скрыты, поэтому найденное называем текстом. */}
      {hasFound && (
        <p className={styles.found}>
          {found.length === 1 ? (
            <>
              Ваш стол: <span className={styles.foundName}>{found[0].name}</span>
            </>
          ) : (
            <>Подсвечено команд: {found.length}</>
          )}
        </p>
      )}
    </div>
  );
}
