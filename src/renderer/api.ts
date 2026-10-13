import type { PixelDeskApi } from '../shared/ipc';
import type { Result } from '../shared/types';

declare global {
  interface Window { pixeldesk: PixelDeskApi }
}

export const api = window.pixeldesk;

export async function unwrap<T>(pending: Promise<Result<T>>): Promise<T> {
  const r = await pending;
  if (!r.ok) throw new Error(r.error.message);
  return r.data;
}
