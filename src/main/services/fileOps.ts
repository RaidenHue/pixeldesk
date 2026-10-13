import { constants, promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError, toAppError } from '../../core/errors';
import { resolveInside } from '../../core/pathValidation';
import type { PlannedMove } from '../../core/planner';
import type { Failure, HistoryMove } from '../../shared/types';

const LINK_FALLBACK = new Set(['EXDEV', 'EPERM', 'ENOTSUP', 'ENOSYS', 'EMLINK', 'EOPNOTSUPP']);
const errCode = (e: unknown) => (e as NodeJS.ErrnoException).code ?? '';

export async function moveNoOverwrite(src: string, dest: string): Promise<void> {
  const before = await fs.lstat(src);
  if (!before.isFile()) throw new AppError('NOT_FILE', 'The source is not a regular file.');

  let linked = false;
  try {
    await fs.link(src, dest);
    linked = true;
  } catch (e) {
    if (errCode(e) === 'EEXIST') throw new AppError('EXISTS', 'A file with that name already exists.');
    if (!LINK_FALLBACK.has(errCode(e))) throw e;
  }
  if (!linked) {
    try {
      await fs.copyFile(src, dest, constants.COPYFILE_EXCL);
    } catch (e) {
      if (errCode(e) === 'EEXIST') throw new AppError('EXISTS', 'A file with that name already exists.');
      throw e;
    }
  }

  try {
    const after = await fs.lstat(dest);
    if (!after.isFile() || after.size !== before.size) {
      throw new AppError('VERIFY_FAILED', 'Could not verify the moved file. The original was left in place.');
    }
    await fs.unlink(src);
  } catch (e) {
    await fs.unlink(dest).catch(() => undefined); 
    throw e;
  }
}

async function ensureRealDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const st = await fs.lstat(dir);
  if (!st.isDirectory() || st.isSymbolicLink()) {
    throw new AppError('BAD_FOLDER', 'A destination folder is not a normal folder.');
  }
}

export async function applyMoves(rootPath: string, moves: readonly PlannedMove[]) {
  const done: HistoryMove[] = [];
  const failed: Failure[] = [];
  for (const m of moves) {
    try {
      const src = resolveInside(rootPath, m.fromRel);
      const dest = resolveInside(rootPath, m.toRel);
      const st = await fs.lstat(src);
      if (!st.isFile() || st.size !== m.size || Math.abs(st.mtimeMs - m.mtimeMs) > 1) {
        throw new AppError('CHANGED', 'The file changed since the scan. Scan again.');
      }
      await ensureRealDirectory(path.dirname(dest));
      await moveNoOverwrite(src, dest);
      done.push({ from: m.fromRel, to: m.toRel });
    } catch (e) {
      failed.push({ name: m.name, message: toAppError(e).message });
    }
  }
  return { done, failed };
}

export async function undoMoves(rootPath: string, moves: readonly HistoryMove[]) {
  const restored: HistoryMove[] = [];
  const failed: Failure[] = [];
  for (const m of [...moves].reverse()) {
    try {
      const current = resolveInside(rootPath, m.to);
      const original = resolveInside(rootPath, m.from);
      await ensureRealDirectory(path.dirname(original));
      await moveNoOverwrite(current, original);
      restored.push(m);
    } catch (e) {
      failed.push({ name: path.basename(m.to), message: toAppError(e).message });
    }
  }
  return { restored, failed };
}
