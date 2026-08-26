import { ResponsiveContainer } from "recharts";
import type { ComponentProps, CSSProperties, ReactElement } from "react";
import styles from "./Chart.module.css";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color?: string;
  }
>;

type ChartContainerProps = {
  config: ChartConfig;
  children: ReactElement;
  className?: string;
} & Omit<ComponentProps<"div">, "children">;

function configToCssVars(config: ChartConfig): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (value.color) {
      vars[`--color-${key}`] = value.color;
    }
  }
  return vars as CSSProperties;
}

export function ChartContainer({
  config,
  children,
  className,
  style,
  ...props
}: ChartContainerProps) {
  return (
    <div
      data-slot="chart"
      className={`${styles.chart} ${className ?? ""}`.trim()}
      style={{ ...configToCssVars(config), ...style }}
      {...props}
    >
      <ResponsiveContainer width="100%" height="100%" minHeight={200}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

type TooltipPayloadItem = {
  name?: string | number;
  value?: string | number;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
};

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
  config?: ChartConfig;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: string | number) => string;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  config,
  labelFormatter,
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      {label !== undefined && (
        <div className={styles.tooltipLabel}>
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className={styles.tooltipItems}>
        {payload.map((item, index) => {
          const key = String(item.dataKey ?? item.name ?? index);
          const seriesLabel = config?.[key]?.label ?? item.name ?? key;
          const value = item.value ?? "";

          return (
            <div key={key} className={styles.tooltipItem}>
              <span
                className={styles.tooltipMarker}
                style={{ backgroundColor: item.color }}
              />
              <span className={styles.tooltipName}>{seriesLabel}</span>
              <span className={styles.tooltipValue}>
                {valueFormatter && typeof value === "number"
                  ? valueFormatter(value)
                  : value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
