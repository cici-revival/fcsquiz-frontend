import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StatsImportPage from "./StatsImport";
import { useTeamStore } from "@/entities/team/model/team.store";
import { NotFoundError } from "@shared/api/errors";

const getGameStatsImport = vi.fn();
const getStatsImport = vi.fn();
const startStatsImport = vi.fn();
const getGameResults = vi.fn();
const getGameTeams = vi.fn();
const uploadFile = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    getGameStatsImport: (game: unknown) => getGameStatsImport(game),
    getStatsImport: (id: string) => getStatsImport(id),
    startStatsImport: (payload: unknown) => startStatsImport(payload),
    getGameResults: (game: unknown) => getGameResults(game),
    getGameTeams: (game: unknown) => getGameTeams(game),
  },
}));

vi.mock("@shared/api/uploadFile", () => ({
  uploadFile: (file: File) => uploadFile(file),
}));

const oldResults = {
  game_id: { season: 9901, game_number: 1 },
  results: [{ team_id: "t-1", round_scores: [1, 2], total: 3, points: 100, place: 1 }],
};

describe("StatsImportPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeamStore.getState().clear();
    useTeamStore.getState().setGameMeta(9901, 1);
    getGameTeams.mockResolvedValue([{ id: "t-1", name: "Альфа", players_count: 4 }]);
    uploadFile.mockResolvedValue("file-1");
    startStatsImport.mockResolvedValue({ import_id: "import-1" });
  });

  it("показывает, что импорт не запускали, и результатов нет", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    getGameResults.mockRejectedValue(new NotFoundError());

    render(<StatsImportPage />);

    expect(await screen.findByText("Импорт ещё не запускали")).toBeInTheDocument();
    expect(await screen.findByText("Результатов этой игры пока нет")).toBeInTheDocument();
  });

  it("при failed оставляет прежнюю таблицу и даёт запустить снова", async () => {
    getGameStatsImport.mockResolvedValue({ status: "failed" });
    getGameResults.mockResolvedValue(oldResults);

    render(<StatsImportPage />);

    expect(await screen.findByText(/Не удалось обработать файл/)).toBeInTheDocument();
    expect(await screen.findByText("Альфа")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Запустить обработку снова" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Файл результатов (.xlsx)"), {
      target: { files: [new File(["x"], "scores.xlsx")] },
    });

    expect(screen.getByRole("button", { name: "Запустить обработку снова" })).toBeEnabled();
  });

  it("не принимает файл не в формате xlsx", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    getGameResults.mockRejectedValue(new NotFoundError());

    render(<StatsImportPage />);
    await screen.findByText("Импорт ещё не запускали");

    fireEvent.change(screen.getByLabelText("Файл результатов (.xlsx)"), {
      target: { files: [new File(["x"], "scores.csv")] },
    });

    expect(screen.getByText("Нужен файл в формате .xlsx")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Загрузить и обработать" })).toBeDisabled();
  });

  it("запускает обработку выбранной игры", async () => {
    getGameStatsImport.mockRejectedValue(new NotFoundError());
    getGameResults.mockRejectedValue(new NotFoundError());
    getStatsImport.mockResolvedValue({ status: "queued" });

    render(<StatsImportPage />);
    await screen.findByText("Импорт ещё не запускали");

    fireEvent.change(screen.getByLabelText("Файл результатов (.xlsx)"), {
      target: { files: [new File(["x"], "scores.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Загрузить и обработать" }));

    await waitFor(() =>
      expect(startStatsImport).toHaveBeenCalledWith({
        file_id: "file-1",
        season: 9901,
        game_number: 1,
      }),
    );
    expect(await screen.findByText("В очереди на обработку")).toBeInTheDocument();
  });
});
