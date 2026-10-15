import type { StatsResultsRange } from "@/types/api";

export const MIN_GAME_NUMBER = 1;
export const MAX_GAME_NUMBER = 10;

export type ResultsRangeInput = {
  seasonStart: string;
  gameStart: string;
  seasonEnd: string;
  gameEnd: string;
};

export const EMPTY_RANGE_INPUT: ResultsRangeInput = {
  seasonStart: "",
  gameStart: "",
  seasonEnd: "",
  gameEnd: "",
};

type RangeValidation =
  | { range: StatsResultsRange; error: null }
  | { range: null; error: string };

function parseNumber(value: string): number | undefined | null {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (!/^\d+$/.test(trimmed)) return null;

  return Number(trimmed);
}

export function isValidSeason(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function isValidGameNumber(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_GAME_NUMBER && value <= MAX_GAME_NUMBER;
}

export function validateResultsRange(input: ResultsRangeInput): RangeValidation {
  const seasonStart = parseNumber(input.seasonStart);
  const gameStart = parseNumber(input.gameStart);
  const seasonEnd = parseNumber(input.seasonEnd);
  const gameEnd = parseNumber(input.gameEnd);

  if (seasonStart === null || seasonEnd === null || gameStart === null || gameEnd === null) {
    return { range: null, error: "Сезон и номер игры — целые числа" };
  }

  if (
    (seasonStart !== undefined && !isValidSeason(seasonStart)) ||
    (seasonEnd !== undefined && !isValidSeason(seasonEnd))
  ) {
    return { range: null, error: "Сезон должен быть больше нуля" };
  }

  if (
    (gameStart !== undefined && !isValidGameNumber(gameStart)) ||
    (gameEnd !== undefined && !isValidGameNumber(gameEnd))
  ) {
    return {
      range: null,
      error: `Номер игры — от ${MIN_GAME_NUMBER} до ${MAX_GAME_NUMBER}`,
    };
  }

  if (
    (gameStart !== undefined && seasonStart === undefined) ||
    (gameEnd !== undefined && seasonEnd === undefined)
  ) {
    return { range: null, error: "Номер игры нельзя указать без сезона" };
  }

  if (seasonStart !== undefined && seasonEnd !== undefined) {
    const start = [seasonStart, gameStart ?? MIN_GAME_NUMBER];
    const end = [seasonEnd, gameEnd ?? MAX_GAME_NUMBER];
    const isAfter = start[0] > end[0] || (start[0] === end[0] && start[1] > end[1]);

    if (isAfter) {
      return { range: null, error: "Начало периода позже конца" };
    }
  }

  const range: StatsResultsRange = {};
  if (seasonStart !== undefined) range.season_start = seasonStart;
  if (gameStart !== undefined) range.game_number_start = gameStart;
  if (seasonEnd !== undefined) range.season_end = seasonEnd;
  if (gameEnd !== undefined) range.game_number_end = gameEnd;

  return { range, error: null };
}

export function isRangeEmpty(range: StatsResultsRange): boolean {
  return Object.values(range).every((value) => value === undefined);
}
