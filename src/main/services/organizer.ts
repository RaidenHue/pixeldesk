import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AppError } from '../../core/errors';
import { buildPlan, type PlannedMove } from '../../core/planner';
import { validateRootPath } from '../../core/pathValidation';
import { DEFAULT_SETTINGS } from '../../core/settings';
import { CATEGORY_ORDER } from '../../shared/categories';
import type {
  ApplyResult, CategoryId, Operation, Plan, Root, Settings, SettingsPatch, UndoResult,
} from '../../shared/types';
import { applyMoves, undoMoves } from './fileOps';
import type { JsonStore } from './jsonStore';
import { scanRoot } from './scanner';

export interface ConfirmRequest { title: string; message: string; detail: string; confirmLabel: string }

export interface OrganizerDeps {
  settingsStore: JsonStore<Settings>;
  historyStore: JsonStore<Operation[]>;
  caseInsensitive: boolean;
  pickFolder(): Promise<string | null>;
  confirm(req: ConfirmRequest): Promise<boolean>;
  openFolder(absPath: string): Promise<void>;
}

interface StoredPlan { root: Root; moves: PlannedMove[] }

const rootIdFor = (p: string) =>
  createHash('sha1').update(process.platform === 'win32' ? p.toLowerCase() : p).digest('hex').slice(0, 12);

export class Organizer {
  private settings: Settings = { ...DEFAULT_SETTINGS, roots: [] };
  private history: Operation[] = [];
  private readonly roots = new Map<string, Root>();
  private readonly plans = new Map<string, StoredPlan>();

  constructor(private readonly deps: OrganizerDeps) {}

  async init(): Promise<void> {
    this.settings = await this.deps.settingsStore.load();
    this.history = await this.deps.historyStore.load();
    // Only folders the user picked in a previous session are re-registered.
    const valid: string[] = [];
    for (const p of this.settings.roots) {
      try { valid.push((await this.registerRoot(p)).path); } catch { /* missing or no longer allowed */ }
    }
    this.settings.roots = valid;
  }

  getSettings(): Settings { return { ...this.settings, roots: [...this.settings.roots] }; }

  async updateSettings(patch: SettingsPatch): Promise<Settings> {
    this.settings = { ...this.settings, ...patch };
    await this.deps.settingsStore.save(this.settings);
    return this.getSettings();
  }

  listRoots(): Root[] {
    return [...this.roots.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async pickRoot(): Promise<Root | null> {
    const chosen = await this.deps.pickFolder(); 
    if (!chosen) return null;
    const root = await this.registerRoot(chosen);
    if (!this.settings.roots.includes(root.path)) {
      this.settings.roots.push(root.path);
      await this.deps.settingsStore.save(this.settings);
    }
    return root;
  }

  async removeRoot(rootId: string): Promise<Root[]> {
    const root = this.requireRoot(rootId);
    this.roots.delete(rootId);
    this.settings.roots = this.settings.roots.filter((p) => p !== root.path);
    for (const [id, plan] of this.plans) if (plan.root.id === rootId) this.plans.delete(id);
    await this.deps.settingsStore.save(this.settings);
    return this.listRoots();
  }

  async openRoot(rootId: string): Promise<void> {
    await this.deps.openFolder(this.requireRoot(rootId).path);
  }

  async createPlan(rootId: string): Promise<Plan> {
    const root = this.requireRoot(rootId);
    await this.assertRootUsable(root.path);
    const scan = await scanRoot(root.path);
    const { moves, skipped } = buildPlan(scan.entries, scan.existing, {
      skipHidden: this.settings.skipHidden,
      uncheckPrograms: this.settings.uncheckPrograms,
      caseInsensitive: this.deps.caseInsensitive,
      blocked: scan.blocked,
    });

    const planId = randomUUID();
    this.plans.set(planId, { root, moves });
    while (this.plans.size > 5) this.plans.delete(this.plans.keys().next().value as string);

    const counts = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, 0])) as Record<CategoryId, number>;
    for (const m of moves) counts[m.category]++;

