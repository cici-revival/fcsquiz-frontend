import { ApiError } from "./errors";

/**
 * Маппинг статусов API Reshala в человекочитаемые сообщения для тостера.
 * Используется во вкладках modify.
 */

/** query_status для PUT /v1/changes/structure */
export const structureStatusMessages: Record<string, string> = {
  ok: "Сохранено",
  conflict: "Конфликт: изменение противоречит текущему состоянию",
  error: "Ошибка при выполнении",
  unknown: "Неизвестный статус",
};

/** player_status для PUT /v1/changes/player/add */
export const addPlayerStatusMessages: Record<string, string> = {
  added: "Игрок добавлен",
  already_exists: "Игрок уже в команде",
  error: "Ошибка при добавлении",
  unknown_team: "Команда не найдена",
  too_few_players: "Слишком мало игроков в команде",
  too_many_players: "Слишком много игроков в команде",
  unknown: "Неизвестная ошибка",
  do_not_need_pass: "Пропуск не требуется",
  removed: "Игрок удалён",
};

/** player_status для PUT /v1/changes/player/remove */
export const removePlayerStatusMessages: Record<string, string> = {
  removed: "Игрок удалён",
  error: "Ошибка при удалении",
  unknown_team: "Команда не найдена",
  unknown: "Неизвестная ошибка",
  added: "Игрок добавлен",
  already_exists: "Игрок уже в команде",
  too_few_players: "Слишком мало игроков",
  too_many_players: "Слишком много игроков",
  do_not_need_pass: "Пропуск не требуется",
};

/** status для PUT /v1/changes/player/count */
export const playersCountStatusMessages: Record<string, string> = {
  ok: "Количество изменено",
  unknown_team: "Команда не найдена",
  invalid_count: "Недопустимое количество участников",
  error: "Ошибка при изменении",
  duplicate_team: "Дубликат команды в запросе",
};

/** status для PassWithStatus (pass/add, pass/remove) */
export const passStatusMessages: Record<string, string> = {
  added: "Пропуск добавлен",
  already_exists: "Пропуск уже заказан",
  removed: "Пропуск удалён",
  error: "Ошибка",
  unknown_team: "Команда не найдена",
  unknown_pass: "Пропуск не найден",
  too_many_passes: "Слишком много пропусков",
};

/** status для ServiceResponse (4xx/5xx) */
export const serviceResponseStatusMessages: Record<string, string> = {
  ok: "Успешно",
  error: "Ошибка",
  conflict: "Конфликт",
};

export function getStructureStatusMessage(
  status: string,
  details?: string,
): string {
  const msg = structureStatusMessages[status] ?? status;
  return details ? `${msg}: ${details}` : msg;
}

export function getAddPlayerStatusMessage(
  status: string,
  details?: string,
): string {
  const msg = addPlayerStatusMessages[status] ?? status;
  return details ? `${msg}: ${details}` : msg;
}

export function getRemovePlayerStatusMessage(
  status: string,
  details?: string,
): string {
  const msg = removePlayerStatusMessages[status] ?? status;
  return details ? `${msg}: ${details}` : msg;
}

export function getPlayersCountStatusMessage(
  status: string,
  details?: string,
): string {
  const msg = playersCountStatusMessages[status] ?? status;
  return details ? `${msg}: ${details}` : msg;
}

export function getPassStatusMessage(status: string, details?: string): string {
  const msg = passStatusMessages[status] ?? status;
  return details ? `${msg}: ${details}` : msg;
}

/** Извлечь details из API error (ServiceResponse) */
export function getApiErrorDetails(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "details" in data) {
      return String((data as { details: unknown }).details);
    }
    if (data && typeof data === "object" && "status" in data) {
      const status = (data as { status: string }).status;
      return serviceResponseStatusMessages[status] ?? status;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Неизвестная ошибка";
}

/** Коды ошибок WebSocket рассадки (/v1/adminka/seating/ws) */
export const seatingErrorMessages: Record<string, string> = {
  revision_conflict: "Место уже изменили в другой вкладке — обновили на актуальное",
  seating_incomplete: "Не все команды рассажены",
  not_found: "Команда не найдена в рассадке",
  invalid_input: "Некорректные данные рассадки",
  invalid_command: "Неизвестная команда",
  invalid_game: "Игра не выбрана",
  game_not_selected: "Игра ещё не выбрана",
  game_mismatch: "Игра изменилась, переподключаемся",
  invalid_team_id: "Некорректный идентификатор команды",
  invalid_argument: "Некорректный запрос",
  internal: "Внутренняя ошибка сервера",
  timeout: "Сервер не ответил вовремя",
  disconnected: "Нет соединения с сервером",
  unknown: "Неизвестная ошибка рассадки",
};

export function getSeatingErrorMessage(code: string): string {
  return seatingErrorMessages[code] ?? seatingErrorMessages.unknown;
}

export const gameResultsHttpMessages: Record<number, string> = {
  400: "Проверьте сезон и номер игры",
  404: "Результаты этой игры ещё не опубликованы",
};

export const teamResultsHttpMessages: Record<number, string> = {
  400: "Неверный идентификатор команды или период",
};

export function getHttpErrorMessage(
  error: unknown,
  messages: Record<number, string>,
  fallback: string,
): string {
  if (error instanceof ApiError && messages[error.status]) {
    return messages[error.status];
  }

  return fallback;
}
