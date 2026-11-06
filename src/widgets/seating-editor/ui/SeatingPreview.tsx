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
import type { PackedCircle } from "@entities/seating/lib/layoutTypes";
import { DEFAULT_SEATING_COLOR } from "@entities/seating/config/hall";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import {
  unplaceTeamSeating,
  updateTeamSeating,
} from "@entities/seating/model/seating.ws";
import { getSeatingErrorMessage } from "@shared/api/statusMessages";
import { useTeamStore } from "@entities/team/model/team.store";
import { TeamDetails } from "@entities/team/ui/TeamDetails";
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
const HOVER_DELAY_MS = 250;

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
    () => buildLayout(teams.map(({ teamId, size, name }): LayoutTeam => ({ teamId, size, name }))),
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
  const sizeById = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team.size])),
    [teams],
  );

  const circles = useMemo<PackedCircle[]>(
    () =>
      computed.placements
        .filter(({ teamId }) => Boolean(seatingTeams.get(teamId)?.position))
        .map(({ teamId, slot }) => {
          const saved = seatingTeams.get(teamId)?.position;
          const size = sizeById.get(teamId);

          return {
            teamId,
            x: dragging[teamId]?.x ?? saved?.x ?? slot.x,
            y: dragging[teamId]?.y ?? saved?.y ?? slot.y,
            // Радиус считаем от состава, а не берём из слота раскладки: слот
            // пересчитывается при смене состава, и сохранённый стол начинал
            // рисоваться чужим размером, наезжая на соседей.
            radius: size === undefined ? slot.radius : getTableRadius(size),
          };
        }),
    [computed.placements, dragging, seatingTeams, sizeById],
  );

  // seatTeamAt читает актуальные круги через ref: иначе колбэк пришлось бы
  // пересоздавать на каждое движение и переустанавливать imperative handle.
  // Зал растягивается под раскладку: рядов может быть больше, чем влезает
  // в номинальную высоту, и обрезать их нельзя.
  const fieldHeight = useMemo(() => {
    const lowest = circles.reduce(
      (bottom, circle) => Math.max(bottom, circle.y + circle.radius),
      0,
    );

    return Math.max(HALL.height, Math.ceil(lowest + HALL_GEOMETRY.bottomMargin));
  }, [circles]);

  const circlesRef = useRef(circles);
  circlesRef.current = circles;

  const names = useMemo(
    () => new Map(teams.map((team) => [team.teamId, team])),
    [teams],
  );

  // Подробности (пропуски) живут в сторе составов, а не в пропсах виджета.
  const rosterTeams = useTeamStore((state) => state.teams);

  // Подсказку ведём сами: Radix-триггер вешает свои onPointerMove/Down на ту
  // же кнопку, за которую тащат стол, и ломает перетаскивание.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHover = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
  }, []);

  // Показываем не сразу: курсор постоянно проезжает над чужими столами,
  // и без задержки подсказка мигала бы на каждом проходе.
  const scheduleHover = useCallback(
    (teamId: string) => {
      cancelHover();
      hoverTimeout.current = setTimeout(() => {
        hoverTimeout.current = null;
        setHoveredId(teamId);
      }, HOVER_DELAY_MS);
    },
    [cancelHover],
  );

  const hideHover = useCallback(() => {
    cancelHover();
    setHoveredId(null);
  }, [cancelHover]);

  useEffect(() => cancelHover, [cancelHover]);

  // Пока тащат стол, подсказка только мешает: она перехватывала бы курсор
  // и мигала при проходе над соседями.
  const [isDragActive, setDragActive] = useState(false);

  // Во время перетаскивания подсказка только мешает.
  const hovered = useMemo(() => {
    if (isDragActive || !hoveredId) return null;

    const team = rosterTeams.get(hoveredId);
    const circle = circles.find((item) => item.teamId === hoveredId);

    if (!team || !circle) return null;

    return { team, circle };
  }, [isDragActive, hoveredId, rosterTeams, circles]);
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
      // Отложенная подсказка не должна всплыть посреди перетаскивания.
      hideHover();
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
        style={{ width: HALL.width, height: fieldHeight, transform: `scale(${scale})` }}
      >
        <div
          className={styles.stage}
          style={{
            height: HALL.stageHeight + HALL.stageBulge,
            borderRadius: `0 0 50% 50% / 0 0 ${HALL.stageBulge}px ${HALL.stageBulge}px`,
          }}
        >
          {/* Сцена */}
        </div>

        <div
          className={styles.aisle}
          style={{
            left: HALL_GEOMETRY.aisle.left,
            width: HALL_GEOMETRY.aisle.right - HALL_GEOMETRY.aisle.left,
            top: HALL.stageHeight + 40,
            height: fieldHeight - HALL.stageHeight,
          }}
        />

        {showBounds && <HallBounds />}

        {circles.map((circle) => {
          const team = names.get(circle.teamId);
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
              onPointerEnter={() => scheduleHover(circle.teamId)}
              onPointerLeave={hideHover}
              onContextMenu={(event) => handleContextMenu(event, circle.teamId)}
            >
              <span className={styles.tableName}>{team?.name ?? "—"}</span>
              <span className={styles.tableSize}>{team?.size ?? 0}</span>
            </button>
          );

          return table;
        })}

        {hovered && (
          <div
            className={styles.details}
            style={{
              left: hovered.circle.x,
              top: hovered.circle.y - hovered.circle.radius - 10,
              // Поле отмасштабировано целиком, поэтому подсказку возвращаем
              // к единице: иначе текст в ней мельчает вместе со столами.
              transform: `translate(-50%, -100%) scale(${1 / scale})`,
              transformOrigin: "bottom center",
            }}
          >
            <TeamDetails team={hovered.team} />
          </div>
        )}
      </div>

      <div
        className={styles.spacer}
        style={{ width: HALL.width * scale, height: fieldHeight * scale }}
      />
    </div>
  );
}
