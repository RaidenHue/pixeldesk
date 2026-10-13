import * as actions from '../actions';
import { h } from '../dom';
import type { State } from '../state';
import { Panel, PixelButton } from '../ui';

export function JournalView(s: State): HTMLElement {
  const body = s.history.length === 0
    ? h('p', { class: 'empty', text: 'Your journal is empty. Sorted files will be recorded here.' })
    : h('ul', { class: 'entries' }, ...s.history.map((op) => {
        const remaining = op.moves.length;
        const label = op.undone ? 'UNDONE' : 'UNDO';
        return h('li', { class: 'entry' + (op.undone ? ' off' : '') },
          h('div', { class: 'entry-info' },
            h('strong', { text: op.rootName }),
            h('span', { class: 'dim', text: new Date(op.timestamp).toLocaleString() })),
          h('span', { class: 'tag', text: op.undone ? 'RESTORED' : `${remaining} MOVED` }),
          PixelButton(label, () => void actions.undo(op.id), { disabled: op.undone || s.busy, variant: 'ghost' }));
      }));
  return h('div', { class: 'view' }, Panel('JOURNAL', body));
}
