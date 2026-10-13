import { h } from './dom';
import { MASCOT_FRAMES, MASCOT_PALETTE, spriteCanvas } from './sprites';
import type { MascotMood } from './state';

export class Mascot {
  readonly el: HTMLElement;
  private readonly box = h('div', { class: 'mascot-box' });
  private readonly bubble = h('p', { class: 'bubble', attrs: { role: 'status', 'aria-live': 'polite' } });
  private mood: MascotMood | null = null;

  constructor() {
    this.el = h('div', { class: 'mascot-wrap' }, this.bubble, this.box);
    this.draw('idle');
    setInterval(() => {
      if (this.mood !== 'idle') return;
      this.draw('blink');
      setTimeout(() => { if (this.mood === 'idle') this.draw('idle'); }, 160);
    }, 3400);
  }

  set(mood: MascotMood, speech: string): void {
    if (mood !== this.mood) { this.mood = mood; this.draw(mood); }
    if (this.bubble.textContent !== speech) this.bubble.textContent = speech;
  }

  private draw(frame: keyof typeof MASCOT_FRAMES): void {
    this.box.replaceChildren(spriteCanvas(MASCOT_FRAMES[frame], MASCOT_PALETTE, 6, 'mascot-sprite'));
  }
}
