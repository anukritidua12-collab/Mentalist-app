import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Task } from '../types';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled';

const isCancel = (err: unknown) => {
  const e = err as { name?: string; message?: string };
  return e?.name === 'AbortError' || /cancel/i.test(e?.message || '');
};

// iPhone: native share sheet (Messages, WhatsApp, Mail…). Browser: the system share
// sheet where supported (Safari, Chrome on Windows/Android), otherwise copy to clipboard.
// (The iOS app's web view has no navigator.share, so the native Share plugin is used there.)
export const shareText = async (title: string, text: string): Promise<ShareOutcome> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await Share.share({ title, text, dialogTitle: title });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
  } catch (err) {
    if (isCancel(err)) return 'cancelled';
    // Fall through to copying
  }
  await copyText(text);
  return 'copied';
};

export const copyText = async (text: string): Promise<void> => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Older browsers / insecure contexts
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
};

export const taskShareText = (task: Task): string => {
  let text = `📋 ${task.title}\n`;
  text += `⚡ Priority: ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}\n`;
  const date = task.dueDate || task.scheduledDate;
  if (date) text += `📅 ${new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}\n`;
  if (task.reminderTime) text += `⏰ ${task.reminderTime}\n`;
  if (task.notes) text += `📝 ${task.notes}\n`;
  const subtasks = task.subTasks.filter(s => !s.deletedAt);
  if (subtasks.length > 0) {
    text += `\nSubtasks:\n`;
    subtasks.forEach(st => {
      text += `${st.isCompleted ? '✅' : '⬜'} ${st.title}\n`;
    });
  }
  text += `\n— Shared from MentaList`;
  return text;
};
