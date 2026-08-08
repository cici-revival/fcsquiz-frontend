// router/index.tsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { PublicRoute } from './PublicRoute';
import { routes } from './routes';
import type {AppRoute} from './types';
import React from 'react';
import { Toaster } from 'react-hot-toast';

const renderRoutes = (routes: AppRoute[], basePath = '') =>
  routes.map(({ path, element, protected: isProtected, publicOnly, children }) => {
    let wrappedElement = element as React.JSX.Element;

    if (isProtected) wrappedElement = <ProtectedRoute>{wrappedElement}</ProtectedRoute>;
    if (publicOnly) wrappedElement = <PublicRoute>{wrappedElement}</PublicRoute>;

    const fullPath = basePath + (path.startsWith('/') ? path : '/' + path);

    return (
      <Route key={fullPath} path={fullPath} element={wrappedElement}>
        {children && renderRoutes(children, fullPath)}
      </Route>
    );
  });

export const AppRouter = () => (
  <AuthProvider>
		<Toaster
        toastOptions={{
          duration: 3000,
          style: {
            background: 'white',
            color: 'black',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: 'green',
              secondary: 'white',
            },
          },
          error: {
            duration: 3000,
            iconTheme: {
              primary: 'red',
              secondary: 'white',
            },
          },
        }}
      />
    <Routes>
      {renderRoutes(routes)}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
);
