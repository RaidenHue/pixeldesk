import path from 'node:path';
import { AppError } from './errors';

export type PlatformKind = 'win32' | 'posix';
export const currentPlatform = (): PlatformKind => (process.platform === 'win32' ? 'win32' : 'posix');
const lib = (k: PlatformKind) => (k === 'win32' ? path.win32 : path.posix);

const BLOCKED_TOP: Record<PlatformKind, string[]> = {
  win32: ['windows', 'program files', 'program files (x86)', 'programdata', '$recycle.bin', 'system volume information'],
  posix: ['bin', 'boot', 'dev', 'etc', 'lib', 'lib64', 'proc', 'run', 'sbin', 'sys', 'usr', 'var'],
};

export function validateRootPath(input: unknown, kind: PlatformKind = currentPlatform()): string {
  if (typeof input !== 'string' || input.length === 0 || input.length > 1024 || input.includes('\0')) {
    throw new AppError('INVALID_PATH', 'That is not a valid folder path.');
  }
  const p = lib(kind);
  if (kind === 'win32' && (input.startsWith('\\\\') || input.startsWith('//'))) {
    throw new AppError('UNSUPPORTED_PATH', 'Network (UNC) paths are not supported.');
  }
  if (!p.isAbsolute(input)) throw new AppError('INVALID_PATH', 'The folder path must be absolute.');

  const resolved = p.resolve(input);
  const { root } = p.parse(resolved);
  if (resolved === root) {
    throw new AppError('PROTECTED_PATH', 'Whole drives cannot be organized. Pick a folder inside it.');
  }
  const top = p.relative(root, resolved).split(p.sep)[0]!.toLowerCase();
  if (BLOCKED_TOP[kind].includes(top)) {
    throw new AppError('PROTECTED_PATH', 'System folders are protected and cannot be organized.');
  }
  return resolved;
}

export function isInside(root: string, candidate: string, kind: PlatformKind = currentPlatform()): boolean {
  const p = lib(kind);
  const rel = p.relative(p.resolve(root), p.resolve(candidate));
  if (rel === '') return false;
  return !(rel === '..' || rel.startsWith('..' + p.sep) || p.isAbsolute(rel));
}

export function isSafeFileName(name: unknown, kind: PlatformKind = currentPlatform()): name is string {
  if (typeof name !== 'string' || name.length === 0 || name.length > 255) return false;
  if (name === '.' || name === '..' || /[\0/\\]/.test(name)) return false;
  if (kind === 'win32' && (/[<>:"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name))) return false;
  return true;
}

export function isSafeRelative(rel: unknown, kind: PlatformKind = currentPlatform()): rel is string {
  if (typeof rel !== 'string' || rel.length === 0 || rel.length > 600) return false;
  if (/^([a-zA-Z]:|[\\/])/.test(rel)) return false;
  return rel.split(/[\\/]/).every((seg) => isSafeFileName(seg, kind));
}

export function resolveInside(root: string, rel: string, kind: PlatformKind = currentPlatform()): string {
  if (!isSafeRelative(rel, kind)) throw new AppError('INVALID_PATH', 'Unsafe path rejected.');
  const p = lib(kind);
  const target = p.resolve(root, ...rel.split(/[\\/]/));
  if (!isInside(root, target, kind)) throw new AppError('ESCAPE', 'Path escapes the selected folder.');
  return target;
}
