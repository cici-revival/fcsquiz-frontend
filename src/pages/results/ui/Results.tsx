import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { GameTeamSummary, StatsTeamScores } from "@/types/api";
import { useTeamStore } from "@/entities/team/model/team.store";
import {
  MAX_GAME_NUMBER,
  MIN_GAME_NUMBER,
  ResultsTable,
  type ResultsTableRow,
  isValidGameNumber,
  isValidSeason,
} from "@entities/stats";
import { adminkaApi } from "@shared/api/adminkaApi";
import { NotFoundError } from "@shared/api/errors";
import {
  gameResultsHttpMessages,
  getHttpErrorMessage,
} from "@shared/api/statusMessages";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/Alert";
import { teamHistoryPath } from "../lib/paths";
import styles from "./Results.module.css";

type LoadState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "not_published" }
  | { state: "error"; message: string }
  | { state: "loaded"; results: StatsTeamScores[]; teams: GameTeamSummary[] };

function readNumber(value: string | null): number {
  return value && /^\d+$/.test(value) ? Number(value) : 0;
}

export default function ResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const season = readNumber(searchParams.get("season"));
  const gameNumber = readNumber(searchParams.get("game"));
  const hasGame = isValidSeason(season) && isValidGameNumber(gameNumber);

  const currentSeason = useTeamStore((s) => s.gameMeta.season);
  const currentGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);
  const rosterTeams = useTeamStore((s) => s.teams);

  const [seasonInput, setSeasonInput] = useState(season ? String(season) : "");
  const [gameInput, setGameInput] = useState(gameNumber ? String(gameNumber) : "");
  const [load, setLoad] = useState<LoadState>({ state: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  const hasParams = searchParams.has("season") || searchParams.has("game");

  useEffect(() => {
    if (hasParams || !currentSeason || !currentGameNumber) return;

    setSearchParams(
      { season: String(currentSeason), game: String(currentGameNumber) },
      { replace: true },
    );
  }, [hasParams, currentSeason, currentGameNumber, setSearchParams]);

  useEffect(() => {
    if (season) setSeasonInput(String(season));
    if (gameNumber) setGameInput(String(gameNumber));
  }, [season, gameNumber]);

  useEffect(() => {
    if (!hasGame) {
      setLoad({ state: "idle" });
      return;
    }

    let isActive = true;
    setLoad({ state: "loading" });

    const game = { season, game_number: gameNumber };

    Promise.all([
      adminkaApi.getGameResults(game),
      adminkaApi.getGameTeams(game).catch(() => []),
    ])
      .then(([response, teams]) => {
        if (!isActive) return;
        setLoad({ state: "loaded", results: response.results ?? [], teams });
      })
      .catch((error) => {
        if (!isActive) return;
        if (error instanceof NotFoundError) {
          setLoad({ state: "not_published" });
          return;
        }
        setLoad({
          state: "error",
          message: getHttpErrorMessage(
            error,
            gameResultsHttpMessages,
            "Не удалось загрузить результаты",
          ),
        });
      });

    return () => {
      isActive = false;
    };
  }, [hasGame, season, gameNumber, reloadKey]);

  const parsedSeason = readNumber(seasonInput.trim());
  const parsedGame = readNumber(gameInput.trim());
  const inputError =
    (seasonInput && !isValidSeason(parsedSeason)) ||
    (gameInput && !isValidGameNumber(parsedGame))
      ? `Сезон — положительное число, игра — от ${MIN_GAME_NUMBER} до ${MAX_GAME_NUMBER}`
      : null;
  const canSubmit =
    !inputError && isValidSeason(parsedSeason) && isValidGameNumber(parsedGame);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    if (parsedSeason === season && parsedGame === gameNumber) {
      setReloadKey((key) => key + 1);
      return;
    }

    setSearchParams({ season: String(parsedSeason), game: String(parsedGame) });
  };

  const rows = useMemo<ResultsTableRow[]>(() => {
    if (load.state !== "loaded") return [];

    const names = new Map(load.teams.map((team) => [team.id, team.name]));

    return [...load.results]
      .sort((a, b) => a.place - b.place)
      .map((scores) => {
        const name =
          names.get(scores.team_id)?.trim() ||
          rosterTeams.get(scores.team_id)?.name?.trim() ||
          "";

        return {
          key: scores.team_id,
          scores,
          label: (
            <Link
              className={styles.teamLink}
              to={teamHistoryPath(scores.team_id, name)}
            >
              {name || scores.team_id}
            </Link>
          ),
        };
      });
  }, [load, rosterTeams]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.back} to="/">
          <ArrowLeft size={16} />
          На главную
        </Link>

        <h1 className={styles.title}>Результаты игр</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <Label htmlFor="results-season">Сезон</Label>
            <Input
              id="results-season"
              inputMode="numeric"
              value={seasonInput}
              onChange={(event) => setSeasonInput(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <Label htmlFor="results-game">Игра</Label>
            <Input
              id="results-game"
              inputMode="numeric"
              value={gameInput}
              onChange={(event) => setGameInput(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!canSubmit}>
            Показать
          </Button>
        </form>
        {inputError && <p className={styles.inputError}>{inputError}</p>}

        {load.state === "idle" && (
          <p className={styles.muted}>Выберите сезон и номер игры</p>
        )}

        {load.state === "loading" && (
          <p className={styles.muted}>Загрузка результатов...</p>
        )}

        {load.state === "not_published" && (
          <p className={styles.muted}>Результаты этой игры ещё не опубликованы</p>
        )}

        {load.state === "error" && (
          <Alert variant="destructive" className={styles.alert}>
            <AlertCircle />
            <div>
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{load.message}</AlertDescription>
            </div>
            <Button variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
              Повторить
            </Button>
          </Alert>
        )}

        {load.state === "loaded" &&
          (rows.length === 0 ? (
            <p className={styles.muted}>В этой игре нет результатов</p>
          ) : (
            <ResultsTable
              rows={rows}
              labelHeader="Команда"
              caption={`Сезон ${season}, игра ${gameNumber}`}
            />
          ))}
      </div>
    </div>
  );
}
