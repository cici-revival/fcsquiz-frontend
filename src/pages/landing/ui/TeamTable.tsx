import { memo, useMemo, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/Tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/Popover";
import { useIsMobile } from "@shared/hooks/useMediaQuery";
import type { RosterTeam } from "@/entities/team/types";
import { displayName } from "./teamName";
import styles from "./Landing.module.css";

const _MAX_VISIBLE_PASSES = 6;

type TeamTableProps = {
  teams: RosterTeam[];
  query: string;
};

const TeamDetails = memo(({ team }: { team: RosterTeam }) => {
  const passesList = useMemo(() => {
    if (!team.passes?.length) return null;

    return team.passes.slice(0, _MAX_VISIBLE_PASSES).map((pass, index) => (
      <li key={pass}>
        {index + 1}. {pass}
      </li>
    ));
  }, [team.passes]);

  return (
    <>
      <div className={styles.tooltipTitle}>{displayName(team)}</div>
      <div className={styles.tooltipMeta}>{team.players_count} человек</div>

      <div className={styles.tooltipBlockTitle}>Пропуски</div>
      <ul className={styles.tooltipList}>{passesList || <li>—</li>}</ul>
    </>
  );
});

TeamDetails.displayName = "TeamDetails";

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

function TeamDetailsDisclosure({
  team,
  isMobile,
  children,
}: {
  team: RosterTeam;
  isMobile: boolean;
  children: ReactNode;
}) {
  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={4}
          className={styles.detailsPopover}
        >
          <TeamDetails team={team} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={5} className={styles.detailsTooltip}>
        <TeamDetails team={team} />
      </TooltipContent>
    </Tooltip>
  );
}

function TeamTable({ teams, query }: TeamTableProps) {
  const isMobile = useIsMobile();

  return (
    <ul className={styles.teamGrid}>
      {teams.map((team) => (
        <li key={team.id} className={styles.teamGridItem}>
          <div className={styles.cell}>
            <span className={styles.teamName}>
              <HighlightText text={displayName(team)} query={query} />
            </span>

            <TeamDetailsDisclosure team={team} isMobile={isMobile}>
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
