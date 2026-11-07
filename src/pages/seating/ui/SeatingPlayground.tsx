import { useCallback, useMemo, useRef, useState } from "react";
import { Frame, RotateCcw, Wand2 } from "lucide-react";

import { buildLayout } from "@entities/seating/lib/buildLayout";
import { Button } from "@shared/ui/Button";
import {
  SeatingPreview,
  type SeatingPreviewControl,
} from "@widgets/seating-editor/ui/SeatingPreview";
import { TeamPool } from "@widgets/seating-editor/ui/TeamPool";

import styles from "./SeatingPage.module.css";

const TEAM_COUNT = 90;

const MOCK_TEAMS = Array.from({ length: TEAM_COUNT }, (_, index) => ({
  teamId: `local-${index + 1}`,
  name: `Тестовая команда ${index + 1}`,
  size: 8 - (index % 7),
}));

function buildAutoPositions(): Map<string, { x: number; y: number }> {
  return new Map<string, { x: number; y: number }>(
    buildLayout(MOCK_TEAMS).placements.map(
      ({ teamId, slot }): [string, { x: number; y: number }] => [
        teamId,
        { x: slot.x, y: slot.y },
      ],
    ),
  );
}

export default function SeatingPlayground() {
  const [positions, setPositions] = useState(buildAutoPositions);
  const [showBounds, setShowBounds] = useState(true);
  const [resetToken, setResetToken] = useState(0);
  const previewRef = useRef<SeatingPreviewControl>(null);

  const pooledTeams = useMemo(
    () => MOCK_TEAMS.filter((team) => !positions.has(team.teamId)),
    [positions],
  );

  const placeTeam = useCallback(
    (teamId: string, position: { x: number; y: number }) => {
      setPositions((current) => {
        const next = new Map(current);
        next.set(teamId, position);

        return next;
      });
    },
    [],
  );

  const unplaceTeam = useCallback((teamId: string) => {
    setPositions((current) => {
      const next = new Map(current);
      next.delete(teamId);

      return next;
    });
  }, []);

  const reset = () => {
    setPositions(new Map());
    setResetToken((value) => value + 1);
  };

  const autoSeat = () => {
    setPositions(buildAutoPositions());
    setResetToken((value) => value + 1);
  };

  const dropFromPool = (
    teamId: string,
    client: { clientX: number; clientY: number },
  ) => {
    const team = MOCK_TEAMS.find((item) => item.teamId === teamId);
    if (!team) return;

    previewRef.current?.seatTeamFromClient(teamId, client, team.size);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Локальная геометрия зала</h1>

      <div className={styles.toolbar}>
        <span className={styles.progress}>
          Рассажено {positions.size} из {MOCK_TEAMS.length}. Перетаскивание — ЛКМ,
          вернуть в пул — ПКМ.
        </span>

        <div className={styles.actions}>
          <Button
            size="sm"
            variant={showBounds ? "secondary" : "ghost"}
            onClick={() => setShowBounds((value) => !value)}
            title="Показать границы зала"
          >
            <Frame size={15} />
          </Button>

          <Button size="sm" variant="outline" onClick={autoSeat}>
            <Wand2 size={15} />
            Рассадить
          </Button>

          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw size={15} />
            В пул
          </Button>
        </div>
      </div>

      <TeamPool teams={pooledTeams} onDropTeam={dropFromPool} />

      <SeatingPreview
        teams={MOCK_TEAMS}
        resetToken={resetToken}
        showBounds={showBounds}
        controlRef={previewRef}
        localPositions={positions}
        onLocalPositionChange={placeTeam}
        onLocalUnplace={unplaceTeam}
      />
    </div>
  );
}
