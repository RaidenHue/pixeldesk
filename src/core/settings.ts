import type { HistoryMove, Operation, Settings } from '../shared/types';
import { isSafeRelative } from './pathValidation';
import { isObj } from './validators';

export const DEFAULT_SETTINGS: Settings = {
  roots: [], skipHidden: true, uncheckPrograms: true, reduceMotion: false,
};

export function sanitizeSettings(raw: unknown): Settings {
  const o = isObj(raw) ? raw : {};
  const bool = (k: 'skipHidden' | 'uncheckPrograms' | 'reduceMotion') =>
    typeof o[k] === 'boolean' ? (o[k] as boolean) : DEFAULT_SETTINGS[k];
  const roots = Array.isArray(o.roots)
    ? o.roots.filter((r): r is string => typeof r === 'string' && r.length <= 1024).slice(0, 50)
    : [];
  return { roots, skipHidden: bool('skipHidden'), uncheckPrograms: bool('uncheckPrograms'), reduceMotion: bool('reduceMotion') };
}

export function sanitizeHistory(raw: unknown): Operation[] {
  if (!Array.isArray(raw)) return [];
  const out: Operation[] = [];
  for (const r of raw) {
    if (!isObj(r) || typeof r.id !== 'string' || typeof r.timestamp !== 'string'
      || typeof r.rootPath !== 'string' || !Array.isArray(r.moves)) continue;
    const moves = r.moves.filter(
      (m): m is HistoryMove =>
        isObj(m) && typeof m.from === 'string' && typeof m.to === 'string'
        && isSafeRelative(m.from) && isSafeRelative(m.to),
    );
    out.push({
      id: r.id,
      timestamp: r.timestamp,
      rootPath: r.rootPath,
      rootName: typeof r.rootName === 'string' ? r.rootName : 'folder',
      moves,
      undone: r.undone === true,
    });
  }
  return out.slice(0, 200);
}
