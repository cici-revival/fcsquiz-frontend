import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { TeamPool } from "./TeamPool";

/**
 * jsdom не реализует PointerEvent, и fireEvent.pointerMove отдаёт clientX = null.
 * Поэтому шлём настоящий MouseEvent с нужным type — координаты доходят.
 */
function pointer(
  node: HTMLElement,
  type: "pointerdown" | "pointermove" | "pointerup",
  clientX: number,
  clientY: number,
) {
  fireEvent(node, new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY }));
}

function stubCapture(node: HTMLElement) {
  node.setPointerCapture = vi.fn();
  node.hasPointerCapture = vi.fn(() => false);
  node.releasePointerCapture = vi.fn();
}

describe("TeamPool", () => {
  it("показывает количество нерассаженных команд", () => {
    render(
      <TeamPool
        teams={[
          { teamId: "a", name: "Альфа", size: 5 },
          { teamId: "b", name: "Бета", size: 4 },
        ]}
        onDropTeam={vi.fn()}
      />,
    );

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Альфа")).toBeInTheDocument();
    expect(screen.getByText("Бета")).toBeInTheDocument();
  });

  it("сообщает, когда пул пуст", () => {
    render(<TeamPool teams={[]} onDropTeam={vi.fn()} />);

    expect(screen.getByText("Все команды на местах.")).toBeInTheDocument();
  });

  it("клик без перетаскивания не сажает команду", () => {
    const onDropTeam = vi.fn();

    render(
      <TeamPool
        teams={[{ teamId: "a", name: "Альфа", size: 5 }]}
        onDropTeam={onDropTeam}
      />,
    );

    const chip = screen.getByRole("button", { name: /Альфа/ });
    chip.setPointerCapture = vi.fn();
    chip.hasPointerCapture = vi.fn(() => false);
    chip.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(chip, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(chip, { pointerId: 1, clientX: 0, clientY: 0 });

    expect(onDropTeam).not.toHaveBeenCalled();
  });

  it("медленное перетаскивание маленькими шагами всё равно срабатывает", () => {
    const onDropTeam = vi.fn();

    render(
      <TeamPool
        teams={[{ teamId: "a", name: "Альфа", size: 5 }]}
        onDropTeam={onDropTeam}
      />,
    );

    const chip = screen.getByRole("button", { name: /Альфа/ });
    stubCapture(chip);

    pointer(chip, "pointerdown", 100, 100);

    // Каждый шаг по 1px: дельта одного события ниже порога, но суммарно
    // уходим далеко — именно этот случай и не работал.
    for (let step = 1; step <= 20; step += 1) {
      pointer(chip, "pointermove", 100 + step, 100);
    }

    pointer(chip, "pointerup", 120, 100);

    expect(onDropTeam).toHaveBeenCalledWith("a", { clientX: 120, clientY: 100 });
  });

  it("дрожание курсора в пределах порога не считается перетаскиванием", () => {
    const onDropTeam = vi.fn();

    render(
      <TeamPool
        teams={[{ teamId: "a", name: "Альфа", size: 5 }]}
        onDropTeam={onDropTeam}
      />,
    );

    const chip = screen.getByRole("button", { name: /Альфа/ });
    stubCapture(chip);

    pointer(chip, "pointerdown", 100, 100);
    pointer(chip, "pointermove", 102, 101);
    pointer(chip, "pointerup", 102, 101);

    expect(onDropTeam).not.toHaveBeenCalled();
  });
});
