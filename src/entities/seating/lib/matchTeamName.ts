const LATIN_LOOKALIKES: Record<string, string> = {
  a: "а",
  b: "в",
  c: "с",
  e: "е",
  h: "н",
  k: "к",
  m: "м",
  o: "о",
  p: "р",
  t: "т",
  x: "х",
  y: "у",
};

export function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[a-z]/g, (char) => LATIN_LOOKALIKES[char] ?? char)
    .replace(/[^а-я0-9a-z]/g, "");
}

export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) =>
    Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[a.length][b.length];
}

export function allowedTypos(normalized: string): number {
  return Math.max(1, Math.floor(normalized.length / 5));
}

export function teamNameDistance(name: string, target: string): number | null {
  const normalizedName = normalizeTeamName(name);
  const normalizedTarget = normalizeTeamName(target);
  if (!normalizedName || !normalizedTarget) return null;

  const distance = editDistance(normalizedName, normalizedTarget);

  return distance <= allowedTypos(normalizedTarget) ? distance : null;
}
