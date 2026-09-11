export function onVisibilityChange(
  handlers: {
    onHidden: () => void;
    onVisible: () => void;
  },
  hiddenDelayMs = 0,
): () => void {
  if (typeof document === "undefined" || !("hidden" in document)) {
    return () => {};
  }

  let hiddenTimeout: ReturnType<typeof setTimeout> | null = null;
  let isHiddenApplied = false;

  const clearHiddenTimeout = () => {
    if (hiddenTimeout) {
      clearTimeout(hiddenTimeout);
      hiddenTimeout = null;
    }
  };

  const applyHidden = () => {
    hiddenTimeout = null;
    isHiddenApplied = true;
    handlers.onHidden();
  };

  const handler = () => {
    if (document.hidden) {
      if (isHiddenApplied || hiddenTimeout) return;

      if (hiddenDelayMs <= 0) {
        applyHidden();
        return;
      }

      hiddenTimeout = setTimeout(applyHidden, hiddenDelayMs);
      return;
    }

    clearHiddenTimeout();

    if (!isHiddenApplied) return;

    isHiddenApplied = false;
    handlers.onVisible();
  };

  document.addEventListener("visibilitychange", handler);

  return () => {
    clearHiddenTimeout();
    document.removeEventListener("visibilitychange", handler);
  };
}
