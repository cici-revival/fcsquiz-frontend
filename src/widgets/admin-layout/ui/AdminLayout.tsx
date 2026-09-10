// src/widgets/admin-layout/index.tsx
import { Suspense, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useTeamExport } from "@/features/team/csvExporter";

import {
  bootstrapTeams,
  shutdownTeams,
  restartTeams,
} from "@entities/team/team.bootstrap"; // Добавили shutdownTeams и restartTeams
import { useTeamStats } from "@/entities/team/model/useTeamStats";
import { RouteFallback } from "@/router/RouteFallback";
import {
  Upload,
  Edit,
  Users,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  GalleryVerticalEnd,
  LayoutGrid,
} from "lucide-react";
import { Button } from "@shared/ui/Button";
import { cn } from "@shared/lib/utils";

import styles from "./styles.module.css";
import { Stats } from "./Stats";



export default function AdminLayout() {
  const location = useLocation();
  const stats = useTeamStats();
	const { exportToCSV, teamsCount } = useTeamExport();

  // Инициализация SSE при монтировании компонента
  useEffect(() => {
    bootstrapTeams();

    // Очистка при размонтировании
    return () => {
      shutdownTeams();
    };
  }, []); // Пустой массив зависимостей - выполняется один раз

  const modifyChildren = [
    { href: "/admin/modify/resolve", label: "Изменения из таблички" },
    { href: "/admin/modify/modifyplayers", label: "Изменить состав" },
    { href: "/admin/modify/modifypasses", label: "Изменить пропуски" },
    { href: "/admin/modify/addteam", label: "Добавить команду" },
    { href: "/admin/modify/modifyteamname", label: "Изменить название команды" },
    { href: "/admin/modify/deleteteam", label: "Удалить команду" },
    { href: "/admin/modify/changecount", label: "Изменить число участников" },
  ];

  const navItems = [
    { href: "/admin/home", label: "Главная", icon: ArrowRight, id: "home" },
    {
      href: "/admin/upload",
      label: "Загрузить таблицу",
      icon: Upload,
      id: "upload",
    },
    {
      href: "/admin/modify",
      label: "Внести изменения",
      icon: Edit,
      id: "modify",
      children: modifyChildren,
    },
    {
      href: "/admin/distribute",
      label: "Распределить одиночек",
      icon: Users,
      id: "distribute",
    },
    {
      href: "/admin/signs",
      label: "Таблички",
      icon: GalleryVerticalEnd,
      id: "signs",
    },
    {
      href: "/admin/seating",
      label: "Рассадка",
      icon: LayoutGrid,
      id: "seating",
    },
  ];

  const handleReconnect = () => {
    restartTeams();
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.navContainer}>
          <nav className={styles.nav}>
            {navItems.map(({ href, label, icon: Icon, id, children }) => {
              const isActive = location.pathname === href;
              const isSectionActive = location.pathname.startsWith(href);

              return (
                <div key={href}>
                  <Link to={href} className={cn(styles.navLink, styles[id])}>
                    <Button
                      variant={
                        label === "Главная"
                          ? isActive
                            ? "default"
                            : "ghost"
                          : isSectionActive
                            ? "secondary"
                            : "ghost"
                      }
                      className={styles.navButton}
                    >
                      <Icon className={styles.navIcon} strokeWidth={1.5} />
                      <span>{label}</span>
                    </Button>
                  </Link>

                  {children && isSectionActive && (
                    <div className={styles.subNav}>
                      {children.map((child) => {
                        const isChildActive = location.pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            to={child.href}
                            className={styles.navLink}
                          >
                            <Button
                              variant={isChildActive ? "secondary" : "ghost"}
                              className={styles.subNavButton}
                            >
                              <span>{child.label}</span>
                            </Button>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        <div className={styles.statsSection}>
          {stats.status === "connecting" && (
            <div className={styles.statusConnecting}>
              <div className={styles.statusConnectingContainer}>
                <RefreshCw className={styles.spinIcon} size={14} />
                <span>Подключение...</span>
              </div>
              {stats.error && (
                <div className={styles.errorText}>{stats.error}</div>
              )}
            </div>
          )}

          {stats.status === "connected" && (
            <Stats
              teamsCount={stats.teamsCount}
              playersCount={stats.playersCount}
              passesCount={stats.passesCount}
            />
          )}

          {stats.status === "disconnected" && (
            <div className={styles.statusDisconnected}>
              <AlertCircle size={16} />
              <div>
                <div className={styles.statusTitle}>Соединение потеряно</div>
                <div>Попытка восстановить...</div>
                {stats.error && (
                  <div className={styles.errorText}>{stats.error}</div>
                )}
              </div>
            </div>
          )}

          {stats.status === "error" && (
            <div className={styles.statusError}>
              <AlertCircle size={16} />
              <div>
                <div className={styles.statusTitle}>Ошибка подключения</div>
                <div>{stats.error || "Не удалось подключиться"}</div>
              </div>
              <Button
                onClick={handleReconnect}
                variant="outline"
                size="sm"
                className={styles.reconnectBtn}
              >
                <RefreshCw className="mr-1" size={12} />
                Переподключиться
              </Button>
            </div>
          )}
        </div>
        <Button variant="outline" onClick={() => exportToCSV()} disabled={teamsCount === 0}>
          Скачать CSV
        </Button>
      </div>

      <main className={styles.main}>
        {/* Своя граница Suspense: без неё загрузка чанка дочерней страницы
            заставила бы suspend'иться внешнюю границу, AdminLayout бы
            размонтировался и его cleanup оборвал бы SSE на каждой навигации. */}
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
