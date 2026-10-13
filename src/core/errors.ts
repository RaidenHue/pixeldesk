export class AppError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export function toAppError(e: unknown): { code: string; message: string } {
  if (e instanceof AppError) return { code: e.code, message: e.message };
  switch ((e as NodeJS.ErrnoException | undefined)?.code) {
    case 'EACCES':
    case 'EPERM':
      return { code: 'PERMISSION', message: 'Permission denied. Check the file or folder permissions.' };
    case 'ENOENT':
      return { code: 'MISSING', message: 'That file or folder no longer exists.' };
    case 'EBUSY':
      return { code: 'BUSY', message: 'The file is in use by another program.' };
    case 'ENOSPC':
      return { code: 'NO_SPACE', message: 'Not enough disk space.' };
    default:
      return { code: 'UNKNOWN', message: 'Something unexpected happened.' };
  }
}
