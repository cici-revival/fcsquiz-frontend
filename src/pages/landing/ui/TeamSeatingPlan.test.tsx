import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { TeamSeatingPlan } from "./TeamSeatingPlan";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import { useTeamStore } from "@entities/team/model/team.store";
import type { SeatingTeam } from "@entities/seating/types";

function seated(teamId: string): SeatingTeam {
  return {
    team_id: teamId,
    size: 6,
    color: "#3B82F6",
    position: { x: 200, y: 300 },
    revision: 1,
  };
}

describe("TeamSeatingPlan", () => {
  beforeEach(() => {
    useSeatingStore.getState().clear();
    useTeamStore.getState().clear();
    useTeamStore.getState().setInitial([
      { id: "a", name: "Альфа", tg: "", captain: "", players_count: 6, passes: [] },
    ]);
  });

  it("не показывает секцию, пока рассадка не опубликована", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: false,
      teams: [seated("a")],
    });

    const { container } = render(<TeamSeatingPlan />);

    expect(container).toBeEmptyDOMElement();
  });

  it("не показывает секцию, если рассадка пуста", () => {
    useSeatingStore.getState().applySnapshot({ is_published: true, teams: [] });

    const { container } = render(<TeamSeatingPlan />);

    expect(container).toBeEmptyDOMElement();
  });

  it("показывает схему после публикации", () => {
    useSeatingStore.getState().applySnapshot({
      is_published: true,
      teams: [seated("a")],
    });

    render(<TeamSeatingPlan />);

    expect(screen.getByText("Рассадка")).toBeInTheDocument();
    expect(screen.getByText("Альфа")).toBeInTheDocument();
  });
});
