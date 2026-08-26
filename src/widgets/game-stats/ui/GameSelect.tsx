import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@shared/ui";
import styles from "./GameStats.module.css";

type GameSelectProps = {
  season: number;
  gameNumber: number;
  maxSeason: number;
  maxGameNumber: number;
  onSeasonChange: (season: number) => void;
  onGameNumberChange: (gameNumber: number) => void;
};

function range(max: number): number[] {
  if (max < 1) return [];
  return Array.from({ length: max }, (_, i) => i + 1);
}

export function GameSelect({
  season,
  gameNumber,
  maxSeason,
  maxGameNumber,
  onSeasonChange,
  onGameNumberChange,
}: GameSelectProps) {
  return (
    <div className={styles.gameSelect}>
      <div className={styles.selectGroup}>
        <span className={styles.selectLabel}>Сезон</span>
        <Select
          value={season ? String(season) : ""}
          onValueChange={(v) => onSeasonChange(Number(v))}
        >
          <SelectTrigger className={styles.selectTrigger}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {range(maxSeason).map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={styles.selectGroup}>
        <span className={styles.selectLabel}>Игра</span>
        <Select
          value={gameNumber ? String(gameNumber) : ""}
          onValueChange={(v) => onGameNumberChange(Number(v))}
        >
          <SelectTrigger className={styles.selectTrigger}>
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {range(maxGameNumber).map((g) => (
              <SelectItem key={g} value={String(g)}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
