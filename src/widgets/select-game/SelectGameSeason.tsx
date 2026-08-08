// SelectGameSeason.tsx
import { Input } from "@/shared/ui";
import styles from "./SelectGameSeason.module.css";
import { useTeamStore } from "@/entities/team/model/team.store";
import { useState, useEffect } from "react";

interface SelectGameSeasonProps {
  onSeasonChange: (season: number) => void;
  onGameNumberChange: (gameNumber: number) => void;
  initialSeason?: number;
  initialGameNumber?: number;
}

export default function SelectGameSeason({
  onSeasonChange,
  onGameNumberChange,
  initialSeason,
  initialGameNumber
}: SelectGameSeasonProps) {
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  // Используем строки для возможности пустого значения
  const [seasonInput, setSeasonInput] = useState<string>("");
  const [gameNumberInput, setGameNumberInput] = useState<string>("");

  // Инициализация
  useEffect(() => {
    // Приоритет: initialSeason -> storeSeason
    const initialValue = initialSeason !== undefined ? initialSeason : storeSeason;
    if (initialValue !== 0) {
      setSeasonInput(initialValue.toString());
      onSeasonChange(initialValue);
    }
  }, []); // Пустой массив зависимостей - только при монтировании

  useEffect(() => {
    // Приоритет: initialGameNumber -> storeGameNumber
    const initialValue = initialGameNumber !== undefined ? initialGameNumber : storeGameNumber;
    if (initialValue !== 0) {
      setGameNumberInput(initialValue.toString());
      onGameNumberChange(initialValue);
    }
  }, []);

  const handleSeasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Разрешаем пустую строку или числа
    if (value === "" || /^\d+$/.test(value)) {
      setSeasonInput(value);

      // Преобразуем в число и передаем родителю
      const numValue = value === "" ? 0 : parseInt(value, 10);
      onSeasonChange(numValue);
    }
  };

  const handleGameNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Разрешаем пустую строку или числа
    if (value === "" || /^\d+$/.test(value)) {
      setGameNumberInput(value);

      // Преобразуем в число и передаем родителю
      const numValue = value === "" ? 0 : parseInt(value, 10);
      onGameNumberChange(numValue);
    }
  };

  return (
    <div className={styles.gameInfo}>
      <div className={styles.inputGroup}>
        <h4 className={styles.cntHeader}>Сезон</h4>
        <Input
          id="season"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          value={seasonInput}
          onChange={handleSeasonChange}
          placeholder="0"
          className={styles.numberInput}
        />
      </div>

      <div className={styles.inputGroup}>
        <h4 className={styles.cntHeader}>Номер игры</h4>
        <Input
          id="gameNumber"
          type="text"
          inputMode="numeric"
          pattern="\d*"
          value={gameNumberInput}
          onChange={handleGameNumberChange}
          placeholder="0"
          className={styles.numberInput}
        />
      </div>
    </div>
  );
}
