import { useEffect, useRef, useState } from "react";

import { getFieldScale } from "@entities/seating/lib/fieldCoords";

export function useFieldScale(zoom = 1) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return { containerRef, fieldRef, scale: getFieldScale(width, zoom) };
}
