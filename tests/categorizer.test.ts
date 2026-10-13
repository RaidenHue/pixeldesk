import { describe, expect, it } from 'vitest';
import { categorize, extensionOf, isTemporaryName } from '../src/shared/categories';

describe('extensionOf', () => {
  it('handles normal, multi-dot, dotfile, none and trailing dot', () => {
    expect(extensionOf('photo.JPG')).toBe('jpg');
    expect(extensionOf('backup.tar.gz')).toBe('gz');
    expect(extensionOf('.gitignore')).toBe('');
    expect(extensionOf('README')).toBe('');
    expect(extensionOf('weird.')).toBe('');
  });
});

describe('categorize', () => {
  it.each([
    ['photo.JPG', 'images'], ['report.pdf', 'documents'], ['song.mp3', 'audio'], ['clip.mkv', 'video'],
    ['backup.tar.gz', 'archives'], ['setup.exe', 'programs'], ['main.ts', 'code'],
    ['mystery.xyz', 'other'], ['README', 'other'], ['.gitignore', 'other'],
  ])('%s -> %s', (name, cat) => {
    expect(categorize(name)).toBe(cat);
  });
});

describe('isTemporaryName', () => {
  it('flags unfinished downloads and Office lock files', () => {
    expect(isTemporaryName('movie.mkv.crdownload')).toBe(true);
    expect(isTemporaryName('big.zip.PART')).toBe(true);
    expect(isTemporaryName('~$budget.xlsx')).toBe(true);
    expect(isTemporaryName('budget.xlsx')).toBe(false);
  });
});
