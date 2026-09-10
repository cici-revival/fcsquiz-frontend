import { useEffect, useRef, useState } from "react";

import { getFieldScale } from "@entities/seating/lib/fieldCoords";

export function useFieldScale() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(getFieldScale(entry.contentRect.width));
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return { containerRef, fieldRef, scale };
}
