const LATIN_TO_CYR: Record<string, string> = {
  'q': 'й', 'w': 'ц', 'e': 'у', 'r': 'к', 't': 'е', 'y': 'н', 'u': 'г', 'i': 'ш',
  'o': 'щ', 'p': 'з', '[': 'х', ']': 'ъ', 'a': 'ф', 's': 'ы', 'd': 'в',
  'f': 'а', 'g': 'п', 'h': 'р', 'j': 'о', 'k': 'л', 'l': 'д', ';': 'ж',
  "'": 'э', 'z': 'я', 'x': 'ч', 'c': 'с', 'v': 'м', 'b': 'и', 'n': 'т',
  'm': ','
};

const CYR_TO_LAT: Record<string, string> = Object.fromEntries(
  Object.entries(LATIN_TO_CYR).map(([lat, cyr]) => [cyr, lat])
);

export const generateSearchVariants = (input: string): string[] => {
  const variants: string[] = [input.toLowerCase().trim()];

  const latinToCyr = input.toLowerCase()
    .split('')
    .map(char => LATIN_TO_CYR[char] || char)
    .join('');
  if (latinToCyr !== variants[0]) variants.push(latinToCyr);

  const cyrToLat = input.toLowerCase()
    .split('')
    .map(char => CYR_TO_LAT[char] || char)
    .join('');
  if (cyrToLat !== variants[0]) variants.push(cyrToLat);

  return [...new Set(variants)];
};
