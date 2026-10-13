import type { CategoryId, Operation, Plan, Root, Settings } from '../shared/types';

export type View = 'map' | 'quest' | 'journal' | 'options';
export type MascotMood = 'idle' | 'happy' | 'think' | 'oops';

export interface State {
  view: View;
  roots: Root[];
  settings: Settings | null;
  plan: Plan | null;
  selected: Set<string>;
  history: Operation[];
  busy: boolean;
  mascot: MascotMood;
  speech: string;
}

const state: State = {
  view: 'map',
  roots: [],
  settings: null,
  plan: null,
  selected: new Set(),
  history: [],
  busy: false,
  mascot: 'idle',
  speech: 'Booting up...',
};

const listeners = new Set<() => void>();
export const getState = (): State => state;
export const subscribe = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export function setState(patch: Partial<State>): void {
  Object.assign(state, patch);
  listeners.forEach((l) => l());
}

export type { CategoryId };
