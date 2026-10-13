import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildPlan } from '../src/core/planner';
import { applyMoves, moveNoOverwrite, undoMoves } from '../src/main/services/fileOps';
import { scanRoot } from '../src/main/services/scanner';

const CI = process.platform !== 'linux';
let dir: string;

beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), 'pixeldesk-')); });
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

const write = (rel: string, content: string) => fs.writeFile(path.join(dir, ...rel.split('/')), content);
const read = (rel: string) => fs.readFile(path.join(dir, ...rel.split('/')), 'utf8');
const exists = (rel: string) => fs.access(path.join(dir, ...rel.split('/'))).then(() => true, () => false);

async function planFor() {
  const scan = await scanRoot(dir);
  return buildPlan(scan.entries, scan.existing, {
    skipHidden: true, uncheckPrograms: true, caseInsensitive: CI, blocked: scan.blocked,
  });
}

describe('moveNoOverwrite', () => {
  it('never overwrites an existing destination', async () => {
    await write('a.txt', 'new');
    await write('b.txt', 'old');
    await expect(moveNoOverwrite(path.join(dir, 'a.txt'), path.join(dir, 'b.txt')))
      .rejects.toMatchObject({ code: 'EXISTS' });
    expect(await read('b.txt')).toBe('old');
    expect(await read('a.txt')).toBe('new');
  });

  it('moves a file when the destination is free', async () => {
    await write('a.txt', 'hello');
    await moveNoOverwrite(path.join(dir, 'a.txt'), path.join(dir, 'b.txt'));
    expect(await read('b.txt')).toBe('hello');
    expect(await exists('a.txt')).toBe(false);
  });
});

describe('scan -> preview -> apply -> undo', () => {
  it('scanning and previewing do not touch the disk', async () => {
    await write('photo.png', 'x');
    await write('song.mp3', 'y');
    const { moves } = await planFor();
    expect(moves).toHaveLength(2);
    expect(await exists('Images')).toBe(false);
    expect(await exists('photo.png')).toBe(true);
  });

  it('sorts files into category folders, then undo restores them', async () => {
    await write('photo.png', 'pic');
    await write('song.mp3', 'tune');
    const { moves } = await planFor();

    const { done, failed } = await applyMoves(dir, moves);
    expect(failed).toEqual([]);
    expect(await read('Images/photo.png')).toBe('pic');
    expect(await read('Audio/song.mp3')).toBe('tune');
    expect(await exists('photo.png')).toBe(false);

    const undone = await undoMoves(dir, done);
    expect(undone.failed).toEqual([]);
    expect(await read('photo.png')).toBe('pic');
    expect(await read('song.mp3')).toBe('tune');
  });

  it('keeps existing files and renames clashes', async () => {
    await fs.mkdir(path.join(dir, 'Images'));
    await write('Images/photo.png', 'OLD');
    await write('photo.png', 'NEW');
    const { moves } = await planFor();
    expect(moves[0]!.toRel).toBe('Images/photo (1).png');

    await applyMoves(dir, moves);
    expect(await read('Images/photo.png')).toBe('OLD');
    expect(await read('Images/photo (1).png')).toBe('NEW');
  });

  it('refuses files that changed since the scan', async () => {
    await write('doc.txt', 'short');
    const { moves } = await planFor();
    await write('doc.txt', 'a much longer replacement');
    const { done, failed } = await applyMoves(dir, moves);
    expect(done).toEqual([]);
    expect(failed[0]!.message).toMatch(/changed/i);
    expect(await read('doc.txt')).toBe('a much longer replacement');
  });

  it('reports a missing file without crashing the batch', async () => {
    await write('a.txt', '1');
    await write('b.txt', '2');
    const { moves } = await planFor();
    await fs.unlink(path.join(dir, 'a.txt'));
    const { done, failed } = await applyMoves(dir, moves);
    expect(done).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(await read('Documents/b.txt')).toBe('2');
  });

  it('undo never overwrites a file that took the original spot', async () => {
    await write('photo.png', 'ORIGINAL');
    const { moves } = await planFor();
    const { done } = await applyMoves(dir, moves);
    await write('photo.png', 'SOMETHING ELSE');
    const res = await undoMoves(dir, done);
    expect(res.restored).toEqual([]);
    expect(res.failed).toHaveLength(1);
    expect(await read('photo.png')).toBe('SOMETHING ELSE');
    expect(await read('Images/photo.png')).toBe('ORIGINAL');
  });

  it('leaves sub-folders alone and skips a category name occupied by a file', async () => {
    await fs.mkdir(path.join(dir, 'Projects'));
    await write('Projects/keep.png', 'k');
    await write('Images', 'i am a file, not a folder');
    await write('pic.png', 'p');
    const scan = await scanRoot(dir);
    expect(scan.entries.map((e) => e.name)).not.toContain('keep.png');
    expect(scan.blocked).toContain('images');
    const { moves, skipped } = await planFor();
    expect(moves.find((m) => m.name === 'pic.png')).toBeUndefined();
    expect(skipped.some((s) => s.name === 'pic.png')).toBe(true);
  });
});
