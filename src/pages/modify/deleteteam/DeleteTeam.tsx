import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Label } from "@/shared/ui";
import { useTeamStore } from "@/entities/team/model/team.store";
import { Check, ChevronsUpDown } from "lucide-react";
import {Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/Command";
import { generateSearchVariants } from "@features/searchUtils";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { getApiErrorDetails } from "@/shared/api/statusMessages";
import styles from "./DeleteTeam.module.css";
import { cn } from "@/shared/lib/utils";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";

interface DeleteTeamProps {
  onFormChange?: (hasChanges: boolean) => void;
}

export default function DeleteTeam({ onFormChange }: DeleteTeamProps) {
  const [selectedTeam, setSelectedTeam] = useState("");
  const [error, setError] = useState<string | null>(null);
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
    if (season === 0 && storeSeason !== 0) {
      setSeason(storeSeason);
    }
  }, [storeSeason]);

  useEffect(() => {
    if (gameNumber === 0 && storeGameNumber !== 0) {
      setGameNumber(storeGameNumber);
    }
  }, [storeGameNumber]);

  useEffect(() => {
    const hasChanges = selectedTeam !== "";

    if (hasChanges !== prevHasChangesRef.current) {
      prevHasChangesRef.current = hasChanges;
      onFormChange?.(hasChanges);
    }
  }, [selectedTeam, onFormChange]);

  useEffect(() => {
    return () => {
      prevHasChangesRef.current = false;
    };
  }, []);

  const validateForm = (): boolean => {
    if (selectedTeam === "") {
      const errorMessage = "Выберите команду для удаления";
      setError(errorMessage);
      toast.error(errorMessage);
      return false;
    }

    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await adminkaApi.remove_team({
        season,
        game_number: gameNumber,
        team: selectedTeam,
      });

      toast.success(`Команда "${selectedTeam}" успешно удалена`);
      setSelectedTeam("");

      if (onFormChange) {
        prevHasChangesRef.current = false;
        onFormChange(false);
      }
    } catch (err) {
      console.error("Ошибка при удалении команды:", err);
      toast.error(getApiErrorDetails(err));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Удалить команду</CardTitle>
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
        <CardTitle>Удалить команду</CardTitle>
        <p className={styles.description}>
          Выберите команду для удаления. Это действие нельзя отменить.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          <SelectGameSeason
            onSeasonChange={setSeason}
            onGameNumberChange={setGameNumber}
            initialSeason={storeSeason}
            initialGameNumber={storeGameNumber}
          />

          <div className={styles.field}>
            <Label htmlFor="team">Команда для удаления</Label>
            <TeamCombobox
              teams={teams}
              value={selectedTeam}
              onChange={setSelectedTeam}
              placeholder="Выберите команду для удаления"
              error={!!error}
            />
            {error && <p className={styles.errorText}>{error}</p>}
          </div>

          <Button
            type="submit"
            className={cn(styles.submitButton, styles.deleteButton)}
            disabled={!selectedTeam}
          >
            Удалить команду
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

function TeamCombobox({ teams, value, onChange, placeholder = "Выберите команду...", error }: TeamComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredTeams = useMemo(() => {
    if (!searchValue.trim()) return teams;

    const searchVariants = generateSearchVariants(searchValue);

    return teams.filter((team) =>
      searchVariants.some(
        (variant) =>
          team.value.toLowerCase().includes(variant) ||
          team.label.toLowerCase().includes(variant)
      )
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
          className={cn(styles.comboboxTrigger, error && styles.inputError)}
        >
          {value
            ? teams.find((team) => team.value === value)?.label
            : placeholder}
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
