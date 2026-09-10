export function onVisibilityChange(handlers: {
  onHidden: () => void;
  onVisible: () => void;
}): () => void {
  if (typeof document === "undefined" || !("hidden" in document)) {
    return () => {};
  }

  const handler = () => {
    if (document.hidden) {
      handlers.onHidden();
    } else {
      handlers.onVisible();
    }
  };

  document.addEventListener("visibilitychange", handler);

  return () => document.removeEventListener("visibilitychange", handler);
}
