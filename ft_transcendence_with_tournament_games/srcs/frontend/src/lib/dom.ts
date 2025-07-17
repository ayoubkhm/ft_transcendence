// Basic DOM helper functions
export function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

export function show(el: HTMLElement) {
  el.classList.remove('hidden');
}

export function hide(el: HTMLElement) {
  el.classList.add('hidden');
}