const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  );
}

/** Pure wrap for Tab / Shift+Tab at the edges of a focus list. */
export function nextFocusIndex(currentIndex: number, length: number, shiftKey: boolean): number {
  if (length === 0) return -1;
  if (shiftKey && currentIndex <= 0) return length - 1;
  if (!shiftKey && currentIndex >= length - 1) return 0;
  return currentIndex + (shiftKey ? -1 : 1);
}

export function cycleFocus(root: HTMLElement, event: KeyboardEvent): void {
  const items = getFocusableElements(root);
  if (items.length === 0) {
    event.preventDefault();
    return;
  }
  const currentIndex = items.findIndex((item) => item === document.activeElement);
  const shouldWrap =
    (event.shiftKey && currentIndex <= 0) || (!event.shiftKey && currentIndex >= items.length - 1);
  if (!shouldWrap) return;
  event.preventDefault();
  items[nextFocusIndex(currentIndex, items.length, event.shiftKey)]?.focus();
}
