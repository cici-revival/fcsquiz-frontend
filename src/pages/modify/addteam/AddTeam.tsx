import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import { useTeamStore } from "@/entities/team/model/team.store";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { getApiErrorDetails } from "@/shared/api/statusMessages";
import styles from "./AddTeam.module.css";
import { cn } from "@/shared/lib/utils";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";

interface AddTeamProps {
  onFormChange?: (hasChanges: boolean) => void;
}

export default function AddTeam({ onFormChange }: AddTeamProps) {
  const [teamName, setTeamName] = useState("");
  const [captain, setCaptain] = useState("");
  const [telegramContact, setTelegramContact] = useState("");
  const [playersCount, setPlayersCount] = useState("");
  const [passes, setPasses] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);
  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);

  const prevHasChangesRef = useRef<boolean>(false);

  useEffect(() => {
    if (season === 0 && storeSeason != 0) {
      setSeason(storeSeason);
    }
  }, [storeSeason]);

  useEffect(() => {
    if (gameNumber === 0 && storeGameNumber != 0) {
      setGameNumber(storeGameNumber);
    }
  }, [storeGameNumber]);

  // Отслеживаем изменения формы для предупреждения
  useEffect(() => {
    const hasChanges =
      teamName !== "" ||
      captain !== "" ||
      telegramContact !== "" ||
      playersCount !== "" ||
      passes !== "";

    if (hasChanges !== prevHasChangesRef.current) {
      prevHasChangesRef.current = hasChanges;
      if (onFormChange) {
        onFormChange(hasChanges);
      }
    }
  }, [teamName, captain, telegramContact, playersCount, passes, onFormChange]);

  // Сброс при размонтировании
  useEffect(() => {
    return () => {
      prevHasChangesRef.current = false;
    };
  }, []);

  const validateForm = (): boolean => {
    let isValid = true;
    let errorMessage = null;

    if (teamName.trim() === "") {
      errorMessage = "Введите название команды";
      isValid = false;
    } else if (teamName.length < 3) {
      errorMessage = "Название команды должно быть не менее 3 символов";
      isValid = false;
    } else if (teamName.length > 50) {
      errorMessage = "Название команды слишком длинное (максимум 50 символов)";
      isValid = false;
    } else if (/[\'\"`<>&;\\]/.test(teamName)) {
      errorMessage = "Дружище, это что за чушь вместо названия?";
      isValid = false;
    } else if (captain.trim() === "") {
      errorMessage = "Введите имя капитана";
      isValid = false;
    } else if (telegramContact.trim() === "") {
      errorMessage = "Введите контакт капитана (Telegram)";
      isValid = false;
    } else if (playersCount === "" || parseInt(playersCount) < 1) {
      errorMessage = "Введите корректное количество участников";
      isValid = false;
    }

    if (!isValid) {
      setError(errorMessage);
      toast.error(errorMessage);
    } else {
      setError(null);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    // Parse passes - split by newlines and filter empty lines
    const passesArray = passes
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p !== "");

    try {
      await adminkaApi.addTeam({
        season,
        game_number: gameNumber,
        team: {
          name: teamName.trim(),
          captain: captain.trim(),
          tg: telegramContact.trim(),
          players_count: parseInt(playersCount),
          passes: passesArray,
          is_ready_to_accept_players: true,
        },
      });

      toast.success(`Команда "${teamName.trim()}" успешно добавлена`);

      // Reset form
      setTeamName("");
      setCaptain("");
      setTelegramContact("");
      setPlayersCount("");
      setPasses("");

      // Сообщаем родителю, что изменений больше нет
      if (onFormChange) {
        prevHasChangesRef.current = false;
        onFormChange(false);
      }
    } catch (err) {
      console.error("Ошибка при добавлении команды:", err);
      toast.error(getApiErrorDetails(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая команда</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Информация об игре */}
          <SelectGameSeason
            onSeasonChange={setSeason}
            onGameNumberChange={setGameNumber}
            initialSeason={storeSeason}
            initialGameNumber={storeGameNumber}
          />

          <div className={styles.field}>
            <Label htmlFor="teamName">Название</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setError(null);
              }}
              placeholder="Введите название..."
              autoComplete="off"
              disabled={isSubmitting}
              className={cn(error && teamName.trim() === "" && styles.inputError)}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="captain">Капитан команды</Label>
            <Input
              id="captain"
              value={captain}
              onChange={(e) => {
                setCaptain(e.target.value);
                setError(null);
              }}
              placeholder="Введите имя..."
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="telegramContact">Контакт капитана</Label>
            <Input
              id="telegramContact"
              value={telegramContact}
              onChange={(e) => {
                setTelegramContact(e.target.value);
                setError(null);
              }}
              placeholder="@telegramtag"
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="playersCount">Количество участников</Label>
            <Input
              id="playersCount"
              type="number"
              min="1"
              value={playersCount}
              onChange={(e) => {
                setPlayersCount(e.target.value);
                setError(null);
              }}
              placeholder="Введите число..."
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="passes">Пропуски</Label>
            <p className={styles.description}>
              В формате Фамилия Имя Отчество через пробел, разделять вводом строки
            </p>
            <textarea
              id="passes"
              value={passes}
              onChange={(e) => setPasses(e.target.value)}
              placeholder="Иванов Иван Иванович"
              className={styles.textarea}
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className={styles.buttonLoader} size={16} />
                Отправка...
              </>
            ) : (
              "Отправить"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
