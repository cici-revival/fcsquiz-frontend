import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTeamStore } from "@/entities/team/model/team.store";
import { adminkaApi } from "@/shared/api/adminkaApi";
import type { Player, Team } from "@/types/api";
import { Button } from "@/shared/ui/Button";
import { Copy } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
} from "@/shared/ui";
import "react-widgets/styles.css";
import styles from "./DistributePage.module.css";
import { cn } from "@/shared/lib/utils";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";

type LostPlayerWithId = {
  id: string;
  player: Player;
  selectedTeamName: string | null;
};

export default function DistributePage() {
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);

  const [lostPlayers, setLostPlayers] = useState<LostPlayerWithId[]>([]);
  const [teamsFromApi, setTeamsFromApi] = useState<Team[]>([]);
  const [season, setSeason] = useState<number>(0);
  const [gameNumber, setGameNumber] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Источник правды — бэкенд: отображаем команды/места по ответу lost_players_info.
  // После отправки распределения делаем повторный запрос и получаем актуальное состояние.
  const availableTeams = useMemo(
    () => teamsFromApi.filter((team) => team.is_ready_to_accept_players),
    [teamsFromApi],
  );

  const teamsByName = useMemo(() => {
    const map = new Map<string, Team>();
    availableTeams.forEach((team) => {
      map.set(team.name, team);
    });
    return map;
  }, [availableTeams]);

  const assignedCounts = useMemo(() => {
    const counts = new Map<string, number>();
    lostPlayers.forEach((item) => {
      if (!item.selectedTeamName) return;
      const current = counts.get(item.selectedTeamName) ?? 0;
      counts.set(item.selectedTeamName, current + 1);
    });
    return counts;
  }, [lostPlayers]);

  useEffect(() => {
    if (!initialized && storeSeason !== 0 && storeGameNumber !== 0) {
      setSeason(storeSeason);
      setGameNumber(storeGameNumber);
      setInitialized(true);
    }
  }, [storeSeason, storeGameNumber, initialized]);

  useEffect(() => {
    if (!season || !gameNumber) return;
    void loadLostPlayers(season, gameNumber);
  }, [season, gameNumber]);

  const loadLostPlayers = async (
    currentSeason: number,
    currentGameNumber: number,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await adminkaApi.getLostPlayers({
        season: currentSeason,
        game_number: currentGameNumber,
      });
			console.log(data.teams_who_can_accept_players)

      const withIds: LostPlayerWithId[] = (data.lost_players ?? []).map(
        (player, index) => ({
          id: `${player.tg ?? player.name}-${index}`,
          player,
          selectedTeamName: null,
        }),
      );

      setLostPlayers(withIds);
      setTeamsFromApi(data.teams_who_can_accept_players ?? []);
    } catch (e) {
      console.error("Failed to load lost players", e);
      setError("Не удалось загрузить список одиночек");
      toast.error("Не удалось загрузить список одиночек");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTeam = (playerId: string, teamName: string | null) => {
    setLostPlayers((prev) =>
      prev.map((item) =>
        item.id === playerId ? { ...item, selectedTeamName: teamName } : item,
      ),
    );
  };

  const copyToClipboard = async (value: string | undefined | null) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Скопировано");
    } catch (e) {
      console.error("Clipboard error", e);
      toast.error("Не удалось скопировать");
    }
  };

  const handleSubmit = async () => {
    if (!season || !gameNumber) {
      toast.error("Нет данных об игре (сезон, номер игры)");
      return;
    }

    const assignments = lostPlayers.filter(
      (item) => item.selectedTeamName && item.player.name,
    );

    if (assignments.length === 0) {
      toast.error("Нет сопоставленных игроков");
      return;
    }

    const missingTeam = assignments.find(
      (a) => !teamsByName.get(a.selectedTeamName ?? "")?.id,
    );
    if (missingTeam) {
      toast.error(`Команда "${missingTeam.selectedTeamName}" не найдена`);
      return;
    }

    setIsSubmitting(true);
    try {
      console.info("[DistributePage] submit distribution", {
        season,
        game_number: gameNumber,
        count: assignments.length,
        assignments: assignments.map((a) => ({
          name: a.player.name,
          team: a.selectedTeamName,
        })),
      });

      const successfulNames: string[] = [];
      const failures: string[] = [];
      for (const { player, selectedTeamName } of assignments) {
        try {
          const response = await adminkaApi.addPlayer({
            season,
            game_number: gameNumber,
            player: {
              team_id: teamsByName.get(selectedTeamName ?? "")?.id ?? "",
              name: player.name,
              is_pass_needed: !!player.is_pass_needed,
              tg: player.tg,
            },
          });
          const status = response.player.player_status;
          if (status === "added" || status === "already_exists" || status === "do_not_need_pass") {
            successfulNames.push(player.name);
          } else {
            failures.push(`${player.name}: ${status ?? "неизвестная ошибка"}`);
          }
        } catch (error) {
          failures.push(`${player.name}: ${error instanceof Error ? error.message : "ошибка запроса"}`);
        }
      }

      if (successfulNames.length > 0) {
        await adminkaApi.markLostPlayersFound({
          season,
          game_number: gameNumber,
          players: successfulNames,
        });
      }

      if (failures.length === 0) {
        toast.success("Распределение отправлено");
      } else {
        toast.error(`${successfulNames.length} успешно, ${failures.length} с ошибкой. ${failures[0]}`);
      }

      // Перезагружаем одиночек после mark_found (бэкенд мог ещё и нормализовать список).
      await loadLostPlayers(season, gameNumber);
    } catch (e) {
      console.error("Failed to submit distribution", e);
      toast.error("Не удалось отправить распределение");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Распределить одиночек</h1>

      <Card>
        <CardContent>
          <div className={styles.layout}>
            <div className={styles.playersColumn}>


              <div className={styles.meta}>
                <SelectGameSeason
                  onSeasonChange={setSeason}
                  onGameNumberChange={setGameNumber}
                  initialSeason={storeSeason}
                  initialGameNumber={storeGameNumber}
                />
              </div>

              {isLoading && (
                <div className={styles.loading}>Загрузка одиночек...</div>
              )}

              {error && <div className={styles.error}>{error}</div>}

              {!isLoading && !error && lostPlayers.length === 0 && (
                <div className={styles.emptyText}>
                  Нет игроков, ожидающих распределения.
                </div>
              )}

              {!isLoading &&
                !error &&
                lostPlayers.map((item) => (
                  <div key={item.id} className={styles.playerCard}>
                    <div className={styles.playerMain}>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className={styles.playerName}
                        onClick={() => copyToClipboard(item.player.tg)}
                        title="Скопировать телеграм"
                      >
                        <Copy size={14} />
                        {item.player.name}
                      </Button>
                    </div>

                    <div className={styles.selectWrapper}>
                      {(() => {
                        if (!item.selectedTeamName) return null;
                        const team = teamsByName.get(item.selectedTeamName);
                        if (!team?.tg) return null;
                        return (
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              styles.pill,
                              styles.pillClickable,
                              styles.captainTag,
                            )}
                            size="sm"
                            onClick={() => copyToClipboard(team.tg)}
                          >
                            <Copy size={14} />
                            {team.tg}
                          </Button>
                        );
                      })()}
                      <Select
                        value={item.selectedTeamName ?? ""}
                        onValueChange={(value) =>
                          handleSelectTeam(item.id, value === "" ? null : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выбрать команду" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTeams
                            .filter((team) => {
                              const baseSeats = Math.max(
                                0,
                                8 - (team.players_count ?? 0),
                              );
                              const assigned =
                                assignedCounts.get(team.name) ?? 0;
                              const freeSeats = Math.max(
                                0,
                                baseSeats - assigned,
                              );
                              return (
                                freeSeats > 0 ||
                                team.name === item.selectedTeamName
                              );
                            })
                            .map((team) => (
                              <SelectItem key={team.name} value={team.name}>
                                {team.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
            </div>

            <div className={styles.teamsColumn}>
              <div className={styles.sectionTitle}>Команды</div>
              {availableTeams.length === 0 ? (
                <div className={styles.teamsEmpty}>
                  Нет команд, готовых принять игроков.
                </div>
              ) : (
                <>
                  <div className={styles.teamsHeaderRow}>
                    <span>Название</span>
                    <span className={styles.seats}>Мест</span>
                    <span>Капитан</span>
                  </div>
                  <div className={styles.teamsList}>
                    {(() => {
                      const active: Team[] = [];
                      const filled: Team[] = [];

                      availableTeams.forEach((team) => {
                        const baseSeats = Math.max(
                          0,
                          8 - (team.players_count ?? 0),
                        );
                        const assigned = assignedCounts.get(team.name) ?? 0;
                        const freeSeats = Math.max(0, baseSeats - assigned);

                        if (freeSeats === 0) {
                          filled.push(team);
                        } else {
                          active.push(team);
                        }
                      });

                      const renderRow = (team: Team, faded: boolean) => {
                        const baseSeats = Math.max(
                          0,
                          8 - (team.players_count ?? 0),
                        );
                        const assigned = assignedCounts.get(team.name) ?? 0;
                        return (
                          <div
                            key={team.name}
                            className={`${styles.teamRow} ${
                              faded ? styles.teamRowFilled : ""
                            }`}
                          >
                            <span className={styles.teamName}>{team.name}</span>
                            <span className={styles.seats}>
                              {assigned}/{baseSeats}
                            </span>
                            <span>
                              {team.tg && (
                                <Button
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                  className={`${styles.pill} ${styles.pillClickable}`}
                                  onClick={() => copyToClipboard(team.tg)}
                                >
                                  <Copy size={14} />
                                  {team.tg}
                                </Button>
                              )}
                            </span>
                          </div>
                        );
                      };

                      return (
                        <>
                          {active.map((team) => renderRow(team, false))}
                          {filled.length > 0 && (
                            <>
                              <div className={styles.teamsDivider} />
                              {filled.map((team) => renderRow(team, true))}
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.submitRow}>
            <Button
              type="button"
              size="lg"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Отправляем..." : "Отправить"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
