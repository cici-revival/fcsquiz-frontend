import { memo } from "react";
import type { RosterTeam } from "@/entities/team/types";
import { displayName } from "@entities/team/lib/teamName";
import { TeamDetailsDisclosure } from "@entities/team/ui/TeamDetails";
import styles from "./Landing.module.css";

type TeamTableProps = {
  teams: RosterTeam[];
  query: string;
  seatNumbers?: Map<string, number>;
};

function HighlightText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark key={i} className={styles.highlight}>
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function TeamTable({ teams, query, seatNumbers }: TeamTableProps) {
  return (
    <ul className={styles.teamGrid}>
      {teams.map((team) => (
        <li key={team.id} className={styles.teamGridItem}>
          <div className={styles.cell}>
            <span className={styles.teamName}>
              <HighlightText text={displayName(team)} query={query} />
            </span>

            <TeamDetailsDisclosure
              team={team}
              seatNumber={seatNumbers?.get(team.id) ?? null}
            >
              <button
                type="button"
                className={styles.kebab}
                aria-label={`Подробнее о ${displayName(team)}`}
              >
                ···
              </button>
            </TeamDetailsDisclosure>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default memo(TeamTable);
