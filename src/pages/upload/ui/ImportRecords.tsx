import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type {
  RegistrationImportRecord,
  RegistrationImportRecordType,
} from "@/types/api";
import { Button } from "@shared/ui/Button";
import { Switch } from "@shared/ui/Switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/Table";
import styles from "./ImportRecords.module.css";

const PAGE_SIZE = 100;

const TYPE_LABELS: Record<RegistrationImportRecordType, string> = {
  register: "Регистрация",
  change: "Изменение",
  lost: "Без команды",
  change_with_llm: "Изменение (ИИ)",
  unknown: "Не распознано",
};

const EMPTY = "—";

function typeLabel(type: string): string {
  return TYPE_LABELS[type as RegistrationImportRecordType] ?? type ?? EMPTY;
}

function hasError(record: RegistrationImportRecord): boolean {
  return !!record.validation_error?.trim();
}

const NO_RECORDS: RegistrationImportRecord[] = [];

type ImportRecordsProps = {
  records: RegistrationImportRecord[] | undefined;
};

export function ImportRecords({ records = NO_RECORDS }: ImportRecordsProps) {
  const sorted = useMemo(
    () => [...records].sort((a, b) => a.row_index - b.row_index),
    [records],
  );
  const errorCount = useMemo(() => sorted.filter(hasError).length, [sorted]);

  const [onlyErrors, setOnlyErrors] = useState(errorCount > 0);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shownRecords, setShownRecords] = useState(records);

  if (shownRecords !== records) {
    setShownRecords(records);
    setOnlyErrors(errorCount > 0);
    setVisibleCount(PAGE_SIZE);
  }

  const filtered = onlyErrors ? sorted.filter(hasError) : sorted;
  const visible = filtered.slice(0, visibleCount);
  const hiddenCount = filtered.length - visible.length;

  if (records.length === 0) {
    return (
      <section className={styles.section} aria-label="Записи импорта">
        <p className={styles.empty}>В файле не найдено ни одной записи</p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-label="Записи импорта">
      <div className={styles.toolbar}>
        <p className={styles.summary}>
          Строк: {records.length}
          {errorCount > 0 ? (
            <span className={styles.summaryError}>
              <TriangleAlert size={16} />
              с ошибками: {errorCount}
            </span>
          ) : (
            <span> · ошибок нет</span>
          )}
        </p>

        {errorCount > 0 && (
          <label className={styles.filter}>
            <Switch
              checked={onlyErrors}
              onCheckedChange={(checked) => {
                setOnlyErrors(checked);
                setVisibleCount(PAGE_SIZE);
              }}
              aria-label="Только ошибки"
            />
            Только ошибки
          </label>
        )}
      </div>

      <div className={styles.tableWrap}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Строка</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead>Команда</TableHead>
              <TableHead>Игроков</TableHead>
              <TableHead>Ошибка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((record) => (
              <TableRow
                key={record.id || record.row_index}
                className={hasError(record) ? styles.errorRow : undefined}
              >
                <TableCell>{record.row_index}</TableCell>
                <TableCell>{typeLabel(record.type)}</TableCell>
                <TableCell>{record.team_name?.trim() || EMPTY}</TableCell>
                <TableCell>{record.players_count || EMPTY}</TableCell>
                <TableCell className={styles.errorCell}>
                  {record.validation_error?.trim() || EMPTY}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hiddenCount > 0 && (
        <div className={styles.more}>
          <Button
            variant="outline"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Показать ещё ({hiddenCount})
          </Button>
        </div>
      )}
    </section>
  );
}
