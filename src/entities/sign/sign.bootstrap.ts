import { connectSignsSSE, disconnectSignsSSE } from "./model/sign.sse";

let isInitialized = false;

export function bootstrapSigns() {
  if (isInitialized) return;
  connectSignsSSE();
  isInitialized = true;
}

export function shutdownSigns() {
  disconnectSignsSSE();
  isInitialized = false;
}
