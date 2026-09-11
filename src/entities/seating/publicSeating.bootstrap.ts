import {
  connectPublicSeatingSSE,
  disconnectPublicSeatingSSE,
} from "./model/publicSeating.sse";

let subscribers = 0;

export function bootstrapPublicSeating() {
  subscribers += 1;

  if (subscribers === 1) {
    connectPublicSeatingSSE();
  }
}

export function shutdownPublicSeating() {
  if (subscribers === 0) {
    return;
  }

  subscribers -= 1;

  if (subscribers === 0) {
    disconnectPublicSeatingSSE();
  }
}

export function restartPublicSeating() {
  disconnectPublicSeatingSSE();

  if (subscribers > 0) {
    connectPublicSeatingSSE();
  }
}
