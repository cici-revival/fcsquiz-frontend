import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SeatingPlan } from "./SeatingPlan";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import { useTeamStore } from "@entities/team/model/team.store";
import type { SeatingTeam } from "@entities/seating/types";
import { BALCONY } from "@entities/seating/config/hall";

function seated(teamId: string, x: number, y: number): SeatingTeam {
  return {
    team_id: teamId,
    size: 6,
    color: "#3B82F6",
    position: { x, y },
    revision: 1,
  };
}

const NAMES = [
  { teamId: "a", name: "Альфа" },
  { teamId: "b", name: "Бета" },
];

describe("SeatingPlan", () => {
  beforeEach(() => {
    useSeatingStore.getState().clear();
    useTeamStore.getState().clear();
    useTeamStore.getState().setInitial([
      {
        id: "a",
        name: "Альфа",
        tg: "",
        captain: "",
        players_count: 6,
        passes: ["Иван", "Пётр"],
      },
    ]);

    // Radix измеряет триггер через ResizeObserver и ждёт pointer-события,
    // которых в jsdom нет — без заглушек попап не открывается.
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  it("рисует посаженные команды", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300), seated("b", 900, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(screen.getByText("Альфа")).toBeInTheDocument();
    expect(screen.getByText("Бета")).toBeInTheDocument();
  });

  it("не рисует команды без позиции", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300), { ...seated("b", 0, 0), position: null }],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(screen.getByText("Альфа")).toBeInTheDocument();
    expect(screen.queryByText("Бета")).not.toBeInTheDocument();
  });

  it("команда без названия в составе не роняет схему", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("unknown", 200, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("по поиску называет найденный стол", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300), seated("b", 900, 300)],
    });

    render(<SeatingPlan teams={NAMES} query="альф" />);

    expect(screen.getByText(/Ваш стол/)).toBeInTheDocument();
  });

  it("без поиска ничего не подсвечивает", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(screen.queryByText(/Ваш стол/)).not.toBeInTheDocument();
  });

  it("считает несколько совпадений", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300), seated("b", 900, 300)],
    });

    render(
      <SeatingPlan
        teams={[
          { teamId: "a", name: "Квиз один" },
          { teamId: "b", name: "Квиз два" },
        ]}
        query="квиз"
      />,
    );

    expect(screen.getByText(/Подсвечено команд: 2/)).toBeInTheDocument();
  });

  it("нумерует столы подряд от 1", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("b", 900, 300), seated("a", 200, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("называет номер найденного стола", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300), seated("b", 900, 300)],
    });

    render(<SeatingPlan teams={NAMES} query="бета" />);

    expect(screen.getByText(/Ваш стол/).textContent).toContain("2");
    expect(screen.getByText(/Ваш стол/).textContent).toContain("Бета");
  });

  it("пустая рассадка не ломает рендер", () => {
    render(<SeatingPlan teams={NAMES} />);

    expect(screen.queryByText("Альфа")).not.toBeInTheDocument();
  });

  it("по клику на стол открывает карточку команды", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    fireEvent.click(screen.getByRole("button", { name: /Альфа/ }));

    // В карточке видно то, чего нет на кружке: состав и пропуски.
    expect(screen.getByText("6 человек")).toBeInTheDocument();
    expect(screen.getByText("1. Иван")).toBeInTheDocument();
  });

  it("в карточке есть номер стола", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    fireEvent.click(screen.getByRole("button", { name: /Альфа/ }));

    expect(screen.getByText(/Стол в рассадке/)).toBeInTheDocument();
  });

  it("стол команды без записи в составе не кликается", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("b", 900, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    const table = screen.getByRole("button", { name: /Бета/ });

    expect(table).not.toHaveAttribute("aria-haspopup");
  });

  it("в названии стола есть номер и имя для скринридера", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, 300)],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(
      screen.getByRole("button", { name: "Стол № 1, Альфа" }),
    ).toBeInTheDocument();
  });

  it("называет балкон в подписи стола для скринридера", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a", 200, BALCONY.seatY)],
    });

    render(<SeatingPlan teams={NAMES} />);

    expect(
      screen.getByRole("button", { name: "Балкон, стол № 1, Альфа" }),
    ).toBeInTheDocument();
  });
});
