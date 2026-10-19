import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { Task } from '../types';
import { toLocalDateString } from '../utils';
import { dialogs } from '../components/Dialogs';
import { SummarySettings, DEFAULT_SUMMARY_SETTINGS, morningMessage, eveningMessage } from './dailySummary';

export interface SoundSettings {
  enabled: boolean;
  soundId: string;
  vibration: boolean;
  volume: number;
}

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

// Sound frequencies for different notification tones. The iPhone uses matching
// WAV files (ios/App/App/reminder-<id>.wav, in the app bundle) because iOS plays the sound itself.
const SOUND_CONFIGS = {
  chime: { freq1: 800, freq2: 1000, duration: 0.5 },
  bell: { freq1: 600, freq2: 900, duration: 0.6 },
  ding: { freq1: 1200, freq2: 1400, duration: 0.3 },
  pop: { freq1: 400, freq2: 600, duration: 0.2 },
  gentle: { freq1: 500, freq2: 700, duration: 0.8 },
  alert: { freq1: 1000, freq2: 1200, duration: 0.4 },
};

const isNative = Capacitor.isNativePlatform();

// iOS only keeps the next 64 scheduled notifications per app: up to 14 go to the
// morning and evening summaries (a week ahead), the rest to task reminders
const MAX_SCHEDULED = 60;
const SUMMARY_DAYS = 7;
const TEST_NOTIFICATION_ID = 2147480000;
const SUMMARY_ID_BASE = 2147480100; // + day * 2 (+1 for the evening)

// Stable positive 31-bit id per task, as iOS notification ids must be numbers here
const notificationId = (taskId: string): number => {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash * 31 + taskId.charCodeAt(i)) | 0;
  }
  return (Math.abs(hash) % 2147000000) + 1;
};

interface UpcomingReminder {
  task: Task;
  at: Date;
}

// Every incomplete task or subtask with a reminder time still in the future.
// A reminder without a date is for today (matches the task editor, which fills in today).
const upcomingReminders = (tasks: Task[]): UpcomingReminder[] => {
  const now = Date.now();
  const result: UpcomingReminder[] = [];
  const walk = (task: Task) => {
    if (!task.isCompleted && !task.deletedAt && task.reminderTime) {
      const date = task.dueDate || task.scheduledDate || toLocalDateString();
      const at = new Date(`${date}T${task.reminderTime}:00`);
      if (!isNaN(at.getTime()) && at.getTime() > now) result.push({ task, at });
    }
    task.subTasks.forEach(walk);
  };
  tasks.forEach(walk);
  return result.sort((a, b) => a.at.getTime() - b.at.getTime());
};

class ReminderService {
  private checkInterval: number | null = null;
  private syncTimer: number | null = null;
  private listenersAdded = false;
  private onOpenToday?: () => void;
  // Reminders already shown in the browser, keyed by task + date + time, so the 30s poll
  // (and restarts on every task edit) don't fire the same reminder repeatedly.
  private firedReminders = new Set<string>();
  private summary: SummarySettings = DEFAULT_SUMMARY_SETTINGS;
  private settings: SoundSettings = {
    enabled: true,
    soundId: 'chime',
    vibration: true,
    volume: 80
  };

  updateSettings(settings: SoundSettings) {
    this.settings = settings;
  }

  updateSummarySettings(summary: SummarySettings) {
    this.summary = summary;
  }

