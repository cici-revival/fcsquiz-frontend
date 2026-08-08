import { Landing, ModifyPage, Home, UploadPage, LoginPage, DistributePage, SignsPage } from '../pages';
import { AdminLayout } from '@/widgets/admin-layout';
import type { AppRoute } from './types';
import { Navigate } from 'react-router-dom';
import Resolve from '../pages/modify/resolve/Resolve';
import ModifyPlayers from '../pages/modify/modifyplayers/ModifyPlayers';
import ModifyPasses from '../pages/modify/modifypasses/ModifyPasses';
import AddTeam from '../pages/modify/addteam/AddTeam';
import ModifyTeamName from '../pages/modify/modifyteamname/ModifyTeamName';
import DeleteTeam from '../pages/modify/deleteteam/DeleteTeam';
import ChangeCount from '../pages/modify/changecount/ChangeCount';

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
