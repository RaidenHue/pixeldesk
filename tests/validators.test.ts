import { describe, expect, it } from 'vitest';
import { none, parseApply, parseRootRef, parseSettingsPatch } from '../src/core/validators';

describe('IPC validators', () => {
  it('none() only accepts empty payloads', () => {
    expect(() => none(undefined)).not.toThrow();
    expect(() => none({ x: 1 })).toThrow();
  });
  it('parseRootRef requires a 12-char hex id', () => {
    expect(parseRootRef({ rootId: 'abcdef012345' })).toEqual({ rootId: 'abcdef012345' });
    expect(() => parseRootRef({ rootId: '../../etc' })).toThrow();
    expect(() => parseRootRef('x')).toThrow();
  });
  it('parseApply validates plan id and item ids', () => {
    const planId = '123e4567-e89b-12d3-a456-426614174000';
    expect(parseApply({ planId, itemIds: ['0', '12'] }).itemIds).toEqual(['0', '12']);
    expect(() => parseApply({ planId: 'nope', itemIds: [] })).toThrow();
    expect(() => parseApply({ planId, itemIds: ['../x'] })).toThrow();
    expect(() => parseApply({ planId, itemIds: [1] })).toThrow();
  });
  it('parseSettingsPatch accepts only known boolean keys', () => {
    expect(parseSettingsPatch({ skipHidden: false })).toEqual({ skipHidden: false });
    expect(() => parseSettingsPatch({ roots: ['C:\\'] })).toThrow();
    expect(() => parseSettingsPatch({ skipHidden: 'yes' })).toThrow();
  });
});
