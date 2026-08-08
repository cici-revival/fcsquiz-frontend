import { useTeamStore } from "./team.store";
import { type TeamEvent } from "../types";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";
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
export function connectTeamsSSE() {
  const store = useTeamStore.getState();

  if (source) return;

  store.setStatus("connecting");
  store.setError(null);

  const apiBase = getApiBaseUrl();
  const url = `${apiBase}/v1/game/state`;
  source = new EventSource(url);

  source.onopen = () => {
    store.setStatus("connected");
    store.setError(null);
    reconnectAttempts = 0;
  };

  source.onmessage = (event) => {
    try {
      const jsonStr = event.data.replace(/^data: /, '');
      const events: TeamEvent[] = JSON.parse(jsonStr);
      if (!events.length) return;

      const firstEvent = events[0];
      if ('game_id' in firstEvent.body) {
        const gameId = (firstEvent.body as any).game_id as {
          season: number;
          game_number: number;
        };
        store.setGameMeta(gameId.season, gameId.game_number);
      }

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

    const delay = BASE_RECONNECT_DELAY;

    reconnectAttempts++;

    store.setStatus("connecting");
    store.setError(`Потеря соединения, переподключение (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    clearReconnectTimeout();
    reconnectTimeout = setTimeout(() => {
      connectTeamsSSE();
    }, delay);
  };
}

export function disconnectTeamsSSE() {
  const store = useTeamStore.getState();

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

export function reconnectTeamsSSE() {
  disconnectTeamsSSE();
  connectTeamsSSE();
}
