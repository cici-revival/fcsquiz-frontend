export type SignEvent =
  | { type: "sign_added"; team_id: string }
  | { type: "sign_removed"; team_id: string };
