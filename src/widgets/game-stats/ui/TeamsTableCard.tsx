import { memo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/ui";
import type { Team } from "@/types/api";
import styles from "./GameStats.module.css";

type TeamsTableCardProps = {
  teams: Team[];
};

const PassesCell = memo(({ team }: { team: Team }) => {
  const passes = team.passes ?? [];
  if (passes.length === 0) {
    return <span className={styles.muted}>0</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={styles.passesTrigger}>
          {passes.length}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={4}
        className={styles.passesTooltip}
      >
        <ul className={styles.passesList}>
          {passes.map((p, i) => (
            <li key={`${p}-${i}`}>
              {i + 1}. {p}
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
});
PassesCell.displayName = "PassesCell";

function TeamsTableCard({ teams }: TeamsTableCardProps) {
  return (
    <Card className={styles.tableCard}>
      <CardHeader>
        <CardTitle>{teams.length} команд</CardTitle>
        <CardDescription>
          зарегистрировано на выбранную игру
        </CardDescription>
      </CardHeader>
      <CardContent className={styles.tableContent}>
        <div className={styles.tableScroll}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Участников</TableHead>
                <TableHead>Капитан</TableHead>
                <TableHead>TG</TableHead>
                <TableHead>Пропуска</TableHead>
                <TableHead>Принимают?</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className={styles.emptyRow}>
                    Нет зарегистрированных команд
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id ?? team.name}>
                    <TableCell className={styles.teamName}>
                      {team.name}
                    </TableCell>
                    <TableCell>{team.players_count}</TableCell>
                    <TableCell>{team.captain || "—"}</TableCell>
                    <TableCell>{team.tg || "—"}</TableCell>
                    <TableCell>
                      <PassesCell team={team} />
                    </TableCell>
                    <TableCell>
                      {team.is_ready_to_accept_players ? (
                        "Да"
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(TeamsTableCard);
