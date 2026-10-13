import * as actions from '../actions';
import { h } from '../dom';
import { ICONS, ICON_PALETTE, spriteCanvas } from '../sprites';
import type { State } from '../state';
import { Panel, PixelButton } from '../ui';

export function MapView(s: State): HTMLElement {
  const list = s.roots.length === 0
    ? h('p', { class: 'empty', text: 'No realms yet. Add a folder and Boxy will scout it for you.' })
    : h('ul', { class: 'realms' }, ...s.roots.map((r) =>
        h('li', { class: 'realm' },
          spriteCanvas(ICONS.map, ICON_PALETTE, 4),
          h('div', { class: 'realm-info' },
            h('strong', { text: r.name }),
            h('span', { class: 'dim', text: r.path })),
          h('div', { class: 'realm-actions' },
            PixelButton('SCAN', () => void actions.scan(r.id), { variant: 'primary', disabled: s.busy, title: 'Preview only. Nothing moves yet.' }),
            PixelButton('OPEN', () => void actions.openRoot(r.id), { disabled: s.busy }),
            PixelButton('FORGET', () => void actions.forget(r.id), { variant: 'ghost', disabled: s.busy, title: 'Remove from this list. Your files are untouched.' })))));

  return h('div', { class: 'view' },
    Panel('YOUR REALMS', list,
      h('div', { class: 'row-end' },
        PixelButton('+ ADD FOLDER', () => void actions.chooseFolder(), { variant: 'primary', disabled: s.busy }))),
    Panel('THE SAFETY CODE',
      h('ul', { class: 'code-list' },
        h('li', { text: 'Only folders you choose are ever scanned.' }),
        h('li', { text: 'Scanning is look-only. Nothing moves until you confirm.' }),
        h('li', { text: 'Nothing is deleted or overwritten. Clashing names get a number.' }),
        h('li', { text: 'Every sort is saved in the Journal so you can undo it.' }))));
}
