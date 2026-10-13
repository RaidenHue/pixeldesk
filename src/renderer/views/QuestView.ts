import { CATEGORY_FOLDER, CATEGORY_LABEL, CATEGORY_ORDER } from '../../shared/categories';
import type { CategoryId, PlanItem } from '../../shared/types';
import * as actions from '../actions';
import { h } from '../dom';
import { ICONS, ICON_PALETTE, spriteCanvas } from '../sprites';
import type { State } from '../state';
import { Panel, PixelButton, formatBytes } from '../ui';

const MAX_ROWS = 1000;
const MAX_SKIPPED = 200;

export function QuestView(s: State): HTMLElement {
  const plan = s.plan;
  if (!plan) {
    return h('div', { class: 'view' },
      Panel('QUEST BOARD',
        h('p', { class: 'empty', text: 'No active quest. Choose a realm on the Map and press SCAN.' }),
        h('div', { class: 'row-end' }, PixelButton('GO TO MAP', () => actions.go('map'), { variant: 'primary' }))));
  }

  const chosen = s.selected.size;

  const slots = CATEGORY_ORDER.filter((c) => plan.counts[c] > 0).map((c: CategoryId) => {
    const items = plan.items.filter((i) => i.category === c);
    const n = items.filter((i) => s.selected.has(i.id)).length;
    const pressed = n === items.length ? 'true' : n === 0 ? 'false' : 'mixed';
    return h('button', {
      class: 'slot',
      attrs: { type: 'button', 'aria-pressed': pressed, title: `Toggle all ${CATEGORY_LABEL[c]}` },
      on: { click: () => actions.toggleCategory(c) },
    },
      spriteCanvas(ICONS[c], ICON_PALETTE, 4),
      h('span', { class: 'slot-name', text: CATEGORY_LABEL[c] }),
      h('span', { class: 'slot-count', text: `${n}/${items.length}` }));
  });

  const row = (it: PlanItem) => {
    const box = h('input', {
      class: 'pixel-check',
      attrs: { type: 'checkbox', 'aria-label': `Include ${it.name}` },
      on: { change: () => actions.toggleItem(it.id) },
    });
    box.checked = s.selected.has(it.id);
    const dest = it.toRel.split('/').slice(1).join('/');
    return h('li', { class: 'loot-row' + (box.checked ? '' : ' off') },
      h('label', { class: 'loot-label' }, box, h('span', { class: 'loot-name', text: it.name })),
      h('span', { class: 'arrow', text: '>' }),
      h('span', { class: 'loot-dest', text: `${CATEGORY_FOLDER[it.category]}/${dest}` }),
      it.renamed
        ? h('span', { class: 'tag', text: 'RENAMED', attrs: { title: 'A file with this name already exists there, so this one gets a number.' } })
        : h('span'),
      h('span', { class: 'dim size', text: formatBytes(it.size) }));
  };

  const shown = plan.items.slice(0, MAX_ROWS);
  const skipped = plan.skipped.slice(0, MAX_SKIPPED);

  return h('div', { class: 'view' },
    Panel(`QUEST: ${plan.rootName.toUpperCase()}`,
      h('p', { class: 'summary', text: plan.items.length === 0
        ? 'Nothing to sort here. This realm is already tidy.'
        : `${plan.items.length} files ready to sort, ${chosen} chosen. This is only a preview.` }),
      plan.items.length ? h('div', { class: 'slots' }, ...slots) : null,
      plan.items.length
        ? h('div', { class: 'row-start' },
            PixelButton('SELECT ALL', actions.selectAll, { variant: 'ghost' }),
            PixelButton('SELECT NONE', actions.selectNone, { variant: 'ghost' }))
        : null),
    plan.items.length
      ? Panel('LOOT LIST',
          h('ul', { class: 'loot' }, ...shown.map(row)),
          plan.items.length > MAX_ROWS
            ? h('p', { class: 'dim', text: `Showing the first ${MAX_ROWS}. Use the slots above to include or exclude whole categories.` })
            : null)
      : null,
    plan.skipped.length
      ? h('details', { class: 'panel skipped' },
          h('summary', { text: `${plan.skipped.length} files left alone` }),
          h('ul', {}, ...skipped.map((k) => h('li', { text: `${k.name}: ${k.reason}` }))))
      : null,
    h('div', { class: 'actionbar' },
      PixelButton('CANCEL QUEST', actions.cancelQuest, { variant: 'ghost', disabled: s.busy }),
      PixelButton(`SORT ${chosen} FILE${chosen === 1 ? '' : 'S'}`, () => void actions.applySelected(),
        { variant: 'primary', disabled: s.busy || chosen === 0, title: 'You will be asked to confirm before anything moves.' })));
}
