import { AppRouter } from "@/router";
// import { useGameStore } from "@/entities/game/model/game.store";
import { bootstrapTeams } from "@/entities/team/team.bootstrap";
import { useEffect } from "react";

export function App() {
  useEffect(() => {
    bootstrapTeams();
  }, []);

  return <AppRouter />;
}
