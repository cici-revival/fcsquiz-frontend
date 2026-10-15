import { useSignStore } from "./sign.store";
import { type SignEvent } from "../types";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";
import { adminkaApi } from "@shared/api/adminkaApi";
import { adminkaApiClient } from "@shared/api/client";
import { ForbiddenError } from "@shared/api/errors";
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
let isConnecting = false;
let connectGeneration = 0;

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

function cancelConnect() {
  connectGeneration += 1;
  isConnecting = false;
}

function watchVisibility() {
  if (unsubscribeVisibility) return;

  unsubscribeVisibility = onVisibilityChange({
    onHidden: () => {
      if (!source && !reconnectTimeout && !isConnecting) return;

      isPausedByVisibility = true;
      clearReconnectTimeout();
      cancelConnect();
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

function buildStreamUrl(ticket: string): string {
  return `${getApiBaseUrl()}/v1/signs/stream?ticket=${encodeURIComponent(ticket)}`;
}

function openSource(ticket: string) {
  const store = useSignStore.getState();

  source = new EventSource(buildStreamUrl(ticket), {
    withCredentials: true,
  });

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
    } catch (error) {
      console.error("Не удалось разобрать событие signs:", error);
    }
  };

  source.onerror = () => {
    closeSource();

    if (isPausedByVisibility) return;

    scheduleReconnect();
  };
}

async function connectWithTicket(generation: number) {
  let ticket: string;

  try {
    ({ ticket } = await adminkaApi.issueWebSocketTicket());
  } catch (error) {
    if (generation !== connectGeneration) return;

    isConnecting = false;

    if (error instanceof ForbiddenError) {
      const store = useSignStore.getState();
      store.setStatus("error");
      store.setError("Нет прав на живые обновления табличек");

      return;
    }

    scheduleReconnect();

    return;
  }

  if (generation !== connectGeneration) return;

  isConnecting = false;
  closeSource();
  openSource(ticket);
}

export function connectSignsSSE() {
  if (source || isConnecting) return;

  const store = useSignStore.getState();

  watchVisibility();

  if (reconnectAttempts <= FAST_RECONNECT_ATTEMPTS) {
    store.setStatus("connecting");
    store.setError(null);
  }

  isConnecting = true;
  connectGeneration += 1;
  void connectWithTicket(connectGeneration);
}

export function disconnectSignsSSE() {
  const store = useSignStore.getState();

  clearReconnectTimeout();
  cancelConnect();
  reconnectAttempts = 0;
  isPausedByVisibility = false;

  unsubscribeVisibility?.();
  unsubscribeVisibility = null;

  closeSource();

  store.clear();
  store.setStatus("idle");
  store.setError(null);
}
