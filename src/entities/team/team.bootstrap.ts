import { connectTeamsSSE, disconnectTeamsSSE } from './model/team.sse';

let isInitialized = false;

export function bootstrapTeams() {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  connectTeamsSSE();
}

export function shutdownTeams() {
  disconnectTeamsSSE();
  isInitialized = false;
}

export function restartTeams() {
  disconnectTeamsSSE();
  connectTeamsSSE();
}
