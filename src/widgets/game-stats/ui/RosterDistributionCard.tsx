import { useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@shared/ui";
import type { Team } from "@/types/api";
import { getRosterDistribution } from "@entities/team/model/teamStats";
import styles from "./GameStats.module.css";

type RosterDistributionCardProps = {
  teams: Team[];
};

export default function RosterDistributionCard({
  teams,
}: RosterDistributionCardProps) {
  const data = useMemo(() => getRosterDistribution(teams), [teams]);
  const maxCount = useMemo(
    () => data.reduce((max, bucket) => Math.max(max, bucket.count), 0),
    [data],
  );
  const totalTeams = useMemo(
    () => data.reduce((sum, bucket) => sum + bucket.count, 0),
    [data],
  );

  return (
    <Card className={styles.chartCard}>
      <CardHeader>
        <CardTitle>Распределение по составам</CardTitle>
        <CardDescription>
          Сколько команд с каким числом участников
        </CardDescription>
      </CardHeader>
      <CardContent>
        {totalTeams === 0 ? (
          <p className={styles.muted}>Нет зарегистрированных команд</p>
        ) : (
          <ul className={styles.distList}>
            {data.map(({ size, count }) => (
              <li key={size} className={styles.distRow}>
                <span className={styles.distLabel}>{size} чел.</span>
                <span className={styles.distTrack}>
                  <span
                    className={styles.distBar}
                    style={{
                      width: maxCount > 0 ? `${(count / maxCount) * 100}%` : 0,
                    }}
                  />
                </span>
                <span className={styles.distValue}>{count}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
