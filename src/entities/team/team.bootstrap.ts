import { connectTeamsSSE, disconnectTeamsSSE } from './model/team.sse';

let subscribers = 0;

export function bootstrapTeams() {
  subscribers += 1;

  if (subscribers === 1) {
    connectTeamsSSE();
  }
}

export function shutdownTeams() {
  if (subscribers === 0) {
    return;
  }

  subscribers -= 1;

  if (subscribers === 0) {
    disconnectTeamsSSE();
  }
}

export function restartTeams() {
  disconnectTeamsSSE();

  if (subscribers > 0) {
    connectTeamsSSE();
  }
}
