import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";

import { getTableRadius, HALL, HALL_GEOMETRY } from "@entities/seating/config/hall";
import { buildLayout, type LayoutTeam } from "@entities/seating/lib/buildLayout";
import { applyGrabOffset, getGrabOffset } from "@entities/seating/lib/dragOffset";
import { clientToField } from "@entities/seating/lib/fieldCoords";
import { resolveDrop } from "@entities/seating/lib/movePlacement";
import {
  layoutSignature,
  teamSetSignature,
} from "@entities/seating/lib/layoutSignature";
import type { PackedCircle } from "@entities/seating/lib/packSide";
import { DEFAULT_SEATING_COLOR } from "@entities/seating/config/hall";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import {
  unplaceTeamSeating,
  updateTeamSeating,
} from "@entities/seating/model/seating.ws";
import { getSeatingErrorMessage } from "@shared/api/statusMessages";
// import { useTeamStore } from "@entities/team/model/team.store";
// import { TeamDetailsDisclosure } from "@entities/team/ui/TeamDetails";
import { HallBounds } from "./HallBounds";
import { useFieldScale } from "./useFieldScale";

import styles from "./SeatingPreview.module.css";

type SeatingTeamInput = {
  teamId: string;
  name: string;
  size: number;
};

export type SeatingPreviewControl = {
  seatTeamFromClient: (
    teamId: string,
    client: { clientX: number; clientY: number },
    size: number,
  ) => boolean;
};

type SeatingPreviewProps = {
  teams: SeatingTeamInput[];
  resetToken?: number;
  showBounds?: boolean;
  controlRef?: React.Ref<SeatingPreviewControl>;
};

// Порог сравнивается с накопленным смещением от точки нажатия, а не с дельтой
// одного события: при медленном ведении каждое событие даёт 1-2px, и порог
// по дельте не преодолевался никогда — стол просто не начинал тащиться.
const DRAG_THRESHOLD = 3;

