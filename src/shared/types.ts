export type CategoryId =
  | 'images' | 'documents' | 'audio' | 'video' | 'archives' | 'programs' | 'code' | 'other';

export interface Root { id: string; path: string; name: string }

export interface Settings {
  roots: string[];
  skipHidden: boolean;
  uncheckPrograms: boolean;
  reduceMotion: boolean;
}
export type SettingsPatch = Partial<Omit<Settings, 'roots'>>;

export interface PlanItem {
  id: string;
  name: string;
  category: CategoryId;
  size: number;
  fromRel: string;
  toRel: string;
  renamed: boolean;
  selected: boolean;
}
export interface SkippedItem { name: string; reason: string }
export interface Plan {
  planId: string;
  rootId: string;
  rootName: string;
  items: PlanItem[];
  skipped: SkippedItem[];
  counts: Record<CategoryId, number>;
}

export interface Failure { name: string; message: string }
export interface ApplyResult {
  operationId: string | null;
  moved: number;
  failed: Failure[];
  cancelled: boolean;
}
export interface UndoResult { restored: number; failed: Failure[]; cancelled: boolean }

export interface HistoryMove { from: string; to: string } // relative to the operation's root
export interface Operation {
  id: string;
  timestamp: string;
  rootPath: string;
  rootName: string;
  moves: HistoryMove[];
  undone: boolean;
}

export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };
