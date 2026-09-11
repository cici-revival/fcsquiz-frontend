import { connectSeatingWS, disconnectSeatingWS } from "./model/seating.ws";

let subscribers = 0;

export function bootstrapSeating() {
  subscribers += 1;

  if (subscribers === 1) {
    connectSeatingWS();
  }
}

export function shutdownSeating() {
  if (subscribers === 0) {
    return;
  }

  subscribers -= 1;

  if (subscribers === 0) {
    disconnectSeatingWS();
  }
}
