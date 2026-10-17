import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { GameTeamSummary, StatsTeamScores } from "@/types/api";
import SelectGameSeason from "@/widgets/select-game/SelectGameSeason";
import { useTeamStore } from "@/entities/team/model/team.store";
import {
  MAX_GAME_NUMBER,
  MIN_GAME_NUMBER,
  ResultsTable,
  type ResultsTableRow,
  createTeamNameLookup,
  isValidGameNumber,
  isValidSeason,
  sortByPlace,
} from "@entities/stats";
import { adminkaApi } from "@shared/api/adminkaApi";
import { NotFoundError } from "@shared/api/errors";
import { Button } from "@shared/ui/Button";
import { FileDropzone } from "@shared/ui/FileDropzone";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/Alert";
import { useStatsImport, type StatsImportView } from "../model/useStatsImport";
import styles from "./StatsImport.module.css";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ResultsState =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "empty" }
  | { state: "error" }
  | { state: "loaded"; results: StatsTeamScores[]; teams: GameTeamSummary[] };

const STATUS_TEXT: Partial<Record<StatsImportView["kind"], string>> = {
  loading: "Проверяем статус...",
  never_started: "Импорт ещё не запускали",
  uploading: "Загружаем файл...",
  queued: "В очереди на обработку",
  processing: "Обрабатывается",
  succeeded: "Обработка завершена, результаты обновлены",
  failed: "Не удалось обработать файл. Предыдущие результаты сохранены — можно запустить обработку снова.",
};

function isBusy(view: StatsImportView): boolean {
  return (
    view.kind === "loading" ||
    view.kind === "uploading" ||
    view.kind === "queued" ||
    view.kind === "processing"
  );
}

