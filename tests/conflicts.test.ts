import { describe, expect, it } from 'vitest';
import { splitName, uniqueName } from '../src/core/conflicts';

describe('splitName', () => {
  it('splits stem and extension', () => {
    expect(splitName('a.txt')).toEqual({ stem: 'a', ext: '.txt' });
    expect(splitName('a.tar.gz')).toEqual({ stem: 'a.tar', ext: '.gz' });
    expect(splitName('.env')).toEqual({ stem: '.env', ext: '' });
    expect(splitName('README')).toEqual({ stem: 'README', ext: '' });
  });
});

describe('uniqueName', () => {
  it('returns the name untouched when free', () => {
    expect(uniqueName('a.txt', new Set())).toBe('a.txt');
  });
  it('adds (1), then (2), ...', () => {
    expect(uniqueName('a.txt', new Set(['a.txt']))).toBe('a (1).txt');
    expect(uniqueName('a.txt', new Set(['a.txt', 'a (1).txt']))).toBe('a (2).txt');
  });
  it('is case-insensitive by default (Windows) and case-sensitive on request', () => {
    expect(uniqueName('A.TXT', new Set(['a.txt']))).toBe('A (1).TXT');
    expect(uniqueName('A.TXT', new Set(['a.txt']), false)).toBe('A.TXT');
  });
  it('handles names without an extension', () => {
    expect(uniqueName('notes', new Set(['notes']))).toBe('notes (1)');
  });
});
