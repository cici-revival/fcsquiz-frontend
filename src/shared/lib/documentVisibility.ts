/**
 * Подписка на уход вкладки в фон и возврат.
 *
 * Нужна, чтобы не держать SSE-соединение открытым в невидимой вкладке:
 * забытая вкладка занимает коннект на сервере и один из шести доступных
 * браузеру слотов на домен, ничего не показывая пользователю.
 *
 * Возвращает функцию отписки. Если API недоступен (тесты, SSR),
 * подписка не создаётся и возвращается пустая функция.
 */
export function onVisibilityChange(handlers: {
  onHidden: () => void;
  onVisible: () => void;
}): () => void {
  if (typeof document === "undefined" || !("hidden" in document)) {
    return () => {};
  }

  const handler = () => {
    if (document.hidden) {
      handlers.onHidden();
    } else {
      handlers.onVisible();
    }
  };

  document.addEventListener("visibilitychange", handler);

  return () => document.removeEventListener("visibilitychange", handler);
}
