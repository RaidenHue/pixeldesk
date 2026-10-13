import { describe, expect, it } from 'vitest';
import { buildPlan, type ScanEntry } from '../src/core/planner';

const f = (name: string, extra: Partial<ScanEntry> = {}): ScanEntry =>
  ({ name, size: 10, mtimeMs: 1000, hidden: false, ...extra });
const base = { skipHidden: true, uncheckPrograms: true, caseInsensitive: true, platform: 'win32' as const };

describe('buildPlan', () => {
  it('maps files to category folders in a stable order', () => {
    const { moves } = buildPlan([f('b.mp3'), f('a.png'), f('notes.txt'), f('x.zzz')], {}, base);
    expect(moves.map((m) => m.toRel)).toEqual([
      'Images/a.png', 'Documents/notes.txt', 'Audio/b.mp3', 'Other/x.zzz',
    ]);
    expect(moves.every((m) => !m.renamed)).toBe(true);
  });

  it('renames on conflict with files already in the destination', () => {
    const { moves } = buildPlan([f('photo.png')], { images: ['photo.png', 'photo (1).png'] }, base);
    expect(moves[0]).toMatchObject({ toRel: 'Images/photo (2).png', renamed: true });
  });

  it('detects conflicts case-insensitively against existing files', () => {
    const { moves } = buildPlan([f('Photo.PNG')], { images: ['photo.png'] }, base);
    expect(moves[0]!.toRel).toBe('Images/Photo (1).PNG');
  });

  it('avoids collisions between files inside the same plan', () => {
    const { moves } = buildPlan([f('photo.png'), f('Photo.PNG')], {}, base);
    expect(moves.filter((m) => m.renamed)).toHaveLength(1);
    const dests = moves.map((m) => m.toRel.toLowerCase());
    expect(new Set(dests).size).toBe(2);
  });

  it('respects case-sensitive filesystems', () => {
    const { moves } = buildPlan([f('A.png')], { images: ['a.png'] }, { ...base, caseInsensitive: false });
    expect(moves[0]!.renamed).toBe(false);
  });

  it('skips hidden/system files, temp downloads and unsafe names, with reasons', () => {
    const { moves, skipped } = buildPlan(
      [f('.secret', { hidden: true }), f('movie.mkv.crdownload'), f('bad:name.txt'), f('ok.txt')], {}, base);
    expect(moves.map((m) => m.name)).toEqual(['ok.txt']);
    expect(skipped.map((s) => s.name).sort()).toEqual(['.secret', 'bad:name.txt', 'movie.mkv.crdownload']);
    expect(skipped.every((s) => s.reason.length > 0)).toBe(true);
  });

  it('includes hidden files when skipHidden is off', () => {
    const { moves } = buildPlan([f('.env', { hidden: true })], {}, { ...base, skipHidden: false });
    expect(moves).toHaveLength(1);
  });

  it('leaves programs unchecked by default, checked when the option is off', () => {
    expect(buildPlan([f('setup.exe')], {}, base).moves[0]!.selected).toBe(false);
    expect(buildPlan([f('setup.exe')], {}, { ...base, uncheckPrograms: false }).moves[0]!.selected).toBe(true);
    expect(buildPlan([f('a.png')], {}, base).moves[0]!.selected).toBe(true);
  });

  it('skips categories whose folder name is blocked by a non-folder', () => {
    const { moves, skipped } = buildPlan([f('a.png'), f('b.mp3')], {}, { ...base, blocked: ['images'] });
    expect(moves.map((m) => m.name)).toEqual(['b.mp3']);
    expect(skipped[0]!.reason).toContain('Images');
  });

  it('does not mutate its inputs', () => {
    const entries = [f('b.png'), f('a.png')];
    const existing = { images: ['a.png'] };
    buildPlan(entries, existing, base);
    expect(entries.map((e) => e.name)).toEqual(['b.png', 'a.png']);
    expect(existing).toEqual({ images: ['a.png'] });
  });
});
