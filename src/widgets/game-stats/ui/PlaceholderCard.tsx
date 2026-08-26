import { Card, CardHeader, CardTitle, CardContent } from "@shared/ui";
import styles from "./GameStats.module.css";

export default function PlaceholderCard() {
  return (
    <Card className={styles.chartCard}>
      <CardHeader>
        <CardTitle>Аналитика</CardTitle>
      </CardHeader>
      <CardContent className={styles.placeholderBox}>
        <span className={styles.muted}>Придумаем попозже</span>
      </CardContent>
    </Card>
  );
}
