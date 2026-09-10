import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Frame,
  LayoutGrid,
  PencilRuler,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { useTeamStore } from "@entities/team/model/team.store";
import { displayName } from "@pages/landing/ui/teamName";
import { useSlotDraft } from "@features/seating/layout-editor/useSlotDraft";
import { LayoutEditorField } from "@widgets/seating-editor/ui/LayoutEditorField";
import { LayoutToolbar } from "@widgets/seating-editor/ui/LayoutToolbar";
import { SeatingPreview } from "@widgets/seating-editor/ui/SeatingPreview";
import { Button } from "@shared/ui/Button";
import { ZOOM_LEVELS } from "@entities/seating/lib/fieldCoords";

import styles from "./SeatingPage.module.css";

type Mode = "seating" | "layout";

export default function SeatingPage() {
  const [mode, setMode] = useState<Mode>("seating");
  const [isDirty, setDirty] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const [showBounds, setShowBounds] = useState(false);
  const [zoomIndex, setZoomIndex] = useState(
    ZOOM_LEVELS.indexOf(1) === -1 ? 0 : ZOOM_LEVELS.indexOf(1),
  );
  const teamsMap = useTeamStore((state) => state.teams);
  const status = useTeamStore((state) => state.status);
  const draft = useSlotDraft();
  const { undo } = draft;

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

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setDirty(dirty);
  }, []);

  useEffect(() => {
    if (mode !== "layout") return;

    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [mode, undo]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Рассадка</h1>
          <p className={styles.description}>
            {mode === "seating"
              ? "Команды текущей игры на местах: крупные — у сцены, остальные по геометрии зала."
              : "Расставьте столы так, как они стоят в зале, и скопируйте разметку."}
          </p>
        </div>

        <div className={styles.modes}>
          <Button
            variant={mode === "seating" ? "default" : "outline"}
            onClick={() => setMode("seating")}
          >
            <LayoutGrid size={16} />
            Рассадка
          </Button>
          <Button
            variant={mode === "layout" ? "default" : "outline"}
            onClick={() => setMode("layout")}
          >
            <PencilRuler size={16} />
            Разметка столов
          </Button>
        </div>
      </header>

      {mode === "seating" ? (
        <>
          <div className={styles.summary}>
            <span className={styles.count}>{teams.length}</span>
            <span className={styles.label}>команд в игре</span>
            {status !== "connected" && (
              <span className={styles.pending}>Данные ещё загружаются…</span>
            )}

            <div className={styles.zoom}>
              <Button
                variant="outline"
                onClick={() => setZoomIndex((index) => Math.max(0, index - 1))}
                disabled={zoomIndex === 0}
                aria-label="Уменьшить"
              >
                <ZoomOut size={16} />
              </Button>
              <span className={styles.zoomValue}>
                {Math.round(ZOOM_LEVELS[zoomIndex] * 100)}%
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setZoomIndex((index) => Math.min(ZOOM_LEVELS.length - 1, index + 1))
                }
                disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                aria-label="Увеличить"
              >
                <ZoomIn size={16} />
              </Button>
            </div>

            <Button
              variant={showBounds ? "default" : "outline"}
              onClick={() => setShowBounds((value) => !value)}
            >
              <Frame size={16} />
              Границы зала
            </Button>

            {isDirty && (
              <Button
                variant="outline"
                className={styles.reset}
                onClick={() => setResetToken((token) => token + 1)}
              >
                <RotateCcw size={16} />
                Рассадить заново
              </Button>
            )}
          </div>

          <SeatingPreview
            teams={teams}
            onDirtyChange={handleDirtyChange}
            resetToken={resetToken}
            showBounds={showBounds}
            zoom={ZOOM_LEVELS[zoomIndex]}
          />
        </>
      ) : (
        <>
          <LayoutToolbar
            slots={draft.slots}
            canUndo={draft.canUndo}
            onUndo={draft.undo}
            onRenumber={draft.renumber}
            onClear={draft.clear}
            onReplaceAll={draft.replaceAll}
          />

          <LayoutEditorField
            slots={draft.slots}
            onAddSlot={draft.addSlot}
            onBeginMove={draft.beginMove}
            onMoveSlot={draft.moveSlot}
            onRemoveSlot={draft.removeSlot}
          />
        </>
      )}
    </div>
  );
}
