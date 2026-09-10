import { useState } from "react";
import toast from "react-hot-toast";
import { Copy, ClipboardPaste, ListOrdered, Trash2, Undo2 } from "lucide-react";

import { Button } from "@shared/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@shared/ui/Dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@shared/ui/AlertDialog";
import type { SeatSlot } from "@entities/seating/config/hall";
import { parseSlots, serializeSlots } from "@features/seating/layout-editor/slotDraftJson";

import styles from "./LayoutToolbar.module.css";

type LayoutToolbarProps = {
  slots: SeatSlot[];
  canUndo: boolean;
  onUndo: () => void;
  onRenumber: () => void;
  onClear: () => void;
  onReplaceAll: (slots: SeatSlot[]) => void;
};

export function LayoutToolbar({
  slots,
  canUndo,
  onUndo,
  onRenumber,
  onClear,
  onReplaceAll,
}: LayoutToolbarProps) {
  const [isImportOpen, setImportOpen] = useState(false);
  const [isClearOpen, setClearOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const rows = slots.length > 0 ? Math.max(...slots.map((slot) => slot.row)) : 0;

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(serializeSlots(slots));
      toast.success(`Скопировано столов: ${slots.length}`);
    } catch {
      toast.error("Не удалось скопировать в буфер обмена");
    }
  }

  function applyImport() {
    try {
      onReplaceAll(parseSlots(importText));
      setImportOpen(false);
      setImportText("");
      toast.success("Разметка загружена");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Не удалось разобрать разметку",
      );
    }
  }

  return (
    <div className={styles.toolbar}>
      <div className={styles.stats}>
        <span className={styles.count}>{slots.length}</span>
        <span className={styles.label}>столов в {rows} рядах</span>
      </div>

      <div className={styles.actions}>
        <Button variant="outline" onClick={copyJson} disabled={slots.length === 0}>
          <Copy size={16} />
          Скопировать JSON
        </Button>

        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <ClipboardPaste size={16} />
          Вставить JSON
        </Button>

        <Button variant="outline" onClick={onRenumber} disabled={slots.length === 0}>
          <ListOrdered size={16} />
          Пронумеровать
        </Button>

        <Button variant="outline" onClick={onUndo} disabled={!canUndo}>
          <Undo2 size={16} />
          Отменить
        </Button>

        <Button
          variant="outline"
          onClick={() => setClearOpen(true)}
          disabled={slots.length === 0}
        >
          <Trash2 size={16} />
          Очистить
        </Button>
      </div>

      <p className={styles.hint}>
        Клик по полю — добавить стол. Перетаскивание — двигать, с Shift — по сетке.
        Правый клик — удалить.
      </p>

      <Dialog open={isImportOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Вставить разметку</DialogTitle>
            <DialogDescription>
              Подойдёт любой текст с парами координат — JSON или литерал из кода.
            </DialogDescription>
          </DialogHeader>

          <textarea
            className={styles.textarea}
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder='[{ "x": 100, "y": 200 }, ...]'
            rows={10}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Отмена
            </Button>
            <Button onClick={applyImport} disabled={!importText.trim()}>
              Загрузить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isClearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить всю разметку?</AlertDialogTitle>
            <AlertDialogDescription>
              Будут удалены все {slots.length} столов. Действие можно отменить кнопкой
              «Отменить».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={onClear}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
