import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { ChevronRight, Columns3 } from "lucide-react";
import type { GameStateUploadRegistrationRecord } from "@/types/api";
import styles from "./RegistrationAccordion.module.css";

type ColumnKey =
  | "row_index"
  | "author"
  | "group"
  | "tg"
  | "team_name"
  | "players_count"
  | "passes"
  | "changes"
  | "errors";

type ColumnDef = { key: ColumnKey; label: string; defaultVisible: boolean };

const ALL_COLUMNS: ColumnDef[] = [
  { key: "row_index", label: "#", defaultVisible: true },
  { key: "author", label: "Автор", defaultVisible: true },
  { key: "group", label: "Группа", defaultVisible: false },
  { key: "tg", label: "Телеграм", defaultVisible: true },
  { key: "team_name", label: "Команда", defaultVisible: true },
  { key: "players_count", label: "Кол-во", defaultVisible: true },
  { key: "passes", label: "Пропуска", defaultVisible: false },
  { key: "changes", label: "Изменения", defaultVisible: false },
  { key: "errors", label: "Ошибки", defaultVisible: true },
];

type RowKind = "ok" | "error" | "old";
type TaggedRow = {
  record: GameStateUploadRegistrationRecord;
  kind: RowKind;
};

type Segment =
  | { type: "rows"; kind: RowKind; rows: TaggedRow[] }
  | { type: "collapse"; rows: TaggedRow[] };

function buildSegments(tagged: TaggedRow[]): Segment[] {
  if (tagged.length === 0) return [];

  const segments: Segment[] = [];
  let okBuf: TaggedRow[] = [];

  const flushOk = () => {
    if (okBuf.length === 0) return;
    segments.push({ type: "collapse", rows: [...okBuf] });
    okBuf = [];
  };

  for (const row of tagged) {
    if (row.kind === "ok") {
      okBuf.push(row);
    } else {
      flushOk();
      segments.push({ type: "rows", kind: row.kind, rows: [row] });
    }
  }
  flushOk();

  return segments;
}

function cellValue(
  record: GameStateUploadRegistrationRecord,
  key: ColumnKey,
): React.ReactNode {
  switch (key) {
    case "row_index":
      return <span className={styles.rowIndex}>{record.row_index + 2}</span>;
    case "author":
      return record.author || "—";
    case "group":
      return record.group || "—";
    case "tg":
      return record.tg || "—";
    case "team_name":
      return record.team_name || "—";
    case "players_count":
      return record.players_count;
    case "passes":
      return record.passes?.length ? record.passes.join(", ") : "—";
    case "changes":
      return record.changes || "—";
    case "errors": {
      const errs = record.errors;
      if (!errs || errs.length === 0) return null;
      return (
        <div className={styles.errorsCell}>
          {errs.map((e, i) => (
            <span key={i} className={styles.errorTag}>
              {e}
            </span>
          ))}
        </div>
      );
    }
  }
}

function rowClassName(kind: RowKind) {
  switch (kind) {
    case "ok":
      return styles.rowOk;
    case "error":
      return styles.rowError;
    case "old":
      return styles.rowOld;
  }
}

interface Props {
  newRecords: GameStateUploadRegistrationRecord[];
  oldRecords: GameStateUploadRegistrationRecord[];
}

export default function RegistrationAccordion({
  newRecords,
  oldRecords,
}: Props) {
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(
    () => new Set(ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key)),
  );
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [columnsOpen, setColumnsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!columnsOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setColumnsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [columnsOpen]);

  const tagged = useMemo<TaggedRow[]>(() => {
    const newTagged: TaggedRow[] = newRecords.map((r) => ({
      record: r,
      kind: r.errors && r.errors.length > 0 ? "error" : "ok",
    }));
    const oldTagged: TaggedRow[] = oldRecords.map((r) => ({
      record: r,
      kind: "old" as const,
    }));
    return [...newTagged, ...oldTagged].sort(
      (a, b) => a.record.row_index - b.record.row_index,
    );
  }, [newRecords, oldRecords]);

  const segments = useMemo(() => buildSegments(tagged), [tagged]);


  const toggleCol = useCallback((key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const cols = ALL_COLUMNS.filter((c) => visibleCols.has(c.key));
  const colCount = cols.length;

  const renderDataRow = (row: TaggedRow) => (
    <tr key={row.record.id} className={rowClassName(row.kind)}>
      {cols.map((col) => (
        <td
          key={col.key}
          className={col.key === "errors" ? styles.tdErrors : undefined}
        >
          {cellValue(row.record, col.key)}
        </td>
      ))}
    </tr>
  );

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>

        <div className={styles.columnsToggle} ref={dropdownRef}>
          <button
            type="button"
            className={styles.columnsButton}
            onClick={() => setColumnsOpen((o) => !o)}
          >
            <Columns3 size={14} />
            Столбцы
          </button>
          {columnsOpen && (
            <div className={styles.columnsDropdown}>
              {ALL_COLUMNS.map((col) => (
                <label key={col.key} className={styles.columnOption}>
                  <input
                    type="checkbox"
                    checked={visibleCols.has(col.key)}
                    onChange={() => toggleCol(col.key)}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {cols.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {segments.map((seg, idx) => {
              if (seg.type === "rows") {
                return seg.rows.map((row) => renderDataRow(row));
              }

              const isOpen = expanded.has(idx);
              return [
                <tr key={`c-${idx}`} className={styles.collapseRow}>
                  <td colSpan={colCount} style={{ padding: 0 }}>
                    <button
                      type="button"
                      className={styles.collapseButton}
                      onClick={() => toggleExpand(idx)}
                    >
                      <ChevronRight
                        size={14}
                        className={`${styles.collapseIcon} ${isOpen ? styles.collapseIconOpen : ""}`}
                      />
                      {isOpen
                        ? `Скрыть ${seg.rows.length} ${pluralRows(seg.rows.length)}`
                        : `Показать ${seg.rows.length} ${pluralRows(seg.rows.length)}`}
                    </button>
                  </td>
                </tr>,
                ...(isOpen ? seg.rows.map((row) => renderDataRow(row)) : []),
              ];
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pluralRows(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "строку";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "строки";
  return "строк";
}
