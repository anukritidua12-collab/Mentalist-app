import { Task, RepeatRule, RepeatFrequency } from '../types';
import { generateId, toLocalDateString } from '../utils';
import { duplicateAttachment } from './attachmentService';

// Repeating tasks work like Apple Reminders: when you tick one off, the next one is
// created straight away for its next date, carrying the same name, notes, subtasks
// (unticked), attachments, priority, lists and reminder time.

export const REPEAT_OPTIONS: { id: RepeatFrequency; label: string }[] = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Every weekday' },
  { id: 'weekly', label: 'Every week' },
  { id: 'biweekly', label: 'Every 2 weeks' },
  { id: 'monthly', label: 'Every month' },
  { id: 'yearly', label: 'Every year' },
];

const parse = (date: string) => new Date(date + 'T00:00:00');
const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

// One step along the pattern from a date
const step = (rule: RepeatRule, date: string): string => {
  const d = parse(date);
  switch (rule.frequency) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekdays':
      do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly': {
      // Same day each month; the 31st falls on the last day of shorter months
      const day = rule.anchorDay || d.getDate();
      const target = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
      return toLocalDateString(target);
    }
    case 'yearly': {
      const day = rule.anchorDay || d.getDate();
      const target = new Date(d.getFullYear() + 1, d.getMonth(), 1);
      target.setDate(Math.min(day, daysInMonth(target.getFullYear(), target.getMonth())));
      return toLocalDateString(target);
    }
  }
  return toLocalDateString(d);
};

// The next date in the pattern after this occurrence. A task finished late (say, last
// Monday's weekly task ticked on Wednesday) skips ahead to the next date after today
// instead of landing in the past.
export const nextOccurrenceDate = (rule: RepeatRule, occurrenceDate: string, today = toLocalDateString()): string => {
  const after = occurrenceDate > today ? occurrenceDate : today;
  let next = step(rule, occurrenceDate);
  let guard = 0;
  while (next <= after && guard++ < 1000) next = step(rule, next);
  return next;
};

// "Every week on Thursday", "Every month on the 14th"
export const describeRepeat = (rule: RepeatRule, date?: string): string => {
  const base = REPEAT_OPTIONS.find(o => o.id === rule.frequency)?.label || 'Repeats';
  if (!date) return base;
  const d = parse(date);
  if (rule.frequency === 'weekly' || rule.frequency === 'biweekly') {
    return `${base} on ${d.toLocaleDateString(undefined, { weekday: 'long' })}`;
  }
  if (rule.frequency === 'monthly') {
    const n = rule.anchorDay || d.getDate();
    const suffix = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
    return `${base} on the ${n}${suffix}`;
  }
  if (rule.frequency === 'yearly') {
    return `${base} on ${d.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`;
  }
  return base;
};

// The date an occurrence belongs to: its planned date, due date, or today
export const occurrenceDate = (task: Task): string => task.scheduledDate || task.dueDate || toLocalDateString();

// The next occurrence of a repeating task, as a fresh copy. File attachments are copied
// too (so deleting one occurrence never removes another's files); `filesCopied`
// resolves once they're written, with the ids of any copies that failed.
export const createNextOccurrence = (task: Task, today = toLocalDateString()): { next: Task; filesCopied: Promise<string[]> } => {
  const copies: Promise<string | null>[] = [];
  const freshCopy = (t: Task): Task => ({
    ...t,
    id: generateId(),
    isCompleted: false,
    completedAt: undefined,
    deletedAt: undefined,
    cloudId: undefined,
    sharedWith: [],
    sharedBy: undefined,
    repeatSpawnedId: undefined,
    createdAt: Date.now(),
    attachments: t.attachments.map(att => {
      const { copy, done } = duplicateAttachment(att);
      copies.push(done.then(() => null, () => copy.id));
      return copy;
    }),
    subTasks: t.subTasks.filter(st => !st.deletedAt).map(freshCopy),
  });
  const date = nextOccurrenceDate(task.repeat!, occurrenceDate(task), today);
  const next: Task = {
    ...freshCopy(task),
    // Planned for its date, so it moves into Today when the day comes
    scheduledDate: date,
    dueDate: undefined,
    categoryIds: (task.categoryIds || ['daily']).filter(id => id !== 'shared'),
  };
  if (next.categoryIds.length === 0) next.categoryIds = ['daily'];
  return { next, filesCopied: Promise.all(copies).then(ids => ids.filter((x): x is string => !!x)) };
};
