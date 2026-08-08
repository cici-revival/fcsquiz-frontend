import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { useTeamStore } from "@/entities/team/model/team.store";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { getApiErrorDetails } from "@/shared/api/statusMessages";
import { adminkaApi } from "@/shared/api/adminkaApi";
import styles from "./Resolve.module.css";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/shared/ui";
import { Button } from "@/shared/ui";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import {
  type Player,
  type ReplacePlayer,
  type Change,
  type StructureChangeDetails,
} from "@/types/api";
import { useChangesStore } from "@/entities/change/model/change.store";
import type {
  StructureStoredChange,
  PassesStoredChange,
  CountStoredChange,
  StoredChange,
} from "@/entities/change/types";

/** Парсит число из выделенного текста: цифры 1-8 или слова "один", "два" и т.д. */
function parseCountFromSelection(text: string): number | null {
  const t = text.toLowerCase().trim();
  const num = parseInt(t, 10);
  if (!isNaN(num) && num >= 1 && num <= 8) return num;
  const words: Record<string, number> = {
    один: 1, одного: 1, одну: 1,
    два: 2, двух: 2, две: 2,
    три: 3, трёх: 3, трех: 3,
    четыре: 4, четырёх: 4, четырех: 4,
    пять: 5, пяти: 5,
    шесть: 6, шести: 6,
    семь: 7, семи: 7,
    восемь: 8, восьми: 8,
  };
  return words[t] ?? null;
}

interface Resolution {
  change_id: string;
  type: "add" | "remove" | "replace";
  team_name: string;
  add_player?: Player | null;
  remove_player?: Player | null;
  replace_player?: ReplacePlayer | null;
}

interface UnresolvedChangesProps {
  onFormChange?: (hasChanges: boolean) => void;
}

type ResolveActionMode = "add-player" | "add-player-with-pass" | "add-pass";
type CountActionMode = "add" | "remove" | "set";

