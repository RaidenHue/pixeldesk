import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { AppError, toAppError } from '../core/errors';
import { none, parseApply, parseOperationRef, parseRootRef, parseSettingsPatch } from '../core/validators';
import type { Channel, IpcContract } from '../shared/ipc';
import type { Result } from '../shared/types';
import type { Organizer } from './services/organizer';

export function registerIpc(organizer: Organizer, trustedUrl: string): void {
  const trusted = trustedUrl.toLowerCase();

  const handle = <C extends Channel>(
    channel: C,
    parse: (raw: unknown) => IpcContract[C]['req'],
    run: (req: IpcContract[C]['req']) => Promise<IpcContract[C]['res']> | IpcContract[C]['res'],
  ) => {
    ipcMain.handle(channel, async (event: IpcMainInvokeEvent, raw: unknown): Promise<Result<IpcContract[C]['res']>> => {
      try {
        const frame = event.senderFrame;
        if (!frame || frame !== event.sender.mainFrame || !frame.url.toLowerCase().startsWith(trusted)) {
          throw new AppError('UNTRUSTED_SENDER', 'Request rejected.');
        }
        return { ok: true, data: await run(parse(raw)) };
      } catch (e) {
        return { ok: false, error: toAppError(e) };
      }
    });
  };

  handle('settings:get', none, () => organizer.getSettings());
  handle('settings:update', parseSettingsPatch, (patch) => organizer.updateSettings(patch));
  handle('roots:list', none, () => organizer.listRoots());
  handle('roots:pick', none, () => organizer.pickRoot());
  handle('roots:remove', parseRootRef, ({ rootId }) => organizer.removeRoot(rootId));
  handle('roots:open', parseRootRef, async ({ rootId }) => { await organizer.openRoot(rootId); return null; });
  handle('plan:create', parseRootRef, ({ rootId }) => organizer.createPlan(rootId));
  handle('plan:apply', parseApply, ({ planId, itemIds }) => organizer.applyPlan(planId, itemIds));
  handle('history:list', none, () => organizer.listHistory());
  handle('history:undo', parseOperationRef, ({ operationId }) => organizer.undo(operationId));
}
