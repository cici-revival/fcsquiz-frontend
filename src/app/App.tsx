import { AppRouter } from "@/router";
import { bootstrapTeams, shutdownTeams } from "@/entities/team/team.bootstrap";
import { useEffect } from "react";

export function App() {
  useEffect(() => {
    bootstrapTeams();

    return () => {
      shutdownTeams();
    };
  }, []);

  return <AppRouter />;
}