export function SeatingPreview({
  teams,
  resetToken = 0,
  showBounds = false,
  controlRef,
}: SeatingPreviewProps) {
  // Пока тащим — рисуем локально; сохранённые позиции приходят из стора.
  const [dragging, setDragging] = useState<Record<string, { x: number; y: number }>>({});
  const seatingTeams = useSeatingStore((state) => state.teams);

  const layoutKey = useMemo(() => layoutSignature(teams), [teams]);
  const teamSetKey = useMemo(() => teamSetSignature(teams), [teams]);

  // Раскладка зависит только от состава: если подмешать сюда координаты
  // посаженных столов, каждое перетаскивание переставляло бы соседей.
  const computed = useMemo(
    () => buildLayout(teams.map(({ teamId, size }): LayoutTeam => ({ teamId, size }))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutKey],
  );
  const { containerRef, fieldRef, scale } = useFieldScale();
  const dragState = useRef<{
    teamId: string;
    moved: boolean;
    node: HTMLButtonElement;
    radius: number;
    origin: { clientX: number; clientY: number };
    /** Смещение точки захвата от центра стола, в координатах поля. */
    grab: { x: number; y: number };
    point: { x: number; y: number } | null;
  } | null>(null);

  useEffect(() => {
    setDragging({});
  }, [resetToken, teamSetKey]);

  // На поле показываем только посаженные столы: остальные ждут в пуле.
  const circles = useMemo<PackedCircle[]>(
    () =>
      computed.placements
        .filter(({ teamId }) => Boolean(seatingTeams.get(teamId)?.position))
        .map(({ teamId, slot }) => {
          const saved = seatingTeams.get(teamId)?.position;

          return {
            teamId,
            x: dragging[teamId]?.x ?? saved?.x ?? slot.x,
            y: dragging[teamId]?.y ?? saved?.y ?? slot.y,
            radius: slot.radius,
          };
        }),
    [computed.placements, dragging, seatingTeams],
  );

  // seatTeamAt читает актуальные круги через ref: иначе колбэк пришлось бы
  // пересоздавать на каждое движение и переустанавливать imperative handle.
  const circlesRef = useRef(circles);
  circlesRef.current = circles;

  const names = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team])),
    [teams],
  );

  // Подробности (пропуски) живут в сторе составов, а не в пропсах виджета.
  // const rosterTeams = useTeamStore((state) => state.teams);

  // Пока тащат стол, подсказка только мешает: она перехватывала бы курсор
  // и мигала при проходе над соседями.
  // isDragActive нужен только подсказке — она временно отключена.
  const [, setDragActive] = useState(false);
  // Стол, который сейчас тащат, рисуется по стилю, выставленному вручную:
  // React не должен перетирать его координатами из circles на ререндере.
  const dragTeamRef = useRef<string | null>(null);

  const toFieldPoint = useCallback(
    (event: { clientX: number; clientY: number }) => {
      const field = fieldRef.current;
      if (!field) return null;

      return clientToField(event, field.getBoundingClientRect(), scale);
    },
    [fieldRef, scale],
  );

  const handleContextMenu = (
    event: React.MouseEvent<HTMLButtonElement>,
    teamId: string,
  ) => {
    event.preventDefault();

    const saved = useSeatingStore.getState().teams.get(teamId);
    if (!saved?.position) return;

    void unplaceTeamSeating({
      teamId,
      expectedRevision: saved.revision,
    }).then((ack) => {
      if (ack.ok) return;

      if (ack.code === "revision_conflict" && ack.details?.current) {
        useSeatingStore.getState().upsertTeam(ack.details.current);
      }

      toast.error(getSeatingErrorMessage(ack.code));
    });
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    teamId: string,
    radius: number,
  ) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    const circle = circlesRef.current.find((item) => item.teamId === teamId);
    const grabPoint = toFieldPoint(event);

    dragState.current = {
      teamId,
      moved: false,
      node: event.currentTarget,
      radius,
      origin: { clientX: event.clientX, clientY: event.clientY },
      // Тащим за ту точку, за которую взяли: иначе на первом же движении
      // стол прыгает центром под курсор.
      grab: getGrabOffset(grabPoint, circle ?? null),
      point: null,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state) return;

    const cursor = toFieldPoint(event);
    if (!cursor) return;

    const point = applyGrabOffset(cursor, state.grab);

    if (!state.moved) {
      const travelled = Math.hypot(
        event.clientX - state.origin.clientX,
        event.clientY - state.origin.clientY,
      );

      if (travelled <= DRAG_THRESHOLD) return;

      // Позицию выставляем ДО setDragActive: иначе ререндер нарисует стол
      // по старым координатам, и он дёрнется назад на первом же движении.
      state.point = point;
      state.moved = true;
      dragTeamRef.current = state.teamId;
      setDragActive(true);
    }

    // Двигаем сам узел, а не состояние: setState на каждый pointermove
    // перерисовывал бы все столы разом.
    state.point = point;
    state.node.style.left = `${point.x - state.radius}px`;
    state.node.style.top = `${point.y - state.radius}px`;
  };

  // Счётчик на команду: пока ответ на прошлое перетаскивание летит, пользователь
  // может начать новое — тогда стирать оптимистичную позицию уже нельзя.
  const dragGeneration = useRef<Record<string, number>>({});

  const clearDragging = useCallback((teamId: string, generation: number) => {
    if (dragGeneration.current[teamId] !== generation) return;

    setDragging((previous) => {
      if (!(teamId in previous)) return previous;

      const next = { ...previous };
      delete next[teamId];

      return next;
    });
  }, []);

  const seatTeamAt = useCallback(
    (teamId: string, point: { x: number; y: number }, radius: number) => {
      const generation = (dragGeneration.current[teamId] ?? 0) + 1;
      dragGeneration.current[teamId] = generation;

      const others = circlesRef.current.filter((circle) => circle.teamId !== teamId);
      const resolved = resolveDrop({ teamId, ...point, radius }, point, others);
      const position = { x: Math.round(resolved.x), y: Math.round(resolved.y) };

      setDragging((previous) => ({ ...previous, [teamId]: position }));

      const saved = useSeatingStore.getState().teams.get(teamId);

      void updateTeamSeating({
        teamId,
        color: saved?.color || DEFAULT_SEATING_COLOR,
        position,
        expectedRevision: saved?.revision ?? 0,
      }).then((ack) => {
        // Оптимистичную позицию снимаем только когда сервер прислал свою,
        // иначе стол на кадр прыгнул бы на старое место.
        clearDragging(teamId, generation);

        if (ack.ok) return;

        if (ack.code === "revision_conflict" && ack.details?.current) {
          useSeatingStore.getState().upsertTeam(ack.details.current);
        }

        toast.error(getSeatingErrorMessage(ack.code));
      });
    },
    [clearDragging],
  );

  useImperativeHandle(
    controlRef,
    () => ({
      seatTeamFromClient: (teamId, client, size) => {
        const point = toFieldPoint(client);
        if (!point) return false;

        seatTeamAt(teamId, point, getTableRadius(size));

        return true;
      },
    }),
    [seatTeamAt, toFieldPoint],
  );

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    dragState.current = null;
    dragTeamRef.current = null;
    setDragActive(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!state?.moved) return;

    const { teamId } = state;
    const point = state.point ?? toFieldPoint(event);

    if (!point) {
      clearDragging(teamId, dragGeneration.current[teamId] ?? 0);

      return;
    }

    seatTeamAt(teamId, point, state.radius);
  };

  return (
    <div className={styles.container} ref={containerRef}>
      <div
        className={styles.field}
        ref={fieldRef}
        style={{ width: HALL.width, height: HALL.height, transform: `scale(${scale})` }}
      >
        <div
          className={styles.stage}
          style={{
            height: HALL.stageHeight + HALL.stageBulge,
            borderRadius: `0 0 50% 50% / 0 0 ${HALL.stageBulge}px ${HALL.stageBulge}px`,
          }}
        >
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

        {showBounds && <HallBounds />}

        {circles.map((circle) => {
          const team = names.get(circle.teamId);
          // const roster = rosterTeams.get(circle.teamId);
          const isMoved =
            circle.teamId in dragging || Boolean(seatingTeams.get(circle.teamId)?.position);

          // У стола, который тащат, координаты ведёт pointermove напрямую в DOM.
          // Убирать left/top из стиля нельзя: React их снимет, и абсолютно
          // спозиционированный стол улетит в левый верхний угол.
          const live =
            dragTeamRef.current === circle.teamId ? dragState.current?.point : null;
          const x = live?.x ?? circle.x;
          const y = live?.y ?? circle.y;

          const table = (
            <button
              key={circle.teamId}
              type="button"
              className={`${styles.table} ${isMoved ? styles.tableMoved : ""}`.trim()}
              style={{
                left: x - circle.radius,
                top: y - circle.radius,
                width: circle.radius * 2,
                height: circle.radius * 2,
              }}
              onPointerDown={(event) =>
                handlePointerDown(event, circle.teamId, circle.radius)
              }
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onContextMenu={(event) => handleContextMenu(event, circle.teamId)}
            >
              <span className={styles.tableName}>{team?.name ?? "—"}</span>
              <span className={styles.tableSize}>{team?.size ?? 0}</span>
            </button>
          );

          return table;

          // Временно отключено: проверяем, не из-за подсказки ли багается
          // перетаскивание (она оборачивает ту же кнопку через asChild).
          // if (!roster) return table;
          //
          // return (
          //   <TeamDetailsDisclosure
          //     key={circle.teamId}
          //     team={roster}
          //     side="top"
          //     delayDuration={250}
          //     disabled={isDragActive}
          //   >
          //     {table}
          //   </TeamDetailsDisclosure>
          // );
        })}
      </div>

      <div
        className={styles.spacer}
        style={{ width: HALL.width * scale, height: HALL.height * scale }}
      />
    </div>
  );
}
