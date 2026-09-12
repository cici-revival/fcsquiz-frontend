import { useCallback, useRef, useState } from "react";

import styles from "./TeamPool.module.css";

export type PoolTeam = {
  teamId: string;
  name: string;
  size: number;
};

type TeamPoolProps = {
  teams: PoolTeam[];
  onDropTeam: (teamId: string, client: { clientX: number; clientY: number }) => void;
};

// Считаем смещение от точки нажатия, а не дельту одного события: при медленном
// ведении дельты по 1-2px и порог не преодолевается.
const DRAG_THRESHOLD = 3;

export function TeamPool({ teams, onDropTeam }: TeamPoolProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragState = useRef<{
    teamId: string;
    moved: boolean;
    origin: { clientX: number; clientY: number };
  } | null>(null);
  const ghostPoint = useRef({ x: 0, y: 0 });

  // Призрак появляется только после setDraggingId, поэтому позицию держим в ref
  // и применяем в callback-ref: иначе первый кадр рисовался бы в левом верхнем углу.
  const ghostRef = useCallback((node: HTMLDivElement | null) => {
    ghostNode.current = node;

    if (node) {
      node.style.transform = `translate(${ghostPoint.current.x}px, ${ghostPoint.current.y}px)`;
    }
  }, []);

  const ghostNode = useRef<HTMLDivElement | null>(null);

  const moveGhost = (clientX: number, clientY: number) => {
    ghostPoint.current = { x: clientX, y: clientY };

    const ghost = ghostNode.current;
    if (!ghost) return;

    ghost.style.transform = `translate(${clientX}px, ${clientY}px)`;
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
    teamId: string,
  ) => {
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      teamId,
      moved: false,
      origin: { clientX: event.clientX, clientY: event.clientY },
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    if (!state) return;

    if (!state.moved) {
      const travelled = Math.hypot(
        event.clientX - state.origin.clientX,
        event.clientY - state.origin.clientY,
      );

      if (travelled <= DRAG_THRESHOLD) return;
    }

    moveGhost(event.clientX, event.clientY);

    if (!state.moved) {
      state.moved = true;
      setDraggingId(state.teamId);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const state = dragState.current;
    dragState.current = null;
    setDraggingId(null);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!state?.moved) return;

    onDropTeam(state.teamId, { clientX: event.clientX, clientY: event.clientY });
  };

  const draggingTeam = teams.find((team) => team.teamId === draggingId);

  // Пустой пул не показываем: пустая плашка «все на местах» только занимает место.
  if (teams.length === 0) {
    return null;
  }

  return (
    <div className={styles.pool}>
      <div className={styles.header}>
        <span className={styles.count}>{teams.length}</span>
        <span className={styles.label}>не рассажено</span>
      </div>

      <div className={styles.list}>
        {teams.map((team) => (
          <button
            key={team.teamId}
            type="button"
            className={`${styles.chip} ${
              draggingId === team.teamId ? styles.chipDragging : ""
            }`.trim()}
            onPointerDown={(event) => handlePointerDown(event, team.teamId)}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <span className={styles.chipName} title={team.name}>
              {team.name}
            </span>
            <span className={styles.chipSize}>{team.size}</span>
          </button>
        ))}
      </div>

      {draggingTeam && (
        <div className={styles.ghost} ref={ghostRef}>
          <span className={styles.chipName}>{draggingTeam.name}</span>
          <span className={styles.chipSize}>{draggingTeam.size}</span>
        </div>
      )}
    </div>
  );
}
