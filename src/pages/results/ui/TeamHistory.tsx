import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import type { StatsResultsRange, StatsTeamGameResult } from "@/types/api";
import { useTeamStore } from "@/entities/team/model/team.store";
import {
  EMPTY_RANGE_INPUT,
  ResultsTable,
  type ResultsRangeInput,
  type ResultsTableRow,
  isRangeEmpty,
  validateResultsRange,
} from "@entities/stats";
import { adminkaApi } from "@shared/api/adminkaApi";
import {
  getHttpErrorMessage,
  teamResultsHttpMessages,
} from "@shared/api/statusMessages";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import { Label } from "@shared/ui/Label";
import { Alert, AlertDescription, AlertTitle } from "@shared/ui/Alert";
import styles from "./Results.module.css";

type LoadState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "loaded"; results: StatsTeamGameResult[] };

const RANGE_PARAMS: Record<keyof ResultsRangeInput, string> = {
  seasonStart: "season_start",
  gameStart: "game_number_start",
  seasonEnd: "season_end",
  gameEnd: "game_number_end",
};

const RANGE_FIELDS: { key: keyof ResultsRangeInput; label: string }[] = [
  { key: "seasonStart", label: "С сезона" },
  { key: "gameStart", label: "с игры" },
  { key: "seasonEnd", label: "По сезон" },
  { key: "gameEnd", label: "по игру" },
];

function readRangeInput(searchParams: URLSearchParams): ResultsRangeInput {
  return {
    seasonStart: searchParams.get(RANGE_PARAMS.seasonStart) ?? "",
    gameStart: searchParams.get(RANGE_PARAMS.gameStart) ?? "",
    seasonEnd: searchParams.get(RANGE_PARAMS.seasonEnd) ?? "",
    gameEnd: searchParams.get(RANGE_PARAMS.gameEnd) ?? "",
  };
}

export default function TeamHistoryPage() {
  const { teamId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const nameParam = searchParams.get("name")?.trim() ?? "";
  const rosterName = useTeamStore((s) => s.teams.get(teamId)?.name?.trim() ?? "");
  const teamName = nameParam || rosterName;

  const appliedInput = readRangeInput(searchParams);
  const appliedKey = JSON.stringify(appliedInput);
  const appliedRange: StatsResultsRange | null =
    validateResultsRange(appliedInput).range;
  const rangeKey = appliedRange ? JSON.stringify(appliedRange) : null;

  const [input, setInput] = useState<ResultsRangeInput>(appliedInput);
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [reloadKey, setReloadKey] = useState(0);

  const [syncedKey, setSyncedKey] = useState(appliedKey);
  if (syncedKey !== appliedKey) {
    setSyncedKey(appliedKey);
    setInput(appliedInput);
  }

  useEffect(() => {
    if (rangeKey === null) {
      setLoad({ state: "error", message: "Неверный период в адресе страницы" });
      return;
    }

    let isActive = true;
    setLoad({ state: "loading" });

    adminkaApi
      .getTeamResults(teamId, JSON.parse(rangeKey) as StatsResultsRange)
      .then((response) => {
        if (!isActive) return;
        setLoad({ state: "loaded", results: response.results ?? [] });
      })
      .catch((error) => {
        if (!isActive) return;
        setLoad({
          state: "error",
          message: getHttpErrorMessage(
            error,
            teamResultsHttpMessages,
            "Не удалось загрузить историю команды",
          ),
        });
      });

    return () => {
      isActive = false;
    };
  }, [teamId, rangeKey, reloadKey]);

  const validation = validateResultsRange(input);

  const applyRange = (next: ResultsRangeInput) => {
    const params = new URLSearchParams();
    if (nameParam) params.set("name", nameParam);
    for (const { key } of RANGE_FIELDS) {
      const value = next[key].trim();
      if (value) params.set(RANGE_PARAMS[key], value);
    }

    if (params.toString() === searchParams.toString()) {
      setReloadKey((key) => key + 1);
      return;
    }

    setSearchParams(params);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validation.error) return;
    applyRange(input);
  };

  const rows = useMemo<ResultsTableRow[]>(() => {
    if (load.state !== "loaded") return [];

    return load.results.map(({ game_id, result }) => ({
      key: `${game_id.season}-${game_id.game_number}`,
      label: `Сезон ${game_id.season}, игра ${game_id.game_number}`,
      scores: result,
    }));
  }, [load]);

  const emptyMessage =
    appliedRange && isRangeEmpty(appliedRange)
      ? "Команда пока не участвовала в опубликованных играх"
      : "За выбранный период результатов нет";

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link className={styles.back} to="/results">
          <ArrowLeft size={16} />
          К результатам игр
        </Link>

        <h1 className={styles.title}>{teamName || "История команды"}</h1>
        {!teamName && <p className={styles.subtitle}>{teamId}</p>}

        <form className={styles.form} onSubmit={handleSubmit}>
          {RANGE_FIELDS.map(({ key, label }) => (
            <div key={key} className={styles.field}>
              <Label htmlFor={`range-${key}`}>{label}</Label>
              <Input
                id={`range-${key}`}
                inputMode="numeric"
                value={input[key]}
                onChange={(event) =>
                  setInput((prev) => ({ ...prev, [key]: event.target.value }))
                }
              />
            </div>
          ))}
          <Button type="submit" disabled={!!validation.error}>
            Показать
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setInput(EMPTY_RANGE_INPUT);
              applyRange(EMPTY_RANGE_INPUT);
            }}
          >
            Вся история
          </Button>
        </form>
        {validation.error && <p className={styles.inputError}>{validation.error}</p>}

        {load.state === "loading" && (
          <p className={styles.muted}>Загрузка истории...</p>
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
            <p className={styles.muted}>{emptyMessage}</p>
          ) : (
            <ResultsTable rows={rows} labelHeader="Игра" />
          ))}
      </div>
    </div>
  );
}
