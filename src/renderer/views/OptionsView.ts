import * as actions from '../actions';
import { h } from '../dom';
import type { State } from '../state';
import { Panel, Toggle } from '../ui';

export function OptionsView(s: State): HTMLElement {
  const st = s.settings;
  if (!st) return h('div', { class: 'view' }, Panel('OPTIONS', h('p', { class: 'empty', text: 'Loading...' })));
  return h('div', { class: 'view' },
    Panel('OPTIONS',
      Toggle('Skip hidden files', 'Dotfiles and desktop.ini stay where they are.', st.skipHidden,
        (v) => void actions.setSetting('skipHidden', v)),
      Toggle('Leave programs unchecked', 'exe, msi and shortcuts start unticked, since moving them can break things.', st.uncheckPrograms,
        (v) => void actions.setSetting('uncheckPrograms', v)),
      Toggle('Reduce motion', 'Turns off bobbing and slide-in animations.', st.reduceMotion,
        (v) => void actions.setSetting('reduceMotion', v)),
      h('p', { class: 'dim', text: 'Changes to scan options apply the next time you scan.' })));
}
