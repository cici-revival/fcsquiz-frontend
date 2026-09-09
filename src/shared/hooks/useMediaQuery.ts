import { useEffect, useState } from "react";

/**
 * Подписка на CSS media query из React.
 *
 * Нужна там, где адаптив нельзя сделать одним CSS: например, на узком экране
 * детали команды показываются по тапу через Popover, а на десктопе —
 * по наведению через Tooltip. Это разные компоненты, а не разные стили.
 *
 * До первого эффекта возвращает false, поэтому на сервере и в тестах
 * без matchMedia поведение считается десктопным.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener("change", handler);

    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Ширина, ниже которой интерфейс считается мобильным. Совпадает с CSS. */
export const MOBILE_BREAKPOINT = "(max-width: 768px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_BREAKPOINT);
}
