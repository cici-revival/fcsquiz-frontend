import { ShieldX } from "lucide-react";
import type { ReactElement } from "react";
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from "@/shared/hooks/useAuth";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

import styles from "./ProtectedRoute.module.css";

interface ProtectedRouteProps {
  children: ReactElement;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { hasAdminAccess, isAuthenticated, isLoading, logout } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasAdminAccess) {
    return (
      <main className={styles.container}>
        <Card className={styles.card}>
          <CardHeader className={styles.header}>
            <span className={styles.icon} aria-hidden="true">
              <ShieldX size={28} />
            </span>
            <CardTitle>Нет доступа к админке</CardTitle>
          </CardHeader>
          <CardContent className={styles.content}>
            <p className={styles.description}>
              Ваша учётная запись не имеет роли администратора.
            </p>
            <Button type="button" onClick={() => void logout()}>
              Выйти
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return children;
};
