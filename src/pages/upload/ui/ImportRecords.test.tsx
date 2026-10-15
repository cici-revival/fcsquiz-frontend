import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UploadPage from "./Upload";
import { ImportRecords } from "./ImportRecords";
import { useUploadResultStore } from "../model/uploadResult.store";
import type { RegistrationImportRecord, RegistrationImportResult } from "@/types/api";

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

function record(
  row_index: number,
  overrides: Partial<RegistrationImportRecord> = {},
): RegistrationImportRecord {
  return {
    id: `r-${row_index}`,
    row_index,
    author: "Иван Иванов",
    group: "",
    type: "register",
    tg: "@secret_tg",
    team_name: `Команда ${row_index}`,
    players_count: 4,
    passes: [],
    is_ready_to_accept_players: false,
    changes: "",
    ip_address: "10.0.0.1",
    timestamp: 0,
    change_requests: [],
    ...overrides,
  };
}

const counters = {
  total_registration_records: 3,
  new_registration_records_count: 2,
  unique_new_teams_count: 1,
  old_changes_count: 0,
  new_changes_count: 1,
  new_lost_players_count: 0,
};

function bodyRows() {
  const [, body] = screen.getAllByRole("rowgroup");
  return within(body).queryAllByRole("row");
}

describe("ImportRecords", () => {
  it("при смешанном результате по умолчанию показывает только строки с ошибками", () => {
    render(
      <ImportRecords
        records={[
          record(3),
          record(2, { validation_error: "Не указано название команды", team_name: "" }),
          record(5, { type: "change" }),
        ]}
      />,
    );

    expect(screen.getByText("Строк: 3")).toBeInTheDocument();
    expect(screen.getByText(/с ошибками: 1/)).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("Не указано название команды")).toBeInTheDocument();
  });

  it("по переключателю показывает все строки по порядку", () => {
    render(
      <ImportRecords
        records={[
          record(3),
          record(2, { validation_error: "Ошибка" }),
          record(5, { type: "change" }),
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("switch", { name: "Только ошибки" }));

    const rows = bodyRows();
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual([
      "2",
      "3",
      "5",
    ]);
    expect(within(rows[2]).getByText("Изменение")).toBeInTheDocument();
  });

  it("не выводит персональные данные", () => {
    render(<ImportRecords records={[record(1)]} />);

    expect(screen.queryByText("@secret_tg")).toBeNull();
    expect(screen.queryByText("10.0.0.1")).toBeNull();
    expect(screen.queryByText("Иван Иванов")).toBeNull();
  });

  it("сообщает о пустом списке записей", () => {
    render(<ImportRecords records={[]} />);

    expect(screen.getByText("В файле не найдено ни одной записи")).toBeInTheDocument();
  });

  it("показывает большие списки порциями", () => {
    const records = Array.from({ length: 150 }, (_, i) => record(i + 1));

    render(<ImportRecords records={records} />);

    expect(bodyRows()).toHaveLength(100);

    fireEvent.click(screen.getByRole("button", { name: "Показать ещё (50)" }));

    expect(bodyRows()).toHaveLength(150);
  });
});

describe("UploadPage: результат импорта", () => {
  beforeEach(() => {
    useUploadResultStore.getState().clear();
  });

  it("показывает прежние счётчики вместе с записями", () => {
    const result: RegistrationImportResult = {
      ...counters,
      records: [record(1, { validation_error: "Неверное число игроков" })],
    };
    useUploadResultStore.getState().setResult(result);

    render(<UploadPage />);

    expect(screen.getByText("Всего регистраций").nextSibling).toHaveTextContent("3");
    expect(screen.getByText("Новых регистраций").nextSibling).toHaveTextContent("2");
    expect(screen.getByText("Неверное число игроков")).toBeInTheDocument();
  });

  it("показывает счётчики, даже если записей в ответе нет", () => {
    useUploadResultStore.getState().setResult(counters);

    render(<UploadPage />);

    expect(screen.getByText("Новых команд").nextSibling).toHaveTextContent("1");
    expect(screen.getByText("В файле не найдено ни одной записи")).toBeInTheDocument();
  });
});
