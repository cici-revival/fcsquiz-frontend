import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import TeamTable from "./TeamTable";
import { displayName } from "@entities/team/lib/teamName";
import { type RosterTeam } from "@/entities/team/types";

function team(overrides: Partial<RosterTeam> = {}): RosterTeam {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "",
    tg: "",
    captain: "",
    players_count: 0,
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

describe("displayName", () => {
  it("возвращает название команды, если оно задано", () => {
    expect(displayName(team({ name: "alpha" }))).toBe("alpha");
  });

  it("возвращает заглушку для пустого названия", () => {
    expect(displayName(team({ name: "" }))).toBe("Без названия");
  });
});

describe("TeamTable", () => {
  beforeEach(() => {
    stubMatchMedia(false);
  });

  it("рендерит команды списком, а не таблицей", () => {
    render(
      <TeamTable
        query=""
        teams={[
          team({ id: "a", name: "Альфа" }),
          team({ id: "b", name: "Бета" }),
        ]}
      />,
    );

    // Раскладку задаёт CSS Grid: разметка остаётся плоским списком
    // независимо от числа колонок.
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("не группирует команды по три", () => {
    const teams = Array.from({ length: 7 }, (_, i) =>
      team({ id: String(i), name: `Команда ${i}` }),
    );

    render(<TeamTable query="" teams={teams} />);

    // Старая реализация резала массив по три и добивала строку пустыми
    // ячейками — в списке лишних элементов быть не должно.
    expect(screen.getAllByRole("listitem")).toHaveLength(7);
  });

  it("подсвечивает совпадение с поиском", () => {
    render(<TeamTable query="льф" teams={[team({ id: "a", name: "Альфа" })]} />);

    const mark = document.querySelector("mark");
    expect(mark?.textContent).toBe("льф");
  });

  it("переживает спецсимволы в поиске", () => {
    // Незаэкранированная скобка роняла new RegExp прямо при вводе.
    expect(() =>
      render(<TeamTable query="((" teams={[team({ id: "a", name: "Альфа" })]} />),
    ).not.toThrow();
  });

  it("даёт кнопке деталей осмысленную подпись", () => {
    render(<TeamTable query="" teams={[team({ id: "a", name: "Альфа" })]} />);

    expect(
      screen.getByRole("button", { name: "Подробнее о Альфа" }),
    ).toBeInTheDocument();
  });
});
