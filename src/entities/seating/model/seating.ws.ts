import { adminkaApi } from "@shared/api/adminkaApi";
import { getApiBaseUrl } from "@shared/config/runtimeConfig";
import { onVisibilityChange } from "@shared/lib/documentVisibility";
import {
  FAST_RECONNECT_ATTEMPTS,
  getReconnectDelay,
  getReconnectMessage,
  HIDDEN_GRACE_MS,
} from "@shared/lib/sseBackoff";
import { useTeamStore } from "@entities/team/model/team.store";

import { useSeatingStore } from "./seating.store";
import {
  isServerMessage,
  type CommandAck,
  type GameId,
  type OutgoingCommand,
  type SeatingPosition,
  type ServerMessage,
} from "../types";

const COMMAND_TIMEOUT_MS = 10_000;

type PendingCommand = {
  resolve: (ack: CommandAck) => void;
  timeout: ReturnType<typeof setTimeout>;
};

let socket: WebSocket | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
let isPausedByVisibility = false;
let unsubscribeVisibility: (() => void) | null = null;
let isStopped = true;
let connectToken = 0;

const pending = new Map<string, PendingCommand>();

function nextRequestId(): string {
  return crypto.randomUUID();
}

function clearReconnectTimeout() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

function settleAll(ack: CommandAck) {
  for (const [, command] of pending) {
    clearTimeout(command.timeout);
    command.resolve(ack);
  }

  pending.clear();
}

function closeSocket() {
  if (!socket) return;

  socket.onopen = null;
  socket.onmessage = null;
  socket.onerror = null;
  socket.onclose = null;
  socket.close();
  socket = null;
}

function toWebSocketUrl(ticket: string): string {
  // API_BASE_URL обычно относительный ("/api"), поэтому базой для URL берём
  // текущий origin — так же, как это делает EventSource в team.sse.
  const url = new URL(`${getApiBaseUrl()}/v1/adminka/seating/ws`, window.location.href);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("ticket", ticket);

  return url.toString();
}

function currentGameId(): GameId | null {
  const { season, gameNumber } = useTeamStore.getState().gameMeta;

  if (!season || !gameNumber) return null;

  return { season, game_number: gameNumber };
}

// gameMeta заполняется только когда в SSE придёт событие с game_id. Если состав
// уже загружен и в стриме тишина, ждать этого события можно бесконечно, поэтому
// номер игры дозапрашиваем по REST.
async function resolveGameId(): Promise<GameId | null> {
  const known = currentGameId();
  if (known) return known;

  try {
    const game = await adminkaApi.getCurrentGame();

    if (!game?.season || !game?.game_number) return null;

    useTeamStore.getState().setGameMeta(game.season, game.game_number);

    return { season: game.season, game_number: game.game_number };
  } catch {
    return null;
  }
}

function send(command: OutgoingCommand): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;

  socket.send(JSON.stringify(command));

  return true;
}

function handleMessage(message: ServerMessage) {
  const store = useSeatingStore.getState();

  switch (message.type) {
    // Ответ на select_game — это game_selected, а не command.accepted,
    // и request_id в нём не приходит. Повторный game_selected означает
    // тихо переподключённый стрим на бэке: состояние заменяем целиком.
    case "game_selected":
      store.applySnapshot(message.snapshot);
      store.setStatus("connected");
      store.setError(null);
      break;

    case "command.accepted": {
      const command = pending.get(message.request_id);
      if (!command) break;

      pending.delete(message.request_id);
      clearTimeout(command.timeout);
      command.resolve({ ok: true });
      break;
    }

    case "command.rejected": {
      const command = pending.get(message.request_id);
      if (!command) break;

      pending.delete(message.request_id);
      clearTimeout(command.timeout);
      command.resolve({ ok: false, code: message.code, details: message.details });
      break;
    }

    default:
      store.applyEvent(message);
  }
}

function scheduleReconnect() {
  if (isStopped || isPausedByVisibility) return;

  reconnectAttempts += 1;

  const store = useSeatingStore.getState();
  store.setStatus(reconnectAttempts > FAST_RECONNECT_ATTEMPTS ? "error" : "connecting");
  store.setError(getReconnectMessage(reconnectAttempts));

  clearReconnectTimeout();
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    void openSocket();
  }, getReconnectDelay(reconnectAttempts));
}

function watchVisibility() {
  if (unsubscribeVisibility) return;

  unsubscribeVisibility = onVisibilityChange(
    {
      onHidden: () => {
        if (!socket && !reconnectTimeout) return;

        isPausedByVisibility = true;
        clearReconnectTimeout();
        closeSocket();
        settleAll({ ok: false, code: "disconnected" });
        useSeatingStore.getState().setStatus("disconnected");
      },
      onVisible: () => {
        if (!isPausedByVisibility) return;

        isPausedByVisibility = false;
        reconnectAttempts = 0;
        void openSocket();
      },
    },
    HIDDEN_GRACE_MS,
  );
}

