import { describe, expect, it } from "vitest";
import { EMPTY_RANGE_INPUT, isRangeEmpty, validateResultsRange } from "./resultsRange";

function validate(input: Partial<typeof EMPTY_RANGE_INPUT>) {
  return validateResultsRange({ ...EMPTY_RANGE_INPUT, ...input });
}

describe("validateResultsRange", () => {
  it("пустой период — вся история без параметров", () => {
    const { range, error } = validate({});

    expect(error).toBeNull();
    expect(range).toEqual({});
    expect(isRangeEmpty(range!)).toBe(true);
  });

  it("только начало", () => {
    expect(validate({ seasonStart: "9901" }).range).toEqual({ season_start: 9901 });
  });

  it("только конец", () => {
    expect(validate({ seasonEnd: "9901", gameEnd: "2" }).range).toEqual({
      season_end: 9901,
      game_number_end: 2,
    });
  });

  it("обе границы", () => {
    expect(
      validate({ seasonStart: "9901", gameStart: "1", seasonEnd: "9901", gameEnd: "2" }).range,
    ).toEqual({
      season_start: 9901,
      game_number_start: 1,
      season_end: 9901,
      game_number_end: 2,
    });
  });

  it("не пропускает игру без сезона", () => {
    expect(validate({ gameStart: "1" }).error).toBe("Номер игры нельзя указать без сезона");
    expect(validate({ gameEnd: "3" }).error).toBe("Номер игры нельзя указать без сезона");
  });

  it("не пропускает нулевой сезон и игру вне 1–10", () => {
    expect(validate({ seasonStart: "0" }).error).toBe("Сезон должен быть больше нуля");
    expect(validate({ seasonStart: "1", gameStart: "11" }).error).toBe("Номер игры — от 1 до 10");
    expect(validate({ seasonStart: "1", gameStart: "0" }).error).toBe("Номер игры — от 1 до 10");
  });

  it("не пропускает нечисловой ввод", () => {
    expect(validate({ seasonStart: "-1" }).error).toBe("Сезон и номер игры — целые числа");
    expect(validate({ seasonStart: "1.5" }).error).toBe("Сезон и номер игры — целые числа");
  });

  it("не пропускает начало позже конца", () => {
    expect(validate({ seasonStart: "5", seasonEnd: "4" }).error).toBe("Начало периода позже конца");
    expect(
      validate({ seasonStart: "5", gameStart: "3", seasonEnd: "5", gameEnd: "2" }).error,
    ).toBe("Начало периода позже конца");
  });

  it("начало без игры и конец без игры в одном сезоне — допустимы", () => {
    expect(validate({ seasonStart: "5", seasonEnd: "5", gameEnd: "1" }).error).toBeNull();
    expect(validate({ seasonStart: "5", gameStart: "10", seasonEnd: "5" }).error).toBeNull();
  });
});
