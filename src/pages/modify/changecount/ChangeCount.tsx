import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import { useTeamStore, useTeamsByName } from "@/entities/team/model/team.store";
import { useChangesStore } from "@/entities/change/model/change.store";
import type { CountStoredChange } from "@/entities/change/types";
import { Check, ChevronsUpDown, Plus, Minus } from "lucide-react";
import {Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/Command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { generateSearchVariants } from "@features/searchUtils";
import { useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import {
  getPlayersCountStatusMessage,
  getApiErrorDetails,
} from "@/shared/api/statusMessages";
import styles from "./ChangeCount.module.css";
import { cn } from "@/shared/lib/utils";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";

interface ChangeCountProps {
  onFormChange?: (hasChanges: boolean) => void;
}

type CountMode = "add" | "remove" | "set";

interface CountBlock {
  id: string;
  teamName: string;
  mode: CountMode;
  countValue: string;
  fromUnresolved?: boolean;
}

const generateId = () =>
  `count_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const defaultBlock = (): CountBlock => ({
  id: generateId(),
  teamName: "",
  mode: "add",
  countValue: "",
});

export default function ChangeCount({ onFormChange }: ChangeCountProps) {
  const [countBlocks, setCountBlocks] = useState<CountBlock[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);
  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);

  const teamsMap = useTeamStore((state) => state.teams);
  const status = useTeamStore((state) => state.status);
  const changesMap = useChangesStore((state) => state.changes);

  const teams = Array.from(teamsMap.values()).map((team) => ({
    value: team.name,
    label: team.name,
  }));

  const teamsByName = useTeamsByName();

  const isLoading = status === "idle" || status === "connecting";
  const prevHasChangesRef = useRef<boolean>(false);

  useEffect(() => {
    if (season === 0 && storeSeason !== 0) setSeason(storeSeason);
  }, [storeSeason]);

  useEffect(() => {
    if (gameNumber === 0 && storeGameNumber !== 0) setGameNumber(storeGameNumber);
  }, [storeGameNumber]);

  const syncBlockToStore = (block: CountBlock) => {
    if (!season || !gameNumber) return;

    const isEmpty = !block.teamName || !block.countValue.trim();
    const num = parseInt(block.countValue, 10);
    const validCount =
      block.mode === "set"
        ? !isNaN(num) && num >= 1 && num <= 8
        : !isNaN(num) && num !== 0 && num >= 1 && num <= 8;

    const storeChanges = useChangesStore.getState().changes;
    const existing = storeChanges.get(block.id) as CountStoredChange | undefined;

    if (isEmpty || !validCount) {
      if (existing) useChangesStore.getState().removeChange(block.id);
      return;
    }

    const stored: CountStoredChange = {
      id: block.id,
      kind: "count",
      source: existing?.source ?? "manual",
      season,
      gameNumber,
      createdAt: existing?.createdAt ?? Date.now(),
      unresolvedId: existing?.unresolvedId,
      teamName: block.teamName,
      mode: block.mode,
      count: block.mode === "remove" ? -num : num,
    };

    useChangesStore.getState().upsertChange(stored);
  };

  useEffect(() => {
    if (!season || !gameNumber) {
      setCountBlocks([defaultBlock()]);
      return;
    }

    const storedCounts = Array.from(changesMap.values()).filter(
      (ch): ch is CountStoredChange =>
        ch.kind === "count" &&
        ch.season === season &&
        ch.gameNumber === gameNumber,
    );

    if (storedCounts.length === 0) {
      setCountBlocks([defaultBlock()]);
      return;
    }

    const mapped: CountBlock[] = storedCounts.map((ch) => ({
      id: ch.id,
      teamName: ch.teamName,
      mode: ch.mode,
      countValue: String(Math.abs(ch.count)),
      fromUnresolved: ch.source === "unresolved",
    }));

    const hasEmpty = mapped.some((b) => !b.teamName || !b.countValue.trim());
    setCountBlocks(hasEmpty ? mapped : [...mapped, defaultBlock()]);
  }, [season, gameNumber, changesMap]);

  useEffect(() => {
    const hasChanges = countBlocks.some(
      (b) => b.teamName !== "" && b.countValue.trim() !== "",
    );
    if (hasChanges !== prevHasChangesRef.current) {
      prevHasChangesRef.current = hasChanges;
      onFormChange?.(hasChanges);
    }
  }, [countBlocks, onFormChange]);

  useEffect(() => () => { prevHasChangesRef.current = false; }, []);

  const maybeAddEmptyBlock = (next: CountBlock[]) => {
    const hasEmpty = next.some((b) => !b.teamName || !b.countValue.trim());
    return hasEmpty ? next : [...next, defaultBlock()];
  };

  const handleTeamChange = (index: number, value: string) => {
    setCountBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], teamName: value };
      syncBlockToStore(next[index]);
      return maybeAddEmptyBlock(next);
    });
  };

  const handleModeChange = (index: number, mode: CountMode) => {
    setCountBlocks((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], mode };
      syncBlockToStore(next[index]);
      return maybeAddEmptyBlock(next);
    });
  };

  const handleCountChange = (index: number, value: string) => {
    setCountBlocks((prev) => {
      const next = [...prev];
      const block = next[index];
      const cleaned = value.replace(/[^0-9]/g, "").slice(0, 2);
      let countValue = cleaned;
      if (cleaned !== "") {
        const num = parseInt(cleaned, 10);
        if (num > 8) countValue = "8";
        else if (num < 1) countValue = "1";
      }
      next[index] = { ...block, countValue };
      syncBlockToStore(next[index]);
      return maybeAddEmptyBlock(next);
    });
  };

  const handleRemoveBlock = (index: number) => {
    setCountBlocks((prev) => {
      const removed = prev[index];
      if (removed) useChangesStore.getState().removeChange(removed.id);
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [defaultBlock()];
    });
  };

  const filledBlocks = countBlocks.filter(
    (b) => b.teamName && b.countValue.trim() !== "",
  );

  const validateBlocks = (): boolean => {
    for (const block of filledBlocks) {
      const num = parseInt(block.countValue, 10);
      if (block.mode === "set") {
        if (isNaN(num) || num < 1 || num > 8) {
          toast.error("Для «установить» введите число от 1 до 8");
          return false;
        }
      } else {
        if (isNaN(num) || num < 1 || num > 8) {
          toast.error("Введите число от 1 до 8");
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (filledBlocks.length === 0) {
      toast.error("Заполните хотя бы один блок");
      return;
    }

    if (!validateBlocks() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const missingTeam = filledBlocks.find((block) => !teamsByName.get(block.teamName)?.id);
      if (missingTeam) {
        toast.error(`Команда "${missingTeam.teamName}" не найдена`);
        return;
      }

      const changes = filledBlocks.map((block) => {
        const num = parseInt(block.countValue, 10);
        const teamId = teamsByName.get(block.teamName)?.id ?? "";
        if (block.mode === "set") {
          return { team_id: teamId, type: "new_count" as const, count: num };
        }
        return {
          team_id: teamId,
          type: "modifier" as const,
          count: block.mode === "remove" ? -num : num,
        };
      });

      const resp = await adminkaApi.changePlayersCount({
        season,
        game_number: gameNumber,
        changes,
      });

      const teamNameById = new Map(
        Array.from(teamsMap.values()).map((team) => [team.id, team.name]),
      );

      const failed = (resp.changes ?? []).filter((c) => c.status && c.status !== "ok");
      if (failed.length > 0) {
        const msg = getPlayersCountStatusMessage(failed[0].status ?? "unknown");
        toast.error(`Команда "${teamNameById.get(failed[0].team_id) ?? failed[0].team_id}": ${msg}`);
        return;
      }

      const unresolvedIdsToMark = new Set<string>();
      filledBlocks.forEach((b) => {
        const stored = useChangesStore.getState().changes.get(b.id) as CountStoredChange | undefined;
        if (stored?.unresolvedId) unresolvedIdsToMark.add(stored.unresolvedId);
      });
      filledBlocks.forEach((b) => useChangesStore.getState().removeChange(b.id));

      if (unresolvedIdsToMark.size > 0) {
        try {
          await Promise.all(
            Array.from(unresolvedIdsToMark).map((id) =>
              adminkaApi.markResolved({ change_id: id }),
            ),
          );
        } catch (e) {
          console.error("Не удалось пометить изменения как разрешённые", e);
        }
      }

      setCountBlocks((prev) => {
        const remaining = prev.filter((b) => !filledBlocks.some((f) => f.id === b.id));
        const hasEmpty = remaining.some((b) => !b.teamName || !b.countValue.trim());
        return hasEmpty ? remaining : [...remaining, defaultBlock()];
      });

      toast.success(`Изменено количество участников в ${filledBlocks.length} команде(ах)`);
      prevHasChangesRef.current = false;
      onFormChange?.(false);
    } catch (err) {
      console.error("Ошибка при изменении количества участников:", err);
      toast.error(getApiErrorDetails(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Изменить количество участников</CardTitle>
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
        <CardTitle>Изменить количество участников</CardTitle>
        <p className={styles.description}>
          Для каждого изменения выберите команду и способ (добавить, убрать или установить количество). Новые блоки появляются при заполнении предыдущего.
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

          <div className={styles.countBlocks}>
            {countBlocks.map((block, index) => (
              <CountBlockComponent
                key={block.id}
                index={index}
                block={block}
                teams={teams}
                isSubmitting={isSubmitting}
                onTeamChange={handleTeamChange}
                onModeChange={handleModeChange}
                onCountChange={handleCountChange}
                onRemove={handleRemoveBlock}
                showRemove={countBlocks.length > 1}
              />
            ))}
          </div>

          <div className={styles.submitContainer}>
            <Button
              variant="default"
              type="submit"
              className={styles.submitButton}
              disabled={filledBlocks.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface CountBlockComponentProps {
  index: number;
  block: CountBlock;
  teams: { value: string; label: string }[];
  isSubmitting: boolean;
  onTeamChange: (index: number, value: string) => void;
  onModeChange: (index: number, mode: CountMode) => void;
  onCountChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}

function CountBlockComponent({
  index,
  block,
  teams,
  isSubmitting,
  onTeamChange,
  onModeChange,
  onCountChange,
  onRemove,
  showRemove,
}: CountBlockComponentProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredTeams = useMemo(() => {
    if (!searchValue.trim()) return teams;
    const variants = generateSearchVariants(searchValue);
    return teams.filter((team) =>
      variants.some(
        (v) =>
          team.value.toLowerCase().includes(v) ||
          team.label.toLowerCase().includes(v),
      ),
    );
  }, [searchValue, teams]);

  const num = parseInt(block.countValue, 10);
  const isValid =
    block.countValue.trim() !== "" &&
    !isNaN(num) &&
    num >= 1 &&
    num <= 8;

  return (
    <div className={styles.countBlock}>
      <div className={styles.blockHeader}>
        <div className={styles.blockHeaderLeft}>
          <span className={styles.blockNumber}>Изменение #{index + 1}</span>
          {block.fromUnresolved && (
            <span className={styles.fromStoreBadge}>Изменение из таблички</span>
          )}
        </div>
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={styles.removeButton}
            aria-label="Удалить блок"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.blockFields}>
        <div className={styles.topRow}>
          <div className={styles.field}>
            <Label>Команда</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className={styles.comboboxTrigger}
                >
                  {block.teamName
                    ? teams.find((t) => t.value === block.teamName)?.label
                    : "Выберите команду..."}
                  <ChevronsUpDown className={styles.chevronIcon} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className={styles.comboboxContent} align="start">
                <Command>
                  <CommandInput
                    placeholder="Поиск команды..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                    className={styles.commandInput}
                  />
                  <CommandList>
                    <CommandEmpty>Команда не найдена.</CommandEmpty>
                    <CommandGroup>
                      {filteredTeams.map((team) => (
                        <CommandItem
                          key={team.value}
                          value={team.value}
                          onSelect={() => {
                            onTeamChange(index, team.value === block.teamName ? "" : team.value);
                            setOpen(false);
                            setSearchValue("");
                          }}
                          className={styles.commandItem}
                        >
                          {team.label}
                          <Check
                            className={styles.checkIcon}
                            style={{ opacity: block.teamName === team.value ? 1 : 0 }}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className={styles.field}>
            <Label>Действие</Label>
            <Select
              value={block.mode}
              onValueChange={(v) => onModeChange(index, v as CountMode)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={styles.modeSelect}>
                <SelectValue placeholder="Выберите действие" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Добавить</SelectItem>
                <SelectItem value="remove">Убрать</SelectItem>
                <SelectItem value="set">Установить</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className={styles.field}>
          <Label htmlFor={`count-${index}`}>
            Количество (чел.)
          </Label>
          <div className={styles.countInputRow}>
            {block.mode !== "set" && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const current = parseInt(block.countValue) || 0;
                  onCountChange(index, Math.max(1, current - 1).toString());
                }}
                disabled={isSubmitting}
                className={styles.modifierButton}
              >
                <Minus className="h-4 w-4" />
              </Button>
            )}
            <Input
              id={`count-${index}`}
              type="text"
              inputMode="numeric"
              value={block.countValue}
              onChange={(e) => onCountChange(index, e.target.value)}
              placeholder="1–8"
              disabled={isSubmitting}
              className={cn(
                styles.countInput,
                block.countValue.trim() !== "" && !isValid && styles.inputError,
              )}
              aria-invalid={block.countValue.trim() !== "" && !isValid}
            />
            {block.mode !== "set" && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const current = parseInt(block.countValue) || 0;
                  onCountChange(index, Math.min(8, current + 1).toString());
                }}
                disabled={isSubmitting}
                className={styles.modifierButton}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
          {block.countValue.trim() !== "" && !isValid && (
            <span className={styles.countErrorText} role="alert">
              Допустимо только число от 1 до 8
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
