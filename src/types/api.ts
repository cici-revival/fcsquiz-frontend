// types/api.ts
//
// ЕДИНАЯ точка входа для типов, связанных с Reshala API.
// Всё, что описано в OpenAPI, берётся из автогенерённого файла
// `@/shared/api/generated/reshala` (openapi-typescript).

import type { components, paths } from "@/shared/api/generated/reshala";

// ---------- БАЗОВЫЕ СХЕМЫ ИЗ OpenAPI (ЕДИНЫЙ ИСТОЧНИК ПРАВДЫ) ----------

export type ServiceResponse = components["schemas"]["ServiceResponse"];
export type Team = components["schemas"]["Team"];
export type Player = components["schemas"]["Player"];
export type NamedValue = components["schemas"]["NamedValue"];
export type Change = components["schemas"]["Change"];
export type Changes = components["schemas"]["Changes"];
export type ReplacePlayer = components["schemas"]["ReplacePlayer"];
export type UploadingState = components["schemas"]["UploadingState"];
export type ParsingError = components["schemas"]["ParsingError"];
export type TableRow = components["schemas"]["TableRow"];

// ---------- ДОМЕННЫЕ ТИПЫ ТОЛЬКО ФРОНТА (СОБРАНЫ В ОДНОМ МЕСТЕ) ----------

// Состояние для таблета
export interface TabletGameState {
  season: number;
  game_number: number;
  teams: Team[];
}

// Сжатый стейт для админской статистики
export type AdminkaGameState = {
  season: number;
  game_number: number;
  teams_count: number;
  players_count: number;
  passes_count: number;
};

export interface StatsData {
  teamsCount: number;
  playersCount: number;
  passesCount: number;
}

export type GameID = {
  season: number;
  game_number: number;
};

export type RegisteredTeamsResponse = { teams: Team[] };

// ---------- ПРОПУСКИ ----------
// Контракты для одиночных ручек /v1/changes/pass/* по gateway openapi.yaml:
// на вход — team_id + pass (PassInput), в ответе — team_id + pass + status.

export type PassStatus =
  | "added"
  | "error"
  | "unknown_team"
  | "already_exists"
  | "too_many_passes"
  | "unknown_pass"
  | "removed";

export type PassInput = { team_id: string; pass: string };
export type PassWithStatus = { team_id: string; pass: string; status?: PassStatus };

// ---------- ИГРОКИ (вход для players-ручек) ----------

export type PlayerInput = {
  team_id: string;
  name: string;
  is_pass_needed?: boolean;
  tg?: string;
};

// ---------- ЧИСЛЕННОСТЬ КОМАНД ----------

export type PlayersCountChangeInput = {
  team_id: string;
  type: "new_count" | "modifier";
  count: number;
};

export type PlayersCountChangeResult = {
  team_id: string;
  type: string;
  count: number;
  status?: string;
};

// ---------- ОДИНОЧКИ (lost players) ----------
export type LostPlayersInfoResponse =
  paths["/v1/lost_players_info"]["get"]["responses"][200]["content"]["application/json"];

export type LostMarkFoundRequest =
  paths["/v1/lost/mark_found"]["put"]["requestBody"]["content"]["application/json"];
export type LostMarkFoundResponse =
  paths["/v1/lost/mark_found"]["put"]["responses"][200]["content"]["application/json"];

// ---------- ИЗМЕНЕНИЯ СОСТАВА КОМАНД ----------

// Детали изменения в PUT /v1/changes/structure по контракту OpenAPI.
// На фронте они используются для локального стора очереди изменений (см. entities/change).
export type StructureChangeDetails =
  paths["/v1/changes/structure"]["put"]["requestBody"]["content"]["application/json"]["data"][number];

// ---------- АУТЕНТИФИКАЦИЯ ----------

export type MagicLinkConfirmResponse = { access_token: string };
export type RefreshTokenResponse = { access_token: string };

export type FileUploadURL = {
  file_id: string;
  upload_url: string;
  required_headers: Record<string, string>;
};

export type RegistrationImportRecordType =
  | "register"
  | "change"
  | "lost"
  | "change_with_llm"
  | "unknown";

export type RegistrationChangeRequest = {
  id: string;
  sequence: number;
  description: string;
  status: "pending" | "applied" | "not_applicable";
  type?: "team_name" | "players_count" | "pass" | "readiness";
  reason?: string;
};

export type RegistrationImportRecord = {
  id: string;
  row_index: number;
  author: string;
  group: string;
  type: RegistrationImportRecordType;
  tg: string;
  team_name: string;
  team_id?: string;
  players_count: number;
  passes: string[];
  is_ready_to_accept_players: boolean;
  changes: string;
  ip_address: string;
  timestamp: number;
  validation_error?: string;
  change_requests: RegistrationChangeRequest[];
};

export type RegistrationImportResult = {
  records?: RegistrationImportRecord[];
  total_registration_records: number;
  new_registration_records_count: number;
  unique_new_teams_count: number;
  old_changes_count: number;
  new_changes_count: number;
  new_lost_players_count: number;
};

export type RegistrationImportStatus = {
  status: "queued" | "processing" | "succeeded" | "failed";
  result?: RegistrationImportResult;
  errors?: string[];
};

// ---------- ТАБЛИЧКИ (SIGNS) ----------
// Контракты для gateway /v1/signs — не входит в reshala OpenAPI.

export type SignsRequest = { team_ids: string[] };
export type SignResult = { team_id: string; status: string };
export type SignsResponse = { signs: SignResult[] };

// ---------- УТИЛИТНЫЕ ЛОКАЛЬНЫЕ ТИПЫ (НЕ ЧАСТЬ КОНТРАКТА БЭКА) ----------
