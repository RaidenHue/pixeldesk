import { h, type Child } from './dom';

export function Panel(title: string, ...children: Child[]): HTMLElement {
  return h('section', { class: 'panel' }, h('h2', { class: 'panel-title', text: title }), ...children);
}

export function PixelButton(
  label: string,
  onClick: () => void,
  opts: { variant?: 'primary' | 'ghost' | 'danger'; disabled?: boolean; title?: string } = {},
): HTMLButtonElement {
  const btn = h('button', {
    class: `btn ${opts.variant ?? ''}`.trim(),
    text: label,
    attrs: { type: 'button', ...(opts.title ? { title: opts.title } : {}) },
    on: { click: onClick },
  });
  btn.disabled = !!opts.disabled;
  return btn;
}

export function Toggle(label: string, hint: string, checked: boolean, onChange: (v: boolean) => void): HTMLElement {
  const input = h('input', { class: 'pixel-check', attrs: { type: 'checkbox' } });
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'toggle' }, input,
    h('span', { class: 'toggle-text' }, h('strong', { text: label }), h('span', { class: 'dim', text: hint })));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}
