import type {
  Team,
  StructureChangeDetails,
} from "@/types/api";

export type ChangeSource = "manual" | "unresolved";

export type ChangeKind =
  | "structure"
  | "passes"
  | "count"
  | "addTeam"
  | "renameTeam"
  | "deleteTeam";

export interface BaseStoredChange {
  id: string;
  kind: ChangeKind;
  source: ChangeSource;
  season: number;
  gameNumber: number;
  createdAt: number;
  /**
   * ID из /v1/game/unresolved_changes, если изменение было создано
   * на основе "сырой" заявки.
   */
  unresolvedId?: string;
}

export interface StructureStoredChange extends BaseStoredChange {
  kind: "structure";
  teamName: string;
  details: StructureChangeDetails;
}

export interface PassesStoredChange extends BaseStoredChange {
  kind: "passes";
  teamName: string;
  playerName: string;
  mode: "add" | "remove";
}

export type CountChangeMode = "add" | "remove" | "set";

export interface CountStoredChange extends BaseStoredChange {
  kind: "count";
  teamName: string;
  mode: CountChangeMode;
  count: number;
}

export interface AddTeamStoredChange extends BaseStoredChange {
  kind: "addTeam";
  team: Team;
}

export interface RenameTeamStoredChange extends BaseStoredChange {
  kind: "renameTeam";
  oldName: string;
  newName: string;
}

export interface DeleteTeamStoredChange extends BaseStoredChange {
  kind: "deleteTeam";
  teamName: string;
}

export type StoredChange =
  | StructureStoredChange
  | PassesStoredChange
  | CountStoredChange
  | AddTeamStoredChange
  | RenameTeamStoredChange
  | DeleteTeamStoredChange;
