import { useEffect } from "react";

import { useSlotDraft } from "@features/seating/layout-editor/useSlotDraft";
import { LayoutEditorField } from "@widgets/seating-editor/ui/LayoutEditorField";
import { LayoutToolbar } from "@widgets/seating-editor/ui/LayoutToolbar";

import styles from "./SeatingPage.module.css";

export default function SeatingPage() {
  const draft = useSlotDraft();
  const { undo } = draft;

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handler);

    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Разметка столов</h1>
        <p className={styles.description}>
          Расставьте столы так, как они стоят в зале. Готовую разметку скопируйте
          и передайте — она станет постоянной сеткой для рассадки команд.
        </p>
      </header>

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
    </div>
  );
}
