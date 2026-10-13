import type { CategoryId } from './types';

export const CATEGORY_ORDER: readonly CategoryId[] = [
  'images', 'documents', 'audio', 'video', 'archives', 'programs', 'code', 'other',
];

export const CATEGORY_FOLDER: Record<CategoryId, string> = {
  images: 'Images', documents: 'Documents', audio: 'Audio', video: 'Videos',
  archives: 'Archives', programs: 'Programs', code: 'Code', other: 'Other',
};

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  images: 'Pictures', documents: 'Scrolls', audio: 'Music', video: 'Films',
  archives: 'Chests', programs: 'Gadgets', code: 'Spells', other: 'Curios',
};

const EXTENSIONS: Record<Exclude<CategoryId, 'other'>, string[]> = {
  images: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tif', 'tiff', 'heic', 'avif', 'raw', 'psd'],
  documents: ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'md', 'epub'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac', 'wma', 'opus', 'mid'],
  video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg'],
  archives: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso', 'cab'],
  programs: ['exe', 'msi', 'lnk', 'bat', 'cmd', 'appx', 'msix', 'jar'],
  code: ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'rb', 'php',
         'html', 'css', 'json', 'xml', 'yml', 'yaml', 'sh', 'ps1', 'sql'],
};

const LOOKUP = new Map<string, CategoryId>();
for (const [cat, exts] of Object.entries(EXTENSIONS)) {
  for (const ext of exts) LOOKUP.set(ext, cat as CategoryId);
}

export function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  if (i <= 0 || i === name.length - 1) return '';
  return name.slice(i + 1).toLowerCase();
}

export function categorize(name: string): CategoryId {
  return LOOKUP.get(extensionOf(name)) ?? 'other';
}

export function isTemporaryName(name: string): boolean {
  return name.startsWith('~$') || /\.(crdownload|part|partial|tmp|download|opdownload)$/i.test(name);
}
