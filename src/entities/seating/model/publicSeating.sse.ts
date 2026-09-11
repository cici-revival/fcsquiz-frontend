import { getApiBaseUrl } from "@shared/config/runtimeConfig";
import {
  FAST_RECONNECT_ATTEMPTS,
  getReconnectDelay,
  getReconnectMessage,
  HIDDEN_GRACE_MS,
} from "@shared/lib/sseBackoff";
import { onVisibilityChange } from "@shared/lib/documentVisibility";

import { useSeatingStore } from "./seating.store";
import { isServerMessage, type SeatingEvent } from "../types";

/**
 * Публичный стрим рассадки для лендинга. Отдаёт только опубликованную рассадку
 * и только посаженные команды, авторизации не требует — в отличие от админского
 * WebSocket, которому нужен одноразовый тикет.
 */

let source: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

let isPausedByVisibility = false;
let unsubscribeVisibility: (() => void) | null = null;

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

  unsubscribeVisibility = onVisibilityChange(
    {
      onHidden: () => {
        if (!source && !reconnectTimeout) return;

        isPausedByVisibility = true;
        clearReconnectTimeout();
        closeSource();
        useSeatingStore.getState().setStatus("disconnected");
      },
      onVisible: () => {
        if (!isPausedByVisibility) return;

        isPausedByVisibility = false;
        reconnectAttempts = 0;
        connectPublicSeatingSSE();
      },
    },
    HIDDEN_GRACE_MS,
  );
}

function scheduleReconnect() {
  reconnectAttempts += 1;

  const store = useSeatingStore.getState();

  store.setStatus(reconnectAttempts > FAST_RECONNECT_ATTEMPTS ? "error" : "connecting");
  store.setError(getReconnectMessage(reconnectAttempts));

  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectPublicSeatingSSE();
  }, getReconnectDelay(reconnectAttempts));
}

export function connectPublicSeatingSSE() {
  if (source) return;

  const store = useSeatingStore.getState();

  watchVisibility();

  if (reconnectAttempts <= FAST_RECONNECT_ATTEMPTS) {
    store.setStatus("connecting");
    store.setError(null);
  }

  source = new EventSource(`${getApiBaseUrl()}/v1/seating/stream`);

  source.onopen = () => {
    store.setStatus("connected");
    store.setError(null);
    reconnectAttempts = 0;
  };

  source.onmessage = (event) => {
    try {
      // Кадр — массив событий, как и у стрима составов. Первым приходит снимок.
      const events: unknown = JSON.parse(event.data);
      if (!Array.isArray(events)) return;

      for (const item of events) {
        if (!isServerMessage(item)) continue;

        store.applyEvent(item as SeatingEvent);
      }
    } catch (error) {
      console.error("Не удалось разобрать событие рассадки:", error);
    }
  };

  source.onerror = () => {
    closeSource();

    if (isPausedByVisibility) return;

    scheduleReconnect();
  };
}

export function disconnectPublicSeatingSSE() {
  const store = useSeatingStore.getState();

  clearReconnectTimeout();
  reconnectAttempts = 0;
  isPausedByVisibility = false;

  unsubscribeVisibility?.();
  unsubscribeVisibility = null;

  closeSource();

  store.clear();
}

export function reconnectPublicSeatingSSE() {
  disconnectPublicSeatingSSE();
  connectPublicSeatingSSE();
}
