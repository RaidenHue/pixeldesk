import { CATEGORY_FOLDER, CATEGORY_ORDER, categorize, isTemporaryName } from '../shared/categories';
import type { CategoryId } from '../shared/types';
import { uniqueName } from './conflicts';
import { currentPlatform, isSafeFileName, type PlatformKind } from './pathValidation';

export interface ScanEntry { name: string; size: number; mtimeMs: number; hidden: boolean }
export interface PlannedMove {
  name: string;
  category: CategoryId;
  size: number;
  mtimeMs: number;
  fromRel: string;
  toRel: string; // always "Folder/name" with forward slash
  renamed: boolean;
  selected: boolean;
}
export interface SkippedEntry { name: string; reason: string }
export interface PlannerOptions {
  skipHidden: boolean;
  uncheckPrograms: boolean;
  caseInsensitive: boolean;
  blocked?: CategoryId[]; // category folders that exist but are not real folders
  platform?: PlatformKind;
}

/**
 * Pure preview builder: decides where each file would go and resolves filename conflicts
 * (against files already in the destination AND against other files in this same plan).
 * Touches nothing on disk.
 */
export function buildPlan(
  entries: readonly ScanEntry[],
  existing: Partial<Record<CategoryId, string[]>>,
  opts: PlannerOptions,
): { moves: PlannedMove[]; skipped: SkippedEntry[] } {
  const platform = opts.platform ?? currentPlatform();
  const key = (n: string) => (opts.caseInsensitive ? n.toLowerCase() : n);
  const taken = new Map<CategoryId, Set<string>>();
  const takenFor = (c: CategoryId) => {
    let s = taken.get(c);
    if (!s) { s = new Set((existing[c] ?? []).map(key)); taken.set(c, s); }
    return s;
  };

  const moves: PlannedMove[] = [];
  const skipped: SkippedEntry[] = [];
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  for (const e of sorted) {
    if (!isSafeFileName(e.name, platform)) { skipped.push({ name: e.name, reason: 'Unsafe file name' }); continue; }
    if (opts.skipHidden && e.hidden) { skipped.push({ name: e.name, reason: 'Hidden or system file' }); continue; }
    if (isTemporaryName(e.name)) { skipped.push({ name: e.name, reason: 'Looks like an unfinished download or temp file' }); continue; }

    const category = categorize(e.name);
    const folder = CATEGORY_FOLDER[category];
    if (opts.blocked?.includes(category)) {
      skipped.push({ name: e.name, reason: `Something that is not a folder is named "${folder}"` });
      continue;
    }

    const used = takenFor(category);
    const finalName = uniqueName(e.name, used, opts.caseInsensitive);
    used.add(key(finalName));

    moves.push({
      name: e.name,
      category,
      size: e.size,
      mtimeMs: e.mtimeMs,
      fromRel: e.name,
      toRel: `${folder}/${finalName}`,
      renamed: finalName !== e.name,
      selected: !(category === 'programs' && opts.uncheckPrograms),
    });
  }

  moves.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      a.name.localeCompare(b.name, 'en', { numeric: true }),
  );
  return { moves, skipped };
}
