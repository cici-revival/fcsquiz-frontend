import { useEffect, useMemo, useState } from "react";
import styles from "./Landing.module.css";
import { useTeamStore } from "@/entities/team/model/team.store";
import { Button } from "@shared/ui/Button";
import { Input } from "@shared/ui/Input";
import TeamTable from "./TeamTable";
import { displayName } from "@entities/team/lib/teamName";
import { useIsMobile } from "@shared/hooks/useMediaQuery";
import { Search, AlertCircle } from "lucide-react";
import { TeamSeatingPlan } from "./TeamSeatingPlan";
import { Faq } from "./Faq";
import { restartTeams } from "@/entities/team/team.bootstrap";
import { Alert, AlertTitle, AlertDescription } from "@shared/ui/Alert";
import { useSeatingStore } from "@entities/seating/model/seating.store";
import { buildSeatNumbers } from "@entities/seating/lib/seatNumbers";
import { TeamListSkeleton } from "./TeamListSkeleton";
import { useRegistrationLink } from "../model/useRegistrationLink";

const DESKTOP_PAGE_SIZE = 24;
const MOBILE_PAGE_SIZE = 12;

export default function Landing() {
  const teamsMap = useTeamStore((s) => s.teams);
  const status = useTeamStore((s) => s.status);
  const error = useTeamStore((s) => s.error);
  const [query, setQuery] = useState("");
  const isMobile = useIsMobile();
  const registrationLink = useRegistrationLink();

  const pageSize = isMobile ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  const teamsArray = useMemo(
    () =>
      Array.from(teamsMap.values()).sort((a, b) =>
        displayName(a).localeCompare(displayName(b), "ru"),
      ),
    [teamsMap],
  );

  const filteredTeams = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teamsArray;

    return teamsArray.filter((t) => displayName(t).toLowerCase().includes(q));
  }, [teamsArray, query]);

  const isSearching = query.trim().length > 0;

  const isLoading = status === "idle" || status === "connecting";

  const seatingTeams = useSeatingStore((s) => s.teams);
  const isSeatingPublished = useSeatingStore((s) => s.isPublished);

  const seatNumbers = useMemo(
    () =>
      isSeatingPublished
        ? buildSeatNumbers(seatingTeams.values())
        : new Map<string, number>(),
    [seatingTeams, isSeatingPublished],
  );

  const visibleTeams = useMemo(
    () => (isSearching ? filteredTeams : filteredTeams.slice(0, visibleCount)),
    [filteredTeams, isSearching, visibleCount],
  );

  const hiddenCount = filteredTeams.length - visibleTeams.length;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Квиз Компьютерных Наук</h1>

            {registrationLink && (
              <div className={styles.register}>
                <a
                  href={registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline">Регистрация на игру</Button>
                </a>
              </div>
            )}
          </div>

          <nav className={styles.actions}>
            <a href="/results">
              <Button variant="outline">Результаты игр</Button>
            </a>
          </nav>
        </header>

        <main className={styles.content}>
          <div className={styles.sectionTitle}>Зарегистрированы на игру:</div>
							{/* <div className={styles.searchHint}>{teamsArray.length} команд</div> */}
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
          </div>

          {isLoading && <TeamListSkeleton isMobile={isMobile} />}

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
              <TeamTable
                query={query}
                teams={visibleTeams}
                seatNumbers={seatNumbers}
              />

              {hiddenCount > 0 && (
                <div className={styles.showMoreRow}>
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount((n) => n + pageSize)}
                  >
                    Показать ещё {Math.min(hiddenCount, pageSize)}
                  </Button>
                  <span className={styles.showMoreHint}>
                    {visibleTeams.length} из {filteredTeams.length}
                  </span>
                </div>
              )}

              {isSearching && filteredTeams.length === 0 && (
                <p className={styles.emptyResult}>
                  Ничего не нашлось по запросу «{query.trim()}»
                </p>
              )}
            </div>
          )}

          <TeamSeatingPlan query={query} />
          <Faq />
        </main>
      </div>
    </div>
  );
}
