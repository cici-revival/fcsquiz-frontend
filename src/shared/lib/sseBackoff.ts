/**
 * Политика переподключения для SSE.
 *
 * Бэкенд не шлёт heartbeat, поэтому прокси рвут неактивные соединения
 * (обычно после 60 с простоя), а registry на стороне streams отключает
 * подписчиков, не успевающих читать (`slow subscriber dropped`). Оба случая
 * приходят в браузер как обычный обрыв, и переподключаться нужно всегда.
 *
 * Задержка растёт экспоненциально и ограничена сверху: после серии быстрых
 * попыток клиент не сдаётся, а продолжает редкие — соединение восстановится
 * само, когда сервер вернётся. Джиттер разводит клиентов во времени, иначе
 * после рестарта бэкенда все подключаются синхронно и роняют его снова.
 */

/** Задержка перед первой попыткой. */
export const BASE_RECONNECT_DELAY = 500;

/** Потолок задержки: дальше клиент просто ждёт сервер. */
export const MAX_RECONNECT_DELAY = 30_000;

/**
 * Сколько попыток считать «быстрыми». После них соединение продолжает
 * восстанавливаться, но пользователю уже показывается ошибка.
 */
export const FAST_RECONNECT_ATTEMPTS = 5;

/** Разброс задержки в обе стороны, доля от рассчитанного значения. */
const JITTER_RATIO = 0.25;

/**
 * Задержка перед попыткой `attempt` (нумерация с 1).
 * 500 мс, 1 с, 2 с, 4 с, 8 с... с потолком MAX_RECONNECT_DELAY, ±25%.
 */
export function getReconnectDelay(attempt: number): number {
  const exponential = BASE_RECONNECT_DELAY * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(exponential, MAX_RECONNECT_DELAY);
  const jitter = capped * JITTER_RATIO * (Math.random() * 2 - 1);

  return Math.round(capped + jitter);
}

/** Текст для пользователя, пока идут быстрые попытки. */
export function getReconnectMessage(attempt: number): string {
  return attempt <= FAST_RECONNECT_ATTEMPTS
    ? `Потеря соединения, переподключение (${attempt}/${FAST_RECONNECT_ATTEMPTS})...`
    : "Нет связи с сервером, продолжаем переподключаться...";
}
