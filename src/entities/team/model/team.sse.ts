import { useTeamStore } from "./team.store";
import { type TeamEvent } from "../types";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";
import {
  FAST_RECONNECT_ATTEMPTS,
  getReconnectDelay,
  getReconnectMessage,
} from "@shared/lib/sseBackoff";
import { onVisibilityChange } from "@shared/lib/documentVisibility";

let source: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;

/** Соединение приостановлено, потому что вкладка ушла в фон. */
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

/**
 * В фоне соединение не нужно: вкладка ничего не показывает, но продолжает
 * занимать коннект. При возврате подключаемся заново — первым сообщением
 * сервер присылает снимок, так что пропущенные события не теряются.
 */
function watchVisibility() {
  if (unsubscribeVisibility) return;

  unsubscribeVisibility = onVisibilityChange({
    onHidden: () => {
      if (!source && !reconnectTimeout) return;

      isPausedByVisibility = true;
      clearReconnectTimeout();
      closeSource();
      useTeamStore.getState().setStatus("disconnected");
    },
    onVisible: () => {
      if (!isPausedByVisibility) return;

      isPausedByVisibility = false;
      reconnectAttempts = 0;
      connectTeamsSSE();
    },
  });
}

function scheduleReconnect() {
  reconnectAttempts += 1;

  const store = useTeamStore.getState();

  // После серии быстрых попыток показываем ошибку, но продолжаем
  // переподключаться с большой задержкой — соединение восстановится само,
  // когда сервер вернётся.
  store.setStatus(
    reconnectAttempts > FAST_RECONNECT_ATTEMPTS ? "error" : "connecting",
  );
  store.setError(getReconnectMessage(reconnectAttempts));

  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectTeamsSSE();
  }, getReconnectDelay(reconnectAttempts));
}

export function connectTeamsSSE() {
  if (source) return;

  const store = useTeamStore.getState();

  watchVisibility();

  // После серии неудач статус остаётся "error", иначе каждая новая попытка
  // затирала бы его на "connecting" и пользователь видел бы бесконечное
  // "Подключение..." вместо честного "нет связи".
  if (reconnectAttempts <= FAST_RECONNECT_ATTEMPTS) {
    store.setStatus("connecting");
    store.setError(null);
  }

  const url = `${getApiBaseUrl()}/v1/game/state`;
  source = new EventSource(url);

  source.onopen = () => {
    store.setStatus("connected");
    store.setError(null);
    reconnectAttempts = 0;
  };

  source.onmessage = (event) => {
    try {
      const events: TeamEvent[] = JSON.parse(event.data);
      if (!events.length) return;

      const gameId = events[0].body.game_id;
      if (gameId) {
        store.setGameMeta(gameId.season, gameId.game_number);
      }

      for (const ev of events) {
        store.applyEvent(ev);
      }
    } catch (error) {
      console.error("Не удалось разобрать событие game state:", error);
    }
  };

  source.onerror = () => {
    closeSource();

    // Вкладка ушла в фон — обрыв ожидаемый, переподключимся при возврате.
    if (isPausedByVisibility) return;

    scheduleReconnect();
  };
}

export function disconnectTeamsSSE() {
  const store = useTeamStore.getState();

  clearReconnectTimeout();
  reconnectAttempts = 0;
  isPausedByVisibility = false;

  unsubscribeVisibility?.();
  unsubscribeVisibility = null;

  closeSource();

  store.clear();
  store.setStatus("idle");
  store.setError(null);
}

export function reconnectTeamsSSE() {
  disconnectTeamsSSE();
  connectTeamsSSE();
}
