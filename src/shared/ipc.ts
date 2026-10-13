import type {
  ApplyResult, Operation, Plan, Result, Root, Settings, SettingsPatch, UndoResult,
} from './types';

export interface IpcContract {
  'settings:get': { req: void; res: Settings };
  'settings:update': { req: SettingsPatch; res: Settings };
  'roots:list': { req: void; res: Root[] };
  'roots:pick': { req: void; res: Root | null };
  'roots:remove': { req: { rootId: string }; res: Root[] };
  'roots:open': { req: { rootId: string }; res: null };
  'plan:create': { req: { rootId: string }; res: Plan };
  'plan:apply': { req: { planId: string; itemIds: string[] }; res: ApplyResult };
  'history:list': { req: void; res: Operation[] };
  'history:undo': { req: { operationId: string }; res: UndoResult };
}

export type Channel = keyof IpcContract;
export type Call<C extends Channel> =
  (req: IpcContract[C]['req']) => Promise<Result<IpcContract[C]['res']>>;

export interface PixelDeskApi {
  getSettings: Call<'settings:get'>;
  updateSettings: Call<'settings:update'>;
  listRoots: Call<'roots:list'>;
  pickRoot: Call<'roots:pick'>;
  removeRoot: Call<'roots:remove'>;
  openRoot: Call<'roots:open'>;
  createPlan: Call<'plan:create'>;
  applyPlan: Call<'plan:apply'>;
  listHistory: Call<'history:list'>;
  undoOperation: Call<'history:undo'>;
}
