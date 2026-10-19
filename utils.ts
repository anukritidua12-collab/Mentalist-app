import { Task } from './types';

export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Local-time YYYY-MM-DD. Don't use toISOString() for this: it returns the UTC date,
// which is a different day for part of every day outside UTC (e.g. 00:00–05:30 in India).
export const toLocalDateString = (date: Date = new Date()): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Local-time date offset by a number of days (handles DST correctly).
export const localDateOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
};

// Whether this device can draw colour emoji (checked once). If not, confetti uses
// coloured shapes, so celebrations never show as blank or "?" boxes.
let emojiSupport: boolean | null = null;
export const canDrawEmoji = (): boolean => {
  if (emojiSupport !== null) return emojiSupport;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'top';
    ctx.font = '28px sans-serif';
    ctx.fillText('🎉', 0, 0);
    const data = ctx.getImageData(0, 0, 32, 32).data;
    // A colour emoji has saturated pixels; a missing-glyph box is grey/black
    let colourful = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
      if (a > 0 && Math.max(r, g, b) - Math.min(r, g, b) > 60) colourful++;
    }
    emojiSupport = colourful > 20;
  } catch {
    emojiSupport = false;
  }
  return emojiSupport;
};


// True on phones and tablets (touch is the main input), false on desktop browsers.
// Used to word hints as "Tap"/"long-press" vs "Click"/"double-click".
export const isTouchDevice = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

export const tapWord = (capital = true): string =>
  isTouchDevice() ? (capital ? 'Tap' : 'tap') : (capital ? 'Click' : 'click');

// The one rule for "today's tasks" in a list, shared by the sidebar counts, Today's
// progress and the daily summaries so they always agree: not deleted or hidden, not
// planned for a later date, and either still to do or completed today.
export const countsTowardsToday = (t: Task, listId: string, today: string): boolean =>
  !t.deletedAt &&
  !t.isPrivate &&
  !(t.scheduledDate && t.scheduledDate > today) &&
  (t.categoryIds?.includes(listId) || (!t.categoryIds && listId === 'daily')) &&
  (!t.isCompleted || !t.completedAt || toLocalDateString(new Date(t.completedAt)) === today);
