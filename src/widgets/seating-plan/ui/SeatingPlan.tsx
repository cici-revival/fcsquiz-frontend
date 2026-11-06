import { Fragment, useMemo } from "react";

import {
  getTableRadius,
  HALL,
  HALL_GEOMETRY,
} from "@entities/seating/config/hall";
import { buildSeatNumbers } from "@entities/seating/lib/seatNumbers";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import { useTeamStore } from "@entities/team/model/team.store";
import { TeamDetails } from "@entities/team/ui/TeamDetails";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/Popover";
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
  number: number;
  x: number;
  y: number;
  radius: number;
  isFound: boolean;
};

export function SeatingPlan({ teams, query = "" }: SeatingPlanProps) {
  const seatingTeams = useSeatingStore((state) => state.teams);
  // Подробности (состав, пропуски) есть только в сторе составов: в стриме
  // рассадки приходят лишь team_id и координаты.
  const rosterTeams = useTeamStore((state) => state.teams);
  const { containerRef, fieldRef, scale } = useFieldScale();

  const nameById = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team.name])),
    [teams],
  );

  const trimmedQuery = query.trim().toLowerCase();

  const seatNumbers = useMemo(
    () => buildSeatNumbers(seatingTeams.values()),
    [seatingTeams],
  );

  const circles = useMemo<PlanCircle[]>(() => {
    const result: PlanCircle[] = [];

    for (const team of seatingTeams.values()) {
      if (!team.position) continue;

      const name = nameById.get(team.team_id) ?? "—";

      result.push({
        teamId: team.team_id,
        name,
        number: seatNumbers.get(team.team_id) ?? 0,
        x: team.position.x,
        y: team.position.y,
        radius: getTableRadius(team.size),
        isFound:
          trimmedQuery.length > 0 && name.toLowerCase().includes(trimmedQuery),
      });
    }

    return result;
  }, [seatingTeams, nameById, trimmedQuery, seatNumbers]);

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
              left: HALL_GEOMETRY.aisle.left,
              width: HALL_GEOMETRY.aisle.right - HALL_GEOMETRY.aisle.left,
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

            const table = (
              <button
                type="button"
                className={className}
                style={{
                  left: circle.x - circle.radius,
                  top: circle.y - circle.radius,
                  width: circle.radius * 2,
                  height: circle.radius * 2,
                }}
                aria-label={`Стол № ${circle.number}, ${circle.name}`}
              >
                <span className={styles.tableNumber}>{circle.number}</span>
                <span className={styles.tableName}>{circle.name}</span>
              </button>
            );

            const roster = rosterTeams.get(circle.teamId);

            // Без записи в составе показывать в попапе нечего — оставляем
            // стол некликабельным, чтобы не открывать пустую карточку.
            if (!roster) {
              return <Fragment key={circle.teamId}>{table}</Fragment>;
            }

            return (
              <Popover key={circle.teamId}>
                <PopoverTrigger asChild>{table}</PopoverTrigger>
                <PopoverContent
                  side="top"
                  sideOffset={8}
                  collisionPadding={12}
                  className={styles.details}
                >
                  <TeamDetails team={roster} seatNumber={circle.number} />
                </PopoverContent>
              </Popover>
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
              Ваш стол № <span className={styles.foundName}>{found[0].number}</span>
              {" — "}
              <span className={styles.foundName}>{found[0].name}</span>
            </>
          ) : (
            <>Подсвечено команд: {found.length}</>
          )}
        </p>
      )}
    </div>
  );
}
