import React, { useRef, useState } from 'react';

// An icon button that explains itself: the label appears on hover (desktop) or on a
// long-press (touch). A long-press only shows the label; it doesn't trigger the action.

interface IconTipProps {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  children: React.ReactNode;
}

export const IconTip: React.FC<IconTipProps> = ({ label, onClick, className = '', children }) => {
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const longPressed = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const clear = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };

  const show = (delay: number) => {
    clear();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    timer.current = window.setTimeout(() => setVisible(true), delay);
  };

  const hide = (delay = 0) => {
    clear();
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setVisible(false), delay);
  };

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        className={`no-callout ${className}`}
        onMouseEnter={() => show(350)}
        onMouseLeave={() => hide()}
        // Touch: hold to see the label. Touch events (not pointer events) because touch
        // browsers cancel pointer events during a long press, which let the tap through.
        onTouchStart={(e) => {
          longPressed.current = false;
          const touch = e.touches[0];
          start.current = { x: touch.clientX, y: touch.clientY };
          clear();
          timer.current = window.setTimeout(() => {
            longPressed.current = true;
            setVisible(true);
          }, 450);
        }}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (start.current && Math.hypot(touch.clientX - start.current.x, touch.clientY - start.current.y) > 10) clear(); // scrolling
        }}
        onTouchEnd={(e) => {
          clear();
          if (longPressed.current) {
            e.preventDefault(); // no tap after a long press
            hide(1400);
          }
        }}
        onTouchCancel={() => { clear(); if (longPressed.current) hide(1400); }}
        onContextMenu={(e) => {
          // Some browsers report a long press as a context menu; show the label instead
          e.preventDefault();
          longPressed.current = true;
          setVisible(true);
          hide(1400);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (longPressed.current) { longPressed.current = false; return; }
          hide();
          onClick(e);
        }}
      >
        {children}
      </button>
      {visible && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-in fade-in zoom-in-95 duration-150"
        >
          {label}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
        </span>
      )}
    </span>
  );
};
