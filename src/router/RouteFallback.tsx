import styles from "./RouteFallback.module.css";

/** Заглушка на время загрузки чанка страницы. */
export const RouteFallback = () => (
  <div className={styles.container} role="status" aria-live="polite">
    Загрузка...
  </div>
);
