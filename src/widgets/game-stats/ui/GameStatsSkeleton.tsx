import {
  Card,
  CardHeader,
  CardContent,
  Skeleton,
} from "@shared/ui";
import styles from "./GameStats.module.css";

export default function GameStatsSkeleton() {
  return (
    <div className={styles.grid}>
      <Card className={styles.tableCard}>
        <CardHeader>
          <Skeleton className={styles.skTitle} />
          <Skeleton className={styles.skSubtitle} />
        </CardHeader>
        <CardContent className={styles.tableContent}>
          <div className={styles.skRows}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className={styles.skRow} />
            ))}
          </div>
        </CardContent>
      </Card>

      {[0, 1].map((i) => (
        <Card key={i} className={styles.chartCard}>
          <CardHeader>
            <Skeleton className={styles.skTitle} />
            <Skeleton className={styles.skSubtitle} />
          </CardHeader>
          <CardContent>
            <Skeleton className={styles.skChart} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
