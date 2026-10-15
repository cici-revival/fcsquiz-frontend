import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GameID,
  StatsImportStatus,
  StatsImportStatusResponse,
} from "@/types/api";
import { adminkaApi } from "@shared/api/adminkaApi";
import { ApiError, NotFoundError } from "@shared/api/errors";
import {
  getHttpErrorMessage,
  statsImportHttpMessages,
} from "@shared/api/statusMessages";
import { uploadFile } from "@shared/api/uploadFile";

export const POLL_INTERVAL_MS = 2_000;

export type StatsImportView =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "never_started" }
  | { kind: "uploading" }
  | { kind: StatsImportStatus }
  | { kind: "status_error"; message: string };

type StatusSource = () => Promise<StatsImportStatusResponse>;

function isActive(status: StatsImportStatus): boolean {
  return status === "queued" || status === "processing";
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return getHttpErrorMessage(error, statsImportHttpMessages, error.message);
  }
  if (error instanceof TypeError) {
    return "Нет связи с сервером, попробуйте ещё раз";
  }

  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

export function useStatsImport(game: GameID | null) {
  const [view, setView] = useState<StatsImportView>({ kind: "idle" });
  const [startError, setStartError] = useState<string | null>(null);
  const [resultsVersion, setResultsVersion] = useState(0);

  const generation = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSource = useRef<{ source: StatusSource; wasActive: boolean } | null>(null);
  const uploaded = useRef<{ file: File; fileId: string } | null>(null);

  const season = game?.season ?? 0;
  const gameNumber = game?.game_number ?? 0;

  const stop = useCallback(() => {
    generation.current += 1;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }

    return generation.current;
  }, []);

  const track = useCallback(
    (gen: number, source: StatusSource, wasActive: boolean, delay: number) => {
      let sawActive = wasActive;
      lastSource.current = { source, wasActive };

      const tick = async () => {
        timer.current = null;
        let response: StatsImportStatusResponse;

        try {
          response = await source();
        } catch (error) {
          if (gen !== generation.current) return;
          if (error instanceof NotFoundError && !sawActive) {
            setView({ kind: "never_started" });
            return;
          }
          lastSource.current = { source, wasActive: sawActive };
          setView({ kind: "status_error", message: errorMessage(error) });
          return;
        }

        if (gen !== generation.current) return;

        setView({ kind: response.status });

        if (isActive(response.status)) {
          sawActive = true;
          timer.current = setTimeout(tick, POLL_INTERVAL_MS);
          return;
        }

        if (response.status === "succeeded" && sawActive) {
          setResultsVersion((version) => version + 1);
        }
      };

      if (delay > 0) {
        timer.current = setTimeout(tick, delay);
      } else {
        void tick();
      }
    },
    [],
  );

  useEffect(() => {
    const gen = stop();
    setStartError(null);

    if (!season || !gameNumber) {
      setView({ kind: "idle" });
      return;
    }

    setView({ kind: "loading" });
    track(
      gen,
      () => adminkaApi.getGameStatsImport({ season, game_number: gameNumber }),
      false,
      0,
    );

    return () => {
      stop();
    };
  }, [season, gameNumber, stop, track]);

  const retryStatus = useCallback(() => {
    const last = lastSource.current;
    if (!last) return;

    const gen = stop();
    setView({ kind: "loading" });
    track(gen, last.source, last.wasActive, 0);
  }, [stop, track]);

  const start = useCallback(
    async (file: File) => {
      if (!season || !gameNumber) return;

      const gen = stop();
      const game = { season, game_number: gameNumber };
      setStartError(null);
      setView({ kind: "uploading" });

      try {
        let fileId =
          uploaded.current?.file === file ? uploaded.current.fileId : null;

        if (!fileId) {
          fileId = await uploadFile(file);
          uploaded.current = { file, fileId };
        }
        if (gen !== generation.current) return;

        const { import_id } = await adminkaApi.startStatsImport({
          file_id: fileId,
          ...game,
        });
        if (gen !== generation.current) return;

        setView({ kind: "queued" });
        track(gen, () => adminkaApi.getStatsImport(import_id), true, POLL_INTERVAL_MS);
      } catch (error) {
        if (gen !== generation.current) return;

        setStartError(errorMessage(error));
        setView({ kind: "loading" });
        track(gen, () => adminkaApi.getGameStatsImport(game), false, 0);
      }
    },
    [season, gameNumber, stop, track],
  );

  return { view, startError, resultsVersion, start, retryStatus };
}
