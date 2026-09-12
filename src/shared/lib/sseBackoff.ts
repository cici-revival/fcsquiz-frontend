export const BASE_RECONNECT_DELAY = 500;

export const MAX_RECONNECT_DELAY = 30_000;

export const FAST_RECONNECT_ATTEMPTS = 5;

export const HIDDEN_GRACE_MS = 30_000;

const JITTER_RATIO = 0.25;

export function getReconnectDelay(attempt: number): number {
  const exponential = BASE_RECONNECT_DELAY * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(exponential, MAX_RECONNECT_DELAY);
  const jitter = capped * JITTER_RATIO * (Math.random() * 2 - 1);

  return Math.round(capped + jitter);
}

export function getReconnectMessage(attempt: number): string {
  return attempt <= FAST_RECONNECT_ATTEMPTS
    ? `Потеря соединения, переподключение (${attempt}/${FAST_RECONNECT_ATTEMPTS})...`
    : "Нет связи с сервером, продолжаем переподключаться...";
}
