import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POLL_INTERVAL_MS, useStatsImport } from "./useStatsImport";
import { ApiError, NotFoundError } from "@shared/api/errors";
import type { GameID } from "@/types/api";

const getGameStatsImport = vi.fn();
const getStatsImport = vi.fn();
const startStatsImport = vi.fn();
const uploadFile = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    getGameStatsImport: (game: unknown) => getGameStatsImport(game),
    getStatsImport: (id: string) => getStatsImport(id),
    startStatsImport: (payload: unknown) => startStatsImport(payload),
  },
}));

vi.mock("@shared/api/uploadFile", () => ({
  uploadFile: (file: File) => uploadFile(file),
}));

const GAME_1: GameID = { season: 9901, game_number: 1 };
const GAME_2: GameID = { season: 9901, game_number: 2 };
const file = new File(["x"], "scores.xlsx");

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("useStatsImport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getGameStatsImport.mockReset();
    getStatsImport.mockReset();
    startStatsImport.mockReset();
    uploadFile.mockReset();
    uploadFile.mockResolvedValue("file-1");
    startStatsImport.mockResolvedValue({ import_id: "import-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("404 по игре — импорт ещё не запускали", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();

    expect(result.current.view).toEqual({ kind: "never_started" });
  });

  it("после запуска опрашивает раз в 2 секунды и останавливается на succeeded", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    getStatsImport
      .mockResolvedValueOnce({ status: "queued" })
      .mockResolvedValueOnce({ status: "processing" })
      .mockResolvedValueOnce({ status: "succeeded" });

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();

    await act(async () => {
      await result.current.start(file);
    });

    expect(uploadFile).toHaveBeenCalledWith(file);
    expect(startStatsImport).toHaveBeenCalledWith({
      file_id: "file-1",
      season: 9901,
      game_number: 1,
    });
    expect(startStatsImport).toHaveBeenCalledTimes(1);
    expect(result.current.view).toEqual({ kind: "queued" });

    await flush(POLL_INTERVAL_MS);
    expect(getStatsImport).toHaveBeenCalledWith("import-1");
    expect(result.current.view).toEqual({ kind: "queued" });

    await flush(POLL_INTERVAL_MS);
    expect(result.current.view).toEqual({ kind: "processing" });

    await flush(POLL_INTERVAL_MS);
    expect(result.current.view).toEqual({ kind: "succeeded" });
    expect(result.current.resultsVersion).toBe(1);

    await flush(POLL_INTERVAL_MS * 5);
    expect(getStatsImport).toHaveBeenCalledTimes(3);
  });

  it("на failed останавливает опрос и не обновляет результаты", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    getStatsImport.mockResolvedValue({ status: "failed" });

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();
    await act(async () => {
      await result.current.start(file);
    });
    await flush(POLL_INTERVAL_MS * 5);

    expect(result.current.view).toEqual({ kind: "failed" });
    expect(result.current.resultsVersion).toBe(0);
    expect(getStatsImport).toHaveBeenCalledTimes(1);
  });

  it("повторный запуск тем же файлом не загружает его заново", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    getStatsImport.mockResolvedValue({ status: "failed" });

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();
    await act(async () => {
      await result.current.start(file);
    });
    await flush(POLL_INTERVAL_MS);
    await act(async () => {
      await result.current.start(file);
    });

    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(startStatsImport).toHaveBeenCalledTimes(2);
  });

  it("при смене игры прекращает опрос прежней", async () => {
    getGameStatsImport.mockImplementation((game: GameID) =>
      Promise.resolve({ status: game.game_number === 1 ? "processing" : "succeeded" }),
    );

    const { result, rerender } = renderHook(({ game }) => useStatsImport(game), {
      initialProps: { game: GAME_1 },
    });
    await flush();
    expect(result.current.view).toEqual({ kind: "processing" });

    rerender({ game: GAME_2 });
    await flush();
    expect(result.current.view).toEqual({ kind: "succeeded" });

    const callsAfterSwitch = getGameStatsImport.mock.calls.length;
    await flush(POLL_INTERVAL_MS * 3);

    expect(getGameStatsImport.mock.calls.length).toBe(callsAfterSwitch);
    expect(result.current.resultsVersion).toBe(0);
  });

  it("останавливает опрос при уходе со страницы", async () => {
    getGameStatsImport.mockResolvedValue({ status: "processing" });

    const { unmount } = renderHook(() => useStatsImport(GAME_1));
    await flush();
    unmount();
    await flush(POLL_INTERVAL_MS * 3);

    expect(getGameStatsImport).toHaveBeenCalledTimes(1);
  });

  it("409 — сообщает о конфликте и показывает текущий статус игры", async () => {
    getGameStatsImport
      .mockRejectedValueOnce(new NotFoundError())
      .mockResolvedValue({ status: "processing" });
    startStatsImport.mockRejectedValue(new ApiError("conflict", 409, "Conflict"));

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();
    await act(async () => {
      await result.current.start(file);
    });
    await flush();

    expect(result.current.startError).toMatch(/дождитесь завершения/);
    expect(result.current.view).toEqual({ kind: "processing" });
  });

  it("не запускает обработку, если загрузка файла не удалась", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    uploadFile.mockRejectedValue(new Error("Не удалось загрузить файл в хранилище (403)"));

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();
    await act(async () => {
      await result.current.start(file);
    });
    await flush();

    expect(startStatsImport).not.toHaveBeenCalled();
    expect(result.current.startError).toBe("Не удалось загрузить файл в хранилище (403)");
  });

  it("ошибка статуса даёт повторить запрос", async () => {
    getGameStatsImport
      .mockRejectedValueOnce(new ApiError("boom", 500, "Internal"))
      .mockResolvedValueOnce({ status: "succeeded" });

    const { result } = renderHook(() => useStatsImport(GAME_1));
    await flush();
    expect(result.current.view.kind).toBe("status_error");

    act(() => result.current.retryStatus());
    await flush();

    expect(result.current.view).toEqual({ kind: "succeeded" });
  });
});
