import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { connectSignsSSE, disconnectSignsSSE } from "./sign.sse";

describe("connectSignsSSE", () => {
  const eventSource = vi.fn(() => ({ close: vi.fn() }));

  beforeEach(() => {
    window.__CSQUIZ_CONFIG = { API_BASE_URL: "https://api.fcsquiz.ru/api" };
    vi.stubGlobal("EventSource", eventSource);
  });

  afterEach(() => {
    disconnectSignsSSE();
    window.__CSQUIZ_CONFIG = undefined;
    vi.unstubAllGlobals();
  });

  it("uses credentials for the API subdomain", () => {
    connectSignsSSE();

    expect(eventSource).toHaveBeenCalledWith(
      "https://api.fcsquiz.ru/api/v1/signs/stream",
      { withCredentials: true },
    );
  });
});
