import { afterEach, describe, expect, it, vi } from "vitest";

import {
  BASE_RECONNECT_DELAY,
  FAST_RECONNECT_ATTEMPTS,
  MAX_RECONNECT_DELAY,
  getReconnectDelay,
  getReconnectMessage,
} from "./sseBackoff";

describe("getReconnectDelay", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("растёт экспоненциально без джиттера", () => {
    // Math.random() === 0.5 даёт нулевой джиттер.
    vi.spyOn(Math, "random").mockReturnValue(0.5);

    expect(getReconnectDelay(1)).toBe(BASE_RECONNECT_DELAY);
    expect(getReconnectDelay(2)).toBe(BASE_RECONNECT_DELAY * 2);
    expect(getReconnectDelay(3)).toBe(BASE_RECONNECT_DELAY * 4);
    expect(getReconnectDelay(4)).toBe(BASE_RECONNECT_DELAY * 8);

    vi.mocked(Math.random).mockRestore();
  });

  it("не превышает потолок", () => {
    for (const attempt of [10, 20, 100]) {
      expect(getReconnectDelay(attempt)).toBeLessThanOrEqual(
        MAX_RECONNECT_DELAY * 1.25,
      );
    }
  });

  it("разводит клиентов джиттером", () => {
    const delays = new Set(
      Array.from({ length: 50 }, () => getReconnectDelay(5)),
    );

    // При синхронном рестарте бэкенда одинаковые задержки означали бы
    // одновременный удар всех клиентов.
    expect(delays.size).toBeGreaterThan(1);
  });

  it("держит джиттер в пределах ±25%", () => {
    const expected = BASE_RECONNECT_DELAY * 4;

    for (let i = 0; i < 100; i += 1) {
      const delay = getReconnectDelay(3);
      expect(delay).toBeGreaterThanOrEqual(expected * 0.75);
      expect(delay).toBeLessThanOrEqual(expected * 1.25);
    }
  });

  it("не уходит в отрицательные значения на нулевой попытке", () => {
    expect(getReconnectDelay(0)).toBeGreaterThan(0);
  });
});

describe("getReconnectMessage", () => {
  it("показывает счётчик, пока попытки быстрые", () => {
    expect(getReconnectMessage(1)).toContain(`1/${FAST_RECONNECT_ATTEMPTS}`);
    expect(getReconnectMessage(FAST_RECONNECT_ATTEMPTS)).toContain(
      `${FAST_RECONNECT_ATTEMPTS}/${FAST_RECONNECT_ATTEMPTS}`,
    );
  });

  it("после серии быстрых попыток сообщает, что связи нет", () => {
    const message = getReconnectMessage(FAST_RECONNECT_ATTEMPTS + 1);

    expect(message).not.toContain("/");
    expect(message).toContain("Нет связи");
  });
});
