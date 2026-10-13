export type Palette = Record<string, string>;

export const ICON_PALETTE: Palette = {
  k: '#120c26', y: '#ffd23f', o: '#f08a24', w: '#f4efe6', r: '#e8505b', g: '#52c26a',
  c: '#5bc0eb', p: '#9b6bff', n: '#8a5a2b', e: '#b8b8c8', b: '#3d7bd9',
};

export type IconName =
  | 'map' | 'quest' | 'journal' | 'options'
  | 'images' | 'documents' | 'audio' | 'video' | 'archives' | 'programs' | 'code' | 'other';

export const ICONS: Record<IconName, readonly string[]> = {
  map: ['........', 'kkk.....', 'kyykkkkk', 'kyyyyyyk', 'kyooooyk', 'kyooooyk', 'kyyyyyyk', 'kkkkkkkk'],
  quest: ['......kk', '.....kwk', '....kwk.', '...kwk..', '.kkwk...', 'kyykk...', 'kyyk....', '.kk.....'],
  journal: ['.kkkkkk.', 'kppppppk', 'kpwwwwpk', 'kppppppk', 'kpwwwwpk', 'kppppppk', 'kkkkkkkk', '........'],
  options: ['...ee...', '.e.ee.e.', '..eeee..', 'eeekkeee', 'eeekkeee', '..eeee..', '.e.ee.e.', '...ee...'],
  images: ['kkkkkkkk', 'kccccwck', 'kcccccck', 'kcccgcck', 'kccgggck', 'kcgggggk', 'kggggggk', 'kkkkkkkk'],
  documents: ['kkkkkk..', 'kwwwwkk.', 'kwkkkwk.', 'kwwwwwk.', 'kwkkkwk.', 'kwwwwwk.', 'kwkkwwk.', 'kkkkkkk.'],
  audio: ['...kkkk.', '...kwwwk', '...kwkkk', '...kwk..', '...kwk..', '.kkkwk..', 'kwwwwk..', '.kkkk...'],
  video: ['kkkkkkkk', 'kwkwkwkw', 'kkkkkkkk', 'kbbkbbbk', 'kbbkkbbk', 'kbbkbbbk', 'kbbbbbbk', 'kkkkkkkk'],
  archives: ['..kkkk..', '.kyyyyk.', 'kyyyyyyk', 'kkkkkkkk', 'knnyynnk', 'knnyynnk', 'knnnnnnk', 'kkkkkkkk'],
  programs: ['kkkkkkkk', 'kbbbbrbk', 'kkkkkkkk', 'kwwwwwwk', 'kwkkkkwk', 'kwwwwwwk', 'kwkkwwwk', 'kkkkkkkk'],
  code: ['........', '..g..g..', '.g....g.', 'g..ww..g', 'g..ww..g', '.g....g.', '..g..g..', '........'],
  other: ['........', '..kkkk..', '.kppppk.', 'kppwpppk', '.kppppk.', '..kppk..', '...kk...', '........'],
};

export const MASCOT_PALETTE: Palette = {
  k: '#120c26', b: '#c98a4b', d: '#8a5a2b', l: '#e8c48a', w: '#f4efe6', p: '#ff7aa8',
};

const BASE = [
  '..kkkkkkkk..',
  '.kllllllllk.',
  'kbbbbllbbbbk',
  'kbwwbllbwwbk',
  'kbwkbbbbwkbk',
  'kppbbbbbbppk',
  'kbbbbkkbbbbk',
  'kbbbbbbbbbbk',
  'kddddddddddk',
  '.kkkkkkkkkk.',
  '..kk....kk..',
  '............',
];
const frame = (over: Record<number, string>) => BASE.map((r, i) => over[i] ?? r);

export const MASCOT_FRAMES = {
  idle: BASE,
  blink: frame({ 3: 'kbbbbllbbbbk', 4: 'kbkkbbbbkkbk' }),
  happy: frame({ 3: 'kbkkbllbkkbk', 4: 'kbbbbbbbbbbk', 6: 'kbbbkkkkbbbk' }),
  think: frame({ 3: 'kbwkbllbwkbk', 4: 'kbwwbbbbwwbk', 6: 'kbbbbkkkkbbk' }),
  oops: frame({ 3: 'kbbkbllbkbbk', 4: 'kbbbbbbbbbbk', 6: 'kbbbbkkkkbbk', 7: 'kbbbkbbbbkbk' }),
} as const;

export function spriteCanvas(
  rows: readonly string[],
  palette: Palette,
  scale: number,
  className = 'sprite',
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = className;
  canvas.width = rows[0]!.length * scale;
  canvas.height = rows.length * scale;
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext('2d')!;
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const color = palette[ch];
      if (!color) return;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return canvas;
}
