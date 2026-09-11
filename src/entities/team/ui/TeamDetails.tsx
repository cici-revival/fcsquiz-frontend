import { memo, useMemo, type ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/Tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@shared/ui/Popover";
import { useIsMobile } from "@shared/hooks/useMediaQuery";

import type { RosterTeam } from "../types";
import { displayName } from "../lib/teamName";

import styles from "./TeamDetails.module.css";

const _MAX_VISIBLE_PASSES = 6;

export const TeamDetails = memo(({ team }: { team: RosterTeam }) => {
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
      <div className={styles.title}>{displayName(team)}</div>
      <div className={styles.meta}>{team.players_count} человек</div>

      <div className={styles.blockTitle}>Пропуски</div>
      <ul className={styles.list}>{passesList || <li>—</li>}</ul>
    </>
  );
});

TeamDetails.displayName = "TeamDetails";

type TeamDetailsDisclosureProps = {
  team: RosterTeam;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Задержка перед показом. 0 — мгновенно, как на лендинге. */
  delayDuration?: number;
  /** Полностью выключить подсказку — например, пока тащат стол. */
  disabled?: boolean;
};

/**
 * На десктопе детали показываются по наведению, на тач-экранах — по тапу:
 * Tooltip на телефоне не открывается.
 */
export function TeamDetailsDisclosure({
  team,
  children,
  side = "right",
  align = "center",
  delayDuration = 0,
  disabled = false,
}: TeamDetailsDisclosureProps) {
  const isMobile = useIsMobile();

  if (disabled) {
    return <>{children}</>;
  }

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="end"
          sideOffset={4}
          className={styles.popover}
        >
          <TeamDetails team={team} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        sideOffset={5}
        className={styles.tooltip}
      >
        <TeamDetails team={team} />
      </TooltipContent>
    </Tooltip>
  );
}
