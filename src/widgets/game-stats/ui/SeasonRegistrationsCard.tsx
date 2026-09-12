import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
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

export default function SeasonRegistrationsCard({
  season,
  maxGameNumber,
}: SeasonRegistrationsCardProps) {
  const [data, setData] = useState<SeasonPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canBuild = season > 0 && maxGameNumber > 0;

  async function loadSeason() {
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
      setError(e instanceof Error ? e.message : "Не удалось загрузить данные");
    } finally {
      setLoading(false);
    }
  }

  const totals = data
    ? data.reduce(
        (acc, point) => ({
          players: acc.players + point.players,
          teams: acc.teams + point.teams,
        }),
        { players: 0, teams: 0 },
      )
    : null;

  return (
    <Card className={styles.chartCard}>
      <CardHeader className={styles.statsHeader}>
        <div className={styles.statsHeaderWrapper}>
          <CardTitle>Регистрации по сезону</CardTitle>
          <CardDescription>
            Динамика по всем играм сезона {season || "—"}
          </CardDescription>
        </div>
        <Button onClick={loadSeason} disabled={!canBuild || loading}>
          {loading ? "Загрузка…" : "Показать регистрации"}
        </Button>
      </CardHeader>
      <CardContent>
        {!data && !loading && !error && (
          <p className={styles.muted}>
            Нажмите «Показать регистрации», чтобы загрузить данные по всем играм
            сезона.
          </p>
        )}

        {data && totals && (
          <>
            <div className={styles.summaryRow}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{totals.teams}</span>
                <span className={styles.summaryLabel}>команд за сезон</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{totals.players}</span>
                <span className={styles.summaryLabel}>человек за сезон</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{data.length}</span>
                <span className={styles.summaryLabel}>игр в сезоне</span>
              </div>
            </div>

            <ul className={styles.seasonList}>
              {data.map((point) => (
                <li key={point.game} className={styles.seasonRow}>
                  <span className={styles.seasonGame}>Игра {point.game}</span>
                  <span className={styles.seasonValues}>
                    <span>{point.teams} команд</span>
                    <span className={styles.muted}>·</span>
                    <span>{point.players} чел.</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {error && <p className={styles.chartError}>{error}</p>}
      </CardContent>
    </Card>
  );
}
