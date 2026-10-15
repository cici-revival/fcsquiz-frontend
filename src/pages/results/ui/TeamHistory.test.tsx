import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import TeamHistoryPage from "./TeamHistory";
import { useTeamStore } from "@/entities/team/model/team.store";
import { ApiError } from "@shared/api/errors";

const getTeamResults = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    getTeamResults: (teamId: string, range: unknown) => getTeamResults(teamId, range),
  },
}));

const TEAM_ID = "b7de69e2-6439-4373-ac3f-452e78ecef36";

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/results/team/:teamId" element={<TeamHistoryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const history = {
  results: [
    {
      game_id: { season: 9901, game_number: 1 },
      result: {
        team_id: TEAM_ID,
        round_scores: [10, 5, 0, 2.5, -1, 4, 3],
        total: 23.5,
        points: 100,
        place: 1,
      },
    },
  ],
};

describe("TeamHistoryPage", () => {
  beforeEach(() => {
    getTeamResults.mockReset();
    useTeamStore.getState().clear();
  });

  it("по умолчанию запрашивает всю историю без параметров", async () => {
    getTeamResults.mockResolvedValue(history);

    renderAt(`/results/team/${TEAM_ID}?name=Альфа`);

    const table = await screen.findByRole("table");
    expect(getTeamResults).toHaveBeenCalledWith(TEAM_ID, {});
    expect(screen.getByRole("heading", { name: "Альфа" })).toBeInTheDocument();
    expect(within(table).getByText("Сезон 9901, игра 1")).toBeInTheDocument();
    expect(within(table).getByText("23,5")).toBeInTheDocument();
  });

  it("передаёт только заданные границы периода", async () => {
    getTeamResults.mockResolvedValue(history);

    renderAt(`/results/team/${TEAM_ID}`);
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("По сезон"), { target: { value: "9901" } });
    fireEvent.change(screen.getByLabelText("по игру"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Показать" }));

    await screen.findByRole("table");
    expect(getTeamResults).toHaveBeenLastCalledWith(TEAM_ID, {
      season_end: 9901,
      game_number_end: 2,
    });
  });

  it("берёт период из адреса", async () => {
    getTeamResults.mockResolvedValue(history);

    renderAt(`/results/team/${TEAM_ID}?season_start=9901&game_number_start=1`);

    await screen.findByRole("table");
    expect(getTeamResults).toHaveBeenCalledWith(TEAM_ID, {
      season_start: 9901,
      game_number_start: 1,
    });
    expect(screen.getByLabelText("С сезона")).toHaveValue("9901");
  });

  it("не даёт отправить игру без сезона", async () => {
    getTeamResults.mockResolvedValue(history);

    renderAt(`/results/team/${TEAM_ID}`);
    await screen.findByRole("table");

    fireEvent.change(screen.getByLabelText("с игры"), { target: { value: "1" } });

    expect(screen.getByText("Номер игры нельзя указать без сезона")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Показать" })).toBeDisabled();
  });

  it("пустая история — не ошибка", async () => {
    getTeamResults.mockResolvedValue({ results: [] });

    renderAt(`/results/team/${TEAM_ID}`);

    expect(
      await screen.findByText("Команда пока не участвовала в опубликованных играх"),
    ).toBeInTheDocument();
  });

  it("пустой период — своё сообщение", async () => {
    getTeamResults.mockResolvedValue({ results: null });

    renderAt(`/results/team/${TEAM_ID}?season_start=1`);

    expect(
      await screen.findByText("За выбранный период результатов нет"),
    ).toBeInTheDocument();
  });

  it("без названия показывает ID команды", async () => {
    getTeamResults.mockResolvedValue({ results: [] });

    renderAt(`/results/team/${TEAM_ID}`);

    expect(await screen.findByText(TEAM_ID)).toBeInTheDocument();
  });

  it("при ошибке даёт повторить", async () => {
    getTeamResults
      .mockRejectedValueOnce(new ApiError("bad", 400, "Bad Request"))
      .mockResolvedValueOnce(history);

    renderAt(`/results/team/${TEAM_ID}`);

    expect(
      await screen.findByText("Неверный идентификатор команды или период"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Повторить" }));

    expect(await screen.findByRole("table")).toBeInTheDocument();
  });
});
