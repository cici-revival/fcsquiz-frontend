import { type Team } from "@/types/api";

export type RosterTeam = Team & { id: string };

export type GameId = {
  season: number;
  game_number: number;
};

export type TeamEvent =
  | {
      type: "new_team";
      body: { team: RosterTeam; game_id?: GameId };
    }
  | {
      type: "change_players_count";
      body: {
        team_id: string;
        team_name: string;
        players_count: number;
        game_id?: GameId;
      };
    }
  | {
      type: "update_passes";
      body: {
        team_id: string;
        team_name: string;
        passes: string[];
        game_id?: GameId;
      };
    }
  | {
      type: "remove_team";
      body: { team_id: string; team_name: string; game_id?: GameId };
    };

	export type TeamEventResponce = {
		data: TeamEvent[];
	}
