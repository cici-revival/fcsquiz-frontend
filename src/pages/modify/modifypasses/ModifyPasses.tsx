import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { Button } from "@/shared/ui";
import { Input } from "@/shared/ui";
import { Label } from "@/shared/ui";
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react";
import { useTeamStore, useTeamsByName } from "@/entities/team/model/team.store";
import { useChangesStore } from "@/entities/change/model/change.store";
import type { PassesStoredChange } from "@/entities/change/types";
import type { PassInput, PassStatus, PassWithStatus } from "@/types/api";
import type { RosterTeam } from "@/entities/team/types";
import {Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/Command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { useEffect, useRef, useState, useMemo } from "react";
import toast from "react-hot-toast";
import { adminkaApi } from "@/shared/api/adminkaApi";
import { getPassStatusMessage, getApiErrorDetails } from "@/shared/api/statusMessages";
import styles from "./ModifyPasses.module.css";
import { cn } from "@/shared/lib/utils";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import { createEmptyPassBlock, type PassBlock } from "./passBlock";

interface ModifyPassProps {
  onFormChange?: (hasChanges: boolean) => void;
}

export default function ModifyPasses({ onFormChange }: ModifyPassProps) {
  const [passBlocks, setPassBlocks] = useState<PassBlock[]>([]);

  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);
  const [, setHasValidationErrors] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const teamsMap = useTeamStore((state) => state.teams);
  const status = useTeamStore((state) => state.status);

  const teams = Array.from(teamsMap.values()).map((team) => ({
    value: team.name,
    label: team.name,
  }));

  const teamsByName = useTeamsByName();

  const changesMap = useChangesStore((state) => state.changes);

  const isLoading = status === "idle" || status === "connecting";

  const prevHasChangesRef = useRef<boolean>(false);

  const generateId = () =>
    `pass_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Инициализация из стора
  useEffect(() => {
    if (!initialized && storeSeason !== 0 && storeGameNumber !== 0) {
      setSeason(storeSeason);
      setGameNumber(storeGameNumber);
      setInitialized(true);
    }
  }, [storeSeason, storeGameNumber, initialized]);

  useEffect(() => {
    const hasChanges = passBlocks.some(
      (block) => block.playerName.trim() !== "" || block.team !== "",
    );

    if (hasChanges !== prevHasChangesRef.current) {
      prevHasChangesRef.current = hasChanges;
      if (onFormChange) {
        onFormChange(hasChanges);
      }
    }
  }, [passBlocks, onFormChange]);

  useEffect(() => {
    return () => {
      prevHasChangesRef.current = false;
    };
  }, []);

  const syncPassBlockToStore = (block: PassBlock) => {
    if (!season || !gameNumber) return;

    const isEmpty = !block.playerName.trim() && !block.team;

    const existing = changesMap.get(block.id) as PassesStoredChange | undefined;

    if (isEmpty) {
      if (existing) {
        useChangesStore.getState().removeChange(block.id);
      }
      return;
    }

    const stored: PassesStoredChange = {
      id: block.id,
      kind: "passes",
      source: existing?.source ?? "manual",
      season,
      gameNumber,
      createdAt: existing?.createdAt ?? Date.now(),
      unresolvedId: existing?.unresolvedId,
      teamName: block.team,
      playerName: block.playerName,
      mode: block.mode ?? "add",
    };

    useChangesStore.getState().upsertChange(stored);
  };

  // Подтягиваем сохранённые passes-изменения из общего стора
  useEffect(() => {
    if (!season || !gameNumber) {
      setPassBlocks([createEmptyPassBlock(generateId())]);
      return;
    }

    const storedPasses = Array.from(changesMap.values()).filter(
      (change): change is PassesStoredChange =>
        change.kind === "passes" &&
        change.season === season &&
        change.gameNumber === gameNumber,
    );

    if (!storedPasses.length) {
      setPassBlocks([createEmptyPassBlock(generateId())]);
      return;
    }

    const mapped: PassBlock[] = storedPasses.map((ch) => ({
      id: ch.id,
      playerName: ch.playerName,
      team: ch.teamName,
      mode: ch.mode ?? "add",
      fromUnresolved: ch.source === "unresolved",
    }));

    setPassBlocks([...mapped, createEmptyPassBlock(generateId())]);
  }, [season, gameNumber, changesMap]);

  const validatePassBlocks = (): boolean => {
    let hasErrors = false;

    const updatedBlocks = passBlocks.map((block) => {
      const hasName = block.playerName.trim() !== "";
      const hasTeam = block.team !== "";

      if (hasName || hasTeam) {
        if (!hasName && hasTeam) {
          hasErrors = true;
          return {
            ...block,
            hasError: true,
            errorMessage: "Заполните ФИО игрока",
          };
        }

        if (hasName && !hasTeam) {
          hasErrors = true;
          return {
            ...block,
            hasError: true,
            errorMessage: "Выберите команду",
          };
        }

        if (!hasName && !hasTeam) {
          return { ...block, hasError: false, errorMessage: undefined };
        }
      }

      return { ...block, hasError: false, errorMessage: undefined };
    });

    setPassBlocks(updatedBlocks);
    setHasValidationErrors(hasErrors);
    return !hasErrors;
  };

  const clearValidationErrors = () => {
    setPassBlocks((prev) =>
      prev.map((block) => ({
        ...block,
        hasError: false,
        errorMessage: undefined,
      })),
    );
    setHasValidationErrors(false);
  };

  const handlePlayerNameChange = (index: number, value: string) => {
    clearValidationErrors();
    setPassBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: PassBlock = {
        ...newBlocks[index],
        playerName: value,
        hasError: false,
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncPassBlockToStore(updated);
      return newBlocks;
    });
  };

  const handleTeamChange = (index: number, value: string) => {
    clearValidationErrors();
    setPassBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: PassBlock = {
        ...newBlocks[index],
        team: value,
        hasError: false,
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncPassBlockToStore(updated);
      return newBlocks;
    });
  };

  const handleModeChange = (index: number, nextMode: "add" | "remove") => {
    clearValidationErrors();
    setPassBlocks((prev) => {
      const newBlocks = [...prev];
      const updated: PassBlock = {
        ...newBlocks[index],
        mode: nextMode,
        hasError: false,
        errorMessage: undefined,
      };
      newBlocks[index] = updated;
      syncPassBlockToStore(updated);
      return newBlocks;
    });
  };

  const handleRemoveBlock = (index: number) => {
    clearValidationErrors();
    setPassBlocks((prev) => {
      const removed = prev[index];
      if (removed) {
        useChangesStore.getState().removeChange(removed.id);
      }
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        return [createEmptyPassBlock(generateId(), removed.mode)];
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassBlocks()) {
      toast.error("Исправьте ошибки в форме");
      return;
    }

    const filledBlocks = passBlocks.filter(
      (block) => block.playerName.trim() !== "" && block.team !== "",
    );

    if (filledBlocks.length === 0) {
      toast.error("Добавьте хотя бы один пропуск");
      return;
    }

    if (season === 0 || gameNumber === 0) {
      toast.error("Не указан сезон или номер игры");
      return;
    }

    setIsSubmitting(true);

    try {
      const { changes } = useChangesStore.getState();

      const unresolvedByBlockId = new Map<string, string>();
      filledBlocks.forEach((block) => {
        const stored = changes.get(block.id) as PassesStoredChange | undefined;
        if (stored?.unresolvedId) {
          unresolvedByBlockId.set(block.id, stored.unresolvedId);
        }
      });

      const successfulBlockIds = new Set<string>();
      const unresolvedIdsToMark = new Set<string>();
      const failedStatuses: string[] = [];

      let successCount = 0;
      let failCount = 0;

      for (const block of filledBlocks) {
        const actionMode = block.mode ?? "add";

        const teamId = teamsByName.get(block.team)?.id;
        if (!teamId) {
          failCount += 1;
          failedStatuses.push("unknown_team");
          continue;
        }

        const payload = {
          season,
          game_number: gameNumber,
          pass: { team_id: teamId, pass: block.playerName } as PassInput,
        };

        let result: PassWithStatus | undefined;
        try {
          const response = actionMode === "add"
            ? await adminkaApi.addPass(payload)
            : await adminkaApi.removePass(payload);
          result = response.pass;
        } catch (error) {
          failCount += 1;
          failedStatuses.push(getApiErrorDetails(error));
          continue;
        }

        const successfulStatuses: PassStatus[] =
          actionMode === "add"
            ? ["added", "already_exists"]
            : ["removed"];

        const isSuccess =
          !!result?.status && successfulStatuses.includes(result.status);

        if (isSuccess) {
          successCount += 1;
          successfulBlockIds.add(block.id);

          const unresolvedId = unresolvedByBlockId.get(block.id);
          if (unresolvedId) {
            unresolvedIdsToMark.add(unresolvedId);
          }

          const { removeChange } = useChangesStore.getState();
          removeChange(block.id);
        } else {
          failCount += 1;
          const st = result?.status ?? "unknown";
          failedStatuses.push(getPassStatusMessage(st));
        }
      }

      if (successCount > 0 && failCount === 0) {
        toast.success(`Успешно обработано ${successCount} пропуск(ов).`);
      } else if (successCount > 0 && failCount > 0) {
        toast.success(
          `Часть пропусков успешно обработана (${successCount}), часть с ошибками (${failCount}).`,
          { duration: 4000 },
        );
        if (failedStatuses[0]) {
          toast.error(failedStatuses[0], { duration: 5000 });
        }
      } else {
        const detail = failedStatuses[0] ?? "Не удалось обработать ни один пропуск.";
        toast.error(detail);
      }

      if (unresolvedIdsToMark.size > 0) {
        try {
          await Promise.all(
            Array.from(unresolvedIdsToMark).map((id) =>
              adminkaApi.markResolved({ change_id: id }),
            ),
          );
        } catch (e) {
          console.error(
            "Не удалось пометить некоторые изменения как разрешённые (passes)",
            e,
          );
        }
      }

      setPassBlocks((prev) => {
        const remaining = prev.filter(
          (block) => !successfulBlockIds.has(block.id),
        );

        if (remaining.length === 0) {
          const lastSuccessful = filledBlocks[filledBlocks.length - 1];
          return [
            createEmptyPassBlock(
              generateId(),
              lastSuccessful?.mode ?? "add",
            ),
          ];
        }

        const hasEmpty = remaining.some(
          (block) => block.playerName.trim() === "" && block.team === "",
        );

        if (hasEmpty) {
          return remaining;
        }

        return [...remaining, createEmptyPassBlock(generateId())];
      });

      clearValidationErrors();

      if (onFormChange) {
        const hasAnyFilled = passBlocks.some(
          (block) =>
            block.playerName.trim() !== "" ||
            block.team !== "",
        );
        prevHasChangesRef.current = hasAnyFilled;
        onFormChange(hasAnyFilled);
      }
    } catch (error) {
      console.error("Критическая ошибка при обработке пропусков:", error);
      toast.error(getApiErrorDetails(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Заказать пропуски</CardTitle>
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
        <CardTitle>Заказать или удалить пропуски</CardTitle>
        <p className={styles.description}>
          Для каждого игрока выберите команду, ФИО и действие (заказать или
          удалить пропуск). Новые поля появятся автоматически при заполнении
          любого блока.
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

          <div className={styles.passBlocks}>
            {passBlocks.map((block, index) => (
              <PassBlock
                key={block.id}
                index={index}
                block={block}
                teams={teams}
                teamsByName={teamsByName}
                onPlayerNameChange={handlePlayerNameChange}
                onTeamChange={handleTeamChange}
                onRemove={handleRemoveBlock}
                showRemove={passBlocks.length > 1}
                onModeChange={handleModeChange}
              />
            ))}
          </div>

          <Button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Отправка..." : "Отправить"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

interface PassBlockProps {
  index: number;
  block: PassBlock;
  teams: { value: string; label: string }[];
  teamsByName: Map<string, RosterTeam>;
  onPlayerNameChange: (index: number, value: string) => void;
  onTeamChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
  onModeChange: (index: number, mode: "add" | "remove") => void;
}

function PassBlock({
  index,
  block,
  teams,
  teamsByName,
  onPlayerNameChange,
  onTeamChange,
  onRemove,
  showRemove,
  onModeChange,
}: PassBlockProps) {
  const [open, setOpen] = useState(false);

  const comboboxClasses = cn(
    styles.comboboxTrigger,
    block.hasError && styles.comboboxError,
  );

  return (
    <div className={styles.passBlock}>
      <div className={styles.blockHeader}>
        <div className={styles.blockHeaderLeft}>
          <span className={styles.blockNumber}>Пропуск #{index + 1}</span>
          {block.fromUnresolved && (
            <span className={styles.fromStoreBadge}>Изменение из таблички</span>
          )}
          {block.hasError && block.errorMessage && (
            <span className={styles.blockError}>
              <AlertCircle size={14} />
              <span>{block.errorMessage}</span>
            </span>
          )}
        </div>
        {showRemove && (
          <button
            type="button"
            onClick={() => onRemove(index)}
            className={styles.removeButton}
            aria-label="Удалить пропуск"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.blockFields}>
        <div className={styles.field}>
          <div className={styles.modeButtons}>
            <Button
              type="button"
              size="sm"
              variant={block.mode === "add" ? "outline" : "ghost"}
              onClick={() => onModeChange(index, "add")}
            >
              Заказать
            </Button>
            <Button
              type="button"
              size="sm"
              variant={block.mode === "remove" ? "outline" : "ghost"}
              onClick={() => onModeChange(index, "remove")}
            >
              Удалить
            </Button>
          </div>
        </div>

        <div className={styles.field}>
          <Label htmlFor={`team-${index}`}>Команда</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className={comboboxClasses}
                aria-invalid={block.hasError}
              >
                {block.team
                  ? teams.find((team) => team.value === block.team)?.label
                  : "Выберите команду..."}
                <ChevronsUpDown className={styles.chevronIcon} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className={styles.comboboxContent}>
              <Command>
                <CommandInput
                  placeholder="Поиск команды..."
                  className={styles.commandInput}
                />
                <CommandList>
                  <CommandEmpty>Команда не найдена.</CommandEmpty>
                  <CommandGroup>
                    {teams.map((team) => (
                      <CommandItem
                        key={team.value}
                        value={team.value}
                        onSelect={(currentValue) => {
                          onTeamChange(
                            index,
                            currentValue === block.team ? "" : currentValue,
                          );
                          setOpen(false);
                        }}
                        className={styles.commandItem}
                      >
                        {team.label}
                        <Check
                          className={styles.checkIcon}
                          style={{
                            opacity: block.team === team.value ? 1 : 0,
                          }}
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
          <Label htmlFor={`playerName-${index}`}>Пропуск / ФИО</Label>
          {block.mode === "remove" ? (
            <PassCombobox
              block={block}
              index={index}
              teamsByName={teamsByName}
              onPlayerNameChange={onPlayerNameChange}
            />
          ) : (
            <Input
              id={`playerName-${index}`}
              value={block.playerName}
              onChange={(e) => onPlayerNameChange(index, e.target.value)}
              placeholder="Иванов Иван"
              autoComplete="off"
              className={styles.mainFormInput}
              aria-invalid={block.hasError}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface PassComboboxProps {
  block: PassBlock;
  index: number;
  teamsByName: Map<string, RosterTeam>;
  onPlayerNameChange: (index: number, value: string) => void;
}

function PassCombobox({
  block,
  index,
  teamsByName,
  onPlayerNameChange,
}: PassComboboxProps) {
  const [open, setOpen] = useState(false);

  const passes = useMemo(() => {
    const team = teamsByName.get(block.team);
    return team?.passes ?? [];
  }, [teamsByName, block.team]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={styles.comboboxTrigger}
        >
          {block.playerName || "Выберите пропуск..."}
          <ChevronsUpDown className={styles.chevronIcon} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={styles.comboboxContent}>
        <Command>
          <CommandInput
            placeholder="Поиск пропуска..."
            className={styles.commandInput}
          />
          <CommandList>
            <CommandEmpty>Пропуск не найден.</CommandEmpty>
            <CommandGroup>
              {passes.length === 0 ? (
                <CommandItem disabled>У команды нет пропусков</CommandItem>
              ) : (
                passes.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={(val) => {
                      onPlayerNameChange(index, val);
                      setOpen(false);
                    }}
                    className={styles.commandItem}
                  >
                    {name}
                    <Check
                      className={styles.checkIcon}
                      style={{
                        opacity: block.playerName === name ? 1 : 0,
                      }}
                    />
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
