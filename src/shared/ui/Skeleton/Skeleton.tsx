import type { ComponentProps } from "react";
import styles from "./Skeleton.module.css";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={`${styles.skeleton} ${className ?? ""}`.trim()}
      {...props}
    />
  );
}
