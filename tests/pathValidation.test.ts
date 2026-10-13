import { describe, expect, it } from 'vitest';
import { AppError } from '../src/core/errors';
import {
  isInside, isSafeFileName, isSafeRelative, resolveInside, validateRootPath,
} from '../src/core/pathValidation';

const code = (fn: () => unknown) => {
  try { fn(); } catch (e) { return (e as AppError).code; }
  return 'NO_ERROR';
};

describe('validateRootPath (win32)', () => {
  it('accepts a normal user folder', () => {
    expect(validateRootPath('C:\\Users\\me\\Downloads', 'win32')).toBe('C:\\Users\\me\\Downloads');
  });
  it('normalizes trailing separators', () => {
    expect(validateRootPath('C:\\Users\\me\\Downloads\\', 'win32')).toBe('C:\\Users\\me\\Downloads');
  });
  it('rejects drive roots, system folders, UNC, relative, empty, NUL and non-strings', () => {
    expect(code(() => validateRootPath('C:\\', 'win32'))).toBe('PROTECTED_PATH');
    expect(code(() => validateRootPath('C:\\Windows\\System32', 'win32'))).toBe('PROTECTED_PATH');
    expect(code(() => validateRootPath('c:\\program files\\App', 'win32'))).toBe('PROTECTED_PATH');
    expect(code(() => validateRootPath('\\\\server\\share\\x', 'win32'))).toBe('UNSUPPORTED_PATH');
    expect(code(() => validateRootPath('Downloads', 'win32'))).toBe('INVALID_PATH');
    expect(code(() => validateRootPath('', 'win32'))).toBe('INVALID_PATH');
    expect(code(() => validateRootPath('C:\\a\0b', 'win32'))).toBe('INVALID_PATH');
    expect(code(() => validateRootPath(42, 'win32'))).toBe('INVALID_PATH');
  });
});

describe('validateRootPath (posix)', () => {
  it('accepts home folders, rejects / and system dirs', () => {
    expect(validateRootPath('/home/me/Downloads', 'posix')).toBe('/home/me/Downloads');
    expect(code(() => validateRootPath('/', 'posix'))).toBe('PROTECTED_PATH');
    expect(code(() => validateRootPath('/etc/ssh', 'posix'))).toBe('PROTECTED_PATH');
  });
});

describe('isInside', () => {
  it('is strict about containment', () => {
    const root = 'C:\\Users\\me\\Downloads';
    expect(isInside(root, 'C:\\Users\\me\\Downloads\\Images\\a.png', 'win32')).toBe(true);
    expect(isInside(root, root, 'win32')).toBe(false);
    expect(isInside(root, 'C:\\Users\\me\\Downloads2\\a.png', 'win32')).toBe(false);
    expect(isInside(root, 'C:\\Users\\me\\Downloads\\..\\secret.txt', 'win32')).toBe(false);
    expect(isInside(root, 'D:\\Downloads\\a.png', 'win32')).toBe(false);
    expect(isInside('/a/b', '/a/b/c', 'posix')).toBe(true);
    expect(isInside('/a/b', '/a/bc', 'posix')).toBe(false);
  });
});

describe('file name / relative path safety', () => {
  it('rejects traversal and illegal names', () => {
    expect(isSafeFileName('ok.txt', 'win32')).toBe(true);
    expect(isSafeFileName('..', 'posix')).toBe(false);
    expect(isSafeFileName('a/b', 'posix')).toBe(false);
    expect(isSafeFileName('a:b', 'win32')).toBe(false);
    expect(isSafeFileName('trailing.', 'win32')).toBe(false);
    expect(isSafeRelative('Images/a.png', 'posix')).toBe(true);
    expect(isSafeRelative('../a.png', 'posix')).toBe(false);
    expect(isSafeRelative('Images/../../a.png', 'posix')).toBe(false);
    expect(isSafeRelative('/etc/passwd', 'posix')).toBe(false);
    expect(isSafeRelative('C:\\x', 'win32')).toBe(false);
  });
  it('resolveInside never escapes the root', () => {
    expect(resolveInside('/home/me/dl', 'Images/a.png', 'posix')).toBe('/home/me/dl/Images/a.png');
    expect(code(() => resolveInside('/home/me/dl', '../x', 'posix'))).toBe('INVALID_PATH');
    expect(code(() => resolveInside('/home/me/dl', '/etc/passwd', 'posix'))).toBe('INVALID_PATH');
  });
});
