export function splitName(name: string): { stem: string; ext: string } {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { stem: name, ext: '' };
  return { stem: name.slice(0, i), ext: name.slice(i) };
}

export function uniqueName(name: string, taken: ReadonlySet<string>, caseInsensitive = true): string {
  const key = (n: string) => (caseInsensitive ? n.toLowerCase() : n);
  if (!taken.has(key(name))) return name;
  const { stem, ext } = splitName(name);
  for (let i = 1; i < 10_000; i++) {
    const candidate = `${stem} (${i})${ext}`;
    if (!taken.has(key(candidate))) return candidate;
  }
  throw new Error('Could not find a free file name');
}
