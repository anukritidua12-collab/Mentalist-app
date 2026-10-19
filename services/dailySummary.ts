import { Task } from '../types';
import { countsTowardsToday, toLocalDateString } from '../utils';

// Two optional notifications a day (Settings → Reminders):
//   morning: what's on Today ("Today: 4 tasks. Pay rent, Send the invoice and 2 more.")
//   evening: how the day went ("Today: 3 of 5 done. Still open: …")
// They follow the app's notification permission and are off until the user turns them on.

export interface SummarySettings {
  morningEnabled: boolean;
  morningTime: string; // HH:MM
  eveningEnabled: boolean;
  eveningTime: string;
}

export const DEFAULT_SUMMARY_SETTINGS: SummarySettings = {
  morningEnabled: false,
  morningTime: '09:00',
  eveningEnabled: false,
  eveningTime: '21:00',
};

export interface SummaryMessage { title: string; body: string }

const PRIORITY: Record<string, number> = { high: 0, medium: 1, low: 2 };
const byPriority = (a: Task, b: Task) => (PRIORITY[a.priority] ?? 3) - (PRIORITY[b.priority] ?? 3);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Pay rent", "Pay rent and Call the bank", "Pay rent, Call the bank and 2 more"
const nameList = (tasks: Task[], max = 3): string => {
  const names = tasks.map(t => t.title.trim() || 'Untitled task');
  if (names.length <= max) {
    return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }
  return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
};

const inToday = (t: Task) => t.categoryIds?.includes('daily') || !t.categoryIds;

// Open tasks that will be on Today on a given date. For today that's the Today list
// itself; for a later date it's open tasks due by then (unfinished ones carry forward).
const openTasksFor = (tasks: Task[], date: string, today: string): Task[] =>
  (date === today
    ? tasks.filter(t => countsTowardsToday(t, 'daily', today) && !t.isCompleted)
    : tasks.filter(t => !t.deletedAt && !t.isPrivate && !t.isCompleted && inToday(t) && !(t.scheduledDate && t.scheduledDate > date))
  ).sort(byPriority);

export const morningMessage = (tasks: Task[], date: string, today = toLocalDateString()): SummaryMessage => {
  const open = openTasksFor(tasks, date, today);
  if (open.length === 0) {
    return { title: 'Today is clear', body: 'Nothing planned yet. Add a task whenever you’re ready.' };
  }
  const high = open.filter(t => t.priority === 'high').length;
  return {
    title: `Today: ${plural(open.length, 'task')}`,
    body: `${nameList(open)}.${high ? ` ${high === 1 ? '1 is' : `${high} are`} high priority.` : ''}`,
  };
};

// Null when there's nothing to report (no tasks today), so no notification is sent
export const eveningMessage = (tasks: Task[], date: string, today = toLocalDateString()): SummaryMessage | null => {
  if (date !== today) {
    // A later day's evening can't be known yet; this is refreshed whenever the app is opened
    return { title: 'How did today go?', body: 'Take a moment to tick off what you finished and plan tomorrow.' };
  }
  const todays = tasks.filter(t => countsTowardsToday(t, 'daily', today));
  if (todays.length === 0) return null;
  const done = todays.filter(t => t.isCompleted).length;
  const open = todays.filter(t => !t.isCompleted).sort(byPriority);
  if (open.length === 0) {
    return { title: 'All done today', body: `You finished ${done === 1 ? 'your task' : `all ${done} tasks`}. Enjoy your evening.` };
  }
  return {
    title: `Today: ${done} of ${todays.length} done`,
    body: done === 0
      ? `Still open: ${nameList(open)}. Tomorrow is a fresh start.`
      : `Nice work. Still open: ${nameList(open)}.`,
  };
};
