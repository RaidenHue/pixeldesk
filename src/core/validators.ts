import type { SettingsPatch } from '../shared/types';
import { AppError } from './errors';

export const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const bad = (m: string) => new AppError('INVALID_REQUEST', m);
const UUID = /^[0-9a-f-]{36}$/;

export function none(raw: unknown): void {
  if (raw !== undefined && raw !== null) throw bad('Unexpected payload');
}

export function parseRootRef(raw: unknown): { rootId: string } {
  if (!isObj(raw) || typeof raw.rootId !== 'string' || !/^[a-f0-9]{12}$/.test(raw.rootId)) {
    throw bad('Invalid folder reference');
  }
  return { rootId: raw.rootId };
}

export function parseOperationRef(raw: unknown): { operationId: string } {
  if (!isObj(raw) || typeof raw.operationId !== 'string' || !UUID.test(raw.operationId)) {
    throw bad('Invalid history reference');
  }
  return { operationId: raw.operationId };
}

export function parseApply(raw: unknown): { planId: string; itemIds: string[] } {
  if (!isObj(raw) || typeof raw.planId !== 'string' || !UUID.test(raw.planId)) throw bad('Invalid plan');
  const ids = raw.itemIds;
  if (!Array.isArray(ids) || ids.length > 50_000 || !ids.every((i) => typeof i === 'string' && /^\d{1,6}$/.test(i))) {
    throw bad('Invalid item list');
  }
  return { planId: raw.planId, itemIds: ids as string[] };
}

const SETTING_KEYS = ['skipHidden', 'uncheckPrograms', 'reduceMotion'] as const;
export function parseSettingsPatch(raw: unknown): SettingsPatch {
  if (!isObj(raw)) throw bad('Invalid settings');
  const patch: SettingsPatch = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!(SETTING_KEYS as readonly string[]).includes(k) || typeof v !== 'boolean') {
      throw bad(`Invalid setting: ${k}`);
    }
    patch[k as (typeof SETTING_KEYS)[number]] = v;
  }
  return patch;
}
