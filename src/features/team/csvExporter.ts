// features/team/lib/csvExporter.ts
import { useTeamStore } from '../../entities/team/model/team.store';
import { type Team } from '@/types/api';

export const getTeamsFromStore = () => {
  const state = useTeamStore.getState();
  return state.teams;
};

const escapeCSVField = (field: string): string => {
  if (field.includes(';') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
};

export const teamsMapToCSV = (teams: Map<string, Team>): string => {
  const headers = ['team', 'players_count', 'passes'];
  const rows: string[][] = [headers];

  const sortedTeams = Array.from(teams.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedTeams.forEach((team: Team) => {
    const passesFormatted = team.passes?.length
      ? team.passes.join('\n')
      : '';

    rows.push([
      team.name,
      team.players_count.toString(),
      passesFormatted
    ]);
  });

  return rows
    .map(row => row.map(escapeCSVField).join(';'))
    .join('\n');
};

export const downloadTeamsCSV = (filename?: string): void => {
  const teams = useTeamStore.getState().teams;

  if (teams.size === 0) {
    console.warn('Нет данных для экспорта');
    return;
  }

  const csvContent = teamsMapToCSV(teams);
  const defaultFilename = `teams_${new Date().toISOString().slice(0,10)}.csv`;

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.setAttribute('download', filename || defaultFilename);
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * это хук для экспорта
 */
export function useTeamExport() {
  const teams = useTeamStore((s) => s.teams);

  const exportToCSV = (filename?: string) => {
    if (teams.size === 0) {
      console.warn('Нет данных для экспорта');
      return;
    }

    const csvContent = teamsMapToCSV(teams);
    const defaultFilename = `teams_${new Date().toISOString().slice(0,10)}.csv`;

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.href = url;
    link.setAttribute('download', filename || defaultFilename);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    exportToCSV,
    teamsCount: teams.size,
    teamsList: Array.from(teams.values())
  } as const;
}
