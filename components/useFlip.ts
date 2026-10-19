import { RefObject, useLayoutEffect, useRef } from 'react';

// Smoothly animates list rows to their new places when the order changes (a task
// moving to the done section, a task removed, one added). Rows are the container's
// direct children marked with data-flip-id. Positions are measured within the
// container, so scrolling doesn't count as movement.
const EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

export const useFlip = (ref: RefObject<HTMLElement | null>, duration = 620) => {
  const positions = useRef(new Map<string, number>());
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const container = ref.current;
    if (!container) { positions.current = new Map(); return; }
    const rows = Array.from(container.querySelectorAll<HTMLElement>(':scope > [data-flip-id]'));
    const next = new Map<string, number>();
    rows.forEach(row => {
      const id = row.dataset.flipId!;
      const top = row.offsetTop;
      next.set(id, top);
      const before = positions.current.get(id);
      if (before !== undefined && Math.abs(before - top) > 0.5) {
        // Start where it was, then glide to where it is now. A row moving down passes
        // over the ones moving up, so it's lifted above them for the trip.
        row.style.transition = 'none';
        row.style.transform = `translateY(${before - top}px)`;
        row.style.position = 'relative';
        row.style.zIndex = before < top ? '2' : '1';
        row.getBoundingClientRect();
        row.style.transition = `transform ${duration}ms ${EASE}`;
        row.style.transform = '';
        const settle = (e: TransitionEvent) => {
          if (e.target !== row || e.propertyName !== 'transform') return;
          row.style.zIndex = '';
          row.style.position = '';
          row.removeEventListener('transitionend', settle);
        };
        row.addEventListener('transitionend', settle);
      } else if (before === undefined && mounted.current && positions.current.size > 0) {
        // A new row in a list already on screen eases in
        row.style.transition = 'none';
        row.style.opacity = '0';
        row.style.transform = 'translateY(6px)';
        row.getBoundingClientRect();
        row.style.transition = `opacity 280ms ease-out, transform 360ms ${EASE}`;
        row.style.opacity = '';
        row.style.transform = '';
      }
    });
    positions.current = next;
    mounted.current = true;
  });
};
