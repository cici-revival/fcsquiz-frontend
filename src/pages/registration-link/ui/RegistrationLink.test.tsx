import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegistrationLinkPage from "./RegistrationLink";
import { useTeamStore } from "@/entities/team/model/team.store";
import { ApiError, NotFoundError } from "@shared/api/errors";

const getRegistrationLink = vi.fn();
const setRegistrationLink = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: {
    getRegistrationLink: (game: unknown) => getRegistrationLink(game),
    setRegistrationLink: (payload: unknown) => setRegistrationLink(payload),
  },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function linkInput() {
  return screen.getByLabelText("Новая ссылка");
}

function saveButton() {
  return screen.getByRole("button", { name: "Сохранить и сделать текущей" });
}

describe("RegistrationLinkPage", () => {
  beforeEach(() => {
    getRegistrationLink.mockReset();
    setRegistrationLink.mockReset();
    useTeamStore.getState().clear();
    useTeamStore.getState().setGameMeta(3, 2);
  });

  it("показывает ссылку выбранной игры", async () => {
    getRegistrationLink.mockResolvedValue({ link: "https://forms.example/a" });

    render(<RegistrationLinkPage />);

    expect(await screen.findByRole("link", { name: "https://forms.example/a" })).toBeInTheDocument();
    expect(getRegistrationLink).toHaveBeenCalledWith({ season: 3, game_number: 2 });
    expect(linkInput()).toHaveValue("https://forms.example/a");
  });

  it("сообщает, что ссылка не задана", async () => {
    getRegistrationLink.mockRejectedValue(new NotFoundError());

    render(<RegistrationLinkPage />);

    expect(await screen.findByText("Ссылка не задана")).toBeInTheDocument();
  });

  it("не даёт сохранить ссылку без https", async () => {
    getRegistrationLink.mockRejectedValue(new NotFoundError());

    render(<RegistrationLinkPage />);
    await screen.findByText("Ссылка не задана");

    fireEvent.change(linkInput(), { target: { value: "http://forms.example" } });

    expect(screen.getByText("Ссылка должна начинаться с https://")).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it("сохраняет ссылку и делает игру текущей", async () => {
    getRegistrationLink.mockRejectedValue(new NotFoundError());
    setRegistrationLink.mockResolvedValue({});
    useTeamStore.getState().setGameMeta(3, 2);

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
    expect(await screen.findByRole("link", { name: "https://forms.example/b" })).toBeInTheDocument();
    expect(useTeamStore.getState().gameMeta).toEqual({ season: 3, gameNumber: 2 });
  });

  it("показывает понятную ошибку при конфликте", async () => {
    getRegistrationLink.mockRejectedValue(new NotFoundError());
    setRegistrationLink.mockRejectedValue(new ApiError("conflict", 409, "Conflict"));

    render(<RegistrationLinkPage />);
    await screen.findByText("Ссылка не задана");

    fireEvent.change(linkInput(), { target: { value: "https://forms.example/c" } });
    fireEvent.click(saveButton());

    expect(await screen.findByText("Не удалось сохранить")).toBeInTheDocument();
    expect(screen.getByText(/данные игры изменились/)).toBeInTheDocument();
  });
});
