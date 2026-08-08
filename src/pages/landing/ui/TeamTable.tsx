import { memo, useMemo } from "react";
import { Table, TableBody, TableCell, TableRow } from "@shared/ui/Table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/Tooltip";
import type { RosterTeam } from "@/entities/team/types";
import styles from "./Landing.module.css";

const _UNNAMED_TEAM_PLACEHOLDER = "Без названия";

export function displayName(team: RosterTeam): string {
  return team.name || _UNNAMED_TEAM_PLACEHOLDER;
}

type TeamTableProps = {
  teams: RosterTeam[];
  query: string;
};

const CELL_STYLE = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  borderRadius: 8,
} as const;

const TEAM_NAME_STYLE = {
  fontWeight: 600,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

const TeamDetailsTooltip = memo(({ team }: { team: RosterTeam }) => {
  const passesList = useMemo(() => {
    if (!team.passes?.length) return null;
    return team.passes.slice(0, 6).map((p, ind) => (
      <li key={p}>{ind + 1}. {p}</li>
    ));
  }, [team.passes]);

  return (
    <div className={styles.tooltipCard}>
      <div className={styles.tooltipTitle}>{displayName(team)}</div>
      <div className={styles.tooltipMeta}>
        {team.players_count} человек
      </div>

      <div className={styles.tooltipBlockTitle}>Пропуски</div>
      <ul className={styles.tooltipList}>
        {passesList || <li>—</li>}
      </ul>
    </div>
  );
});

TeamDetailsTooltip.displayName = "TeamDetailsTooltip";

// Функция для выделения текста поиска
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} style={{ backgroundColor: 'yellow' }}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function TeamTable({ teams, query }: TeamTableProps) {
  const rows = useMemo(() => {
    const result: RosterTeam[][] = [];
    for (let i = 0; i < teams.length; i += 3) {
      result.push(teams.slice(i, i + 3));
    }
    return result;
  }, [teams]);

  const emptyCells = useMemo(() => {
    const lastRow = rows[rows.length - 1];
    if (!lastRow || lastRow.length >= 3) return null;

    return Array.from({ length: 3 - lastRow.length }).map((_, i) => (
      <TableCell key={`empty-${i}`} />
    ));
  }, [rows]);

  return (
    <Table>
      <TableBody>
        {rows.map((row, rowIndex) => (
          <TableRow key={rowIndex}>
            {row.map((team) => (
              <TableCell key={team.id}>
                <div className={styles.cell} style={CELL_STYLE}>
                  <span style={TEAM_NAME_STYLE}>
                    <HighlightText text={displayName(team)} query={query} />
                  </span>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={styles.kebab}
                        aria-label={`Подробнее о ${displayName(team)}`}
                      >
                        ···
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={5}>
                      <TeamDetailsTooltip team={team} />
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            ))}

            {rowIndex === rows.length - 1 && emptyCells}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Кастомная функция сравнения для memo
function arePropsEqual(prevProps: TeamTableProps, nextProps: TeamTableProps) {
  // Если изменился поиск - нужно перерендерить (для подсветки)
  if (prevProps.query !== nextProps.query) return false;

  // Если изменились команды - нужно перерендерить
  if (prevProps.teams.length !== nextProps.teams.length) return false;

  // Быстрая проверка первых элементов
  if (prevProps.teams[0]?.name !== nextProps.teams[0]?.name) return false;

  return true;
}

export default memo(TeamTable, arePropsEqual);
