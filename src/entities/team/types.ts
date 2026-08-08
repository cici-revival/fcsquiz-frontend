import { type Team } from "@/types/api";

export type RosterTeam = Team & { id: string };

export type TeamEvent =
  | {
      type: "new_team";
      body: { team: RosterTeam };
    }
  | {
      type: "change_players_count";
      body: { team_id: string; team_name: string; players_count: number };
    }
  | {
      type: "update_passes";
      body: { team_id: string; team_name: string; passes: string[] };
    }
  | {
      type: "remove_team";
      body: { team_id: string; team_name: string };
    };


	export type TeamEventResponce = {
		data: TeamEvent[];
	}
