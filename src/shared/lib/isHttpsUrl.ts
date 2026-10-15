export function isHttpsUrl(value: string): boolean {
  if (!/^https:\/\/\S+$/.test(value)) return false;

  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
