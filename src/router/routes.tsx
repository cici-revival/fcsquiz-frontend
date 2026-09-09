import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { Landing } from '../pages';
import type { AppRoute } from './types';

// Лендинг остаётся в основном чанке — это публичная точка входа.
// Всё остальное грузится по требованию. Импорты идут прямыми путями
// в обход барреля '../pages': импорт из него затянул бы все страницы разом.

const LoginPage = lazy(() => import('../pages/login/ui/Login'));
const AdminLayout = lazy(() => import('@/widgets/admin-layout/ui/AdminLayout'));

const Home = lazy(() => import('../pages/home/ui/Home'));
const UploadPage = lazy(() => import('../pages/upload/ui/Upload'));
const ModifyPage = lazy(() => import('../pages/modify/ui/Modify'));
const DistributePage = lazy(() => import('../pages/distribute/DistributePage'));

// Единственная страница с именованным экспортом вместо default.
const SignsPage = lazy(() =>
  import('../pages/signs/ui/Signs').then((m) => ({ default: m.SignsPage })),
);

const Resolve = lazy(() => import('../pages/modify/resolve/Resolve'));
const ModifyPlayers = lazy(() => import('../pages/modify/modifyplayers/ModifyPlayers'));
const ModifyPasses = lazy(() => import('../pages/modify/modifypasses/ModifyPasses'));
const AddTeam = lazy(() => import('../pages/modify/addteam/AddTeam'));
const ModifyTeamName = lazy(() => import('../pages/modify/modifyteamname/ModifyTeamName'));
const DeleteTeam = lazy(() => import('../pages/modify/deleteteam/DeleteTeam'));
const ChangeCount = lazy(() => import('../pages/modify/changecount/ChangeCount'));

export const routes: AppRoute[] = [
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    publicOnly: true,
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    protected: true,
    children: [
      { path: '', element: <Navigate to="home" replace /> },
      { path: 'home', element: <Home /> },
      { path: 'upload', element: <UploadPage /> },
      {
        path: 'modify',
        element: <ModifyPage />,
        children: [
          { path: '', element: <Navigate to="resolve" replace /> },
          { path: 'resolve', element: <Resolve /> },
          { path: 'modifyplayers', element: <ModifyPlayers /> },
          { path: 'modifypasses', element: <ModifyPasses /> },
          { path: 'addteam', element: <AddTeam /> },
          { path: 'modifyteamname', element: <ModifyTeamName /> },
          { path: 'deleteteam', element: <DeleteTeam /> },
          { path: 'changecount', element: <ChangeCount /> },
        ],
      },
      { path: 'distribute', element: <DistributePage /> },
      { path: 'signs', element: <SignsPage /> },
    ],
  },
];
