// Route/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import React from 'react';

export const ProtectedRoute = ({ children }: { children: React.JSX.Element }) => {
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
      <main>
        <p>У вас нет прав для доступа к админке.</p>
        <button type="button" onClick={() => void logout()}>
          Выйти
        </button>
      </main>
    );
  }

  return children;
};
