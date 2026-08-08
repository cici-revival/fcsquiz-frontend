import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@shared/ui";
import type { Team } from "@/types/api";
import { getRosterDistribution } from "@entities/team/model/teamStats";
import styles from "./GameStats.module.css";

type RosterDistributionCardProps = {
  teams: Team[];
};

const chartConfig: ChartConfig = {
  count: { label: "Команд", color: "var(--chart-1)" },
};

export default function RosterDistributionCard({
  teams,
}: RosterDistributionCardProps) {
  const data = useMemo(() => getRosterDistribution(teams), [teams]);

  return (
    <Card className={styles.chartCard}>
      <CardHeader>
        <CardTitle>Распределение по составам</CardTitle>
        <CardDescription>
          Сколько команд с каким числом участников
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className={styles.chartBox}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="size"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
              content={
                <ChartTooltipContent
                  config={chartConfig}
                  labelFormatter={(l) => `Состав: ${l} чел.`}
                />
              }
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