export default function Resolve({ onFormChange }: UnresolvedChangesProps) {
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);
  const [changes, setChanges] = useState<Change[]>([]);
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [capturedSelection, setCapturedSelection] = useState<string | null>(null);

  const upsertChange = useChangesStore((state) => state.upsertChange);
  const changesMap = useChangesStore((state) => state.changes);

  const storedByUnresolvedId = useMemo(() => {
    const result = new Map<string, StoredChange[]>();
    for (const change of changesMap.values()) {
      if (!change.unresolvedId) continue;
      const list = result.get(change.unresolvedId) ?? [];
      list.push(change);
      result.set(change.unresolvedId, list);
    }
    return result;
  }, [changesMap]);

  const makePlayerKey = (name: string) =>
    name.toLowerCase().trim().replace(/\s+/g, "_").slice(0, 50);

  const highlightNames = (text: string) => {
   const regex = /([А-ЯЁA-Z][а-яёa-z]+(?:[-\s][А-ЯЁA-Z][а-яёa-z]+)*\s+[А-ЯЁA-Z][а-яёa-z]+\s+[А-ЯЁA-Z][а-яёa-z]+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // eslint-disable-next-line no-cond-assign
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      parts.push(
        <span
          key={`${match.index}-${match[0]}`}
          className={styles.nameHighlight}
        >
          {match[0]}
        </span>,
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  };

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
    if (season && gameNumber) {
      loadChanges();
    }
  }, [season, gameNumber]);

  const loadChanges = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminkaApi.unresolved_changes({season, game_number: gameNumber});
      setChanges(data);
      setResolutions([]);
    } catch (err) {
      console.error("Ошибка загрузки изменений:", err);
      const msg = getApiErrorDetails(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // const handleRefresh = () => {
  //   if (useMock) {
  //     setLoading(true);
  //     setTimeout(() => {
  //       setChanges(MOCK_CHANGES);
  //       setResolutions([]);
  //       setLoading(false);
  //       toast.success('Мок-данные обновлены');
  //     }, 800);
  //   } else {
  //     loadChanges();
  //   }
  // };

  useEffect(() => {
    const hasUnsaved = resolutions.length > 0;
    if (hasUnsaved !== hasChanges) {
      setHasChanges(hasUnsaved);
      onFormChange?.(hasUnsaved);
    }
  }, [resolutions, onFormChange]);

  const handleResolution = (change: Change, mode: ResolveActionMode) => {
    if (!season || !gameNumber) {
      toast.error("Сначала выберите сезон и игру");
      return;
    }

    const rawSelection =
      window.getSelection()?.toString().replace(/\s+/g, " ").trim() || "";

    if (!rawSelection) {
      toast.error("Выделите ФИО игрока в тексте заявки");
      return;
    }

    const selectionText = rawSelection;

    if (!selectionText) {
      toast.error("Выделите ФИО игрока в тексте заявки");
      return;
    }

    const playerName = selectionText;

    const resolution: Resolution = {
      change_id: change.id,
      type: "add",
      team_name: change.team,
    };

    // Для отображения в кратком резюме считаем, что во всех трёх случаях
    // используется "add" с нужным флагом is_pass_needed.
    resolution.add_player = {
      name: playerName,
      is_pass_needed: mode !== "add-player",
      tg: "",
    };

    const playerKey = makePlayerKey(playerName || change.id);

    // Сохранение в глобальном сторе
    if (mode === "add-player" || mode === "add-player-with-pass") {
      const details: StructureChangeDetails = {
        change_id: `unresolved-structure-${change.id}-${playerKey}`,
        type: "add",
        team_name: change.team,
        add_player: {
          name: playerName,
          is_pass_needed: mode === "add-player-with-pass",
          tg: "",
        },
      };

      const stored: StructureStoredChange = {
        id: details.change_id,
        kind: "structure",
        source: "unresolved",
        season,
        gameNumber,
        createdAt: Date.now(),
        unresolvedId: change.id,
        teamName: change.team,
        details,
      };

      upsertChange(stored);
    }

    if (mode === "add-pass") {
      const stored: PassesStoredChange = {
        id: `unresolved-passes-${change.id}-${playerKey}`,
        kind: "passes",
        source: "unresolved",
        season,
        gameNumber,
        createdAt: Date.now(),
        unresolvedId: change.id,
        teamName: change.team,
        playerName,
        mode: "add",
      };

      upsertChange(stored);
    }

    setResolutions(prev => {
      const filtered = prev.filter(r => r.change_id !== change.id);
      return [...filtered, resolution];
    });

    let actionLabel = "добавить игрока";
    if (mode === "add-player-with-pass") {
      actionLabel = "добавить игрока с пропуском";
    } else if (mode === "add-pass") {
      actionLabel = "добавить пропуск";
    }

    toast.success(`Действие "${actionLabel}" для "${playerName}" сохранено`);
  };

  const handleCountResolution = (change: Change, mode: CountActionMode, count: number) => {
    if (!season || !gameNumber) {
      toast.error("Сначала выберите сезон и игру");
      return;
    }

    const stored: CountStoredChange = {
      id: `unresolved-count-${change.id}-${mode}-${count}`,
      kind: "count",
      source: "unresolved",
      season,
      gameNumber,
      createdAt: Date.now(),
      unresolvedId: change.id,
      teamName: change.team,
      mode,
      count,
    };

    upsertChange(stored);

    const labels: Record<CountActionMode, string> = {
      add: `добавить ${count} человек`,
      remove: `убрать ${count} человек`,
      set: `установить ${count} человек`,
    };
    toast.success(`Действие "${labels[mode]}" сохранено`);
  };

  const hasStoredChange = (changeId: string) => {
    const list = storedByUnresolvedId.get(changeId);
    if (!list || !list.length) return false;
    return list.some(
      (ch) => ch.season === season && ch.gameNumber === gameNumber,
    );
  };

  const parsedCount = capturedSelection ? parseCountFromSelection(capturedSelection) : null;

  const handleMarkResolved = async (changeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (resolvedIds.has(changeId) || resolvingId) return;
    setResolvingId(changeId);
    try {
      await adminkaApi.markResolved({ change_id: changeId });
      setResolvedIds((prev) => new Set(prev).add(changeId));
      toast.success("Изменение отмечено решённым");
    } catch (err) {
      console.error("mark_resolved error:", err);
      toast.error(getApiErrorDetails(err));
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Неразрешённые изменения</CardTitle>
        <p className={styles.description}>
          Выберите игру и обработайте изменения. Для каждого изменения можно вызвать контекстное меню (правый клик) и выбрать действие.

        </p>
      </CardHeader>
      <CardContent>
        <div className={styles.controls}>
          <SelectGameSeason
            onSeasonChange={setSeason}
            onGameNumberChange={setGameNumber}
            initialSeason={storeSeason}
            initialGameNumber={storeGameNumber}
          />
          {/* Можно впихнуть кнопку обновления, но хз */}
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Загрузка изменений...</p>
          </div>
        ) : (
          <div className={styles.changesList}>
            {changes.length === 0 ? (
              <p className={styles.empty}>Нет неразрешённых изменений для выбранной игры.</p>
            ) : (
              changes.map((change) => {
                const stored = hasStoredChange(change.id);
                const markedResolved = resolvedIds.has(change.id);
                const isResolving = resolvingId === change.id;

                return (
                  <ContextMenu key={change.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          styles.changeCard,
                          stored && styles.resolved,
                          markedResolved && styles.markedResolved,
                        )}
                      >
                        <div className={styles.changeHeader}>
                          <span className={styles.teamName}>{change.team}</span>
                          <div className={styles.headerActions}>
                            {stored && (
                              <span className={styles.resolvedBadge}>
                                В очереди на применение
                              </span>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={styles.resolveButton}
                              title="Пометить решённым"
                              disabled={markedResolved || !!isResolving}
                              onClick={(e) => handleMarkResolved(change.id, e)}
                            >
                              {isResolving ? (
                                <Loader2
                                  className={cn(styles.resolveIcon, styles.resolveIconSpinner)}
                                  size={18}
                                />
                              ) : (
                                <CheckCircle2
                                  className={cn(
                                    styles.resolveIcon,
                                    markedResolved && styles.resolveIconDone,
                                  )}
                                  size={18}
                                />
                              )}
                            </Button>
                          </div>
                        </div>
                        <div
                          className={styles.changeText}
                          onContextMenu={() => {
                            setCapturedSelection(
                              window.getSelection()?.toString().replace(/\s+/g, " ").trim() || null,
                            );
                          }}
                        >
                          {highlightNames(change.change)}
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent
                      className={styles.contextMenu}
                      onCloseAutoFocus={() => setCapturedSelection(null)}
                    >
                      {parsedCount !== null ? (
                        <>
                          <ContextMenuItem
                            onSelect={() => handleCountResolution(change, "add", parsedCount)}
                          >
                            Добавить {parsedCount} человек
                          </ContextMenuItem>
                          <ContextMenuItem
                            onSelect={() => handleCountResolution(change, "remove", parsedCount)}
                          >
                            Убрать {parsedCount} человек
                          </ContextMenuItem>
                          <ContextMenuItem
                            onSelect={() => handleCountResolution(change, "set", parsedCount)}
                          >
                            Установить {parsedCount} человек
                          </ContextMenuItem>
                        </>
                      ) : (
                        <>
                          <ContextMenuItem
                            onSelect={() => handleResolution(change, "add-player")}
                          >
                            Добавить игрока
                          </ContextMenuItem>
                          <ContextMenuItem
                            onSelect={() =>
                              handleResolution(change, "add-player-with-pass")
                            }
                          >
                            Добавить игрока с пропуском
                          </ContextMenuItem>
                          <ContextMenuItem
                            onSelect={() => handleResolution(change, "add-pass")}
                          >
                            Добавить пропуск
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })
            )}
          </div>
        )}

        {resolutions.length > 0 && (
          <div className={styles.resolutionsSummary}>
            <h3>Выбрано действий: {resolutions.length}</h3>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
