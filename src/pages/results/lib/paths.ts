export function teamHistoryPath(teamId: string, name?: string): string {
  const path = `/results/team/${encodeURIComponent(teamId)}`;

  return name ? `${path}?${new URLSearchParams({ name }).toString()}` : path;
}