export default function StatsImportPage() {
  const storeSeason = useTeamStore((s) => s.gameMeta.season);
  const storeGameNumber = useTeamStore((s) => s.gameMeta.gameNumber);
  const rosterTeams = useTeamStore((s) => s.teams);

  const [season, setSeason] = useState(0);
  const [gameNumber, setGameNumber] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsState>({ state: "idle" });
  const [resultsReloadKey, setResultsReloadKey] = useState(0);

  const isGameValid = isValidSeason(season) && isValidGameNumber(gameNumber);
  const game = useMemo(
    () => (isGameValid ? { season, game_number: gameNumber } : null),
    [isGameValid, season, gameNumber],
  );

  const { view, startError, resultsVersion, start, retryStatus } = useStatsImport(game);

  const gameKey = game ? `${game.season}/${game.game_number}` : null;
  const [resultsGameKey, setResultsGameKey] = useState(gameKey);
  if (resultsGameKey !== gameKey) {
    setResultsGameKey(gameKey);
    setResults({ state: gameKey ? "loading" : "idle" });
  }

  useEffect(() => {
    if (!game) return;

    let isActive = true;

    Promise.all([
      adminkaApi.getGameResults(game),
      adminkaApi.getGameTeams(game).catch(() => []),
    ])
      .then(([response, teams]) => {
        if (!isActive) return;
        setResults({ state: "loaded", results: response.results ?? [], teams });
      })
      .catch((error) => {
        if (!isActive) return;
        setResults((prev) =>
          error instanceof NotFoundError
            ? { state: "empty" }
            : prev.state === "loaded"
              ? prev
              : { state: "error" },
        );
      });

    return () => {
      isActive = false;
    };
  }, [game, resultsVersion, resultsReloadKey]);

  const rows = useMemo<ResultsTableRow[]>(() => {
    if (results.state !== "loaded") return [];

    const nameOf = createTeamNameLookup(results.teams, rosterTeams);

    return sortByPlace(results.results).map((scores) => ({
      key: scores.team_id,
      label: nameOf(scores.team_id) || scores.team_id,
      scores,
    }));
  }, [results, rosterTeams]);

  const handleFile = (selected: File) => {
    setFileError(null);

    if (!selected.name.toLowerCase().endsWith(".xlsx")) {
      setFileError("Нужен файл в формате .xlsx");
      setFile(null);
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setFileError("Файл слишком большой. Максимальный размер: 10MB");
      setFile(null);
      return;
    }

    setFile(selected);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFileError(null);
  };

  const busy = isBusy(view);
  const canStart = !!game && !!file && !busy;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canStart || !file) return;
    void start(file);
  };

  const statusText = STATUS_TEXT[view.kind];

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Загрузить результаты игры</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <SelectGameSeason
          onSeasonChange={setSeason}
          onGameNumberChange={setGameNumber}
          initialSeason={storeSeason}
          initialGameNumber={storeGameNumber}
        />
        {(season > 0 || gameNumber > 0) && !isGameValid && (
          <p className={styles.fieldError}>
            Сезон — положительное число, игра — от {MIN_GAME_NUMBER} до {MAX_GAME_NUMBER}
          </p>
        )}

        <div className={styles.fileRow}>
          <FileDropzone
            file={file}
            accept=".xlsx"
            formats="XLSX"
            label="Файл результатов (.xlsx)"
            onFile={handleFile}
            onRemove={handleRemoveFile}
            disabled={busy}
            status={view.kind === "uploading" ? "loading" : fileError ? "error" : "ok"}
          />
          <p className={styles.hint}>
            Для игры N обрабатывается лист «Игра N». Нужен согласованный шаблон
            с колонкой «Название команды» и раундами.
          </p>
          {fileError && <p className={styles.fieldError}>{fileError}</p>}
        </div>

        <div className={styles.actions}>
          <Button type="submit" disabled={!canStart}>
            {view.kind === "uploading" ? (
              <>
                <Loader2 className={styles.spinner} size={16} />
                Загрузка...
              </>
            ) : view.kind === "failed" || view.kind === "succeeded" ? (
              "Запустить обработку снова"
            ) : (
              "Загрузить и обработать"
            )}
          </Button>
        </div>
      </form>

      {game && (
        <section className={styles.status} aria-label="Статус обработки" aria-live="polite">
          <h2 className={styles.sectionTitle}>Статус</h2>

          {statusText && (
            <p
              className={
                view.kind === "failed"
                  ? styles.statusFailed
                  : view.kind === "succeeded"
                    ? styles.statusSucceeded
                    : styles.statusText
              }
            >
              {(view.kind === "queued" || view.kind === "processing") && (
                <Loader2 className={styles.spinner} size={16} />
              )}
              {view.kind === "succeeded" && <CheckCircle2 size={16} />}
              {statusText}
            </p>
          )}

          {view.kind === "status_error" && (
            <Alert variant="destructive" className={styles.alert}>
              <AlertCircle />
              <div>
                <AlertTitle>Не удалось получить статус</AlertTitle>
                <AlertDescription>{view.message}</AlertDescription>
              </div>
              <Button variant="outline" onClick={retryStatus}>
                Повторить
              </Button>
            </Alert>
          )}

          {startError && (
            <Alert variant="destructive" className={styles.alert}>
              <AlertCircle />
              <div>
                <AlertTitle>Обработка не запущена</AlertTitle>
                <AlertDescription>{startError}</AlertDescription>
              </div>
            </Alert>
          )}
        </section>
      )}

      {game && (
        <section className={styles.results} aria-label="Результаты игры">
          <h2 className={styles.sectionTitle}>Результаты</h2>

          {results.state === "loading" && (
            <p className={styles.statusText}>Загрузка результатов...</p>
          )}
          {results.state === "empty" && (
            <p className={styles.statusText}>Результатов этой игры пока нет</p>
          )}
          {results.state === "error" && (
            <Alert variant="destructive" className={styles.alert}>
              <AlertCircle />
              <div>
                <AlertTitle>Не удалось загрузить результаты</AlertTitle>
              </div>
              <Button
                variant="outline"
                onClick={() => setResultsReloadKey((key) => key + 1)}
              >
                Повторить
              </Button>
            </Alert>
          )}
          {results.state === "loaded" &&
            (rows.length === 0 ? (
              <p className={styles.statusText}>Результатов этой игры пока нет</p>
            ) : (
              <ResultsTable rows={rows} labelHeader="Команда" />
            ))}
        </section>
      )}
    </main>
  );
}
