import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import { useTeamStore } from "@/entities/team/model/team.store";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui";
import { generateSearchVariants } from "@features/searchUtils";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { getApiErrorDetails } from "@/shared/api/statusMessages";
import styles from "./ModifyTeamName.module.css";
import { cn } from "@/shared/lib/utils";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";

interface ModifyTeamNameProps {
  onFormChange?: (hasChanges: boolean) => void;
}

export default function ModifyTeamName({ onFormChange }: ModifyTeamNameProps) {
  const [oldTeamName, setOldTeamName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);
  const teamsMap = useTeamStore((state) => state.teams);
  const status = useTeamStore((state) => state.status);

  const teams = Array.from(teamsMap.values()).map((team) => ({
    value: team.name,
    label: team.name,
  }));
  const isLoading = status === "idle" || status === "connecting";
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

  useEffect(() => {
    const hasChanges = oldTeamName !== "" || newTeamName.trim() !== "";

    if (hasChanges !== prevHasChangesRef.current) {
      prevHasChangesRef.current = hasChanges;
      if (onFormChange) {
        onFormChange(hasChanges);
      }
    }
  }, [oldTeamName, newTeamName, onFormChange]);

  useEffect(() => {
    return () => {
      prevHasChangesRef.current = false;
    };
  }, []);

  // Проверка, заполнены ли все поля
  const isFormValid = useMemo(() => {
    return (
      oldTeamName !== "" &&
      newTeamName.trim().length >= 1 &&
      newTeamName.length <= 50
    );
  }, [oldTeamName, newTeamName]);

  const validateForm = (): boolean => {
    let isValid = true;
    let errorMessage = null;

    if (oldTeamName === "") {
      errorMessage = "Выберите старое название команды";
      isValid = false;
    } else if (newTeamName.trim() === "") {
      errorMessage = "Введите новое название команды";
      isValid = false;
    } else if (newTeamName.length < 3) {
      errorMessage = "Название команды должно быть не менее 3 символов";
      isValid = false;
    } else if (newTeamName.length > 50) {
      errorMessage = "Название команды слишком длинное (максимум 50 символов)";
      isValid = false;
    } else if (/[\'\"`<>&;\\]/.test(newTeamName)) {
      errorMessage = "Дружище, это что за чушь вместо названия?";
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

    if (!validateForm() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await adminkaApi.changeTeamName({
        season,
        game_number: gameNumber,
        old_name: oldTeamName,
        new_name: newTeamName,
      });

      toast.success(`Название команды успешно изменено на "${newTeamName}"`);

      setOldTeamName("");
      setNewTeamName("");

      if (onFormChange) {
        prevHasChangesRef.current = false;
        onFormChange(false);
      }
    } catch (err) {
      console.error("Ошибка при изменении названия команды:", err);
      toast.error(getApiErrorDetails(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Изменить название команды</CardTitle>
        </CardHeader>
        <CardContent className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Загрузка списка команд...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Изменить название команды</CardTitle>
        <p className={styles.description}>
          Измените название существующей команды.
        </p>
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
            <Label htmlFor="oldTeamName">Старое название команды</Label>
            <TeamCombobox
              teams={teams}
              value={oldTeamName}
              onChange={setOldTeamName}
              placeholder="Выберите команду"
            />
          </div>

          <div className={styles.field}>
            <Label htmlFor="newTeamName">Новое название команды</Label>
            <Input
              id="newTeamName"
              value={newTeamName}
              onChange={(e) => {
                setNewTeamName(e.target.value);
                setError(null);
              }}
              autoComplete="off"
              className={cn(
                styles.mainFormInput,
                error && newTeamName.trim() === "" && styles.inputError,
              )}
              aria-invalid={!!error && newTeamName.trim() === ""}
              disabled={isSubmitting}
            />
          </div>

          <Button
            variant="default"
            type="submit"
            className={styles.submitButton}
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? <>Отправка...</> : "Отправить"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface TeamComboboxProps {
  teams: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
}

function TeamCombobox({ teams, value, onChange }: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredTeams = useMemo(() => {
    if (!searchValue.trim()) return teams;

    const searchVariants = generateSearchVariants(searchValue);

    return teams.filter((team) =>
      searchVariants.some(
        (variant) =>
          team.value.toLowerCase().includes(variant) ||
          team.label.toLowerCase().includes(variant),
      ),
    );
  }, [searchValue, teams]);

  const handleInputChange = (input: string) => {
    setSearchValue(input);
  };

  const handleSelect = (teamValue: string) => {
    onChange(teamValue === value ? "" : teamValue);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={styles.comboboxTrigger}
        >
          {value
            ? teams.find((team) => team.value === value)?.label
            : "Выберите команду..."}
          <ChevronsUpDown className={styles.chevronIcon} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={styles.comboboxContent} align="start">
        <Command>
          <CommandInput
            placeholder="Поиск команды..."
            value={searchValue}
            onValueChange={handleInputChange}
            className={styles.commandInput}
          />
          <CommandList>
            <CommandEmpty>Команда не найдена.</CommandEmpty>
            <CommandGroup>
              {filteredTeams.length > 0 ? (
                filteredTeams.map((team) => (
                  <CommandItem
                    key={team.value}
                    value={team.value}
                    onSelect={() => handleSelect(team.value)}
                    className={styles.commandItem}
                  >
                    {team.label}
                    <Check
                      className={styles.checkIcon}
                      style={{
                        opacity: value === team.value ? 1 : 0,
                      }}
                    />
                  </CommandItem>
                ))
              ) : (
                <CommandItem disabled>Нет результатов</CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
