import type { CategoryId, SettingsPatch } from '../shared/types';
import { api, unwrap } from './api';
import { getState, setState, type MascotMood, type View } from './state';

const say = (mascot: MascotMood, speech: string) => setState({ mascot, speech });
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

async function guarded(mood: MascotMood, speech: string, fn: () => Promise<void>): Promise<void> {
  if (getState().busy) return;
  setState({ busy: true, mascot: mood, speech });
  try {
    await fn();
  } catch (e) {
    say('oops', errText(e));
  } finally {
    setState({ busy: false });
  }
}

export const go = (view: View) => setState({ view });

export async function boot(): Promise<void> {
  try {
    const [settings, roots, history] = await Promise.all([
      unwrap(api.getSettings()), unwrap(api.listRoots()), unwrap(api.listHistory()),
    ]);
    setState({
      settings, roots, history,
      mascot: 'happy',
      speech: roots.length ? 'Welcome back, adventurer!' : 'Pick a folder and we will tidy it up!',
    });
  } catch (e) {
    say('oops', errText(e));
  }
}

export const chooseFolder = () =>
  guarded('think', 'Opening the map...', async () => {
    const root = await unwrap(api.pickRoot());
    const roots = await unwrap(api.listRoots());
    setState({ roots, mascot: root ? 'happy' : 'idle', speech: root ? 'New realm unlocked!' : 'No folder chosen.' });
  });

export const forget = (rootId: string) =>
  guarded('think', 'Rubbing it off the map...', async () => {
    const roots = await unwrap(api.removeRoot({ rootId }));
    const { plan } = getState();
    setState({
      roots,
      plan: plan?.rootId === rootId ? null : plan,
      mascot: 'idle',
      speech: 'Forgotten. Your files were not touched.',
    });
  });

export const openRoot = (rootId: string) =>
  guarded('idle', 'Opening the folder...', async () => {
    await unwrap(api.openRoot({ rootId }));
    say('idle', 'There it is!');
  });

export const scan = (rootId: string) =>
  guarded('think', 'Sniffing around for loot...', async () => {
    const plan = await unwrap(api.createPlan({ rootId }));
    setState({
      plan,
      selected: new Set(plan.items.filter((i) => i.selected).map((i) => i.id)),
      view: 'quest',
      mascot: 'happy',
      speech: plan.items.length ? `Found ${plan.items.length} files to sort!` : 'Already tidy. Nothing to move!',
    });
  });

export function toggleItem(id: string): void {
  const next = new Set(getState().selected);
  if (!next.delete(id)) next.add(id);
  setState({ selected: next });
}

export function toggleCategory(cat: CategoryId): void {
  const { plan, selected } = getState();
  if (!plan) return;
  const ids = plan.items.filter((i) => i.category === cat).map((i) => i.id);
  const all = ids.every((id) => selected.has(id));
  const next = new Set(selected);
  for (const id of ids) { if (all) next.delete(id); else next.add(id); }
  setState({ selected: next });
}

export const selectAll = () => {
  const { plan } = getState();
  if (plan) setState({ selected: new Set(plan.items.map((i) => i.id)) });
};
export const selectNone = () => setState({ selected: new Set() });
export const cancelQuest = () =>
  setState({ plan: null, selected: new Set(), view: 'map', mascot: 'idle', speech: 'Quest abandoned. No changes.' });

export const applySelected = () => {
  const { plan, selected } = getState();
  if (!plan || selected.size === 0) return Promise.resolve();
  return guarded('think', 'Waiting for your OK...', async () => {
    const res = await unwrap(api.applyPlan({ planId: plan.planId, itemIds: [...selected] }));
    if (res.cancelled) { say('idle', 'No changes made. Phew!'); return; }
    const history = await unwrap(api.listHistory());
    const first = res.failed[0];
    setState({
      plan: null,
      selected: new Set(),
      history,
      view: 'journal',
      mascot: first ? 'oops' : 'happy',
      speech: first
        ? `Sorted ${res.moved}. ${res.failed.length} skipped: ${first.message}`
        : `Sorted ${res.moved} files!`,
    });
  });
};

export const undo = (operationId: string) =>
  guarded('think', 'Waiting for your OK...', async () => {
    const res = await unwrap(api.undoOperation({ operationId }));
    if (res.cancelled) { say('idle', 'Left everything as it is.'); return; }
    const history = await unwrap(api.listHistory());
    const first = res.failed[0];
    setState({
      history,
      mascot: first ? 'oops' : 'happy',
      speech: first ? `Restored ${res.restored}. ${res.failed.length} stayed: ${first.message}` : `Restored ${res.restored} files!`,
    });
  });

export const setSetting = (key: keyof SettingsPatch, value: boolean) =>
  guarded('think', 'Saving...', async () => {
    const patch: SettingsPatch = {};
    patch[key] = value;
    const settings = await unwrap(api.updateSettings(patch));
    setState({ settings, mascot: 'happy', speech: 'Saved!' });
  });
