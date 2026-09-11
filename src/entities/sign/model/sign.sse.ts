import { useSignStore } from "./sign.store";
import { type SignEvent } from "../types";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";
import { adminkaApiClient } from "@shared/api/client";
import {
  FAST_RECONNECT_ATTEMPTS,
  getReconnectDelay,
  getReconnectMessage,
  HIDDEN_GRACE_MS,
} from "@shared/lib/sseBackoff";
import { onVisibilityChange } from "@shared/lib/documentVisibility";

let source: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

let isPausedByVisibility = false;
let unsubscribeVisibility: (() => void) | null = null;
/** Отличает отказ сервера при подключении от обрыва уже живого потока. */
let hasEverOpened = false;

function clearReconnectTimeout() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

function closeSource() {
  if (source) {
    source.close();
    source = null;
  }
}

function watchVisibility() {
  if (unsubscribeVisibility) return;

  unsubscribeVisibility = onVisibilityChange({
    onHidden: () => {
      if (!source && !reconnectTimeout) return;

      isPausedByVisibility = true;
      clearReconnectTimeout();
      closeSource();
      useSignStore.getState().setStatus("disconnected");
    },
    onVisible: () => {
      if (!isPausedByVisibility) return;

      isPausedByVisibility = false;
      reconnectAttempts = 0;
      connectSignsSSE();
    },
  }, HIDDEN_GRACE_MS);
}

function scheduleReconnect() {
  reconnectAttempts += 1;

  const store = useSignStore.getState();

  store.setStatus(
    reconnectAttempts > FAST_RECONNECT_ATTEMPTS ? "error" : "connecting",
  );
  store.setError(getReconnectMessage(reconnectAttempts));

  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    void adminkaApiClient.tryRestoreSession().finally(() => {
      connectSignsSSE();
    });
  }, getReconnectDelay(reconnectAttempts));
}

export function connectSignsSSE() {
  if (source) return;

  const store = useSignStore.getState();

  watchVisibility();

  if (reconnectAttempts <= FAST_RECONNECT_ATTEMPTS) {
    store.setStatus("connecting");
    store.setError(null);
  }

  source = new EventSource(`${getApiBaseUrl()}/v1/signs/stream`, {
    withCredentials: true,
  });

  source.onopen = () => {
    store.setStatus("connected");
    store.setError(null);
    reconnectAttempts = 0;
    hasEverOpened = true;
  };

  source.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      const events: SignEvent[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const ev of events) {
        store.applyEvent(ev);
      }
    } catch (error) {
      console.error("Не удалось разобрать событие signs:", error);
    }
  };

  source.onerror = () => {
    // Поток ни разу не открылся и соединение закрыто — значит сервер отверг
    // запрос, а не оборвал его. Роут требует заголовок Authorization, который
    // EventSource задавать не умеет, поэтому переподключаться бессмысленно:
    // см. BACKEND-REQUESTS.md. Данные страница всё равно берёт обычным
    // GET /v1/signs, теряется только живая синхронизация между админами.
    const isRejected = !hasEverOpened && source?.readyState === EventSource.CLOSED;

    closeSource();

    if (isPausedByVisibility) return;

    if (isRejected) {
      store.setStatus("error");
      store.setError("Живые обновления табличек недоступны");

      return;
    }

    scheduleReconnect();
  };
}

export function disconnectSignsSSE() {
  const store = useSignStore.getState();

  clearReconnectTimeout();
  reconnectAttempts = 0;
  isPausedByVisibility = false;
  hasEverOpened = false;

  unsubscribeVisibility?.();
  unsubscribeVisibility = null;

  closeSource();

  store.clear();
  store.setStatus("idle");
  store.setError(null);
}
