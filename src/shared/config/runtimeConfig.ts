// runtimeConfig.ts
type CsquizConfig = {
  API_BASE_URL?: string;
  FRONTEND_URL?: string;
};

declare global {
  interface Window {
    __CSQUIZ_CONFIG?: CsquizConfig;
  }
}

const DEFAULT_API_BASE_URL = "http://localhost:9000";

export function getApiBaseUrl(): string {
  return window.__CSQUIZ_CONFIG?.API_BASE_URL ?? DEFAULT_API_BASE_URL;
}
