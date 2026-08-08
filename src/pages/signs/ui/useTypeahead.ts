import { useEffect, useRef, useState } from "react";

const RESET_TIMEOUT_MS = 5000;
const FLASH_DURATION_MS = 600;

export type TypeaheadState = {
  query: string;
  flashKey: number;
  flashChar: string | null;
};

export function useTypeahead(enabled: boolean = true): TypeaheadState {
  const [query, setQuery] = useState("");
  const [flash, setFlash] = useState<{ char: string; key: number } | null>(null);

  const queryRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const flashCounterRef = useRef(0);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (e.key === "Escape") {
        setQuery("");
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        setQuery((q) => q.slice(0, -1));
        lastKeyTimeRef.current = Date.now();
        return;
      }

      if (e.key.length !== 1) return;

      const now = Date.now();
      const shouldReset = now - lastKeyTimeRef.current > RESET_TIMEOUT_MS;
      lastKeyTimeRef.current = now;

      const char = e.key;
      setQuery((prev) => (shouldReset ? char : prev + char));

      flashCounterRef.current += 1;
      setFlash({ char, key: flashCounterRef.current });
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);

  useEffect(() => {
    if (!flash) return;
    const id = setTimeout(() => setFlash(null), FLASH_DURATION_MS);
    return () => clearTimeout(id);
  }, [flash]);

  return {
    query,
    flashKey: flash?.key ?? 0,
    flashChar: flash?.char ?? null,
  };
}