async function openSocket() {
  if (isStopped || socket) return;

  const store = useSeatingStore.getState();

  if (reconnectAttempts <= FAST_RECONNECT_ATTEMPTS) {
    store.setStatus("connecting");
    store.setError(null);
  }

  const generation = (connectToken += 1);

  const gameId = await resolveGameId();

  if (generation !== connectToken || isStopped) return;

  if (gameId === null) {
    store.setError("Не удалось определить текущую игру");
    scheduleReconnect();

    return;
  }

  let ticket: string;
  try {
    // Тикет одноразовый и живёт 60 секунд, поэтому берём новый на каждое
    // подключение, а не переиспользуем.
    ({ ticket } = await adminkaApi.issueWebSocketTicket());
  } catch {
    if (generation !== connectToken || isStopped) return;

    store.setError("Не удалось авторизоваться для рассадки");
    scheduleReconnect();

    return;
  }

  if (generation !== connectToken || isStopped) return;

  const next = new WebSocket(toWebSocketUrl(ticket));
  socket = next;

  next.onopen = () => {
    if (socket !== next) return;

    reconnectAttempts = 0;
    store.setStatus("selecting");
    send({ type: "select_game", request_id: nextRequestId(), game_id: gameId });
  };

  next.onmessage = (event) => {
    if (socket !== next) return;

    try {
      const message: unknown = JSON.parse(event.data);
      if (!isServerMessage(message)) return;

      handleMessage(message);
    } catch (error) {
      console.error("Не удалось разобрать сообщение рассадки:", error);
    }
  };

  next.onerror = () => {
    if (socket !== next) return;

    store.setError("Ошибка соединения с рассадкой");
  };

  // Сокет закрывается сам, когда истекает exp access-токена, — обрабатываем
  // это тем же переподключением, что и обычный обрыв: возьмётся новый тикет.
  next.onclose = () => {
    if (socket !== next) return;

    socket = null;
    settleAll({ ok: false, code: "disconnected" });

    if (isStopped || isPausedByVisibility) return;

    scheduleReconnect();
  };
}

export function connectSeatingWS() {
  if (!isStopped) return;

  isStopped = false;
  reconnectAttempts = 0;
  watchVisibility();
  void openSocket();
}

export function disconnectSeatingWS() {
  isStopped = true;
  isPausedByVisibility = false;
  connectToken += 1;

  clearReconnectTimeout();
  closeSocket();
  settleAll({ ok: false, code: "disconnected" });

  unsubscribeVisibility?.();
  unsubscribeVisibility = null;

  useSeatingStore.getState().clear();
}

function sendCommand(command: OutgoingCommand): Promise<CommandAck> {
  if (!send(command)) {
    return Promise.resolve({ ok: false, code: "disconnected" });
  }

  return new Promise<CommandAck>((resolve) => {
    const timeout = setTimeout(() => {
      pending.delete(command.request_id);
      resolve({ ok: false, code: "timeout" });
    }, COMMAND_TIMEOUT_MS);

    pending.set(command.request_id, { resolve, timeout });
  });
}

export function updateTeamSeating(input: {
  teamId: string;
  color: string;
  position: SeatingPosition;
  expectedRevision: number;
}): Promise<CommandAck> {
  const gameId = currentGameId();
  if (!gameId) return Promise.resolve({ ok: false, code: "game_not_selected" });

  return sendCommand({
    type: "command.update_team",
    request_id: nextRequestId(),
    game_id: gameId,
    team_id: input.teamId,
    color: input.color,
    position: input.position,
    expected_revision: input.expectedRevision,
  });
}

export function unplaceTeamSeating(input: {
  teamId: string;
  expectedRevision: number;
}): Promise<CommandAck> {
  const gameId = currentGameId();
  if (!gameId) return Promise.resolve({ ok: false, code: "game_not_selected" });

  return sendCommand({
    type: "command.unplace_team",
    request_id: nextRequestId(),
    game_id: gameId,
    team_id: input.teamId,
    position: null,
    expected_revision: input.expectedRevision,
  });
}

export function publishSeating(): Promise<CommandAck> {
  const gameId = currentGameId();
  if (!gameId) return Promise.resolve({ ok: false, code: "game_not_selected" });

  return sendCommand({
    type: "command.publish_seating",
    request_id: nextRequestId(),
    game_id: gameId,
  });
}
