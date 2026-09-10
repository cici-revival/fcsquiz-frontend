export type GameId = {
  season: number;
  game_number: number;
};

export type SeatingPosition = {
  x: number;
  y: number;
};

export type SeatingTeam = {
  team_id: string;
  size: number;
  color: string;
  position: SeatingPosition | null;
  revision: number;
};

export type SeatingSnapshot = {
  is_published: boolean;
  teams: SeatingTeam[];
};

export const SEATING_EVENT = {
  snapshot: "seating.snapshot",
  teamUpserted: "seating.team.upserted",
  teamRemoved: "seating.team.removed",
  published: "seating.published",
} as const;

export type SeatingEvent =
  | { type: "seating.snapshot"; game_id: GameId; snapshot: SeatingSnapshot }
  | { type: "seating.team.upserted"; game_id: GameId; team: SeatingTeam }
  | { type: "seating.team.removed"; game_id: GameId; team_id: string }
  | { type: "seating.published"; game_id: GameId };

export type GameSelectedMessage = {
  type: "game_selected";
  game_id: GameId;
  snapshot: SeatingSnapshot;
};

export type CommandAcceptedMessage = {
  type: "command.accepted";
  request_id: string;
};

export type CommandRejectedMessage = {
  type: "command.rejected";
  request_id: string;
  code: SeatingErrorCode;
  details?: {
    current?: SeatingTeam;
    unplaced_team_ids?: string[];
  };
};

export type ServerMessage =
  | GameSelectedMessage
  | CommandAcceptedMessage
  | CommandRejectedMessage
  | SeatingEvent;

export type SeatingErrorCode =
  | "revision_conflict"
  | "seating_incomplete"
  | "not_found"
  | "invalid_input"
  | "invalid_command"
  | "game_not_selected"
  | "game_mismatch"
  | "invalid_team_id"
  | "invalid_argument"
  | "internal";

export type OutgoingCommand =
  | { type: "select_game"; request_id: string; game_id: GameId }
  | {
      type: "command.update_team";
      request_id: string;
      game_id: GameId;
      team_id: string;
      color: string;
      position: SeatingPosition;
      expected_revision: number;
    }
  | {
      type: "command.unplace_team";
      request_id: string;
      game_id: GameId;
      team_id: string;
      color: string;
      position: null;
      expected_revision: number;
    }
  | { type: "command.publish_seating"; request_id: string; game_id: GameId };

export type CommandAck =
  | { ok: true }
  | {
      ok: false;
      code: SeatingErrorCode | "timeout" | "disconnected";
      details?: CommandRejectedMessage["details"];
    };

export type SeatingConnectionStatus =
  | "idle"
  | "connecting"
  | "selecting"
  | "connected"
  | "error"
  | "disconnected";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isServerMessage(value: unknown): value is ServerMessage {
  return isObject(value) && typeof value.type === "string";
}
