// api/adminkaApi.ts
import type {
  AdminkaGameState,
  Team,
  Player,
  PlayerInput,
  Change,
  PassWithStatus,
  PassInput,
  PlayersCountChangeInput,
  PlayersCountChangeResult,
  LostPlayersInfoResponse,
  LostMarkFoundRequest,
  LostMarkFoundResponse,
  FileUploadURL,
  RegistrationImportStatus,
  SignsRequest,
  SignsResponse,
  GameID,
  RegisteredTeamsResponse,
} from "@/types/api";
import { adminkaApiClient } from "./client";

export const adminkaApi = {
  // AUTH

  authByEmail(payload: { email: string }) {
    return adminkaApiClient.request<{ message?: string }>("/v1/adminka/auth", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  confirmMagicLink(payload: { token: string }) {
    return adminkaApiClient.request<{
      access_token: string;
    }>("/v1/adminka/magic-link/confirm", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  refreshToken() {
    return adminkaApiClient.request<{
      access_token: string;
    }>("/v1/adminka/refresh", {
      method: "POST",
    });
  },

  // Одноразовый тикет на WebSocket рассадки: обычный Authorization в
  // конструктор WebSocket не передать, поэтому бэк меняет токен на тикет.
  issueWebSocketTicket() {
    return adminkaApiClient.request<{
      ticket: string;
      expires_in: number;
    }>("/v1/adminka/ws-ticket", {
      method: "POST",
    });
  },

  // GAME STATE

  getGameState() {
    return adminkaApiClient.request<AdminkaGameState>("/v1/game/state");
  },

  getCurrentGame() {
    return adminkaApiClient.request<GameID>("/v1/games/current");
  },

  async getRegisteredTeams(payload: { season: number; game_number: number }) {
    const params = new URLSearchParams({
      season: String(payload.season),
      game_number: String(payload.game_number),
    });

    const response = await adminkaApiClient.request<RegisteredTeamsResponse>(
      `/v1/game/registered_teams?${params.toString()}`,
    );

    return response.teams;
  },

  createFileUploadURL(payload: { filename: string; size: number }) {
    return adminkaApiClient.request<FileUploadURL>("/files/upload-url", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  submitFile(fileID: string) {
    return adminkaApiClient.request<void>(`/files/${fileID}/submit`, {
      method: "POST",
    });
  },

  startRegistrationImport(payload: {
    file_id: string;
    game_id: GameID;
  }) {
    return adminkaApiClient.request<RegistrationImportStatus>(
      "/registration-imports",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  getRegistrationImport(fileID: string) {
    return adminkaApiClient.request<RegistrationImportStatus>(
      `/registration-imports/${fileID}`,
    );
  },

  // CHANGES

  addPass(payload: { season: number; game_number: number; pass: PassInput }) {
    return adminkaApiClient.request<{ pass: PassWithStatus }>("/v1/changes/pass/add", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  removePass(payload: { season: number; game_number: number; pass: PassInput }) {
    return adminkaApiClient.request<{ pass: PassWithStatus }>("/v1/changes/pass/remove", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  markResolved(payload: { change_id: string }) {
    const params = new URLSearchParams({ change_id: payload.change_id });
    return adminkaApiClient.request<void>(
      `/v1/changes/mark_resolved?${params.toString()}`,
      { method: "PUT" },
    );
  },

  addTeam(payload: { season: number; game_number: number; team: Team }) {
    return adminkaApiClient.request<void>("/v1/changes/add_team", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  changeTeamName(payload: {
    season: number;
    game_number: number;
    old_name: string;
    new_name: string;
  }) {
    return adminkaApiClient.request<void>("/v1/changes/change_team_name", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  remove_team(payload: { season: number; game_number: number; team: string }) {
    return adminkaApiClient.request<void>("/v1/changes/remove_team", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  changePlayerCount(payload: {
    season: number;
    game_number: number;
    change: PlayersCountChangeInput;
  }) {
    return adminkaApiClient.request<{ change: PlayersCountChangeResult }>(
      "/v1/changes/player/count",
      { method: "PUT", body: JSON.stringify(payload) },
    );
  },

  addPlayer(payload: { season: number; game_number: number; player: PlayerInput }) {
    return adminkaApiClient.request<{ player: Player }>("/v1/changes/player/add", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  removePlayer(payload: { season: number; game_number: number; player: PlayerInput }) {
    return adminkaApiClient.request<{ player: Player }>("/v1/changes/player/remove", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  unresolved_changes(payload: { season: number; game_number: number }) {
    const params = new URLSearchParams({
      season: String(payload.season),
      game_number: String(payload.game_number),
    });

    return adminkaApiClient.request<Change[]>(
      `/v1/game/unresolved_changes?${params.toString()}`,
    );
  },

  getLostPlayers(payload: { season: number; game_number: number }) {
    const params = new URLSearchParams({
      season: String(payload.season),
      game_number: String(payload.game_number),
    });

    return adminkaApiClient.request<LostPlayersInfoResponse>(
      `/v1/lost_players_info?${params.toString()}`,
    );
  },

  markLostPlayersFound(payload: LostMarkFoundRequest) {
    return adminkaApiClient.request<LostMarkFoundResponse>("/v1/lost/mark_found", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // SIGNS

  getSigns() {
    return adminkaApiClient.request<{ team_ids: string[] }>("/v1/signs");
  },

  addSigns(payload: SignsRequest) {
    return adminkaApiClient.request<SignsResponse>("/v1/signs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  deleteSigns(payload: SignsRequest) {
    return adminkaApiClient.request<SignsResponse>("/v1/signs", {
      method: "DELETE",
      body: JSON.stringify(payload),
    });
  },
};