    return {
      planId,
      rootId,
      rootName: root.name,
      items: moves.map((m, i) => ({
        id: String(i), name: m.name, category: m.category, size: m.size,
        fromRel: m.fromRel, toRel: m.toRel, renamed: m.renamed, selected: m.selected,
      })),
      skipped: [...scan.skipped, ...skipped],
      counts,
    };
  }

  async applyPlan(planId: string, itemIds: string[]): Promise<ApplyResult> {
    const plan = this.plans.get(planId);
    if (!plan) throw new AppError('PLAN_EXPIRED', 'This quest expired. Scan the folder again.');

    const chosen: PlannedMove[] = [];
    for (const id of new Set(itemIds)) {
      const m = plan.moves[Number(id)];
      if (!m) throw new AppError('INVALID_REQUEST', 'Unknown item in request.');
      chosen.push(m);
    }
    if (chosen.length === 0) throw new AppError('NOTHING_SELECTED', 'Pick at least one file.');
    await this.assertRootUsable(plan.root.path);

    const ok = await this.deps.confirm({
      title: 'Sort these files?',
      message: `Move ${chosen.length} file${chosen.length === 1 ? '' : 's'} into category folders inside "${plan.root.name}"?`,
      detail: 'Nothing is overwritten. Files with clashing names get a number added. You can undo this from the Journal.',
      confirmLabel: 'Move files',
    });
    if (!ok) return { operationId: null, moved: 0, failed: [], cancelled: true };

    const { done, failed } = await applyMoves(plan.root.path, chosen);
    this.plans.delete(planId);

    let operationId: string | null = null;
    if (done.length > 0) {
      const op: Operation = {
        id: randomUUID(), timestamp: new Date().toISOString(),
        rootPath: plan.root.path, rootName: plan.root.name, moves: done, undone: false,
      };
      this.history = [op, ...this.history].slice(0, 200);
      operationId = op.id;
      await this.deps.historyStore.save(this.history).catch((e) => console.error('history save failed', e));
    }
    return { operationId, moved: done.length, failed, cancelled: false };
  }

  listHistory(): Operation[] { return this.history.map((o) => ({ ...o, moves: [...o.moves] })); }

  async undo(operationId: string): Promise<UndoResult> {
    const op = this.history.find((o) => o.id === operationId);
    if (!op || op.undone || op.moves.length === 0) {
      throw new AppError('NOT_UNDOABLE', 'There is nothing left to undo for this entry.');
    }
    const rootPath = validateRootPath(op.rootPath);
    await this.assertRootUsable(rootPath);

    const ok = await this.deps.confirm({
      title: 'Undo this sort?',
      message: `Move ${op.moves.length} file${op.moves.length === 1 ? '' : 's'} back to where they were in "${op.rootName}"?`,
      detail: 'A file is only moved back if its original spot is still free. Nothing is overwritten.',
      confirmLabel: 'Undo',
    });
    if (!ok) return { restored: 0, failed: [], cancelled: true };

    const { restored, failed } = await undoMoves(rootPath, op.moves);
    const done = new Set(restored.map((m) => m.to));
    op.moves = op.moves.filter((m) => !done.has(m.to));
    op.undone = op.moves.length === 0;
    await this.deps.historyStore.save(this.history).catch((e) => console.error('history save failed', e));
    return { restored: restored.length, failed, cancelled: false };
  }

  private requireRoot(rootId: string): Root {
    const r = this.roots.get(rootId);
    if (!r) throw new AppError('UNKNOWN_ROOT', 'That folder is not in your list.');
    return r;
  }

  private async assertRootUsable(p: string): Promise<void> {
    validateRootPath(p);
    const st = await fs.stat(p);
    if (!st.isDirectory()) throw new AppError('NOT_DIR', 'That path is not a folder.');
  }

  private async registerRoot(p: string): Promise<Root> {
    const resolved = validateRootPath(p);
    await this.assertRootUsable(resolved);
    const root: Root = { id: rootIdFor(resolved), path: resolved, name: path.basename(resolved) };
    this.roots.set(root.id, root);
    return root;
  }
}
