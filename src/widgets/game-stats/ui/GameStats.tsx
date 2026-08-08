import { useEffect, useMemo, useState } from "react";
import { useTeamStore } from "@entities/team/model/team.store";
import { adminkaApi } from "@shared/api/adminkaApi";
import type { Team } from "@/types/api";
import { GameSelect } from "./GameSelect";
import TeamsTableCard from "./TeamsTableCard";
import RosterDistributionCard from "./RosterDistributionCard";
import PlaceholderCard from "./PlaceholderCard";
import SeasonRegistrationsCard from "./SeasonRegistrationsCard";
import GameStatsSkeleton from "./GameStatsSkeleton";
import styles from "./GameStats.module.css";

export default function GameStats() {
  const teamsMap = useTeamStore((s) => s.teams);
  const sseStatus = useTeamStore((s) => s.status);
  const liveTeams = useMemo(() => Array.from(teamsMap.values()), [teamsMap]);

  const [currentSeason, setCurrentSeason] = useState(0);
  const [currentGameNumber, setCurrentGameNumber] = useState(0);

  const [season, setSeason] = useState(0);
  const [gameNumber, setGameNumber] = useState(0);

  const [preflightTeams, setPreflightTeams] = useState<Team[]>([]);
  const [preflightLoading, setPreflightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminkaApi
      .getCurrentGame()
      .then((game) => {
        if (cancelled) return;
        setCurrentSeason(game.season);
        setCurrentGameNumber(game.game_number);
        setSeason((prev) => prev || game.season);
        setGameNumber((prev) => prev || game.game_number);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isCurrentGame =
    season > 0 &&
    season === currentSeason &&
    gameNumber === currentGameNumber;

  useEffect(() => {
    if (season <= 0 || gameNumber <= 0 || isCurrentGame) {
      setPreflightTeams([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setPreflightLoading(true);
    setError(null);

    adminkaApi
      .getRegisteredTeams({ season, game_number: gameNumber })
      .then((res) => {
        if (!cancelled) setPreflightTeams(res ?? []);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setPreflightTeams([]);
        setError(e instanceof Error ? e.message : "Ошибка загрузки команд");
      })
      .finally(() => {
        if (!cancelled) setPreflightLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [season, gameNumber, isCurrentGame]);

  const gameSelected = season > 0 && gameNumber > 0;
  const teams = isCurrentGame ? liveTeams : preflightTeams;

  const isLoading = isCurrentGame
    ? (sseStatus === "connecting" || sseStatus === "idle") &&
      liveTeams.length === 0
    : preflightLoading;

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <GameSelect
          season={season}
          gameNumber={gameNumber}
          maxSeason={Math.max(currentSeason, season)}
          maxGameNumber={Math.max(currentGameNumber, gameNumber)}
          onSeasonChange={setSeason}
          onGameNumberChange={setGameNumber}
        />
      </div>

      {!gameSelected ? (
        <p className={styles.placeholder}>
          Выберите игру, чтобы увидеть статистику.
        </p>
      ) : isLoading ? (
        <GameStatsSkeleton />
      ) : error ? (
        <p className={styles.chartError}>{error}</p>
      ) : (
        <div className={styles.grid}>
          <TeamsTableCard teams={teams} />
          <RosterDistributionCard teams={teams} />
          <PlaceholderCard />
          <div className={styles.fullWidth}>
            <SeasonRegistrationsCard
              season={season}
              maxGameNumber={gameNumber}
            />
          </div>
        </div>
      )}
    </div>
  );
}
