import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Landing from "./Landing";
import { useTeamStore } from "@/entities/team/model/team.store";
import type { RosterTeam } from "@/entities/team/types";
import { NotFoundError } from "@shared/api/errors";

const getRegistrationLink = vi.fn();

vi.mock("@shared/api/adminkaApi", () => ({
  adminkaApi: { getRegistrationLink: () => getRegistrationLink() },
}));

vi.mock("@/entities/team/team.bootstrap", () => ({
  restartTeams: vi.fn(),
}));

function team(name: string, id: string): RosterTeam {
  return {
    id,
    name,
    tg: "",
    captain: "",
    players_count: 4,
    passes: [],
  };
}

/** Заполняет стор командами и переводит соединение в подключённое. */
function seedTeams(names: string[]) {
  const store = useTeamStore.getState();
  store.setInitial(names.map((n, i) => team(n, `id-${i}`)));
  store.setStatus("connected");
}

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("Landing", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    stubMatchMedia(false);
    useTeamStore.getState().clear();
    getRegistrationLink.mockReset();
    getRegistrationLink.mockRejectedValue(new NotFoundError());
  });

  it("показывает кнопку регистрации с полученной ссылкой", async () => {
    getRegistrationLink.mockResolvedValue({ link: "https://forms.example/quiz" });

    render(<Landing />);

    const button = await screen.findByRole("button", { name: "Регистрация на игру" });
    expect(button.closest("a")).toHaveAttribute("href", "https://forms.example/quiz");
  });

  it("не показывает кнопку регистрации, если ссылки нет", async () => {
    render(<Landing />);

    await waitFor(() => expect(getRegistrationLink).toHaveBeenCalled());

    expect(screen.queryByRole("button", { name: "Регистрация на игру" })).toBeNull();
  });

  it("не показывает кнопку регистрации для небезопасной ссылки", async () => {
    getRegistrationLink.mockResolvedValue({ link: "javascript:alert(1)" });

    render(<Landing />);

    await waitFor(() => expect(getRegistrationLink).toHaveBeenCalled());

    expect(screen.queryByRole("button", { name: "Регистрация на игру" })).toBeNull();
  });

  it("сортирует команды по алфавиту, а не по порядку прихода", () => {
    seedTeams(["Яуза", "Альфа", "Бета"]);

    render(<Landing />);

    const names = screen
      .getAllByRole("listitem")
      .map((li) => li.textContent?.replace("···", "").trim());

    expect(names).toEqual(["Альфа", "Бета", "Яуза"]);
  });

  it("показывает первую порцию и прячет остальные", () => {
    seedTeams(Array.from({ length: 60 }, (_, i) => `Команда ${i + 1}`));

    render(<Landing />);

    // Десктопная порция — 24.
    expect(screen.getAllByRole("listitem")).toHaveLength(24);
    expect(screen.getByText("24 из 60")).toBeInTheDocument();
  });

  it("раскрывает следующую порцию по кнопке", () => {
    seedTeams(Array.from({ length: 60 }, (_, i) => `Команда ${i + 1}`));

    render(<Landing />);
    fireEvent.click(screen.getByRole("button", { name: /Показать ещё/ }));

    expect(screen.getAllByRole("listitem")).toHaveLength(48);
    expect(screen.getByText("48 из 60")).toBeInTheDocument();
  });

  it("прячет кнопку, когда показаны все команды", () => {
    seedTeams(["Альфа", "Бета"]);

    render(<Landing />);

    expect(
      screen.queryByRole("button", { name: /Показать ещё/ }),
    ).not.toBeInTheDocument();
  });

  it("показывает все совпадения поиска без ограничения", () => {
    seedTeams(Array.from({ length: 60 }, (_, i) => `Команда ${i + 1}`));

    render(<Landing />);
    fireEvent.change(screen.getByPlaceholderText("Найти команду..."), {
      target: { value: "Команда 1" },
    });

    // «Команда 1», «Команда 1x» — все 11 совпадений видны сразу,
    // без нажатия «показать ещё».
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
    expect(
      screen.queryByRole("button", { name: /Показать ещё/ }),
    ).not.toBeInTheDocument();
  });

  it("сообщает, когда поиск ничего не нашёл", () => {
    seedTeams(["Альфа"]);

    render(<Landing />);
    fireEvent.change(screen.getByPlaceholderText("Найти команду..."), {
      target: { value: "щщщ" },
    });

    expect(screen.getByText(/Ничего не нашлось/)).toBeInTheDocument();
  });

  it("показывает скелет, пока соединение не установлено", () => {
    useTeamStore.getState().setStatus("connecting");

    render(<Landing />);

    expect(screen.getByLabelText("Загрузка списка команд")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("скрывает скелет, когда команды пришли", () => {
    seedTeams(["Альфа"]);

    render(<Landing />);

    expect(
      screen.queryByLabelText("Загрузка списка команд"),
    ).not.toBeInTheDocument();
  });

  it("на мобильном показывает меньшую порцию", () => {
    stubMatchMedia(true);
    seedTeams(Array.from({ length: 60 }, (_, i) => `Команда ${i + 1}`));

    render(<Landing />);

    expect(screen.getAllByRole("listitem")).toHaveLength(12);
  });
});
