export type Child = Node | string | null | undefined | false;
type Handlers = { [K in keyof HTMLElementEventMap]?: (e: HTMLElementEventMap[K]) => void };
export interface Props {
  class?: string;
  text?: string;
  attrs?: Record<string, string>;
  on?: Handlers;
}


export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  if (props.on) for (const [k, fn] of Object.entries(props.on)) el.addEventListener(k, fn as EventListener);
  for (const c of children) if (c) el.append(c);
  return el;
}