  // Morning and evening summaries due in the next week, with their messages
  private upcomingSummaries(tasks: Task[]): { id: number; at: Date; title: string; body: string }[] {
    const result: { id: number; at: Date; title: string; body: string }[] = [];
    const now = Date.now();
    const today = toLocalDateString();
    for (let day = 0; day < SUMMARY_DAYS; day++) {
      const d = new Date(); d.setDate(d.getDate() + day);
      const date = toLocalDateString(d);
      if (this.summary.morningEnabled) {
        const at = new Date(`${date}T${this.summary.morningTime}:00`);
        if (at.getTime() > now) result.push({ id: SUMMARY_ID_BASE + day * 2, at, ...morningMessage(tasks, date, today) });
      }
      if (this.summary.eveningEnabled) {
        const at = new Date(`${date}T${this.summary.eveningTime}:00`);
        const message = eveningMessage(tasks, date, today);
        if (message && at.getTime() > now) result.push({ id: SUMMARY_ID_BASE + day * 2 + 1, at, ...message });
      }
    }
    return result;
  }

  // iPhone: open the task when the user taps a reminder, and vibrate when one
  // arrives while the app is open (iOS handles vibration when it's closed).
  async init(onOpenTask: (taskId: string) => void, onOpenToday?: () => void) {
    this.onOpenToday = onOpenToday;
    if (!isNative || this.listenersAdded) return;
    this.listenersAdded = true;
    await LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const taskId = action.notification.extra?.taskId;
      if (taskId) onOpenTask(taskId);
      else if (action.notification.extra?.page === 'today') onOpenToday?.();
    });
    await LocalNotifications.addListener('localNotificationReceived', () => {
      this.triggerVibration();
    });
  }

  async getPermissionState(): Promise<PermissionState> {
    if (isNative) {
      const { display } = await LocalNotifications.checkPermissions();
      return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
    }
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission === 'default' ? 'prompt' : Notification.permission;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (isNative) {
        const { display } = await LocalNotifications.requestPermissions();
        return display === 'granted';
      }
      if ('Notification' in window) {
        return (await Notification.requestPermission()) === 'granted';
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
    return false;
  }

  private createSound(soundId: string) {
    const config = SOUND_CONFIGS[soundId as keyof typeof SOUND_CONFIGS] || SOUND_CONFIGS.chime;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator1.frequency.value = config.freq1;
      oscillator2.frequency.value = config.freq2;

      const volume = (this.settings.volume / 100) * 0.3;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);

      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + config.duration);
      oscillator2.stop(audioContext.currentTime + config.duration);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }

  playReminderSound() {
    if (!this.settings.enabled) return;
    this.createSound(this.settings.soundId);
  }

  playPreviewSound(soundId: string) {
    this.createSound(soundId);
  }

  triggerVibration() {
    if (!this.settings.vibration) return;
    if (isNative) {
      Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
    } else if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  private nativeSound(): string | undefined {
    return this.settings.enabled ? `reminder-${this.settings.soundId}.wav` : undefined;
  }

  async testNotification() {
    if (isNative) {
      if (!(await this.requestPermissions())) {
        dialogs.alert({ title: 'Notifications are off', message: 'To get reminders, turn on notifications in the iPhone Settings app → MentaList → Notifications.' });
        return;
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: TEST_NOTIFICATION_ID,
          title: 'Test notification',
          body: 'Your reminders are set up. Lock your phone to see how they arrive.',
          schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
          sound: this.nativeSound(),
        }]
      });
      return;
    }

    if (this.settings.enabled) {
      this.createSound(this.settings.soundId);
    }
    this.triggerVibration();

    if (await this.getPermissionState() === 'granted') {
      const notification = new Notification('Test notification', {
        body: 'Your notification settings are working!',
        tag: 'test',
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      setTimeout(() => notification.close(), 5000);
    } else {
      dialogs.alert({ title: 'Test notification', message: 'Your reminder sound is working. To see reminders as notifications, allow notifications for this site in your browser.' });
    }
  }

  private showWebNotification(task: Task) {
    this.playReminderSound();
    this.triggerVibration();

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(`Reminder: ${task.title}`, {
        body: task.notes || 'Time to work on this task!',
        tag: task.id,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } else {
      // Fallback: Show in-app alert
      dialogs.alert({ title: `Reminder: ${task.title || 'Untitled task'}`, message: task.notes || 'Time to work on this task.' });
    }
  }

  // Call whenever tasks or sound settings change.
  // iPhone: hands the upcoming reminders to iOS, which delivers them even when the
  // app is closed. Browser: checks every 30 seconds while the page is open.
  syncReminders(tasks: Task[]) {
    if (isNative) {
      // Debounced: tasks change on every keystroke while editing
      if (this.syncTimer !== null) clearTimeout(this.syncTimer);
      this.syncTimer = window.setTimeout(() => {
        this.syncTimer = null;
        this.scheduleNative(tasks).catch(err => console.error('Failed to schedule reminders', err));
      }, 800);
      return;
    }
    this.startWebMonitoring(tasks);
  }

  private async scheduleNative(tasks: Task[]) {
    if (await this.getPermissionState() !== 'granted') return;

    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => n.id !== TEST_NOTIFICATION_ID);
    if (ours.length > 0) {
      await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
    }

    const summaries = this.upcomingSummaries(tasks);
    const upcoming = upcomingReminders(tasks).slice(0, MAX_SCHEDULED - summaries.length);
    if (upcoming.length === 0 && summaries.length === 0) return;

    await LocalNotifications.schedule({
      notifications: [
        ...upcoming.map(({ task, at }) => ({
          id: notificationId(task.id),
          title: task.title || 'Task reminder',
          body: task.notes || 'Time to work on this task!',
          schedule: { at, allowWhileIdle: true },
          sound: this.nativeSound(),
          extra: { taskId: task.id },
        })),
        ...summaries.map(({ id, at, title, body }) => ({
          id,
          title,
          body,
          schedule: { at, allowWhileIdle: true },
          sound: this.nativeSound(),
          extra: { page: 'today' },
        })),
      ]
    });
  }

  private startWebMonitoring(tasks: Task[]) {
    this.stopMonitoring();

    // Check every 30 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkWebReminders(tasks);
    }, 30000);

    // Initial check
    this.checkWebReminders(tasks);
  }

  stopMonitoring() {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkWebReminders(tasks: Task[]) {
    const now = new Date();
    const currentDate = toLocalDateString(now);
    const currentTime = now.toTimeString().slice(0, 5);

    const checkTask = (task: Task) => {
      if (!task.isCompleted && !task.deletedAt && task.reminderTime) {
        const effectiveDate = task.dueDate || task.scheduledDate || currentDate;
        if (effectiveDate === currentDate && task.reminderTime === currentTime) {
          const key = `${task.id}|${currentDate}|${currentTime}`;
          if (!this.firedReminders.has(key)) {
            this.firedReminders.add(key);
            this.showWebNotification(task);
          }
        }
      }
      task.subTasks.forEach(checkTask);
    };

    tasks.forEach(checkTask);

    // Daily summaries, once each per day while the app is open in the browser
    const summaryDue = (enabled: boolean, time: string, kind: string) => {
      if (!enabled || time !== currentTime) return false;
      const key = `summary|${kind}|${currentDate}`;
      if (this.firedReminders.has(key)) return false;
      this.firedReminders.add(key);
      return true;
    };
    if (summaryDue(this.summary.morningEnabled, this.summary.morningTime, 'morning')) {
      this.showWebSummary(morningMessage(tasks, currentDate, currentDate));
    }
    if (summaryDue(this.summary.eveningEnabled, this.summary.eveningTime, 'evening')) {
      const message = eveningMessage(tasks, currentDate, currentDate);
      if (message) this.showWebSummary(message);
    }
  }

  private showWebSummary({ title, body }: { title: string; body: string }) {
    this.playReminderSound();
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, { body, tag: `summary-${title}` });
      notification.onclick = () => { window.focus(); this.onOpenToday?.(); notification.close(); };
      setTimeout(() => notification.close(), 15000);
    } else {
      dialogs.alert({ title, message: body });
    }
  }
}

export const reminderService = new ReminderService();
