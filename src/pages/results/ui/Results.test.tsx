import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ResultsPage from "./Results";
import { useTeamStore } from "@/entities/team/model/team.store";
import { ApiError, NotFoundError } from "@shared/api/errors";
import type { StatsGameResults } from "@/types/api";

const getGameResults = vi.fn();
const getGameTeams = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    getGameResults: (game: unknown) => getGameResults(game),
    getGameTeams: (game: unknown) => getGameTeams(game),
  },
}));

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <ResultsPage />
    </MemoryRouter>,
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });

  return { promise, resolve };
}

const game1: StatsGameResults = {
  game_id: { season: 9901, game_number: 1 },
  results: [
    {
      team_id: "t-2",
      round_scores: [0, -1, 2.5],
      total: 1.5,
      points: 50,
      place: 2,
    },
    {
      team_id: "t-1",
      round_scores: [10, 5, 0],
      total: 15,
      points: 100,
      place: 1,
    },
  ],
};

describe("ResultsPage", () => {
  beforeEach(() => {
    getGameResults.mockReset();
    getGameTeams.mockReset();
    getGameTeams.mockResolvedValue([{ id: "t-1", name: "Альфа", players_count: 4 }]);
    useTeamStore.getState().clear();
  });

  it("показывает таблицу по месту, все раунды и ID команды без названия", async () => {
    getGameResults.mockResolvedValue(game1);

    renderAt("/results?season=9901&game=1");

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);

    expect(getGameResults).toHaveBeenCalledWith({ season: 9901, game_number: 1 });
    expect(within(rows[0]).getByRole("link", { name: "Альфа" })).toHaveAttribute(
      "href",
      "/results/team/t-1?name=%D0%90%D0%BB%D1%8C%D1%84%D0%B0",
    );
    expect(within(rows[1]).getByRole("link", { name: "t-2" })).toBeInTheDocument();
    expect(rows[1].textContent).toContain("0");
    expect(rows[1].textContent).toContain("-1");
    expect(rows[1].textContent).toContain("2,5");
    expect(within(table).getByText("Р3")).toBeInTheDocument();
  });

  it("сообщает, что результаты не опубликованы", async () => {
    getGameResults.mockRejectedValue(new NotFoundError());

    renderAt("/results?season=9901&game=3");

    expect(
      await screen.findByText("Результаты этой игры ещё не опубликованы"),
    ).toBeInTheDocument();
  });

  it("при ошибке сервера даёт повторить запрос", async () => {
    getGameResults
      .mockRejectedValueOnce(new ApiError("boom", 500, "Internal"))
      .mockResolvedValueOnce(game1);

    renderAt("/results?season=9901&game=1");

    fireEvent.click(await screen.findByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(getGameResults).toHaveBeenCalledTimes(2);
  });

  it("не показывает устаревший ответ после смены игры", async () => {
    const first = deferred<StatsGameResults>();
    const second = deferred<StatsGameResults>();
    getGameResults
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    renderAt("/results?season=9901&game=1");

    fireEvent.change(screen.getByLabelText("Игра"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Показать" }));

    second.resolve({
      game_id: { season: 9901, game_number: 2 },
      results: [{ team_id: "t-3", round_scores: [1], total: 1, points: 100, place: 1 }],
    });
    expect(await screen.findByRole("link", { name: "t-3" })).toBeInTheDocument();

    first.resolve(game1);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(screen.queryByRole("link", { name: "Альфа" })).toBeNull();
    expect(screen.getByRole("link", { name: "t-3" })).toBeInTheDocument();
  });

  it("берёт текущую игру, если в адресе ничего нет", async () => {
    getGameResults.mockResolvedValue(game1);
    useTeamStore.getState().setGameMeta(9901, 1);

    renderAt("/results");

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(getGameResults).toHaveBeenCalledWith({ season: 9901, game_number: 1 });
  });

  it("не даёт запросить игру вне 1–10", () => {
    renderAt("/results");

    fireEvent.change(screen.getByLabelText("Сезон"), { target: { value: "9901" } });
    fireEvent.change(screen.getByLabelText("Игра"), { target: { value: "11" } });

    expect(screen.getByRole("button", { name: "Показать" })).toBeDisabled();
  });
});
