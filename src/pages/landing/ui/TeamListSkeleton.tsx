import { Skeleton } from "@shared/ui/Skeleton";
import styles from "./Landing.module.css";

const DESKTOP_PLACEHOLDERS = 12;
const MOBILE_PLACEHOLDERS = 6;

type TeamListSkeletonProps = {
  isMobile: boolean;
};

export function TeamListSkeleton({ isMobile }: TeamListSkeletonProps) {
  const count = isMobile ? MOBILE_PLACEHOLDERS : DESKTOP_PLACEHOLDERS;

  return (
    <div
      className={styles.skeletonGrid}
      role="status"
      aria-busy="true"
      aria-label="Загрузка списка команд"
    >
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.skeletonCell}>
          <Skeleton
            className={styles.skeletonName}
            style={{ width: `${45 + ((i * 17) % 40)}%` }}
          />
          <Skeleton className={styles.skeletonKebab} />
        </div>
      ))}
    </div>
  );
}
