import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { onVisibilityChange } from "./documentVisibility";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });

  document.dispatchEvent(new Event("visibilitychange"));
}

describe("onVisibilityChange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("без отсрочки вызывает onHidden сразу", () => {
    const onHidden = vi.fn();
    const unsubscribe = onVisibilityChange({ onHidden, onVisible: vi.fn() });

    setHidden(true);

    expect(onHidden).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("с отсрочкой ждёт до конца окна", () => {
    const onHidden = vi.fn();
    const unsubscribe = onVisibilityChange({ onHidden, onVisible: vi.fn() }, 30_000);

    setHidden(true);
    vi.advanceTimersByTime(29_000);
    expect(onHidden).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(onHidden).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("возврат до конца отсрочки не зовёт ни onHidden, ни onVisible", () => {
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    const unsubscribe = onVisibilityChange({ onHidden, onVisible }, 30_000);

    setHidden(true);
    vi.advanceTimersByTime(10_000);
    setHidden(false);
    vi.advanceTimersByTime(60_000);

    expect(onHidden).not.toHaveBeenCalled();
    expect(onVisible).not.toHaveBeenCalled();

    unsubscribe();
  });

  it("возврат после отсрочки зовёт onVisible", () => {
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    const unsubscribe = onVisibilityChange({ onHidden, onVisible }, 30_000);

    setHidden(true);
    vi.advanceTimersByTime(30_000);
    setHidden(false);

    expect(onHidden).toHaveBeenCalledTimes(1);
    expect(onVisible).toHaveBeenCalledTimes(1);

    unsubscribe();
  });

  it("отписка снимает отложенный onHidden", () => {
    const onHidden = vi.fn();
    const unsubscribe = onVisibilityChange({ onHidden, onVisible: vi.fn() }, 30_000);

    setHidden(true);
    unsubscribe();
    vi.advanceTimersByTime(60_000);

    expect(onHidden).not.toHaveBeenCalled();
  });
});
