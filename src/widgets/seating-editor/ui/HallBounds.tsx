import {
  DEAD_ZONE,
  HALL,
  HALL_GEOMETRY,
  getHallBounds,
} from "@entities/seating/config/hall";

import styles from "./HallBounds.module.css";

const floor = HALL.height - HALL_GEOMETRY.bottomMargin;
const ceiling = HALL.stageHeight;

function sidePath(isLeft: boolean): string {
  const outer: string[] = [];
  const step = 20;

  for (let y = ceiling; y <= floor; y += step) {
    const bounds = getHallBounds(y);
    outer.push(`${isLeft ? bounds.left : bounds.right},${y}`);
  }

  const last = getHallBounds(floor);
  outer.push(`${isLeft ? last.left : last.right},${floor}`);

  const inner = isLeft ? HALL_GEOMETRY.aisleLeft : HALL_GEOMETRY.aisleRight;

  return `M ${outer.join(" L ")} L ${inner},${floor} L ${inner},${ceiling} Z`;
}

export function HallBounds() {
  return (
    <svg
      className={styles.root}
      width={HALL.width}
      height={HALL.height}
      aria-hidden="true"
    >
      <path className={styles.area} d={sidePath(true)} />
      <path className={styles.area} d={sidePath(false)} />

      <rect
        className={styles.blocked}
        x={DEAD_ZONE.left}
        y={DEAD_ZONE.top}
        width={DEAD_ZONE.right - DEAD_ZONE.left}
        height={DEAD_ZONE.bottom - DEAD_ZONE.top}
      />
    </svg>
  );
}
