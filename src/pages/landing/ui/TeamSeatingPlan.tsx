import { useEffect, useMemo } from "react";

import { useSeatingStore } from "@entities/seating/model/seating.store";
import {
  bootstrapPublicSeating,
  shutdownPublicSeating,
} from "@entities/seating/publicSeating.bootstrap";
import { useTeamStore } from "@entities/team/model/team.store";
import { displayName } from "@entities/team/lib/teamName";
import { SeatingPlan } from "@widgets/seating-plan/ui/SeatingPlan";

import styles from "./Landing.module.css";

type TeamSeatingPlanProps = {
  query?: string;
};

export function TeamSeatingPlan({ query = "" }: TeamSeatingPlanProps) {
  const isPublished = useSeatingStore((state) => state.isPublished);
  const seatingTeams = useSeatingStore((state) => state.teams);
  const teamsMap = useTeamStore((state) => state.teams);

  useEffect(() => {
    bootstrapPublicSeating();

    return () => shutdownPublicSeating();
  }, []);

  const teams = useMemo(
    () =>
      Array.from(teamsMap.values())
        .filter((team) => team.id)
        .map((team) => ({ teamId: team.id, name: displayName(team) })),
    [teamsMap],
  );

  // Бэк отдаёт рассадку только после публикации, а это заметно позже начала
  // регистрации. Пока показывать нечего — секции просто нет.
  if (!isPublished || seatingTeams.size === 0) {
    return null;
  }

  return (
    <section className={styles.seatingPlan}>
      <h2 className={styles.sectionTitle}>Рассадка</h2>
      <SeatingPlan teams={teams} query={query} />
    </section>
  );
}
