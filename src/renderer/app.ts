import { go, boot } from './actions';
import { h } from './dom';
import { Mascot } from './mascot';
import { ICONS, ICON_PALETTE, spriteCanvas, type IconName } from './sprites';
import { getState, subscribe, type State, type View } from './state';
import { JournalView } from './views/JournalView';
import { MapView } from './views/MapView';
import { OptionsView } from './views/OptionsView';
import { QuestView } from './views/QuestView';

const NAV: { view: View; label: string; icon: IconName }[] = [
  { view: 'map', label: 'MAP', icon: 'map' },
  { view: 'quest', label: 'QUEST', icon: 'quest' },
  { view: 'journal', label: 'JOURNAL', icon: 'journal' },
  { view: 'options', label: 'OPTIONS', icon: 'options' },
];

const navButtons = new Map<View, HTMLButtonElement>();
for (const n of NAV) {
  navButtons.set(n.view, h('button', {
    class: 'nav-btn',
    attrs: { type: 'button', title: n.label },
    on: { click: () => go(n.view) },
  }, spriteCanvas(ICONS[n.icon], ICON_PALETTE, 3), h('span', { class: 'nav-label', text: n.label })));
}

const mascot = new Mascot();
const main = h('main', { class: 'main' });

const sidebar = h('aside', { class: 'sidebar' },
  h('div', { class: 'brand' }, 'PIXEL', h('br'), 'DESK', h('small', { text: 'file organizer' })),
  h('nav', { class: 'nav' }, ...navButtons.values()),
  mascot.el);

document.getElementById('app')!.append(sidebar, main);

function viewFor(s: State): HTMLElement {
  switch (s.view) {
    case 'map': return MapView(s);
    case 'quest': return QuestView(s);
    case 'journal': return JournalView(s);
    case 'options': return OptionsView(s);
  }
}

let lastView: View | null = null;
function render(): void {
  const s = getState();
  document.body.classList.toggle('reduce-motion', !!s.settings?.reduceMotion);
  mascot.set(s.mascot, s.speech);
  for (const [view, btn] of navButtons) {
    const active = view === s.view;
    btn.classList.toggle('active', active);
    if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
  }
  const content = viewFor(s);
  const changed = s.view !== lastView;
  if (changed) content.classList.add('enter');
  const top = changed ? 0 : main.scrollTop;
  main.replaceChildren(content);
  main.scrollTop = top;
  lastView = s.view;
}

subscribe(render);
render();
void boot();
