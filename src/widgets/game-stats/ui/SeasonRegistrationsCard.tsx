import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@shared/ui";
import { adminkaApi } from "@shared/api/adminkaApi";
import { NotFoundError } from "@shared/api/errors";
import { getGameTotals } from "@entities/team/model/teamStats";
import styles from "./GameStats.module.css";

type SeasonRegistrationsCardProps = {
  season: number;
  maxGameNumber: number;
};

type SeasonPoint = {
  game: number;
  players: number;
  teams: number;
};

const chartConfig: ChartConfig = {
  players: { label: "Человек", color: "var(--chart-2)" },
  teams: { label: "Команд", color: "var(--chart-3)" },
};

export default function SeasonRegistrationsCard({
  season,
  maxGameNumber,
}: SeasonRegistrationsCardProps) {
  const [data, setData] = useState<SeasonPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBuild = season > 0 && maxGameNumber > 0;

  async function buildChart() {
    if (!canBuild) return;

    setLoading(true);
    setError(null);

    try {
      const gameNumbers = Array.from(
        { length: maxGameNumber },
        (_, i) => i + 1,
      );

      const points = await Promise.all(
        gameNumbers.map(async (game_number): Promise<SeasonPoint> => {
          try {
            const res = await adminkaApi.getRegisteredTeams({
              season,
              game_number,
            });
            const totals = getGameTotals(res ?? []);
            return {
              game: game_number,
              players: totals.playersCount,
              teams: totals.teamsCount,
            };
          } catch (e) {
            if (e instanceof NotFoundError) {
              return { game: game_number, players: 0, teams: 0 };
            }
            throw e;
          }
        }),
      );

      setData(points.sort((a, b) => a.game - b.game));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось построить график");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={styles.chartCard}>
      <CardHeader className={styles.statsHeader}>
        <div className={styles.statsHeaderWrapper}>
          <CardTitle>Регистрации по сезону</CardTitle>
          <CardDescription>
            Динамика по всем играм сезона {season || "—"}
          </CardDescription>
        </div>
        <Button onClick={buildChart} disabled={!canBuild || loading}>
          {loading ? "Загрузка…" : "Построить график регистраций"}
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className={styles.chartBox}>
          <LineChart
            data={data ?? []}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="game"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <Tooltip
              content={
                <ChartTooltipContent
                  config={chartConfig}
                  labelFormatter={(l) => `Игра ${l}`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="players"
              stroke="#fba068"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="teams"
              stroke="black"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
        {/* {!data && !loading && (
          <p className={styles.chartHint}>
            Нажмите «Построить график», чтобы загрузить данные по всем играм
            сезона.
          </p>
        )} */}
        {error && <p className={styles.chartError}>{error}</p>}
      </CardContent>
      <CardFooter></CardFooter>
    </Card>
  );
}
