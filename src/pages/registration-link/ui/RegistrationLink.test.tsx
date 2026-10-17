import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegistrationLinkPage from "./RegistrationLink";
import { useTeamStore } from "@/entities/team/model/team.store";
import { ApiError, NotFoundError } from "@shared/api/errors";
import type { GameID } from "@/types/api";

const getCurrentGame = vi.fn();
const getRegistrationLink = vi.fn();
const setRegistrationLink = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    getCurrentGame: () => getCurrentGame(),
    getRegistrationLink: (game?: GameID) => getRegistrationLink(game),
    setRegistrationLink: (payload: unknown) => setRegistrationLink(payload),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

const CURRENT: GameID = { season: 3, game_number: 2 };

function linksByGame(links: Record<string, string>) {
  getRegistrationLink.mockImplementation((game?: GameID) => {
    const key = game ? `${game.season}/${game.game_number}` : "current";
    const link = links[key];

    return link ? Promise.resolve({ link }) : Promise.reject(new NotFoundError());
  });
}

function linkInput() {
  return screen.getByLabelText("Новая ссылка");
}

function saveButton() {
  return screen.getByRole("button", { name: "Сохранить" });
}

function editSection() {
  return screen.getByRole("region", { name: "Изменить ссылку" });
}

describe("RegistrationLinkPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTeamStore.getState().clear();
    getCurrentGame.mockResolvedValue(CURRENT);
  });

  it("показывает, что сейчас на главной", async () => {
    linksByGame({ current: "https://forms.example/now", "3/2": "https://forms.example/now" });

    render(<RegistrationLinkPage />);

    const published = await screen.findByRole("region", { name: "Сейчас на главной" });
    expect(
      await within(published).findByRole("link", { name: "https://forms.example/now" }),
    ).toBeInTheDocument();
    expect(within(published).getByText("Текущая: игра №2, сезон 3")).toBeInTheDocument();
  });

  it("сообщает, что кнопки на главной нет", async () => {
    linksByGame({});

    render(<RegistrationLinkPage />);

    expect(
      await screen.findByText(/Ссылка для текущей игры не задана/),
    ).toBeInTheDocument();
  });

  it("по умолчанию выбирает текущую игру и подставляет её ссылку", async () => {
    linksByGame({ current: "https://forms.example/a", "3/2": "https://forms.example/a" });

    render(<RegistrationLinkPage />);

    await waitFor(() => expect(linkInput()).toHaveValue("https://forms.example/a"));
    expect(getRegistrationLink).toHaveBeenCalledWith(CURRENT);
    expect(within(editSection()).getByText("Текущая игра")).toBeInTheDocument();
  });

  it("не даёт сохранить ссылку без https и неизменённую ссылку", async () => {
    linksByGame({ "3/2": "https://forms.example/a" });

    render(<RegistrationLinkPage />);
    await waitFor(() => expect(linkInput()).toHaveValue("https://forms.example/a"));

    expect(saveButton()).toBeDisabled();
    expect(screen.getByText("Эта ссылка уже сохранена")).toBeInTheDocument();

    fireEvent.change(linkInput(), { target: { value: "http://forms.example" } });

    expect(screen.getByText("Нужна полная ссылка, начинающаяся с https://")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("для текущей игры сохраняет сразу, без подтверждения", async () => {
    linksByGame({});
    setRegistrationLink.mockResolvedValue({});

    render(<RegistrationLinkPage />);
    await screen.findByText("Ссылка не задана");

    fireEvent.change(linkInput(), { target: { value: " https://forms.example/b " } });
    fireEvent.click(saveButton());

    await waitFor(() =>
      expect(setRegistrationLink).toHaveBeenCalledWith({
        season: 3,
        game_number: 2,
        link: "https://forms.example/b",
      }),
    );
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("для другой игры предупреждает и просит подтвердить смену текущей", async () => {
    linksByGame({});
    setRegistrationLink.mockResolvedValue({});

    render(<RegistrationLinkPage />);
    await screen.findByText("Ссылка не задана");

    fireEvent.change(document.getElementById("gameNumber")!, {
      target: { value: "5" },
    });
    await waitFor(() => expect(getRegistrationLink).toHaveBeenCalledWith({ season: 3, game_number: 5 }));

    expect(await screen.findByText(/Сохранение сделает текущей игру №5 сезона 3/)).toBeInTheDocument();

    fireEvent.change(linkInput(), { target: { value: "https://forms.example/c" } });
    fireEvent.click(saveButton());

    const dialog = await screen.findByRole("alertdialog");
    expect(setRegistrationLink).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Сохранить и сделать текущей" }));

    await waitFor(() =>
      expect(setRegistrationLink).toHaveBeenCalledWith({
        season: 3,
        game_number: 5,
        link: "https://forms.example/c",
      }),
    );
    expect(useTeamStore.getState().gameMeta).toEqual({ season: 3, gameNumber: 5 });
  });

  it("показывает понятную ошибку при конфликте", async () => {
    linksByGame({});
    setRegistrationLink.mockRejectedValue(new ApiError("conflict", 409, "Conflict"));

    render(<RegistrationLinkPage />);
    await screen.findByText("Ссылка не задана");

    fireEvent.change(linkInput(), { target: { value: "https://forms.example/d" } });
    fireEvent.click(saveButton());

    expect(await screen.findByText(/данные игры изменились/)).toBeInTheDocument();
  });
});
