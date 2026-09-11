import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SeatingPlan } from "./SeatingPlan";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import type { SeatingTeam } from "@entities/seating/types";

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

  it("пустая рассадка не ломает рендер", () => {
    render(<SeatingPlan teams={NAMES} />);

    expect(screen.queryByText("Альфа")).not.toBeInTheDocument();
  });
});
