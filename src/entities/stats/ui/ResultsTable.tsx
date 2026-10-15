import type { ReactNode } from "react";
import type { StatsTeamScores } from "@/types/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/Table";
import { formatScore } from "../lib/formatScore";
import styles from "./ResultsTable.module.css";

export type ResultsTableRow = {
  key: string;
  label: ReactNode;
  scores: StatsTeamScores;
};

type ResultsTableProps = {
  rows: ResultsTableRow[];
  labelHeader: string;
  caption?: string;
};

export function ResultsTable({ rows, labelHeader, caption }: ResultsTableProps) {
  const roundsCount = rows.reduce(
    (max, row) => Math.max(max, row.scores.round_scores?.length ?? 0),
    0,
  );
  const rounds = Array.from({ length: roundsCount }, (_, index) => index);

  return (
    <div className={styles.wrap}>
      <Table className={styles.table}>
        {caption && <caption className={styles.caption}>{caption}</caption>}
        <TableHeader>
          <TableRow>
            <TableHead className={styles.numeric}>Место</TableHead>
            <TableHead>{labelHeader}</TableHead>
            {rounds.map((round) => (
              <TableHead key={round} className={styles.numeric}>
                Р{round + 1}
              </TableHead>
            ))}
            <TableHead className={styles.numeric}>Сумма</TableHead>
            <TableHead className={styles.numeric}>Очки</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ key, label, scores }) => (
            <TableRow key={key}>
              <TableCell className={`${styles.numeric} ${styles.place}`}>
                {scores.place}
              </TableCell>
              <TableCell className={styles.label}>{label}</TableCell>
              {rounds.map((round) => (
                <TableCell key={round} className={styles.numeric}>
                  {formatScore(scores.round_scores?.[round])}
                </TableCell>
              ))}
              <TableCell className={`${styles.numeric} ${styles.total}`}>
                {formatScore(scores.total)}
              </TableCell>
              <TableCell className={styles.numeric}>
                {formatScore(scores.points)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
