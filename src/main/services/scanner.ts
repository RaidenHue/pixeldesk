import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError, toAppError } from '../../core/errors';
import type { ScanEntry, SkippedEntry } from '../../core/planner';
import { CATEGORY_FOLDER, CATEGORY_ORDER } from '../../shared/categories';
import type { CategoryId } from '../../shared/types';

const MAX_FILES = 10_000;
const SYSTEM_NAMES = new Set(['desktop.ini', 'thumbs.db']);

export interface ScanResult {
  entries: ScanEntry[];
  skipped: SkippedEntry[];
  existing: Partial<Record<CategoryId, string[]>>;
  blocked: CategoryId[];
}

export async function scanRoot(rootPath: string): Promise<ScanResult> {
  const dirents = await fs.readdir(rootPath, { withFileTypes: true });
  if (dirents.length > MAX_FILES) {
    throw new AppError('TOO_MANY', `This folder has more than ${MAX_FILES} items. Choose a smaller folder.`);
  }

  const entries: ScanEntry[] = [];
  const skipped: SkippedEntry[] = [];
  for (const d of dirents) {
    if (d.isSymbolicLink()) { skipped.push({ name: d.name, reason: 'Link (left alone)' }); continue; }
    if (!d.isFile()) continue; 
    try {
      const st = await fs.lstat(path.join(rootPath, d.name));
      entries.push({
        name: d.name,
        size: st.size,
        mtimeMs: st.mtimeMs,
        hidden: d.name.startsWith('.') || SYSTEM_NAMES.has(d.name.toLowerCase()),
      });
    } catch (e) {
      skipped.push({ name: d.name, reason: toAppError(e).message });
    }
  }

  const existing: Partial<Record<CategoryId, string[]>> = {};
  const blocked: CategoryId[] = [];
  for (const cat of CATEGORY_ORDER) {
    const dir = path.join(rootPath, CATEGORY_FOLDER[cat]);
    try {
      const st = await fs.lstat(dir);
      if (st.isSymbolicLink() || !st.isDirectory()) { blocked.push(cat); continue; }
      existing[cat] = await fs.readdir(dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') blocked.push(cat);
    }
  }
  return { entries, skipped, existing, blocked };
}
