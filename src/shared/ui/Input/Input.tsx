import styles from "./Input.module.css";
import type { ComponentProps } from "react";

export function Input({
  className,
  onKeyDown,
  ...props
}: ComponentProps<"input">) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <input
      className={`${styles.input} ${className ?? ""}`.trim()}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}
