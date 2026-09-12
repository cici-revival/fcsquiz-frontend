import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { TeamDetails, TeamDetailsDisclosure } from "./TeamDetails";
import type { RosterTeam } from "../types";

function team(overrides: Partial<RosterTeam> = {}): RosterTeam {
  return {
    id: "t1",
    name: "Альфа",
    tg: "",
    captain: "",
    players_count: 6,
    passes: [],
    ...overrides,
  };
}

/** jsdom не реализует matchMedia, а useIsMobile на него опирается. */
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TeamDetails", () => {
  it("показывает название и число человек", () => {
    render(<TeamDetails team={team({ name: "Альфа", players_count: 7 })} />);

    expect(screen.getByText("Альфа")).toBeInTheDocument();
    expect(screen.getByText("7 человек")).toBeInTheDocument();
  });

  it("выводит пропуски нумерованным списком", () => {
    render(<TeamDetails team={team({ passes: ["Иван", "Пётр"] })} />);

    expect(screen.getByText("1. Иван")).toBeInTheDocument();
    expect(screen.getByText("2. Пётр")).toBeInTheDocument();
  });

  it("ставит прочерк, когда пропусков нет", () => {
    render(<TeamDetails team={team({ passes: [] })} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("подставляет заглушку вместо пустого названия", () => {
    render(<TeamDetails team={team({ name: "" })} />);

    expect(screen.getByText("Без названия")).toBeInTheDocument();
  });
});

describe("TeamDetailsDisclosure", () => {
  it("рендерит триггер как есть", () => {
    stubMatchMedia(false);

    render(
      <TeamDetailsDisclosure team={team()}>
        <button type="button">стол</button>
      </TeamDetailsDisclosure>,
    );

    expect(screen.getByRole("button", { name: "стол" })).toBeInTheDocument();
  });

  it("с disabled не оборачивает триггер подсказкой", () => {
    stubMatchMedia(false);

    render(
      <TeamDetailsDisclosure team={team()} disabled>
        <button type="button">стол</button>
      </TeamDetailsDisclosure>,
    );

    const trigger = screen.getByRole("button", { name: "стол" });

    expect(trigger).toBeInTheDocument();
    expect(trigger).not.toHaveAttribute("data-slot", "tooltip-trigger");
  });
});
