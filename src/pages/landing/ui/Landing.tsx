import { useMemo, useState } from "react";
import styles from "./Landing.module.css";
import { useTeamStore } from "@/entities/team/model/team.store";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import TeamTable from "./TeamTable";
import { Search, AlertCircle } from "lucide-react";
import { TeamSeatingPlan } from "./TeamSeatingPlan";
import { Faq } from "./Faq";
import { restartTeams } from "@/entities/team/team.bootstrap";
import { Alert, AlertTitle, AlertDescription } from "@shared/ui/Alert";

export default function Landing() {
  const teamsMap = useTeamStore((s) => s.teams);
  const status = useTeamStore((s) => s.status);
  const error = useTeamStore((s) => s.error);
  const [query, setQuery] = useState("");

  const teamsArray = useMemo(() => Array.from(teamsMap.values()), [teamsMap]);

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teamsArray;
    return teamsArray.filter((t) => t.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));;
  }, [teamsArray, query]);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Квиз Компьютерных Наук</h1>

            <div className={styles.register}>
              <a
                href="https://cs.hse.ru/abitur/polls/1110068092.html"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline">Регистрация на игру</Button>
              </a>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.sectionTitle}>Зарегистрированы на игру:</div>

          <div className={styles.searchRow}>
            <div className={styles.searchField}>
              <span className={styles.searchIcon}>
                <Search size={14} />
              </span>
              <Input
                className={styles.searchInput}
                placeholder="Найти команду..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingLeft: 30 }}
              />
            </div>

            <div className={styles.searchHint}>{teamsArray.length} команд</div>
          </div>

          {status === "connecting" && (
            <div className={styles.loading}>Подключение к серверу...</div>
          )}

          {status === "error" && (
            <Alert variant="destructive" className={styles.fetchAlert}>
							<AlertCircle />
              <div>

              <AlertTitle>Ошибка загрузки данных</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
							</div>
              <div style={{ marginLeft: 8 }}>
                <Button variant="outline" onClick={restartTeams}>
                  Попробовать снова
                </Button>
              </div>
            </Alert>
          )}

          {status === "connected" && (
            <div className={styles.tableWrap}>
              <TeamTable query={query} teams={filteredTeams} />
            </div>
          )}

          <TeamSeatingPlan />
          <Faq />
        </main>
      </div>
    </div>
  );
}
