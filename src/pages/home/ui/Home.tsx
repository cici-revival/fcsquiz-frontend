import { GameStats } from "@widgets/game-stats";
import styles from "./Home.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Главная страница</h1>
      <GameStats />
    </div>
  );
}
