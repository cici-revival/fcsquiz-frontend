import { BALCONY } from "../config/hall";

import styles from "./BalconyStrip.module.css";

type BalconyStripProps = {
  scale: number;
  top: number;
};

export function BalconyStrip({ scale, top }: BalconyStripProps) {
  const labelScale = 1 / Math.max(scale, 0.01);

  return (
    <div
      className={styles.root}
      style={{
        left: BALCONY.left,
        top,
        width: BALCONY.right - BALCONY.left,
        height: BALCONY.height,
      }}
      aria-hidden="true"
    >
      <span className={styles.labelPosition}>
        <span
          className={styles.label}
          style={{ transform: `scale(${labelScale})` }}
        >
          Балкон · 15 мест
        </span>
      </span>
    </div>
  );
}
