import { z } from "zod";

export const teamSchema = z.object({
  name: z.string(),
  tg: z.string(),
  captain: z.string(),
  players_count: z.number(),
  is_ready_to_accept_players: z.boolean(),
  passes: z.array(z.string()),
  division: z.string().optional(),
  processed: z.number().optional(),
});

export const teamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("new_team"),
    body: z.object({
      game_id: z.object({
        season: z.number(),
        game_number: z.number(),
      }),
      team: teamSchema,
    }),
  }),
  z.object({
    type: z.literal("change_players_count"),
    body: z.object({
      game_id: z.object({
        season: z.number(),
        game_number: z.number(),
      }),
      team_name: z.string(),
      players_count: z.number(),
    }),
  }),
  z.object({
    type: z.literal("update_passes"),
    body: z.object({
      game_id: z.object({
        season: z.number(),
        game_number: z.number(),
      }),
      team_name: z.string(),
      passes: z.array(z.string()),
    }),
  }),
  z.object({
    type: z.literal("remove_team"),
    body: z.object({
      game_id: z.object({
        season: z.number(),
        game_number: z.number(),
      }),
      team_name: z.string(),
    }),
  }),
]);

export const teamEventResponseSchema = z.array(teamEventSchema);
export type TeamEvent = z.infer<typeof teamEventSchema>;
