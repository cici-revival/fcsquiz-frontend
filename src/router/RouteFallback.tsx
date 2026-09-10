import styles from "./RouteFallback.module.css";

export const RouteFallback = () => (
  <div className={styles.container} role="status" aria-live="polite">
    Загрузка...
  </div>
);
