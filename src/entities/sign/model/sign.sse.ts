import { useSignStore } from "./sign.store";
import { type SignEvent } from "../types";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";
import { adminkaApiClient } from "@shared/api/client";

let source: EventSource | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 500;

function clearReconnectTimeout() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

export function connectSignsSSE() {
  const store = useSignStore.getState();

  if (source) return;

  store.setStatus("connecting");
  store.setError(null);

  const apiBase = getApiBaseUrl();
  source = new EventSource(`${apiBase}/v1/signs/stream`, { withCredentials: true });

  source.onopen = () => {
    store.setStatus("connected");
    store.setError(null);
    reconnectAttempts = 0;
  };

  source.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      const events: SignEvent[] = Array.isArray(parsed) ? parsed : [parsed];
      for (const ev of events) {
        store.applyEvent(ev);
      }
    } catch {
    }
  };

  source.onerror = () => {
    if (source) {
      source.close();
      source = null;
    }

    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      store.setStatus("error");
      store.setError("Ошибка соединения с сервером");
      reconnectAttempts = 0;
      return;
    }

    reconnectAttempts++;
    store.setStatus("connecting");
    store.setError(`Потеря соединения, переподключение (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    clearReconnectTimeout();
    reconnectTimeout = setTimeout(() => {
      void adminkaApiClient.tryRestoreSession().finally(() => {
        connectSignsSSE();
      });
    }, BASE_RECONNECT_DELAY);
  };
}

export function disconnectSignsSSE() {
  const store = useSignStore.getState();

  clearReconnectTimeout();
  reconnectAttempts = 0;

  if (source) {
    source.close();
    source = null;
  }

  store.clear();
  store.setStatus("idle");
  store.setError(null);
}
