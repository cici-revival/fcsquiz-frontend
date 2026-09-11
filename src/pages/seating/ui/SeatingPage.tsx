import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CloudUpload, Frame, RotateCcw, Wand2 } from "lucide-react";

import { useTeamStore } from "@entities/team/model/team.store";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import {
  publishSeating,
  unplaceTeamSeating,
  updateTeamSeating,
} from "@entities/seating/model/seating.ws";
import {
  DEFAULT_SEATING_COLOR,
  getTableRadius,
} from "@entities/seating/config/hall";
import {
  buildLayout,
  type LayoutTeam,
} from "@entities/seating/lib/buildLayout";
import {
  bootstrapSeating,
  shutdownSeating,
} from "@entities/seating/seating.bootstrap";
import { getSeatingErrorMessage } from "@shared/api/statusMessages";
import { displayName } from "@entities/team/lib/teamName";
import {
  SeatingPreview,
  type SeatingPreviewControl,
} from "@widgets/seating-editor/ui/SeatingPreview";
import { TeamPool } from "@widgets/seating-editor/ui/TeamPool";
import { Button } from "@shared/ui/Button";

import styles from "./SeatingPage.module.css";

export default function SeatingPage() {
  const [resetToken, setResetToken] = useState(0);
  const [showBounds, setShowBounds] = useState(false);
  const [isPublishing, setPublishing] = useState(false);
  const [isResetting, setResetting] = useState(false);
  const [isAutoSeating, setAutoSeating] = useState(false);
  const teamsMap = useTeamStore((state) => state.teams);
  const status = useTeamStore((state) => state.status);
  const seatingStatus = useSeatingStore((state) => state.status);
  const isPublished = useSeatingStore((state) => state.isPublished);
  const seatingTeams = useSeatingStore((state) => state.teams);
  const hasPlacedTeams = useSeatingStore((state) => {
    for (const team of state.teams.values()) {
      if (team.position) return true;
    }

    return false;
  });

  useEffect(() => {
    bootstrapSeating();

    return () => shutdownSeating();
  }, []);

  const teams = useMemo(
    () =>
      Array.from(teamsMap.values())
        .filter((team) => team.id)
        .map((team) => ({
          teamId: team.id,
          name: displayName(team),
          size: team.players_count ?? 0,
        })),
    [teamsMap],
  );

  const previewRef = useRef<SeatingPreviewControl>(null);

  const pooledTeams = useMemo(() => {
    const pooled = teams.filter((team) => !seatingTeams.get(team.teamId)?.position);

    // Команда может быть в игре, но отсутствовать в составе из SSE (например,
    // без названия). Её тоже показываем: иначе она молча блокирует публикацию.
    const known = new Set(teams.map((team) => team.teamId));
    for (const team of seatingTeams.values()) {
      if (team.position || known.has(team.team_id)) continue;

      pooled.push({
        teamId: team.team_id,
        name: "Без названия",
        size: team.size,
      });
    }

    return pooled;
  }, [teams, seatingTeams]);

  // Поле рисует только те команды, которые пришли пропсом, поэтому
  // добавляем к составу и тех, кто есть в рассадке, но не в составе.
  const fieldTeams = useMemo(() => {
    const known = new Set(teams.map((team) => team.teamId));
    const strays = Array.from(seatingTeams.values())
      .filter((team) => !known.has(team.team_id))
      .map((team) => ({
        teamId: team.team_id,
        name: "Без названия",
        size: team.size,
      }));

    return strays.length > 0 ? [...teams, ...strays] : teams;
  }, [teams, seatingTeams]);

  const handleDropFromPool = useCallback(
    (teamId: string, client: { clientX: number; clientY: number }) => {
      // Размер ищем и в составе, и в сторе рассадки: команды без названия
      // в составе из SSE может не быть.
      const size =
        pooledTeams.find((item) => item.teamId === teamId)?.size ??
        useSeatingStore.getState().teams.get(teamId)?.size;

      if (size === undefined) return;

      previewRef.current?.seatTeamFromClient(teamId, client, size);
    },
    [pooledTeams],
  );

  // Алгоритм считает раскладку для всего состава сразу, поэтому автопосадка
  // берёт координаты из него и шлёт только для тех, кто ещё в пуле.
  const handleAutoSeat = useCallback(async () => {
    setAutoSeating(true);

    const store = useSeatingStore.getState();
    const sizeById = new Map(teams.map((team) => [team.teamId, team.size]));

    const occupied = Array.from(store.teams.values())
      .filter((team) => team.position && sizeById.has(team.team_id))
      .map((team) => ({
        teamId: team.team_id,
        x: team.position!.x,
        y: team.position!.y,
        radius: getTableRadius(sizeById.get(team.team_id) ?? team.size),
      }));

    // Публикацию проверяет бэк по своему снимку, а он включает всех, кто есть
    // в игре — в том числе команды, которых нет в составе из SSE (например,
    // без названия). Если раскладывать только по составу, такая команда
    // навсегда останется непосаженной и заблокирует публикацию.
    const known = new Set(teams.map((team) => team.teamId));
    const strays = Array.from(store.teams.values())
      .filter((team) => !known.has(team.team_id))
      .map(({ team_id, size }): LayoutTeam => ({ teamId: team_id, size }));

    const layout = buildLayout(
      [
        ...teams.map(({ teamId, size }): LayoutTeam => ({ teamId, size })),
        ...strays,
      ],
      occupied,
    );

    const pending = layout.placements;

    const failed = (
      await Promise.all(
        pending.map(({ teamId, slot }) =>
          updateTeamSeating({
            teamId,
            color: store.teams.get(teamId)?.color || DEFAULT_SEATING_COLOR,
            position: { x: slot.x, y: slot.y },
            expectedRevision: store.teams.get(teamId)?.revision ?? 0,
          }),
        ),
      )
    ).filter((ack) => !ack.ok);

    setAutoSeating(false);

    if (layout.overflow.length > 0) {
      toast.error(`Не хватило места командам: ${layout.overflow.length}`);
    }

    if (failed.length > 0) {
      toast.error(`Не удалось посадить команд: ${failed.length}`);
    }
  }, [teams]);

  const handleReset = useCallback(async () => {
    setResetting(true);

    const seated = Array.from(useSeatingStore.getState().teams.values()).filter(
      (team) => team.position,
    );

    const failed = (
      await Promise.all(
        seated.map((team) =>
          unplaceTeamSeating({
            teamId: team.team_id,
            expectedRevision: team.revision,
          }),
        ),
      )
    ).filter((ack) => !ack.ok);

    setResetting(false);
    setResetToken((token) => token + 1);

    if (failed.length > 0) {
      toast.error(`Не удалось снять с мест команд: ${failed.length}`);
    }
  }, []);

  // Аварийный выход: если бэк требует команду, которой нет ни в составе, ни
  // в рассадке, посадить её обычным способом нельзя. Команду update_team бэк
  // принимает по любому известному ему team_id, поэтому сажаем вслепую.
  const seatUnplacedById = useCallback(async (ids: string[]) => {
    const store = useSeatingStore.getState();
    const occupied = Array.from(store.teams.values())
      .filter((team) => team.position)
      .map((team) => ({
        teamId: team.team_id,
        x: team.position!.x,
        y: team.position!.y,
        radius: getTableRadius(team.size),
      }));

    const layout = buildLayout(
      ids.map((teamId): LayoutTeam => ({ teamId, size: 0 })),
      occupied,
    );

    const failed = (
      await Promise.all(
        layout.placements.map(({ teamId, slot }) =>
          updateTeamSeating({
            teamId,
            color: store.teams.get(teamId)?.color || DEFAULT_SEATING_COLOR,
            position: { x: slot.x, y: slot.y },
            expectedRevision: store.teams.get(teamId)?.revision ?? 0,
          }),
        ),
      )
    ).filter((ack) => !ack.ok);

    return failed.length;
  }, []);

  const handlePublish = useCallback(async () => {
    setPublishing(true);

    const ack = await publishSeating();

    setPublishing(false);

    if (ack.ok) {
      toast.success("Рассадка опубликована");

      return;
    }

    if (ack.code === "seating_incomplete") {
      const ids = ack.details?.unplaced_team_ids ?? [];

      if (ids.length === 0) {
        toast.error(getSeatingErrorMessage(ack.code));

        return;
      }

      // Бэк проверяет по своему снимку. Если он требует команду, которой у нас
      // нет ни в составе, ни в рассадке, посадить её из интерфейса нельзя —
      // и об этом нужно сказать прямо, а не показывать общее «не рассажено».
      const store = useSeatingStore.getState();
      const known = new Set(teams.map((team) => team.teamId));
      const invisible = ids.filter(
        (id) => !known.has(id) && !store.teams.has(id),
      );

      console.warn("Не рассажены:", ids, "из них невидимых фронту:", invisible);

      if (invisible.length > 0) {
        const failed = await seatUnplacedById(invisible);

        toast[failed > 0 ? "error" : "success"](
          failed > 0
            ? `Не удалось посадить команд: ${failed}`
            : `Посажено вслепую: ${invisible.length}. Нажмите «Опубликовать» ещё раз`,
        );

        return;
      }

      toast.error(`Не рассажено команд: ${ids.length}`);

      return;
    }

    toast.error(getSeatingErrorMessage(ack.code));
  }, [teams, seatUnplacedById]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Рассадка</h1>
          <p className={styles.description}>
            Перетащите команду из пула на место. ПКМ по столу возвращает её в пул.
          </p>
        </div>
      </header>

      <div className={styles.summary}>
        <span className={styles.count}>{teams.length}</span>
        <span className={styles.label}>команд в игре</span>
        {status !== "connected" && (
          <span className={styles.pending}>Данные ещё загружаются…</span>
        )}
        {status === "connected" && seatingStatus !== "connected" && (
          <span className={styles.pending}>Рассадка подключается…</span>
        )}
        {isPublished && <span className={styles.pending}>Опубликована</span>}

        <Button
          variant={showBounds ? "default" : "outline"}
          className={styles.reset}
          onClick={() => setShowBounds((value) => !value)}
        >
          <Frame size={16} />
          Границы зала
        </Button>

        {pooledTeams.length > 0 && (
          <Button
            className={styles.reset}
            onClick={handleAutoSeat}
            disabled={isAutoSeating || seatingStatus !== "connected"}
          >
            <Wand2 size={16} />
            Рассадить автоматически
          </Button>
        )}

        {hasPlacedTeams && (
          <Button
            variant="outline"
            className={styles.reset}
            onClick={handleReset}
            disabled={isResetting || seatingStatus !== "connected"}
          >
            <RotateCcw size={16} />
            Убрать всех в пул
          </Button>
        )}

        <Button
          className={styles.reset}
          onClick={handlePublish}
          disabled={isPublishing || seatingStatus !== "connected"}
        >
          <CloudUpload size={16} />
          {isPublished ? "Опубликовать заново" : "Опубликовать"}
        </Button>
      </div>

      <TeamPool teams={pooledTeams} onDropTeam={handleDropFromPool} />

      <SeatingPreview
        teams={fieldTeams}
        resetToken={resetToken}
        showBounds={showBounds}
        controlRef={previewRef}
      />
    </div>
  );
}
