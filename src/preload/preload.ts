import { contextBridge, ipcRenderer } from 'electron';
import type { Call, Channel, PixelDeskApi } from '../shared/ipc';

const call = <C extends Channel>(channel: C): Call<C> =>
  ((req: unknown) => ipcRenderer.invoke(channel, req)) as Call<C>;

const api: PixelDeskApi = {
  getSettings: call('settings:get'),
  updateSettings: call('settings:update'),
  listRoots: call('roots:list'),
  pickRoot: call('roots:pick'),
  removeRoot: call('roots:remove'),
  openRoot: call('roots:open'),
  createPlan: call('plan:create'),
  applyPlan: call('plan:apply'),
  listHistory: call('history:list'),
  undoOperation: call('history:undo'),
};

contextBridge.exposeInMainWorld('pixeldesk', Object.freeze(api));
