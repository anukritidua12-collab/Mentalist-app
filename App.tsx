
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Task, ThemeType, Notification, SharedUser } from './types';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { DEFAULT_CATEGORIES, NEUTRAL_DARK_THEME, Icons, MOTIVATIONAL_QUOTES, THEMES, VICTORY_QUOTES } from './constants';
import { Button } from './components/Button';
import { TaskItem } from './components/TaskItem';
import { TaskDetails } from './components/TaskDetails';
import TaskViewer from './components/TaskViewer';
import { CollaborateModal } from './components/CollaborateModal';
import { QuickList } from './components/QuickList';
import { IconTip } from './components/IconTip';
import { AddToListsModal } from './components/AddToListsModal';
import { ThemeBackdrop, ThemeSwitchOverlay } from './components/ThemeScene';
import { useSettledDone, doneOrder } from './components/useSettledDone';
import { useFlip } from './components/useFlip';
import { QuickAddRow } from './components/QuickAddRow';
import { currentSuggestions } from './services/suggestionService';
import { createNextOccurrence } from './services/repeatService';
import { SummarySettings, DEFAULT_SUMMARY_SETTINGS } from './services/dailySummary';
import { TimeField } from './components/DatePicker';
import { App as CapApp } from '@capacitor/app';
import { GuideContent, StoryContent, APP_VERSION } from './components/GuidePages';
import { FEATURES } from './config';
import { dialogs, DialogHost } from './components/Dialogs';
import { ListIcon, ThemeIcon, LIST_ICON_KEYS, normalizeListIcon } from './components/AppIcons';
import {
  ArrowsClockwise as RefreshCw, ChartBar as BarChart3, ClipboardText as ClipboardList, User, Users as UsersIcon, Bell as BellIcon,
  CalendarPlus, Confetti as PartyPopper, Sun, Moon, Monitor, Trophy,
  SortDescending as ArrowDownWideNarrow, Lifebuoy, CaretDown, CaretLeft, CaretRight, CaretUp, DotsSixVertical, List, LockSimple, MagnifyingGlass, X,
} from '@phosphor-icons/react';
import './themes.css';
import { generateId, toLocalDateString, localDateOffset, isTouchDevice, countsTowardsToday } from './utils';
import { reminderService, PermissionState, SoundSettings } from './services/reminderService';
import { storage, migrateFromLocalStorage } from './services/storageService';
import { initAttachmentStorage, migrateInlineAttachments, deleteAttachmentFile } from './services/attachmentService';
import { shareText, taskShareText } from './services/shareService';
import {
  CloudUser, SharedTaskDoc, InviteDoc, isCloudConfigured, onCloudUserChanged, watchSharedTasks, watchInvites,
  createSharedTask, pushSharedTask, deleteSharedTask, sendInvite, respondToInvite, toCloudContent,
  fromCloudSubTasks, initialsAvatar,
} from './services/cloudService';

// JSON with sorted keys, so the same content always compares equal
const stableStringify = (value: unknown): string => JSON.stringify(value, (_key, v) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.keys(v).sort().reduce((acc, k) => { acc[k] = v[k]; return acc; }, {} as Record<string, unknown>)
    : v
);

const COMPLETED_DISAPPEAR_OPTIONS = [
  { id: 'immediately', label: 'Right away' },
  { id: '1hour', label: 'After 1 hour' },
  { id: '1day', label: 'After 1 day' },
  { id: '1week', label: 'After 1 week' },
  { id: 'never', label: 'Never' },
];


// Helper functions for rotation
const getRotatedQuoteIndex = (): number => {
  const lastUpdate = localStorage.getItem('mentalist_quote_last_update');
  const savedIndex = localStorage.getItem('mentalist_quote_index');
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  if (!lastUpdate || !savedIndex || (now - parseInt(lastUpdate)) >= oneHour) {
    // Time for a new quote
    const newIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    localStorage.setItem('mentalist_quote_index', newIndex.toString());
    localStorage.setItem('mentalist_quote_last_update', now.toString());
    return newIndex;
  }
  return parseInt(savedIndex);
};


interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
  kind?: 'quick'; // A quick list: a Notes-style checklist instead of task cards
}

// The two kinds of list offered when making a new one
const NEW_LIST_CHOICES = [
  { id: 'list', label: 'List', hint: 'Tasks with dates, reminders, priority and subtasks.' },
  { id: 'quick', label: 'Quick list', hint: 'A simple checklist, like Notes. Type a line, press Enter, keep going.' },
];

const CATEGORY_ICONS = LIST_ICON_KEYS;

// Lists that cannot be deleted
const PROTECTED_LISTS = ['daily', 'shared', 'quick'];
// Shared with Me only appears when collaboration is switched on (config.ts)
const isListShown = (list: { id: string }) => FEATURES.collaboration || list.id !== 'shared';

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('daily');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskId, setNewTaskId] = useState<string | null>(null); // Track if the selected task is newly created
  const [isEditingTask, setIsEditingTask] = useState<boolean>(false); // Track if we're editing an existing task
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<ThemeType>('clarity');
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [victoryIdx, setVictoryIdx] = useState(0);
  const [lastCompletedCount, setLastCompletedCount] = useState(0);
  const [confettiOnComplete, setConfettiOnComplete] = useState(true); // Confetti when all of today's tasks are done
  const [doneToBottom, setDoneToBottom] = useState(true); // Finished tasks move below the open ones
  const [summarySettings, setSummarySettings] = useState<SummarySettings>(DEFAULT_SUMMARY_SETTINGS); // Morning and evening summaries
  const [sortByPriorityEnabled, setSortByPriorityEnabled] = useState(true); // High-priority tasks & subtasks first
  const [searchIncludeArchived, setSearchIncludeArchived] = useState(false); // Search History & Hidden tasks too
  const [planAheadTaskId, setPlanAheadTaskId] = useState<string | null>(null); // New task opened from Plan Ahead
  const [panelClosing, setPanelClosing] = useState(false); // Task panel slide-out in progress
  const panelCloseActionRef = useRef<(() => void) | null>(null); // Runs once the panel has slid away
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [collabTaskId, setCollabTaskId] = useState<string | null>(null); // Task the invite sheet is open for
  const [showAccount, setShowAccount] = useState(false);
  const [sharedDocs, setSharedDocs] = useState<Record<string, SharedTaskDoc>>({});
  const [incomingInvites, setIncomingInvites] = useState<Record<string, InviteDoc>>({});
  const [notificationPermission, setNotificationPermission] = useState<PermissionState>('prompt');
  const [themeReveal, setThemeReveal] = useState<ThemeType | null>(null);
  const [editSnapshot, setEditSnapshot] = useState<Task | null>(null); // Restored when editing is cancelled
  const [toast, setToast] = useState<string | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false); // Toast fading out
  const [listPickerFor, setListPickerFor] = useState<{ cloudId: string; title: string } | null>(null); // Accepted invite
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(true);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [suggestionsEnabled, setSuggestionsEnabled] = useState(true); // Suggested tasks under Today
  const [suggestionTick, setSuggestionTick] = useState(0); // Re-checks whether a new set of suggestions is due
  const [showSettings, setShowSettings] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'lists' | 'appearance' | 'guide' | 'story' | 'privacy'>('main');
  const [guideOpenedStory, setGuideOpenedStory] = useState(false); // Back from Why MentaList returns to the Guide
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'light' | 'dark' | 'system'>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [completedDisappearTime, setCompletedDisappearTime] = useState<string>('1day'); // Options: immediately, 1hour, 1day, 1week, never
  const [progressViewType, setProgressViewType] = useState<'weekly' | 'monthly'>('weekly');
  const [celebratedCategories, setCelebratedCategories] = useState<Set<string>>(new Set()); // Track which categories have been celebrated
  const [hasLoaded, setHasLoaded] = useState(false); // Don't save or carry forward until saved data is loaded
  const [soundSettings, setSoundSettings] = useState<SoundSettings>({ enabled: true, vibration: true });

  // Load persistence
  useEffect(() => {
    const load = async () => {
      try {
        await migrateFromLocalStorage();
        await initAttachmentStorage();

        const savedTasks = await storage.getJSON<Task[] | null>('mentalist_tasks', null);
        if (Array.isArray(savedTasks)) {
          // Earlier versions kept attachments inside the task data; move them into files
          const migratedTasks = await migrateInlineAttachments(savedTasks);
          setTasks(migratedTasks);
          setLastCompletedCount(migratedTasks.filter(t => t.isCompleted).length);
        }
        const savedTheme = await storage.get('mentalist_theme');
        if (savedTheme && THEMES[savedTheme]) setTheme(savedTheme as ThemeType);
        const savedCategories = await storage.getJSON<Category[] | null>('mentalist_categories', null);
        if (Array.isArray(savedCategories)) {
          // Earlier versions used emoji for list icons; switch to the matching drawn icon
          // Default lists dropped the word "List" (Daily List -> Today); rename only if the user never renamed them
          const OLD_DEFAULT_NAMES: Record<string, string> = { daily: 'Daily List', work: 'Work List', personal: 'Personal List', other: 'Other List' };
          const migrated = savedCategories.map(c => ({
            ...c,
            icon: normalizeListIcon(c.icon),
            name: OLD_DEFAULT_NAMES[c.id] === c.name ? DEFAULT_CATEGORIES.find(d => d.id === c.id)!.name : c.name,
          }));
          // The Quick List was added later; give existing users one, below Personal
          if (!migrated.some(c => c.id === 'quick')) {
            const quick = DEFAULT_CATEGORIES.find(c => c.id === 'quick')!;
            const after = migrated.findIndex(c => c.id === 'personal');
            migrated.splice(after >= 0 ? after + 1 : migrated.length, 0, quick);
          }
          setCategories(migrated);
        }
        // Earlier versions also saved a sound choice and volume; only on/off is kept now
        const savedSoundSettings = await storage.getJSON<Partial<SoundSettings> | null>('mentalist_sound_settings', null);
        if (savedSoundSettings) {
          const loaded: SoundSettings = { enabled: savedSoundSettings.enabled ?? true, vibration: savedSoundSettings.vibration ?? true };
          setSoundSettings(loaded);
          reminderService.updateSettings(loaded);
        }
        const savedCarryForward = await storage.getJSON<boolean | null>('mentalist_carry_forward', null);
        if (savedCarryForward !== null) setCarryForwardEnabled(savedCarryForward);
        const savedRotation = await storage.getJSON<boolean | null>('mentalist_rotation_enabled', null);
        if (savedRotation !== null) setRotationEnabled(savedRotation);
        const savedDisplayMode = await storage.get('mentalist_display_mode');
        if (savedDisplayMode) setDisplayMode(savedDisplayMode as 'light' | 'dark' | 'system');
        const savedConfetti = await storage.getJSON<boolean | null>('mentalist_confetti_on_complete', null);
        if (savedConfetti !== null) setConfettiOnComplete(savedConfetti);
        const savedSortPriority = await storage.getJSON<boolean | null>('mentalist_sort_priority', null);
        if (savedSortPriority !== null) setSortByPriorityEnabled(savedSortPriority);
        const savedSuggestions = await storage.getJSON<boolean | null>('mentalist_suggestions_enabled', null);
        if (savedSuggestions !== null) setSuggestionsEnabled(savedSuggestions);
        const savedSummary = await storage.getJSON<SummarySettings | null>('mentalist_summary_settings', null);
        if (savedSummary) setSummarySettings({ ...DEFAULT_SUMMARY_SETTINGS, ...savedSummary });
        const savedDoneToBottom = await storage.getJSON<boolean | null>('mentalist_done_to_bottom', null);
        if (savedDoneToBottom !== null) setDoneToBottom(savedDoneToBottom);
        const savedSearchArchived = await storage.getJSON<boolean | null>('mentalist_search_archived', null);
        if (savedSearchArchived !== null) setSearchIncludeArchived(savedSearchArchived);
        const savedDisappearTime = await storage.get('mentalist_disappear_time');
        if (savedDisappearTime) setCompletedDisappearTime(savedDisappearTime);
        const savedCelebratedCategories = await storage.getJSON<string[]>('mentalist_celebrated_categories', []);
        setCelebratedCategories(new Set(savedCelebratedCategories));
        setNotifications(await storage.getJSON<Notification[]>('mentalist_notifications', []));
        setNotificationPermission(await reminderService.getPermissionState());
      } catch (e) {
        console.error("Failed to load persistence", e);
      }
      setHasLoaded(true);
    };
    load();

    // Initialize quote and suggestions indices with rotation logic
    setQuoteIdx(getRotatedQuoteIndex());
    setVictoryIdx(Math.floor(Math.random() * VICTORY_QUOTES.length));

    // Tapping a reminder notification opens its task
    reminderService.init(taskId => openTask(taskId), () => { setSidebarOpen(false); setActiveCategory('daily'); });
  }, []);

  // Detect system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Compute effective dark mode. Midnight and Twilight are dark themes and always use it.
  // Dark mode (chosen, or from the system) always uses the neutral dark look; themes show in light mode.
  // Midnight and Twilight are dark-looking themes, so they also use dark styling in light mode.
  const displayDark = displayMode === 'dark' || (displayMode === 'system' && systemPrefersDark);
  const isDarkMode = displayDark || !!THEMES[theme]?.isDark;
  // Light themes give way to the neutral dark look in dark mode; dark themes (Midnight,
  // Twilight, Ink) are already dark, so they stay themselves
  const neutralDark = displayDark && !THEMES[theme]?.isDark;
  const visualTheme = neutralDark ? 'neutral-dark' : theme; // What's on screen right now

  // A new quote every hour (checked every minute to catch the hour boundary)
  useEffect(() => {
    if (!rotationEnabled) return;
    const quoteInterval = setInterval(() => setQuoteIdx(getRotatedQuoteIndex()), 60 * 1000);
    return () => clearInterval(quoteInterval);
  }, [rotationEnabled]);

  // Suggestions: a new set every 20 minutes while the app is in use. A tab left open
  // and untouched doesn't count, so the 5-day no-repeat pool isn't used up by idle time.
  useEffect(() => {
    if (!suggestionsEnabled) return;
    let lastActive = Date.now();
    const markActive = () => { lastActive = Date.now(); };
    const tick = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastActive < 5 * 60 * 1000) setSuggestionTick(n => n + 1);
    };
    const onVisible = () => { if (document.visibilityState === 'visible') { markActive(); tick(); } };
    const interval = setInterval(tick, 60 * 1000);
    window.addEventListener('pointerdown', markActive);
    window.addEventListener('keydown', markActive);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [suggestionsEnabled]);

  // Apply theme to root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', visualTheme);
  }, [visualTheme]);

  // The areas behind the iPhone status bar and home indicator show the page background,
  // so match it to the app; and use light status bar text on dark backgrounds
  useEffect(() => {
    const background = neutralDark ? '#0f172a' : (THEMES[theme]?.paper || '#F3F5F9');
    document.body.style.backgroundColor = background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', background);
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light }).catch(() => {});
    }
  }, [isDarkMode]);

  // Save persistence
  useEffect(() => {
    if (!hasLoaded) return;
    Promise.all([
      storage.setJSON('mentalist_tasks', tasks),
      storage.set('mentalist_theme', theme),
      storage.setJSON('mentalist_categories', categories),
      storage.setJSON('mentalist_sound_settings', soundSettings),
      storage.setJSON('mentalist_carry_forward', carryForwardEnabled),
      storage.setJSON('mentalist_rotation_enabled', rotationEnabled),
      storage.set('mentalist_display_mode', displayMode),
      storage.set('mentalist_disappear_time', completedDisappearTime),
      storage.setJSON('mentalist_celebrated_categories', [...celebratedCategories]),
      storage.setJSON('mentalist_notifications', notifications),
      storage.setJSON('mentalist_search_archived', searchIncludeArchived),
      storage.setJSON('mentalist_sort_priority', sortByPriorityEnabled),
      storage.setJSON('mentalist_done_to_bottom', doneToBottom),
      storage.setJSON('mentalist_summary_settings', summarySettings),
      storage.setJSON('mentalist_suggestions_enabled', suggestionsEnabled),
      storage.setJSON('mentalist_confetti_on_complete', confettiOnComplete),
    ]).catch(e => {
      // In the browser this is usually the ~5MB storage quota, e.g. from large attachments
      console.error('Failed to save', e);
      setToast('Your latest changes could not be saved. Try removing some large attachments.');
    });
  }, [hasLoaded, tasks, theme, categories, soundSettings, carryForwardEnabled, rotationEnabled, displayMode, completedDisappearTime, celebratedCategories, notifications, searchIncludeArchived, sortByPriorityEnabled, confettiOnComplete, doneToBottom, suggestionsEnabled, summarySettings]);

  // Keep scheduled reminders in step with tasks and sound settings
  useEffect(() => {
    if (!hasLoaded) return;
    reminderService.updateSettings(soundSettings);
    reminderService.updateSummarySettings(summarySettings);
    reminderService.syncReminders(tasks);
    return () => {
      reminderService.stopMonitoring();
    };
  }, [hasLoaded, tasks, soundSettings, notificationPermission, summarySettings]);

  // Coming back to the app: re-read the notification permission (it may have been
  // changed in iPhone or browser settings meanwhile) and, on iPhone, refresh the
  // scheduled summaries, since this morning's or evening's message depends on today's tasks
  useEffect(() => {
    const refreshPermission = () => { reminderService.getPermissionState().then(setNotificationPermission); };
    const onVisible = () => { if (document.visibilityState === 'visible') refreshPermission(); };
    document.addEventListener('visibilitychange', onVisible);
    const listener = Capacitor.isNativePlatform()
      ? CapApp.addListener('resume', () => { refreshPermission(); reminderService.syncReminders(tasksRef.current); })
      : null;
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      listener?.then(l => l.remove());
    };
  }, []);

  const requestNotificationPermission = async () => {
    await reminderService.requestPermissions();
    setNotificationPermission(await reminderService.getPermissionState());
  };

  // Hide the toast message after a few seconds
  useEffect(() => {
    if (!toast) return;
    setToastLeaving(false);
    const leave = setTimeout(() => setToastLeaving(true), 3200);
    const timer = setTimeout(() => { setToast(null); setToastLeaving(false); }, 3500);
    return () => { clearTimeout(leave); clearTimeout(timer); };
  }, [toast]);

  // Carry forward overdue incomplete tasks to today
  useEffect(() => {
    if (!hasLoaded || !carryForwardEnabled) return;
    
    const today = toLocalDateString();
    const lastCarryForwardDate = localStorage.getItem('mentalist_last_carry_forward');
    
    // Only run once per day
    if (lastCarryForwardDate === today) return;
    localStorage.setItem('mentalist_last_carry_forward', today);
    
    setTasks(prev => {
      let changed = false;
      const updated = prev.map(task => {
        if (!task.isCompleted && !task.deletedAt && task.dueDate && task.dueDate < today) {
          changed = true;
          return { ...task, dueDate: today };
        }
        return task;
      });
      return changed ? updated : prev;
    });
  }, [hasLoaded, carryForwardEnabled]);


  // ---------- Collaboration (Firebase) ----------
  useEffect(() => onCloudUserChanged(setCloudUser), []);

  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  // Last content seen from / sent to the cloud for each shared task, to tell
  // our own echoes apart from collaborators' edits
  const lastSyncedRef = useRef(new Map<string, string>());
  const pushTimersRef = useRef(new Map<string, number>());
  // Shared tasks being created: cloud id -> local task id (covers the moment before cloudId is saved locally)
  const pendingLinksRef = useRef(new Map<string, string>());
  // Lists chosen for an accepted invite whose shared task hasn't arrived yet: cloud id -> list ids
  const pendingListChoicesRef = useRef(new Map<string, string[]>());

  // Apply shared tasks from Firestore to the local list
  const applySharedDocs = useCallback((user: CloudUser, docs: SharedTaskDoc[], fromCache: boolean) => {
    setSharedDocs(Object.fromEntries(docs.map(d => [d.id, d])));
    const present = new Set(docs.map(d => d.id));
    let next = tasksRef.current;
    let changed = false;

    for (const d of docs) {
      const content = stableStringify(d.task);
      const sharedWith = Object.entries(d.memberInfo || {})
        .filter(([uid]) => uid !== user.uid && d.memberUids.includes(uid))
        .map(([uid, info]) => ({ id: uid, name: info.name, email: info.email, avatar: initialsAvatar(info.name) }));
      const owner = d.memberInfo?.[d.ownerUid];
      const sharedBy = d.ownerUid !== user.uid && owner
        ? { id: d.ownerUid, name: owner.name, email: owner.email, avatar: initialsAvatar(owner.name) }
        : undefined;
      const linkedLocalId = pendingLinksRef.current.get(d.id);
      const idx = next.findIndex(t => t.cloudId === d.id || (linkedLocalId && t.id === linkedLocalId));
      const remote = d.task;
      const fields = {
        title: remote.title || '',
        notes: remote.notes || '',
        priority: remote.priority || 'medium',
        isCompleted: !!remote.isCompleted,
        completedAt: remote.completedAt,
        dueDate: remote.dueDate,
        reminderTime: remote.reminderTime,
        scheduledDate: remote.scheduledDate,
      };

      if (idx === -1) {
        // New to this device: an invite we accepted, or our own task on a new device
        next = [{
          id: d.id,
          ...fields,
          createdAt: remote.createdAt || Date.now(),
          subTasks: fromCloudSubTasks(remote.subTasks, []),
          attachments: [],
          sharedWith,
          sharedBy,
          isPrivate: false,
          categoryIds: d.ownerUid === user.uid ? ['daily'] : ['shared', ...(pendingListChoicesRef.current.get(d.id) || [])],
          cloudId: d.id,
        } as Task, ...next];
        lastSyncedRef.current.set(d.id, content);
        pendingListChoicesRef.current.delete(d.id);
        changed = true;
        continue;
      }

      const local = next[idx];
      const remoteChanged = lastSyncedRef.current.get(d.id) !== content;
      const peopleChanged = JSON.stringify(local.sharedWith) !== JSON.stringify(sharedWith) || local.sharedBy?.id !== sharedBy?.id;
      if (!remoteChanged && !peopleChanged && local.cloudId === d.id) continue;

      const updated: Task = { ...local, cloudId: d.id, sharedWith, sharedBy };
      if (remoteChanged) {
        Object.assign(updated, fields, { subTasks: fromCloudSubTasks(remote.subTasks, local.subTasks) });
        lastSyncedRef.current.set(d.id, content);
      }
      next = next.map((t, i) => i === idx ? updated : t);
      changed = true;
    }

    // Shared tasks that disappeared were deleted by a collaborator (or we were removed)
    if (!fromCache) {
      next = next.map(t => {
        if (t.cloudId && !present.has(t.cloudId) && !pendingLinksRef.current.has(t.cloudId)) {
          changed = true;
          lastSyncedRef.current.delete(t.cloudId);
          return { ...t, cloudId: undefined, sharedWith: [], deletedAt: t.deletedAt || Date.now() };
        }
        return t;
      });
    }

    if (changed) setTasks(next);
  }, []);

  // Listen for shared tasks and invites while signed in with a verified email
  useEffect(() => {
    if (!cloudUser?.emailVerified) return;
    const user = cloudUser;
    const onError = (err: Error) => console.error('Collaboration sync error', err);

    const stopTasks = watchSharedTasks(user, (docs, fromCache) => applySharedDocs(user, docs, fromCache), onError);
    const stopInvites = watchInvites(
      user,
      incoming => {
        setIncomingInvites(Object.fromEntries(incoming.map(i => [i.id, i])));
        setNotifications(prev => {
          let next = prev;
          for (const invite of incoming) {
            const existing = next.find(n => n.requestId === invite.id);
            if (!existing && invite.status === 'pending') {
              next = [{
                id: generateId(),
                type: 'invite_received',
                title: 'Collaboration invite',
                message: `${invite.fromName} invited you to collaborate`,
                taskTitle: invite.taskTitle,
                requestId: invite.id,
                inviteStatus: 'pending',
                createdAt: invite.createdAt,
                isRead: false,
              } as Notification, ...next];
            } else if (existing && existing.inviteStatus !== invite.status) {
              next = next.map(n => n.id === existing.id ? { ...n, inviteStatus: invite.status } : n);
            }
          }
          return next;
        });
      },
      replies => {
        setNotifications(prev => {
          let next = prev;
          for (const invite of replies) {
            const key = `reply-${invite.id}`;
            if (next.some(n => n.requestId === key)) continue;
            const accepted = invite.status === 'accepted';
            next = [{
              id: generateId(),
              type: accepted ? 'invite_accepted' : 'invite_declined',
              title: accepted ? 'Invite accepted' : 'Invite declined',
              message: `${invite.respondedByName || invite.toEmail} ${accepted ? 'accepted' : 'declined'} your invite`,
              taskTitle: invite.taskTitle,
              requestId: key,
              createdAt: invite.respondedAt || Date.now(),
              isRead: false,
            } as Notification, ...next];
          }
          return next;
        });
      },
      onError,
    );
    return () => { stopTasks(); stopInvites(); };
  }, [cloudUser, applySharedDocs]);

  // Send local edits of shared tasks to collaborators (debounced per task)
  useEffect(() => {
    if (!cloudUser?.emailVerified) return;
    const user = cloudUser;
    for (const task of tasks) {
      if (!task.cloudId || task.deletedAt) continue;
      const cloudId = task.cloudId;
      const content = stableStringify(toCloudContent(task));
      if (lastSyncedRef.current.get(cloudId) === content) continue;
      lastSyncedRef.current.set(cloudId, content);

      const timers = pushTimersRef.current;
      if (timers.has(cloudId)) clearTimeout(timers.get(cloudId));
      timers.set(cloudId, window.setTimeout(() => {
        timers.delete(cloudId);
        const latest = tasksRef.current.find(t => t.cloudId === cloudId);
        if (!latest) return;
        lastSyncedRef.current.set(cloudId, stableStringify(toCloudContent(latest)));
        pushSharedTask(cloudId, latest, user, Date.now()).catch(err => {
          console.error('Failed to sync shared task', err);
          lastSyncedRef.current.delete(cloudId); // retry on the next change
        });
      }, 700));
    }
  }, [tasks, cloudUser]);

  const collabTask = collabTaskId ? tasks.find(t => t.id === collabTaskId) : undefined;

  const handleSendInvite = async (email: string) => {
    if (!cloudUser || !collabTask) throw new Error('Please sign in first.');
    let cloudId = collabTask.cloudId;
    if (!cloudId) {
      cloudId = generateId();
      pendingLinksRef.current.set(cloudId, collabTask.id);
      lastSyncedRef.current.set(cloudId, stableStringify(toCloudContent(collabTask)));
      try {
        await createSharedTask(collabTask, cloudUser, cloudId);
      } catch (err) {
        pendingLinksRef.current.delete(cloudId);
        throw err;
      }
      updateTask(collabTask.id, { cloudId });
      setTimeout(() => pendingLinksRef.current.delete(cloudId!), 5000);
    }
    return sendInvite(cloudId, collabTask.title, cloudUser, email);
  };

  const respondToCollabInvite = async (notification: Notification, accept: boolean) => {
    const invite = notification.requestId ? incomingInvites[notification.requestId] : undefined;
    if (!cloudUser || !invite) {
      setToast('Sign in with the invited email to answer this invite.');
      setShowAccount(true);
      return;
    }
    try {
      await respondToInvite(invite, cloudUser, accept);
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, inviteStatus: accept ? 'accepted' : 'declined' } : n));
      if (accept) {
        setShowNotifications(false);
        // Ask which of their own lists it should also appear in
        setListPickerFor({ cloudId: invite.sharedTaskId, title: invite.taskTitle });
      }
    } catch (err) {
      console.error('Failed to answer invite', err);
      setToast('Could not reach the server. Check your connection and try again.');
    }
  };

  const closeSettings = () => {
    setSettingsClosing(true);
    setTimeout(() => {
      setShowSettings(false);
      setSettingsClosing(false);
      setSettingsPanel('main');
      setGuideOpenedStory(false);
    }, 200);
  };

  const selectTheme = (next: ThemeType) => {
    if (next === theme) return;
    setTheme(next);
    if (displayDark && !THEMES[next].isDark) {
      setToast(`${THEMES[next].name} will show when you switch to light mode`);
    } else {
      setThemeReveal(next);
      // Dark themes change the whole app; say so, so it isn't a surprise
      if (THEMES[next].isDark && !displayDark) setToast(`${THEMES[next].name} is a dark theme, so the app switches to dark`);
    }
  };
  const closeThemeReveal = useCallback(() => setThemeReveal(null), []);

  // After accepting an invite: the task is always in Shared with Me, plus any lists chosen.
  // The shared task may not have reached this device yet, so the choice is kept until it does.
  const applyListChoice = (cloudId: string, listIds: string[]) => {
    setListPickerFor(null);
    setActiveCategory('shared');
    if (listIds.length === 0) return;
    const local = tasksRef.current.find(t => t.cloudId === cloudId);
    if (local) {
      updateTask(local.id, { categoryIds: ['shared', ...listIds] });
    } else {
      pendingListChoicesRef.current.set(cloudId, listIds);
    }
    setToast(`Added to ${listIds.length} list${listIds.length > 1 ? 's' : ''} and Shared with Me`);
  };

  const handleShareDetails = async (task: Task) => {
    const outcome = await shareText(task.title, taskShareText(task));
    if (outcome === 'copied') setToast('Task details copied. Paste them into any app.');
  };

  // Long-press a list in the sidebar to rename it (double-click also works on desktop)
  const longPressTimerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const startListLongPress = (categoryId: string) => {
    longPressFiredRef.current = false;
    if (PROTECTED_LISTS.includes(categoryId)) return;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      setEditingListId(categoryId);
    }, 500);
  };
  const cancelListLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Category management functions
  const handleCategoryTap = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSidebarOpen(false); // Close sidebar on mobile when category is selected
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, name: newName } : cat
    ));
  };

  const addNewCategory = (name?: string, kind?: 'quick'): string => {
    const newId = generateId();
    const trimmedName = name?.trim();
    const newCategory: Category = {
      id: newId,
      name: trimmedName && trimmedName.length > 0 ? trimmedName : 'New List',
      icon: kind === 'quick' ? 'checklist' : CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)],
      color: 'bg-slate-500',
      isDefault: false,
      ...(kind ? { kind } : {}),
    };
    setCategories(prev => [...prev, newCategory]);
    return newId;
  };

  const deleteCategory = (categoryId: string) => {
    // Can't delete protected lists (Daily, Shared)
    if (PROTECTED_LISTS.includes(categoryId)) return;
    
    // Move tasks from this category to daily
    setTasks(prev => prev.map(task => {
      if (task.categoryIds?.includes(categoryId)) {
        const newCategoryIds = task.categoryIds.filter(id => id !== categoryId);
        return { ...task, categoryIds: newCategoryIds.length > 0 ? newCategoryIds : ['daily'] };
      }
      return task;
    }));
    
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    if (activeCategory === categoryId) {
      setActiveCategory('daily');
    }
  };

  const updateCategoryIcon = (categoryId: string, newIcon: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, icon: newIcon } : cat
    ));
    setShowIconPicker(null);
  };

  // Moves swap with the nearest list that's shown, skipping hidden ones (Shared with Me
  // while collaboration is off), so every tap visibly moves the list
  const moveCategory = (categoryId: string, step: -1 | 1) => {
    setCategories(prev => {
      const index = prev.findIndex(c => c.id === categoryId);
      if (index < 0) return prev;
      let target = index + step;
      while (target >= 0 && target < prev.length && !isListShown(prev[target])) target += step;
      if (target < 0 || target >= prev.length) return prev;
      const newCategories = [...prev];
      [newCategories[index], newCategories[target]] = [newCategories[target], newCategories[index]];
      return newCategories;
    });
  };
  const moveCategoryUp = (categoryId: string) => moveCategory(categoryId, -1);
  const moveCategoryDown = (categoryId: string) => moveCategory(categoryId, 1);

  // Completion Detection Logic - check tasks in current category
  // Today's tasks in the open list (drives Today's progress and the celebration)
  const categoryTasks = useMemo(() => {
    const todayStr = toLocalDateString();
    return tasks.filter(t => countsTowardsToday(t, activeCategory, todayStr));
  }, [tasks, activeCategory]);

  const isAllCompleted = useMemo(() => {
    return categoryTasks.length > 0 && categoryTasks.every(t => t.isCompleted);
  }, [categoryTasks]);

  // Progress for the open list
  const progressStats = useMemo(() => {
    const total = categoryTasks.length;
    const completed = categoryTasks.filter(t => t.isCompleted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  }, [categoryTasks]);

  useEffect(() => {
    const currentCompleted = categoryTasks.filter(t => t.isCompleted).length;
    
    // Trigger celebration if all tasks in category are completed and this is a new "all complete" state
    // Only celebrate if we haven't celebrated this category already
    if (isAllCompleted && currentCompleted > lastCompletedCount && categoryTasks.length > 0 && !celebratedCategories.has(activeCategory)) {
      setVictoryIdx(Math.floor(Math.random() * VICTORY_QUOTES.length));
      if (confettiOnComplete) {
        triggerThemedConfetti();
        // The message follows the first burst, so the confetti gets a moment on its own
        window.setTimeout(() => setShowCelebrationModal(true), 700);
      } else {
        setShowCelebrationModal(true);
      }
      // Mark this category as celebrated
      setCelebratedCategories(prev => new Set([...prev, activeCategory]));
    }
    
    // Reset celebration flag if tasks become incomplete
    if (!isAllCompleted && celebratedCategories.has(activeCategory)) {
      setCelebratedCategories(prev => {
        const next = new Set(prev);
        next.delete(activeCategory);
        return next;
      });
    }
    
    setLastCompletedCount(currentCompleted);
  }, [categoryTasks, isAllCompleted, activeCategory, celebratedCategories]);

  
  // A short celebration in three beats, in the theme's colours and confetti shape:
  // cannons from both bottom corners, a burst from the middle, then a light shower
  // from the top that drifts down for a couple of seconds. About 3.5 seconds in all.
  const confettiTimers = useRef<number[]>([]);
  const triggerThemedConfetti = () => {
    confettiTimers.current.forEach(clearTimeout);
    confettiTimers.current = [];
    const currentTheme = neutralDark ? NEUTRAL_DARK_THEME : THEMES[theme as keyof typeof THEMES];
    const colors: string[] = currentTheme?.confettiColors || ['#6366f1', '#a855f7', '#ec4899', '#fbbf24'];
    const path: string | undefined = currentTheme?.confettiPath;
    const shapes: confetti.Shape[] = path ? [confetti.shapeFromPath({ path }), 'circle', 'square'] : ['circle', 'square'];
    const base = { colors, shapes, ticks: 240, gravity: 0.95, scalar: 1.05, disableForReducedMotion: false };
    const later = (ms: number, fire: () => void) => confettiTimers.current.push(window.setTimeout(fire, ms));

    if (Capacitor.isNativePlatform()) Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    // 1. Cannons
    confetti({ ...base, particleCount: 55, angle: 60, spread: 55, startVelocity: 58, origin: { x: 0, y: 0.85 } });
    confetti({ ...base, particleCount: 55, angle: 120, spread: 55, startVelocity: 58, origin: { x: 1, y: 0.85 } });
    // 2. Burst
    later(260, () => confetti({ ...base, particleCount: 80, spread: 100, startVelocity: 42, origin: { x: 0.5, y: 0.6 } }));
    // 3. Shower: a few pieces at a time from above, falling slowly
    for (let k = 0; k < 9; k++) {
      later(650 + k * 200, () => confetti({
        ...base, particleCount: 9, angle: 270, spread: 70, startVelocity: 8, gravity: 0.6, ticks: 300, drift: (Math.random() - 0.5) * 0.8,
        origin: { x: 0.1 + Math.random() * 0.8, y: -0.05 },
      }));
    }
  };

  const addTask = (title: string = '', taskScheduledDate?: string) => {
    // Pages like History or Progress aren't lists; new tasks go to Daily List from there
    const listId = categories.some(c => c.id === activeCategory && c.id !== 'shared') ? activeCategory : 'daily';
    const newTask: Task = {
      id: generateId(),
      title,
      isCompleted: false,
      notes: '',
      subTasks: [],
      attachments: [],
      sharedWith: [],
      createdAt: Date.now(),
      priority: 'medium',
      isPrivate: false,
      scheduledDate: taskScheduledDate,
      categoryIds: [listId]
    };
    discardUnsavedNewTask();
    setTasks(prev => [newTask, ...prev]);
    setPanelClosing(false);
    setPlanAheadTaskId(null);
    setSelectedTaskId(newTask.id);
    setNewTaskId(newTask.id); // Mark this as a new task
    setIsEditingTask(false);
    return newTask.id;
  };

  // Quick List items are added in place, without the task panel
  // Quick add at the end of a list: just a name, no details panel. Added after the
  // existing tasks so it appears right above the line it was typed into.
  const addInlineTask = (title: string, listId: string) => {
    const item: Task = {
      id: generateId(),
      title,
      isCompleted: false,
      notes: '',
      subTasks: [],
      attachments: [],
      sharedWith: [],
      createdAt: Date.now(),
      priority: 'medium',
      isPrivate: false,
      categoryIds: [listId],
    };
    setTasks(prev => [...prev, item]);
  };

  // The built-in Quick List and any list made as a quick list
  const isQuickList = (listId: string) => listId === 'quick' || categories.some(c => c.id === listId && c.kind === 'quick');

  // Clear a quick list: items that live only here move to History; items also in other
  // lists just leave this one
  const clearQuickList = async (listId: string) => {
    const list = categories.find(c => c.id === listId);
    const items = tasks.filter(t => !t.deletedAt && t.categoryIds?.includes(listId));
    if (items.length === 0) return;
    const ok = await dialogs.confirm({
      title: `Clear ${list?.name || 'this list'}?`,
      message: `${items.length === 1 ? 'Its item moves' : `All ${items.length} items move`} to History, where you can restore ${items.length === 1 ? 'it' : 'them'} if you need to.`,
      confirmLabel: 'Clear list',
      destructive: true,
    });
    if (!ok) return;
    const now = Date.now();
    setTasks(prev => prev.map(t => {
      if (t.deletedAt || !t.categoryIds?.includes(listId)) return t;
      const others = t.categoryIds.filter(id => id !== listId);
      return others.length ? { ...t, categoryIds: others } : { ...t, deletedAt: now };
    }));
    setToast(`Cleared ${list?.name || 'the list'}`);
  };

  const addQuickItem = (title: string) => {
    const item: Task = {
      id: generateId(),
      title,
      isCompleted: false,
      notes: '',
      subTasks: [],
      attachments: [],
      sharedWith: [],
      createdAt: Date.now(),
      priority: 'medium',
      isPrivate: false,
      categoryIds: [isQuickList(activeCategory) ? activeCategory : 'quick'],
    };
    setTasks(prev => [item, ...prev]);
  };

  // Plan Ahead: one screen. Opens the new-task panel with tomorrow picked and the calendar up front.
  const planAheadTask = () => {
    const id = addTask('', localDateOffset(1));
    setPlanAheadTaskId(id);
  };

  // Slides the task panel away, then clears it (and runs any pending cancel/undo)
  const closeTaskPanel = () => {
    setPanelClosing(true);
    setTimeout(() => {
      panelCloseActionRef.current?.();
      panelCloseActionRef.current = null;
      setSelectedTaskId(null);
      setNewTaskId(null);
      setPlanAheadTaskId(null);
      setIsEditingTask(false);
      setEditSnapshot(null);
      setPanelClosing(false);
    }, 220);
  };

  // A new task that was never saved (Add task) is discarded when the panel moves on
  const savedNewTaskRef = useRef<string | null>(null); // New task the user pressed Add on
  const discardUnsavedNewTask = (keepId?: string) => {
    if (newTaskId && newTaskId !== keepId && savedNewTaskRef.current !== newTaskId) {
      const id = newTaskId;
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const openTask = (taskId: string) => {
    discardUnsavedNewTask(taskId);
    panelCloseActionRef.current = null;
    setPanelClosing(false);
    setNewTaskId(null);
    setPlanAheadTaskId(null);
    setIsEditingTask(false);
    setSelectedTaskId(taskId);
  };

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    // Repeating tasks: ticking one off creates the next occurrence; un-ticking it again
    // takes that occurrence back (if it hasn't been ticked off itself)
    const target = tasksRef.current.find(t => t.id === id);
    let spawned: Task | null = null;
    let withdrawn: Task | null = null;
    if (target?.repeat && updates.isCompleted === true && !target.isCompleted && !target.repeatSpawnedId && !target.deletedAt) {
      const { next, filesCopied } = createNextOccurrence(target);
      spawned = next;
      updates = { ...updates, repeatSpawnedId: next.id };
      filesCopied.then(failed => {
        if (failed.length === 0) return;
        const drop = (t: Task): Task => ({ ...t, attachments: t.attachments.filter(a => !failed.includes(a.id)), subTasks: t.subTasks.map(drop) });
        setTasks(prev => prev.map(t => t.id === next.id ? drop(t) : t));
      });
    } else if (target?.repeatSpawnedId && updates.isCompleted === false && target.isCompleted) {
      const nextOne = tasksRef.current.find(t => t.id === target.repeatSpawnedId);
      if (nextOne && !nextOne.isCompleted && !nextOne.deletedAt) withdrawn = nextOne;
      updates = { ...updates, repeatSpawnedId: undefined };
    }
    if (withdrawn) {
      const removeFiles = (t: Task) => { t.attachments.forEach(deleteAttachmentFile); t.subTasks.forEach(removeFiles); };
      removeFiles(withdrawn);
    }

    const deepUpdate = (items: Task[]): Task[] => {
      return items.map(t => {
        if (t.id === id) {
          // Add completedAt timestamp when task is marked complete
          if (updates.isCompleted === true && !t.isCompleted) {
            return { ...t, ...updates, completedAt: Date.now() };
          }
          // Clear completedAt when task is uncompleted
          if (updates.isCompleted === false && t.isCompleted) {
            return { ...t, ...updates, completedAt: undefined };
          }
          return { ...t, ...updates };
        }
        if (t.subTasks.length > 0) return { ...t, subTasks: deepUpdate(t.subTasks) };
        return t;
      });
    };
    setTasks(prev => {
      let next = deepUpdate(prev);
      if (withdrawn) next = next.filter(t => t.id !== withdrawn!.id);
      if (spawned) next = [...next, spawned];
      return next;
    });
    if (spawned?.scheduledDate) {
      setToast(`Repeats. Next one is on ${new Date(spawned.scheduledDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`);
    }
  }, []);

  // Swaps a whole task back in (used to undo edits when editing is cancelled)
  // (at any depth, so cancelling edits to a subtask opened on its own works too)
  const replaceTask = useCallback((replacement: Task) => {
    const deepReplace = (items: Task[]): Task[] => items.map(t =>
      t.id === replacement.id ? replacement : t.subTasks.length > 0 ? { ...t, subTasks: deepReplace(t.subTasks) } : t
    );
    setTasks(prev => deepReplace(prev));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const target = tasksRef.current.find(t => t.id === id);
    if (target?.cloudId) {
      const ok = await dialogs.confirm({
        title: 'Delete shared task?',
        message: 'This task is shared, so deleting it removes it for everyone collaborating on it.',
        confirmLabel: 'Delete for everyone',
        destructive: true,
      });
      if (!ok) return;
      const cloudId = target.cloudId;
      lastSyncedRef.current.delete(cloudId);
      deleteSharedTask(cloudId).catch(err => console.error('Failed to delete shared task', err));
    }
    const deepDelete = (items: Task[]): Task[] => {
      return items.map(t => {
        if (t.id === id) {
          return { ...t, deletedAt: Date.now(), cloudId: undefined };
        }
        return {
          ...t,
          subTasks: deepDelete(t.subTasks)
        };
      });
    };
    setTasks(prev => deepDelete(prev));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }, [selectedTaskId]);

  // Notification handlers
  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // Mark all as read when opening
      setNotifications(prev => prev.some(n => !n.isRead) ? prev.map(n => ({ ...n, isRead: true })) : prev);
    }
  };
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Calculate disappear threshold based on setting
  const getDisappearThreshold = (): number | null => {
    const now = Date.now();
    switch (completedDisappearTime) {
      case 'immediately': return now; // Always hide
      case '1hour': return now - (60 * 60 * 1000);
      case '1day': return now - (24 * 60 * 60 * 1000);
      case '1week': return now - (7 * 24 * 60 * 60 * 1000);
      case 'never': return null; // Never hide
      default: return now - (24 * 60 * 60 * 1000); // Default to 1 day
    }
  };

  // Check if a completed task should be visible in the main list
  const shouldShowCompletedTask = (task: Task): boolean => {
    if (task.deletedAt) return false; // Hide deleted tasks
    if (!task.isCompleted || !task.completedAt) return true;
    const threshold = getDisappearThreshold();
    if (threshold === null) return true; // 'never' setting
    return task.completedAt > threshold;
  };

  // Get all tasks that have history (completed, deleted, or past scheduled dates)
  const allHistoryTasks = useMemo(() => {
    return tasks.filter(t => t.completedAt || t.deletedAt);
  }, [tasks]);


  // Get all completed tasks (regardless of disappear threshold) for progress tracking
  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.isCompleted && t.completedAt);
  }, [tasks]);

  // Permanently removes completed and deleted tasks (not shared ones, which belong to collaborators too)
  const clearHistory = async () => {
    const ok = await dialogs.confirm({
      title: 'Clear history?',
      message: 'This permanently removes all completed and deleted tasks, including completed tasks still showing in your lists, and their attachments. Progress charts will start fresh. This can’t be undone.',
      confirmLabel: 'Clear history',
      destructive: true,
    });
    if (!ok) return;
    const isHistory = (t: Task) => !t.cloudId && (!!t.deletedAt || t.isCompleted);
    const removeFiles = (t: Task) => { t.attachments.forEach(deleteAttachmentFile); t.subTasks.forEach(removeFiles); };
    const pruneSubtasks = (t: Task): Task => ({ ...t, subTasks: t.subTasks.filter(st => !st.deletedAt).map(pruneSubtasks) });
    tasks.filter(isHistory).forEach(removeFiles);
    setTasks(prev => prev.filter(t => !isHistory(t)).map(pruneSubtasks));
    setToast('History cleared');
  };

  // Removes one task from History permanently (with its attachment files)
  const deleteForever = async (task: Task) => {
    const shared = !!task.cloudId;
    const ok = await dialogs.confirm({
      title: `Delete “${task.title || 'Untitled task'}” forever?`,
      message: shared
        ? 'It’s shared, so it will also be removed for everyone collaborating on it. This can’t be undone.'
        : 'This can’t be undone.',
      confirmLabel: 'Delete forever',
      destructive: true,
    });
    if (!ok) return;
    if (task.cloudId) {
      lastSyncedRef.current.delete(task.cloudId);
      deleteSharedTask(task.cloudId).catch(err => console.error('Failed to delete shared task', err));
    }
    const removeFiles = (t: Task) => { t.attachments.forEach(deleteAttachmentFile); t.subTasks.forEach(removeFiles); };
    removeFiles(task);
    setTasks(prev => prev.filter(t => t.id !== task.id));
    if (selectedTaskId === task.id) closeTaskPanel();
    setToast('Deleted forever');
  };

  // Restore a task from history (uncheck it)
  const restoreFromHistory = (taskId: string) => {
    updateTask(taskId, { isCompleted: false, completedAt: undefined });
  };

  // Repeat a task from history: a fresh, unfinished copy in its original list
  const repeatFromHistory = (task: Task) => {
    const fresh = (t: Task): Task => ({
      ...t,
      id: generateId(),
      isCompleted: false,
      completedAt: undefined,
      deletedAt: undefined,
      createdAt: Date.now(),
      subTasks: t.subTasks.filter(st => !st.deletedAt).map(fresh),
    });
    const listIds = (task.categoryIds || []).filter(id => id !== 'shared' && categories.some(c => c.id === id));
    const copy: Task = {
      ...fresh(task),
      cloudId: undefined,
      repeatSpawnedId: undefined,
      sharedWith: [],
      sharedBy: undefined,
      isPrivate: false,
      scheduledDate: undefined,
      dueDate: undefined,
      categoryIds: listIds.length ? listIds : ['daily'],
    };
    setTasks(prev => [copy, ...prev]);
    setToast(`"${copy.title}" added again`);
  };

  // Order of a list: open tasks first, then finished ones (setting "Move done tasks down"),
  // and within each, High > Medium > Low (setting "Sort by priority"); otherwise the order
  // tasks were added. A task that was just ticked waits for its strike line before moving.
  const settledDone = useSettledDone(tasks);
  const sortByPriority = (taskList: Task[]): Task[] => {
    const priorityOrder: Record<string, number> = { 'high': 0, 'medium': 1, 'low': 2 };
    return [...taskList].sort((a, b) =>
      (doneToBottom ? doneOrder(settledDone, a, b) : 0) ||
      (sortByPriorityEnabled ? (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3) : 0));
  };
  // Rows glide to their new places when the order changes
  const todayListRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useFlip(todayListRef);
  useFlip(listRef);

  const findTask = (items: Task[], id: string): Task | null => {
    for (const t of items) {
      if (t.id === id) return t;
      const found = findTask(t.subTasks, id);
      if (found) return found;
    }
    return null;
  };

  const selectedTask = selectedTaskId ? findTask(tasks, selectedTaskId) : null;

  // Search: titles and notes of tasks and subtasks at any depth. Deleted (History) and
  // hidden tasks are only included when the setting is on, and are labelled.
  type SearchStatus = 'active' | 'completed' | 'deleted' | 'hidden';
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return { results: [], archivedMatches: 0 };
    const results: { task: Task; parentTitle?: string; categoryName: string; categoryIcon: string; status: SearchStatus }[] = [];
    let archivedMatches = 0;

    const walk = (task: Task, root: Task, parent: Task | null, inherited: SearchStatus | null) => {
      const status: SearchStatus = inherited || (task.deletedAt ? 'deleted' : task.isPrivate ? 'hidden' : task.isCompleted ? 'completed' : 'active');
      const matches = task.title.toLowerCase().includes(query) || task.notes?.toLowerCase().includes(query);
      if (matches) {
        const archived = status === 'deleted' || status === 'hidden';
        if (archived && !searchIncludeArchived) {
          archivedMatches++;
        } else {
          const category = categories.find(c => root.categoryIds?.includes(c.id)) || categories[0];
          results.push({ task, parentTitle: parent?.title, categoryName: category.name, categoryIcon: category.icon, status });
        }
      }
      // Subtasks of a deleted or hidden task share its status
      const passDown = status === 'deleted' || status === 'hidden' ? status : null;
      task.subTasks.forEach(sub => walk(sub, root, task, passDown));
    };
    tasks.forEach(task => walk(task, task, null, null));

    const order: Record<SearchStatus, number> = { active: 0, completed: 1, hidden: 2, deleted: 3 };
    results.sort((x, y) => order[x.status] - order[y.status]);
    return { results: results.slice(0, 10), archivedMatches };
  }, [searchQuery, tasks, categories, searchIncludeArchived]);
  
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const recurringSuggestions = useMemo(() => {
    const counts: Record<string, number> = {};
    const traverse = (items: Task[]) => {
      items.forEach(t => {
        const title = t.title.trim();
        if (title && title !== 'New Task' && title.length > 2) {
          counts[title] = (counts[title] || 0) + 1;
        }
        traverse(t.subTasks);
      });
    };
    traverse(tasks);
    return Object.entries(counts)
      .filter(([_, count]) => count > 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title]) => title);
  }, [tasks]);

  // Four suggestions: at most one of the user's own frequent tasks (it may come back
  // sooner), the rest from the curated pool, which doesn't repeat within 5 days
  const allSuggestions = useMemo(() => {
    if (!suggestionsEnabled) return [];
    const openTitles = new Set(tasks.filter(t => !t.isCompleted && !t.deletedAt).map(t => t.title.trim().toLowerCase()));
    const own = recurringSuggestions.filter(text => !openTitles.has(text.toLowerCase()));
    const ownPick = own.length ? own[Math.floor(Date.now() / (20 * 60 * 1000)) % own.length] : null;
    const curated = currentSuggestions(ownPick ? 3 : 4);
    return [
      ...(ownPick ? [{ text: ownPick, recurring: true }] : []),
      ...curated.map(text => ({ text, recurring: false })),
    ];
    // suggestionTick re-runs this every minute so a due set appears without a reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringSuggestions, suggestionsEnabled, suggestionTick]);

  // Keep the user's selected theme (no theme switch on completion)
  const activeTheme = neutralDark ? NEUTRAL_DARK_THEME : THEMES[theme];

  // Each theme has its own light and dark backgrounds
  const darkBg = activeTheme.darkBg || 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
  const lightBg = activeTheme.bg;
  const today = toLocalDateString();

  // Shared by the sidebar and (on phones) the bottom of the Today page
  const inspirationCard = (
    <figure className="px-3 py-1">
      <ThemeIcon theme={visualTheme} size={18} style={{ color: 'var(--theme-primary)' }} className="mb-2" />
      <blockquote className={`text-sm italic leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>
        “{isAllCompleted ? VICTORY_QUOTES[victoryIdx] : MOTIVATIONAL_QUOTES[quoteIdx]}”
      </blockquote>
    </figure>
  );

  return (
    <div className={`flex flex-col md:flex-row h-full ${isDarkMode ? darkBg : lightBg} ${isDarkMode ? 'text-slate-100' : 'text-ink'} overflow-hidden transition-colors duration-500`}>
      
      {!neutralDark && <ThemeBackdrop theme={theme} isDarkMode={isDarkMode} />}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        safe-panel fixed md:relative inset-y-0 left-0 z-40
        w-[85vw] max-w-[300px] md:w-64 
        ${isDarkMode ? (neutralDark ? 'bg-slate-900 border-slate-800' : 'theme-ground border-white/10') : 'theme-ground border-line'} 
        border-r flex flex-col shadow-lg md:shadow-none
        transform transition-transform duration-[380ms] [transition-timing-function:var(--ease-sheet)]
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 md:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-on-accent transition-colors" style={{ backgroundColor: 'var(--theme-primary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h1 className={`text-lg md:text-xl font-extrabold tracking-tight font-display ${isDarkMode ? 'text-white' : 'text-ink'}`}>MentaList</h1>
          </div>
          {/* Close button for mobile */}
          <button 
            onClick={() => setSidebarOpen(false)}
            aria-label="Close lists"
            className={`md:hidden p-2 rounded-lg active:scale-95 transition-transform ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>

        <nav className="flex-1 px-3 md:px-4 space-y-1 overflow-y-auto no-scrollbar">
          <div className="mb-4">
            <p className={`text-[13px] font-semibold mb-2 px-3 ${isDarkMode ? 'text-slate-500' : 'text-muted'}`}>Lists</p>
            {categories.filter(isListShown).map(cat => (
              <div
                key={cat.id}
                onClick={() => {
                  // A long press renames instead of opening the list
                  if (longPressFiredRef.current) { longPressFiredRef.current = false; return; }
                  handleCategoryTap(cat.id);
                }}
                role="button"
                tabIndex={0}
                aria-current={activeCategory === cat.id ? 'page' : undefined}
                onKeyDown={(e) => { if (e.key === 'Enter' && editingListId !== cat.id) handleCategoryTap(cat.id); }}
                onPointerDown={() => startListLongPress(cat.id)}
                onPointerUp={cancelListLongPress}
                onPointerLeave={cancelListLongPress}
                onPointerCancel={cancelListLongPress}
                onContextMenu={(e) => e.preventDefault()}
                style={activeCategory === cat.id ? {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.07)' : 'var(--theme-sheet)',
                  color: isDarkMode ? '#fff' : 'var(--theme-ink)',
                } : {}}
                className={`no-callout w-full flex items-center justify-between px-3 py-3 md:py-2.5 rounded-xl transition-all cursor-pointer group active:scale-[0.98] ${
                  activeCategory === cat.id 
                    ? 'font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]' 
                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-muted hover:bg-[color:var(--theme-secondary)]'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="shrink-0 flex" style={activeCategory === cat.id ? { color: 'var(--theme-primary)' } : undefined}><ListIcon icon={cat.icon} size={20} /></span>
                  {editingListId === cat.id ? (
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => updateCategoryName(cat.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={() => setEditingListId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') {
                          setEditingListId(null);
                        }
                      }}
                      autoFocus
                      className={`text-sm md:text-sm px-2 py-1 rounded-md border w-full max-w-[140px] ${isDarkMode ? 'bg-slate-700 border-slate-500 text-white' : 'bg-white border-slate-300 text-ink'}`}
                    />
                  ) : (
                    <span
                      className="text-sm md:text-sm truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!PROTECTED_LISTS.includes(cat.id)) {
                          setEditingListId(cat.id);
                        }
                      }}
                      title={!PROTECTED_LISTS.includes(cat.id) ? (isTouchDevice() ? 'Long-press to rename' : 'Double-click to rename') : undefined}
                    >
                      {cat.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] tabular-nums min-w-[1.25rem] text-right ${isDarkMode ? 'text-slate-500' : 'text-muted'}`}>
                    {tasks.filter(t => countsTowardsToday(t, cat.id, today)).length}
                  </span>
                  {!cat.isDefault && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const ok = await dialogs.confirm({
                          title: `Delete “${cat.name}”?`,
                          message: 'Its tasks move to Today.',
                          confirmLabel: 'Delete list',
                          destructive: true,
                        });
                        if (ok) deleteCategory(cat.id);
                      }}
                      className="w-11 h-11 -my-2.5 -mr-2 flex items-center justify-center rounded-full text-slate-400 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${cat.name}`}
                      title="Delete this list"
                    >
                      <Icons.Trash />
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Add New Category Button */}
            <button
              onClick={async () => {
                const result = await dialogs.promptChoice({ title: 'New list', placeholder: 'List name', confirmLabel: 'Create list', choices: NEW_LIST_CHOICES });
                if (result === null) return;
                const newId = addNewCategory(result.text, result.choice === 'quick' ? 'quick' : undefined);
                setActiveCategory(newId);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mt-1 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-[color:var(--theme-secondary)]'}`}
              style={{ color: 'var(--theme-primary)' }}
            >
              <Icons.Plus />
              <span className="text-sm font-medium">New list</span>
            </button>
          </div>

          <div className="mb-4">
             <div className={`h-px mx-3 mb-3 ${isDarkMode ? 'bg-slate-700/70' : 'bg-line'}`} />
             
             {/* Hidden Tasks - as a page like categories - inconspicuous */}
             <button
                type="button"
                onClick={() => handleCategoryTap('hidden')}
                aria-current={activeCategory === 'hidden' ? 'page' : undefined}
                className={`w-full text-left flex items-center justify-between px-3 py-3 md:py-2 rounded-xl transition-all cursor-pointer group active:scale-[0.98] mb-1 ${
                  activeCategory === 'hidden' 
                    ? (isDarkMode ? 'bg-white/[0.07] text-white font-semibold' : 'bg-sheet text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]')
                    : isDarkMode ? 'text-slate-500 hover:text-slate-400 hover:bg-white/5' : 'text-muted hover:bg-[color:var(--theme-secondary)]'
                }`}
             >
                <div className="flex items-center gap-2">
                  <Icons.EyeOff />
                  <span className="text-xs font-medium">Hidden</span>
                </div>
                <span className={`text-[13px] tabular-nums ${isDarkMode ? 'text-slate-500' : 'text-muted'}`}>
                  {tasks.filter(t => t.isPrivate && !t.deletedAt).length}
                </span>
             </button>

             {/* History - as a page like categories */}
             <button
                type="button"
                onClick={() => handleCategoryTap('history')}
                aria-current={activeCategory === 'history' ? 'page' : undefined}
                className={`w-full text-left flex items-center justify-between px-3 py-3 md:py-2.5 rounded-xl md:rounded-lg transition-all cursor-pointer group active:scale-[0.98] mb-1 ${
                  activeCategory === 'history' 
                    ? (isDarkMode ? 'bg-white/[0.07] text-white font-semibold' : 'bg-sheet text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]')
                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-muted hover:bg-[color:var(--theme-secondary)]'
                }`}
             >
                <div className="flex items-center gap-3">
                  <Icons.History />
                  <span className="text-sm">History</span>
                </div>
                <span className={`text-[13px] tabular-nums ${isDarkMode ? 'text-slate-500' : 'text-muted'}`}>
                  {allHistoryTasks.length}
                </span>
             </button>

             {/* Progress - as a page like categories */}
             <button
                type="button"
                onClick={() => handleCategoryTap('progress')}
                aria-current={activeCategory === 'progress' ? 'page' : undefined}
                className={`w-full text-left flex items-center justify-between px-3 py-3 md:py-2.5 rounded-xl md:rounded-lg transition-all cursor-pointer group active:scale-[0.98] ${
                  activeCategory === 'progress' 
                    ? (isDarkMode ? 'bg-white/[0.07] text-white font-semibold' : 'bg-sheet text-ink font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.05)]')
                    : isDarkMode ? 'text-slate-400 hover:bg-white/5' : 'text-muted hover:bg-[color:var(--theme-secondary)]'
                }`}
             >
                <div className="flex items-center gap-3">
                  <BarChart3 size={18} />
                  <span className="text-sm">Progress</span>
                </div>
                <CaretRight size={16} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} aria-hidden="true" />
             </button>
        </div>
        </nav>

        {/* Daily Inspiration */}
        <div className="p-4 md:p-5">
          {inspirationCard}
        </div>
      </aside>

      {/* Main List Area */}
      <main className="relative z-[1] flex-1 flex flex-col min-w-0 min-h-0 w-full">
        <header className={`p-4 md:px-10 lg:px-16 md:pt-7 md:pb-2 flex flex-col gap-4 backdrop-blur-md border-b sticky top-0 z-10 md:backdrop-blur-none md:border-transparent md:bg-transparent ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/70 border-line'}`}>
          <div className="flex items-center gap-3 w-full">
            {/* Mobile Menu Button */}
            <button 
              onClick={() => setSidebarOpen(true)}
              aria-label="Open lists"
              className={`md:hidden p-2 -ml-1 rounded-lg active:scale-95 transition-transform ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
            >
              <List size={24} aria-hidden="true" />
            </button>
            
            <div className="relative flex-1 md:max-w-sm lg:max-w-md">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <MagnifyingGlass size={18} aria-hidden="true" />
              </div>
              <input 
                type="text" 
                placeholder="Search tasks" 
                className={`w-full pl-10 pr-10 py-2.5 ${isDarkMode ? 'bg-slate-800 text-white placeholder-slate-400 border-slate-700' : 'bg-sheet text-ink placeholder:text-muted border-line'} border rounded-xl text-base md:text-sm focus:ring-2 focus:ring-[color:var(--theme-primary-lighter)] outline-none`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setShowSearchDropdown(false)}
                enterKeyHint="search"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute inset-y-0 right-0 w-10 flex items-center justify-center transition-transform active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}
                  aria-label="Clear search"
                >
                  <Icons.X />
                </button>
              )}
              
              {/* Search Predictive Dropdown */}
              {showSearchDropdown && searchQuery.trim() && (
                <div
                  // Keep the input focused while tapping a result, so the tap isn't lost
                  onMouseDown={(e) => e.preventDefault()}
                  className={`absolute top-full left-0 right-0 mt-2 ${isDarkMode ? 'bg-slate-800/95 backdrop-blur-sm border-slate-700' : 'bg-white border-slate-200'} rounded-xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-1 duration-150`}
                >
                  {searchResults.results.length === 0 ? (
                    <div className={`p-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <p className="text-sm">No tasks found for "{searchQuery}"</p>
                      {searchResults.archivedMatches > 0 && (
                        <p className="text-xs mt-1">{searchResults.archivedMatches} match{searchResults.archivedMatches > 1 ? 'es' : ''} in History or Hidden. Turn on “Search History & Hidden” in Settings to see {searchResults.archivedMatches > 1 ? 'them' : 'it'}.</p>
                      )}
                    </div>
                  ) : (
                    <div className="max-h-[60vh] md:max-h-96 overflow-y-auto">
                      {searchResults.results.map((result, idx) => (
                        <button
                          key={`${result.task.id}-${idx}`}
                          onClick={() => {
                            openTask(result.task.id);
                            setSearchQuery('');
                            setShowSearchDropdown(false);
                            (document.activeElement as HTMLElement | null)?.blur();
                          }}
                          className={`w-full p-3 flex items-start gap-3 transition-colors text-left border-b last:border-b-0 ${isDarkMode ? 'hover:bg-slate-700 active:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 active:bg-slate-100 border-slate-100'}`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            result.task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isDarkMode ? 'border-slate-500' : 'border-slate-300'
                          }`}>
                            {result.task.isCompleted && <Icons.Check />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              result.status === 'deleted' || result.task.isCompleted ? 'text-slate-400 line-through' : isDarkMode ? 'text-slate-100' : 'text-ink'
                            }`}>
                              {result.task.title || 'Untitled task'}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                <ListIcon icon={result.categoryIcon} size={12} /> {result.categoryName}
                              </span>
                              {result.parentTitle && (
                                <span className={`text-xs truncate max-w-[10rem] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Subtask of {result.parentTitle}</span>
                              )}
                              {result.status === 'deleted' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isDarkMode ? 'bg-red-900/40 text-red-300' : 'bg-red-50 text-red-600'}`}>Deleted · History</span>
                              )}
                              {result.status === 'hidden' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isDarkMode ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-50 text-amber-700'}`}>Hidden</span>
                              )}
                              {result.status === 'completed' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>Completed</span>
                              )}
                              {result.status === 'active' && (result.task.scheduledDate || result.task.dueDate) && (
                                <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-1 ${isDarkMode ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                                  <Icons.Calendar /> {new Date((result.task.scheduledDate || result.task.dueDate) + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4 md:ml-auto">
              
              {/* Notification Bell: only collaboration invites arrive here, so it shows when collaboration is on */}
              {FEATURES.collaboration && (
              <div className="relative">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  onClick={handleOpenNotifications}
                  title="Notifications"
                  className={showNotifications ? 'bg-[color:var(--theme-secondary)] text-accent' : isDarkMode ? '!bg-slate-700 !text-slate-200 !border-slate-600' : ''}
                >
                  <Icons.Bell />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 top-full mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-slate-800/95 backdrop-blur-sm border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>Notifications</h3>
                      <button aria-label="Close notifications" 
                        onClick={() => setShowNotifications(false)}
                        className={isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}
                      >
                        <Icons.X />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={`p-8 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                          <BellIcon size={36} className="mx-auto mb-2 opacity-60" />
                          <p className="text-sm">No notifications yet</p>
                          {isCloudConfigured && !cloudUser && (
                            <button onClick={() => { setShowNotifications(false); setShowAccount(true); }} className="mt-3 text-sm font-semibold" style={{ color: 'var(--theme-primary)' }}>
                              Sign in to receive collaboration invites
                            </button>
                          )}
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div 
                            key={notification.id}
                            className={`p-4 border-b transition-colors ${
                              isDarkMode 
                                ? `border-slate-700 hover:bg-slate-700 ${!notification.isRead ? 'bg-white/[0.07]' : ''}` 
                                : `border-slate-50 hover:bg-slate-50 ${!notification.isRead ? 'bg-[color:var(--theme-secondary)]' : ''}`
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                notification.type === 'invite_received' ? 'bg-[color:var(--theme-secondary)] text-accent' :
                                notification.type === 'invite_accepted' ? 'bg-emerald-100 text-emerald-600' :
                                notification.type === 'invite_declined' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {notification.type === 'invite_received' ? <Icons.Users size={18} /> :
                                 notification.type === 'invite_accepted' ? <Icons.CheckCircle size={18} /> :
                                 notification.type === 'invite_declined' ? <Icons.X /> : <Icons.Send size={18} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-ink'}`}>{notification.title}</p>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notification.message}</p>
                                {notification.taskTitle && (
                                  <p className="text-xs text-accent mt-1 truncate flex items-center gap-1"><ClipboardList size={12} className="shrink-0" /> {notification.taskTitle}</p>
                                )}
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {new Date(notification.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                                </p>
                                {notification.type === 'invite_received' && (
                                  notification.inviteStatus === 'pending' ? (
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        onClick={() => respondToCollabInvite(notification, true)}
                                        className="flex-1 h-10 rounded-xl text-sm font-semibold text-on-accent"
                                        style={{ backgroundColor: 'var(--theme-primary)' }}
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => respondToCollabInvite(notification, false)}
                                        className={`flex-1 h-10 rounded-xl text-sm font-semibold ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                                      >
                                        Decline
                                      </button>
                                    </div>
                                  ) : (
                                    <p className={`text-xs font-semibold mt-2 ${notification.inviteStatus === 'accepted' ? 'text-emerald-500' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {notification.inviteStatus === 'accepted' ? <span className="inline-flex items-center gap-1"><Icons.Check /> Accepted</span> : 'Declined'}
                                    </p>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}
              {/* Settings Button */}
              <Button 
                variant="secondary" 
                size="icon" 
                onClick={() => setShowSettings(true)}
                title="Settings"
                aria-label="Settings"
                className={`w-11 h-11 ${showSettings ? 'bg-[color:var(--theme-secondary)] text-accent' : isDarkMode ? '!bg-slate-700 !text-slate-200 !border-slate-600' : ''}`}
              >
                <Icons.Settings />
              </Button>
            </div>
          </div>

        </header>

        <div className="flex-1 overflow-y-auto p-5 pb-40 md:px-10 lg:px-16 md:pt-10 md:pb-24 custom-scrollbar">
          <div className="max-w-3xl md:max-w-[780px] mx-auto md:mx-0 relative">

            <div className="transition-all duration-700">
              {/* Hidden Tasks Page */}
              {activeCategory === 'hidden' ? (
                <div>
                  <div className="mb-6 md:mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                        <Icons.EyeOff />
                      </div>
                      <div>
                        <h2 className={`text-2xl md:text-4xl font-extrabold font-display ${isDarkMode ? 'text-white' : 'text-ink'} tracking-tight`}>
                          Hidden Tasks
                        </h2>
                        <p className={`text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {tasks.filter(t => t.isPrivate && !t.deletedAt).length} task{tasks.filter(t => t.isPrivate && !t.deletedAt).length !== 1 ? 's' : ''} hidden from your lists
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {tasks.filter(t => t.isPrivate && !t.deletedAt).length > 0 ? (
                    <div className="space-y-3">
                      {tasks.filter(t => t.isPrivate && !t.deletedAt).map(task => {
                        const taskCategory = task.categoryIds?.[0] 
                          ? categories.find(c => c.id === task.categoryIds![0])
                          : categories.find(c => c.id === 'daily');
                        return (
                          <div 
                            key={task.id}
                            onClick={() => openTask(task.id)}
                            className={`p-4 rounded-xl cursor-pointer transition-all ${
                              isDarkMode 
                                ? 'bg-slate-800 hover:bg-slate-750 border-slate-700' 
                                : 'bg-white hover:shadow-md border-slate-200'
                            } border`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={task.isCompleted}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => updateTask(task.id, { isCompleted: !task.isCompleted })}
                                className="mt-1 w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium ${task.isCompleted ? 'line-through opacity-50' : ''} ${isDarkMode ? 'text-slate-200' : 'text-ink'}`}>
                                  {task.title}
                                </p>
                                {task.notes && (
                                  <p className={`text-sm mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {task.notes}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span 
                                    className="text-xs font-medium px-2 py-1 rounded-lg"
                                    style={{ 
                                      backgroundColor: taskCategory?.color ? `${taskCategory.color}20` : (isDarkMode ? '#374151' : '#f3f4f6'),
                                      color: taskCategory?.color || (isDarkMode ? '#9ca3af' : '#6b7280')
                                    }}
                                  >
                                    <span className="inline-flex items-center gap-1"><ListIcon icon={taskCategory?.icon} size={13} /> {taskCategory?.name || 'Today'}</span>
                                  </span>
                                  {task.priority && (
                                    <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
                                      task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                      task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                                      'bg-blue-100 text-blue-700'
                                    }`}>
                                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const categoryIds = task.categoryIds && task.categoryIds.length > 0 ? task.categoryIds : ['daily'];
                                  updateTask(task.id, { isPrivate: false, categoryIds });
                                }}
                                className={`p-2 rounded-lg transition-all flex items-center gap-1 group ${isDarkMode ? 'text-amber-400 hover:bg-amber-900/50' : 'text-amber-600 hover:bg-amber-100'}`}
                                title="Unhide"
                              >
                                <Icons.Eye />
                                <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Unhide</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <Icons.EyeOff />
                      </div>
                      <p className="text-lg font-medium">No hidden tasks</p>
                      <p className="text-sm mt-1">Tasks you hide will appear here</p>
                    </div>
                  )}
                </div>
              ) : activeCategory === 'history' ? (
                /* History Page */
                <div>
                  <div className="mb-6 md:mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600'}`}>
                        <Icons.History />
                      </div>
                      <div>
                        <h2 className={`text-2xl md:text-4xl font-extrabold font-display ${isDarkMode ? 'text-white' : 'text-ink'} tracking-tight`}>
                          Task History
                        </h2>
                        <p className={`text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {allHistoryTasks?.length || 0} task{(allHistoryTasks?.length || 0) !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    {allHistoryTasks.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className={`h-10 px-4 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all active:scale-95 ${isDarkMode ? 'border-red-900/60 text-red-300 hover:bg-red-900/20' : 'border-red-200 text-red-600 bg-white hover:bg-red-50'}`}
                      >
                        <Icons.Trash /> Clear history
                      </button>
                    )}
                  </div>
                  
                  {allHistoryTasks && allHistoryTasks.length > 0 ? (
                    <div className="space-y-3">
                      {allHistoryTasks.map(task => {
                        const taskCategory = task.categoryIds && task.categoryIds.length > 0
                          ? categories.find(c => c.id === task.categoryIds![0])
                          : categories.find(c => c.id === 'daily');
                        
                        const isDeleted = task.deletedAt;
                        const isCompleted = task.isCompleted;
                        
                        return (
                          <div
                            key={task.id}
                            className={`p-4 rounded-xl transition-all cursor-pointer ${
                              isDarkMode 
                                ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' 
                                : 'bg-white border-slate-200 hover:shadow-md'
                            } border`}
                            onClick={() => openTask(task.id)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isDeleted 
                                  ? (isDarkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-600')
                                  : isCompleted 
                                  ? (isDarkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-600')
                                  : (isDarkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600')
                              }`}>
                                {isDeleted ? <Icons.Trash /> : isCompleted ? <Icons.Check /> : <ClipboardList size={14} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`font-medium ${isCompleted || isDeleted ? 'line-through' : ''} ${isDarkMode ? 'text-slate-200' : 'text-ink'}`}>
                                  {task.title}
                                </p>
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span 
                                    className="text-xs font-medium px-2 py-1 rounded-lg"
                                    style={{ 
                                      backgroundColor: taskCategory?.color ? `${taskCategory.color}20` : (isDarkMode ? '#374151' : '#f3f4f6'),
                                      color: taskCategory?.color || (isDarkMode ? '#9ca3af' : '#6b7280')
                                    }}
                                  >
                                    <span className="inline-flex items-center gap-1"><ListIcon icon={taskCategory?.icon} size={13} /> {taskCategory?.name || 'Today'}</span>
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded-lg ${
                                    isDeleted 
                                      ? (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                                      : isCompleted
                                      ? (isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700')
                                      : (isDarkMode ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                                  }`}>
                                    {isDeleted ? 'Deleted' : isCompleted ? 'Completed' : 'Incomplete'}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                {(isCompleted || isDeleted) && (
                                  <IconTip
                                    label="Restore to list"
                                    onClick={() => {
                                      if (isDeleted) {
                                        updateTask(task.id, { deletedAt: undefined });
                                      } else {
                                        restoreFromHistory(task.id);
                                      }
                                    }}
                                    className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all active:scale-90 ${isDarkMode ? 'text-green-400 hover:bg-green-900/50' : 'text-green-600 hover:bg-green-100'}`}
                                  >
                                    <Icons.RotateCcw />
                                  </IconTip>
                                )}
                                <IconTip
                                  label="Add again as new task"
                                  onClick={() => repeatFromHistory(task)}
                                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all active:scale-90 ${isDarkMode ? 'text-blue-400 hover:bg-blue-900/50' : 'text-blue-600 hover:bg-blue-100'}`}
                                >
                                  <Icons.Repeat />
                                </IconTip>
                                <IconTip
                                  label="Delete forever"
                                  onClick={() => deleteForever(task)}
                                  className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all active:scale-90 ${isDarkMode ? 'text-red-400 hover:bg-red-900/40' : 'text-red-500 hover:bg-red-50'}`}
                                >
                                  <Icons.Trash />
                                </IconTip>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                        <Icons.History />
                      </div>
                      <p className="text-lg font-medium">No history yet</p>
                      <p className="text-sm mt-1">Complete or delete tasks to see them here</p>
                    </div>
                  )}
                </div>
              ) : activeCategory === 'progress' ? (
                /* Progress Page */
                <div>
                  <div className="mb-6 md:mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${isDarkMode ? 'bg-white/[0.07]' : 'bg-[color:var(--theme-secondary)]'}`}>
                        <BarChart3 size={26} />
                      </div>
                      <div>
                        <h2 className={`text-2xl md:text-4xl font-extrabold font-display ${isDarkMode ? 'text-white' : 'text-ink'} tracking-tight`}>
                          Progress Analytics
                        </h2>
                        <p className={`text-sm md:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Track your productivity over time
                        </p>
                      </div>
                    </div>
                    
                    {/* View Toggle */}
                    <div className={`inline-flex rounded-lg p-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <button
                        onClick={() => setProgressViewType('weekly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          progressViewType === 'weekly' 
                            ? (isDarkMode ? 'bg-accent text-on-accent' : 'bg-white text-accent shadow-sm')
                            : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-ink')
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => setProgressViewType('monthly')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                          progressViewType === 'monthly' 
                            ? (isDarkMode ? 'bg-accent text-on-accent' : 'bg-white text-accent shadow-sm')
                            : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-ink')
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {(() => {
                      const now = new Date();
                      const periodStart = progressViewType === 'weekly' 
                        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                      const periodTasks = completedTasks.filter(t => t.completedAt && t.completedAt >= periodStart.getTime());
                      const avgPerDay = periodTasks.length / (progressViewType === 'weekly' ? 7 : 30);
                      const totalSubtasks = periodTasks.reduce((acc, t) => acc + (t.subTasks?.filter(st => st.isCompleted).length || 0), 0);
                      
                      return (
                        <>
                          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-green-50'}`}>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>{periodTasks.length}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Tasks Completed</p>
                          </div>
                          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-blue-50'}`}>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>{avgPerDay.toFixed(1)}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg per Day</p>
                          </div>
                          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-[color:var(--theme-secondary)]'}`}>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-accent' : 'text-accent'}`}>{totalSubtasks}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Subtasks Done</p>
                          </div>
                          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-amber-50'}`}>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>{completedTasks.length}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>All Time Total</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* Progress Chart */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'} mb-6`}>
                    <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-ink'}`}>
                      {progressViewType === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'}
                    </h3>
                    <div className="h-48 flex items-end gap-1 md:gap-2">
                      {(() => {
                        const days = progressViewType === 'weekly' ? 7 : 30;
                        const now = new Date();
                        const dayData: { date: Date; count: number; label: string }[] = [];
                        
                        for (let i = days - 1; i >= 0; i--) {
                          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                          const dayEnd = dayStart + 24 * 60 * 60 * 1000;
                          const count = completedTasks.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt < dayEnd).length;
                          dayData.push({
                            date,
                            count,
                            label: progressViewType === 'weekly' 
                              ? date.toLocaleDateString('en-US', { weekday: 'short' })
                              : date.getDate().toString()
                          });
                        }
                        
                        const maxCount = Math.max(...dayData.map(d => d.count), 1);
                        
                        return dayData.map((day, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div 
                              className={`w-full rounded-t-md transition-all ${
                                day.count > 0 
                                  ? 'bg-[var(--theme-primary)]'
                                  : (isDarkMode ? 'bg-slate-700' : 'bg-slate-200')
                              }`}
                              style={{ height: `${Math.max((day.count / maxCount) * 140, 4)}px` }}
                              title={`${day.date.toLocaleDateString()}: ${day.count} tasks`}
                            />
                            <span className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {day.label}
                            </span>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>

                  {/* Tasks by List */}
                  <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
                    <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-ink'}`}>
                      Completed by List
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        const now = new Date();
                        const periodStart = progressViewType === 'weekly' 
                          ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                          : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        const periodTasks = completedTasks.filter(t => t.completedAt && t.completedAt >= periodStart.getTime());
                        
                        const byCategory: Record<string, number> = {};
                        periodTasks.forEach(task => {
                          const catId = task.categoryIds?.[0] || 'daily';
                          byCategory[catId] = (byCategory[catId] || 0) + 1;
                        });
                        
                        const total = periodTasks.length || 1;
                        
                        if (Object.keys(byCategory).length === 0) {
                          return (
                            <p className={`text-sm text-center py-4 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              No data for this period
                            </p>
                          );
                        }
                        
                        return Object.entries(byCategory)
                          .sort(([, a], [, b]) => b - a)
                          .map(([catId, count]) => {
                            const cat = categories.find(c => c.id === catId) || { name: 'Today', icon: 'sun', color: '#6366f1' };
                            const percentage = (count / total) * 100;
                            
                            return (
                              <div key={catId} className="flex items-center gap-3">
                                <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}><ListIcon icon={cat.icon} size={20} /></span>
                                <div className="flex-1">
                                  <div className="flex justify-between mb-1">
                                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{cat.name}</span>
                                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{count} {count === 1 ? 'task' : 'tasks'}</span>
                                  </div>
                                  <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
                                    <div 
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${percentage}%`, backgroundColor: 'var(--theme-primary)' }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  </div>
                </div>
              ) : activeCategory === 'daily' ? (
                /* Today: weekday, large date and the two actions, then a thin progress line */
                <div className="mb-6 md:mb-10">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-8">
                    <div className="min-w-0">
                      <p className={`text-sm md:text-base font-semibold ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>
                        {new Date().toLocaleDateString('en-GB', { weekday: 'long' })}
                      </p>
                      <h2 className={`mt-1 text-[38px] md:text-6xl font-extrabold font-display tracking-[-0.03em] leading-[1.02] ${isDarkMode ? 'text-white' : 'text-ink'}`}>
                        {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
                      </h2>
                      <p className={`mt-3 text-sm md:text-base italic leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>
                        {isAllCompleted ? "All clear. You've finished everything." : <span className="inline-flex items-center gap-1.5"><ThemeIcon theme={visualTheme} size={16} style={{ color: 'var(--theme-primary)' }} />{activeTheme.tagline}</span>}
                      </p>
                    </div>
                    <div className="flex gap-2 md:gap-3 shrink-0 md:pb-1">
                      <button
                        onClick={() => addTask()}
                        className="group h-12 md:h-11 px-5 rounded-full font-semibold text-on-accent flex items-center gap-2 transition-all hover:brightness-110 active:scale-[0.97]"
                        style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 10px 22px -12px rgba(var(--theme-shadow-color), 0.9)' }}
                      >
                        <span className="transition-transform duration-200 group-hover:rotate-90"><Icons.Plus /></span> New task
                      </button>
                      <button
                        onClick={planAheadTask}
                        className={`h-12 md:h-11 px-5 rounded-full font-semibold flex items-center gap-2 border-[1.5px] transition-all active:scale-[0.97] ${isDarkMode ? 'border-slate-600 text-white hover:bg-white/5' : 'border-[color:var(--theme-primary-lighter)] bg-sheet text-ink hover:border-[color:var(--theme-primary-light)]'}`}
                      >
                        <Icons.Calendar /> Plan ahead
                      </button>
                    </div>
                  </div>

                  {/* Progress: a line that fills as tasks are done */}
                  {progressStats.total > 0 && (
                    <div className="mt-6 md:mt-8 flex items-center gap-4" role="progressbar" aria-valuemin={0} aria-valuemax={progressStats.total} aria-valuenow={progressStats.completed} aria-label="Today's progress">
                      <div className={`flex-1 h-[3px] rounded-full overflow-hidden ${isDarkMode ? 'bg-slate-700' : 'bg-line'}`}>
                        <div
                          className="h-full rounded-full transition-[width] duration-700 ease-out"
                          style={{ width: `${progressStats.percentage}%`, backgroundColor: 'var(--theme-primary)' }}
                        />
                      </div>
                      <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-muted'}`}>
                        {progressStats.percentage === 100 ? 'All done for today' : `${progressStats.completed} of ${progressStats.total} done`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                /* Other lists: name and description, with New task beside it on desktop */
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-5 md:gap-8">
                  <div className="min-w-0">
                    <h2 className={`text-[34px] md:text-5xl font-extrabold font-display tracking-[-0.03em] leading-[1.05] ${isDarkMode ? 'text-white' : 'text-ink'}`}>
                      {categories.find(c => c.id === activeCategory)?.name || 'My Tasks'}
                    </h2>
                    <p className={`mt-3 text-sm md:text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>
                      {activeCategory === 'shared' 
                        ? "Tasks that others have shared with you"
                        : isQuickList(activeCategory)
                        ? `Jot things down fast. ${isTouchDevice() ? 'Tap return' : 'Press Enter'} for the next line.`
                        : isAllCompleted ? "All clear. You've finished everything." : "Capture your ideas and daily goals."}
                    </p>
                  </div>
                  {/* Quick lists: Clear instead of New task (items are added right in the list) */}
                  {isQuickList(activeCategory) && tasks.some(t => !t.deletedAt && t.categoryIds?.includes(activeCategory)) && (
                    <button
                      onClick={() => clearQuickList(activeCategory)}
                      className={`h-11 px-5 rounded-full font-semibold flex items-center justify-center gap-2 shrink-0 border-[1.5px] transition-colors active:scale-[0.97] self-start md:self-auto ${isDarkMode ? 'border-slate-600 text-slate-200 hover:border-red-400 hover:text-red-300' : 'border-line bg-sheet text-ink hover:border-red-300 hover:text-red-600'}`}
                    >
                      <Icons.Trash /> Clear
                    </button>
                  )}
                  {/* Hide New task for Shared with Me and quick lists */}
                  {activeCategory !== 'shared' && !isQuickList(activeCategory) && (
                    <button
                      onClick={() => addTask()}
                      className="group h-12 md:h-11 px-5 rounded-full font-semibold text-on-accent flex items-center justify-center gap-2 shrink-0 transition-all hover:brightness-110 active:scale-[0.97] w-full md:w-auto"
                      style={{ backgroundColor: 'var(--theme-primary)', boxShadow: '0 10px 22px -12px rgba(var(--theme-shadow-color), 0.9)' }}
                    >
                      <span className="transition-transform duration-200 group-hover:rotate-90"><Icons.Plus /></span> New task
                    </button>
                  )}
                </div>
              )}

              {/* Task List - with date grouping for Daily List (History, Hidden and Progress are full pages above) */}
              {['hidden', 'history', 'progress'].includes(activeCategory) ? null : activeCategory === 'daily' ? (
                <div className="space-y-8">
                  {/* Today's Tasks */}
                  <div ref={todayListRef} className="relative space-y-4">
                    {sortByPriority(tasks
                      .filter(t => !t.isPrivate && shouldShowCompletedTask(t) && (t.categoryIds?.includes('daily') || (!t.categoryIds && activeCategory === 'daily')) && (!t.scheduledDate || t.scheduledDate <= today) && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    ).map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          onUpdate={updateTask}
                          onDelete={deleteTask}
                          onSelect={(t) => openTask(t.id)}
                          categories={categories}
                          isInHiddenSection={false}
                          isDarkMode={isDarkMode}
                          sortSubtasksByPriority={sortByPriorityEnabled}
                        doneToBottom={doneToBottom}
                        />
                      ))}
                    <QuickAddRow onAdd={(title) => addInlineTask(title, 'daily')} isDarkMode={isDarkMode} />
                    {/* Suggestions: set apart from Quick add, in an even grid; one tap adds it to today */}
                    {allSuggestions.length > 0 && (
                      <section className="pt-8 md:pt-10" aria-labelledby="suggested-heading">
                        <h3 id="suggested-heading" className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>Suggested</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {allSuggestions.map(suggestion => (
                            <button
                              key={suggestion.text}
                              onClick={() => { addInlineTask(suggestion.text, 'daily'); setToast(`Added "${suggestion.text}"`); }}
                              title={suggestion.recurring ? 'You add this often' : undefined}
                              className={`suggestion-chip group min-h-[52px] px-3.5 py-2.5 rounded-2xl border text-left text-sm leading-snug flex items-start gap-2 ${isDarkMode ? 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-500' : 'border-line text-ink hover:bg-sheet'}`}
                            >
                              <span className="mt-[2px] shrink-0" style={{ color: 'var(--theme-primary)' }}>
                                {suggestion.recurring ? <RefreshCw size={15} aria-label="You add this often" /> : <Icons.Plus size={15} />}
                              </span>
                              <span className="min-w-0">{suggestion.text}</span>
                            </button>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  {/* Future Dated Tasks - grouped by date */}
                  {(() => {
                    const futureTasks = tasks.filter(t => !t.isPrivate && shouldShowCompletedTask(t) && (t.categoryIds?.includes('daily') || (!t.categoryIds && activeCategory === 'daily')) && t.scheduledDate && t.scheduledDate > today && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
                    const groupedByDate = futureTasks.reduce((acc, task) => {
                      const date = task.scheduledDate!;
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(task);
                      return acc;
                    }, {} as Record<string, Task[]>);
                    
                    const sortedDates = Object.keys(groupedByDate).sort();
                    
                    return sortedDates.map(dateStr => {
                      const date = new Date(dateStr + 'T00:00:00');
                      const day = date.getDate();
                      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                      const month = date.toLocaleDateString('en-US', { month: 'long' });
                      const year = date.getFullYear();
                      const formattedDate = `${day}${suffix} ${month}, ${year}`;
                      
                      return (
                        <div key={dateStr} className="space-y-4">
                          <div className={`flex items-center gap-3 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/[0.07] text-accent' : 'bg-[color:var(--theme-secondary)] text-accent'}`}>
                              <Icons.Calendar />
                            </div>
                            <div>
                              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>{formattedDate}</h3>
                              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{groupedByDate[dateStr].length} task{groupedByDate[dateStr].length > 1 ? 's' : ''} scheduled</p>
                            </div>
                          </div>
                          {sortByPriority(groupedByDate[dateStr]).map(task => (
                            <TaskItem 
                              key={task.id} 
                              task={task} 
                              onUpdate={updateTask}
                              onDelete={deleteTask}
                              onSelect={(t) => openTask(t.id)}
                              categories={categories}
                              isInHiddenSection={false}
                              isDarkMode={isDarkMode}
                              sortSubtasksByPriority={sortByPriorityEnabled}
                        doneToBottom={doneToBottom}
                            />
                          ))}
                        </div>
                      );
                    });
                  })()}

                  {/* Daily Inspiration on phones (on larger screens it's in the sidebar) */}
                  <div className="md:hidden">{inspirationCard}</div>
                  
                  {categoryTasks.filter(shouldShowCompletedTask).length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl ${isDarkMode ? 'bg-slate-800/70' : 'bg-white/70'} backdrop-blur-sm shadow-sm`}>
                        <ThemeIcon theme={visualTheme} variant="empty" size={34} style={{ color: 'var(--theme-primary)' }} />
                      </div>
                      <p className={`text-lg font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{activeTheme.emptyTitle}</p>
                      <p className="text-sm mt-1">{activeTheme.emptyText}</p>
                    </div>
                  )}
                </div>
              ) : activeCategory === 'shared' ? (
                /* Shared with Me - Group tasks by who shared them */
                <div className="space-y-6">
                  {(() => {
                    const sharedTasks = tasks.filter(t => t.categoryIds?.includes('shared') && shouldShowCompletedTask(t) && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
                    
                    if (sharedTasks.length === 0) {
                      return (
                        <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <UsersIcon size={30} />
                          </div>
                          <p className="text-lg font-medium">No tasks shared with you</p>
                          <p className="text-sm mt-2 text-center max-w-xs">When someone shares a task with you, it will appear here organized by who shared it.</p>
                        </div>
                      );
                    }
                    
                    // Group tasks by sharedBy user
                    const groupedByUser = sharedTasks.reduce((acc, task) => {
                      const sharerId = task.sharedBy?.id || 'unknown';
                      if (!acc[sharerId]) {
                        acc[sharerId] = { user: task.sharedBy, tasks: [] };
                      }
                      acc[sharerId].tasks.push(task);
                      return acc;
                    }, {} as Record<string, { user: SharedUser | undefined; tasks: Task[] }>);
                    
                    return Object.entries(groupedByUser).map(([sharerId, group]) => {
                      const { user, tasks: userTasks } = group as { user: SharedUser | undefined; tasks: Task[] };
                      return (
                      <div key={sharerId} className="space-y-3">
                        <div className={`flex items-center gap-3 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          {user?.avatar ? (
                            <img src={user.avatar} className="w-8 h-8 rounded-full" alt={user.name} />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-white/[0.07] text-accent' : 'bg-[color:var(--theme-secondary)] text-accent'}`}>
                              <User size={16} />
                            </div>
                          )}
                          <div>
                            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>
                              Shared by {user?.name || 'Unknown'}
                            </h3>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {userTasks.length} task{userTasks.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 pl-2">
                          {sortByPriority(userTasks).map(task => (
                            <TaskItem 
                              key={task.id} 
                              task={task} 
                              onUpdate={updateTask}
                              onDelete={deleteTask}
                              onSelect={(t) => openTask(t.id)}
                              categories={categories}
                              isInHiddenSection={false}
                              isDarkMode={isDarkMode}
                              sortSubtasksByPriority={sortByPriorityEnabled}
                        doneToBottom={doneToBottom}
                            />
                          ))}
                        </div>
                      </div>
                    )});
                  })()}
                </div>
              ) : isQuickList(activeCategory) ? (
                <QuickList
                  key={activeCategory}
                  items={tasks
                    .filter(t => !t.isPrivate && shouldShowCompletedTask(t) && t.categoryIds?.includes(activeCategory) && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => a.createdAt - b.createdAt)}
                  onAdd={addQuickItem}
                  onToggle={(id) => {
                    const item = tasks.find(t => t.id === id);
                    if (item) updateTask(id, { isCompleted: !item.isCompleted });
                  }}
                  onRename={(id, title) => updateTask(id, { title })}
                  onDelete={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
                  onRemove={(id) => deleteTask(id)}
                  onOpen={openTask}
                  isDarkMode={isDarkMode}
                />
              ) : (
                <div ref={listRef} className="relative space-y-4">
                  {sortByPriority(tasks
                    .filter(t => !t.isPrivate && shouldShowCompletedTask(t) && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily')) && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onSelect={(t) => openTask(t.id)}
                        categories={categories}
                        isInHiddenSection={false}
                        isDarkMode={isDarkMode}
                        sortSubtasksByPriority={sortByPriorityEnabled}
                        doneToBottom={doneToBottom}
                      />
                  ))}

                  <QuickAddRow onAdd={(title) => addInlineTask(title, activeCategory)} isDarkMode={isDarkMode} />
                
                  {categoryTasks.filter(shouldShowCompletedTask).length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl ${isDarkMode ? 'bg-slate-800/70' : 'bg-white/70'} backdrop-blur-sm shadow-sm`}>
                        <ThemeIcon theme={visualTheme} variant="empty" size={34} style={{ color: 'var(--theme-primary)' }} />
                      </div>
                      <p className={`text-lg font-semibold ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{activeTheme.emptyTitle}</p>
                      <p className="text-sm mt-1">{activeTheme.emptyText}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Task panel: the details of the open task, or the editor */}
      {selectedTask && (
        <aside
          key={selectedTask.id}
          className={`safe-panel fixed md:relative inset-0 md:inset-auto w-full md:w-[380px] md:max-w-md shadow-2xl z-50 md:z-30 ${
            panelClosing
              ? 'animate-out slide-out-to-right-full md:slide-out-to-right-8 fade-out duration-200 fill-mode-forwards'
              : 'animate-in slide-in-from-right-full md:slide-in-from-right-8 fade-in duration-300'
          } ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
        >
          {selectedTask.id === newTaskId || isEditingTask ? (
            <TaskDetails 
              key={selectedTask.id}
              task={selectedTask}
              onUpdate={(updates) => updateTask(selectedTask.id, updates)}
              isNewTask={selectedTask.id === newTaskId}
              planAhead={selectedTask.id === planAheadTaskId}
              onClose={closeTaskPanel}
              onCancel={() => {
                const id = selectedTask.id;
                if (id === newTaskId) {
                  // Discard the new task once the panel has slid away (a real remove,
                  // not deleteTask, so it doesn't show up in History)
                  panelCloseActionRef.current = () => setTasks(prev => prev.filter(t => t.id !== id));
                } else if (editSnapshot && editSnapshot.id === id) {
                  // Undo changes made while editing
                  const snapshot = editSnapshot;
                  panelCloseActionRef.current = () => replaceTask(snapshot);
                }
              }}
              onComplete={() => {
                if (!selectedTask.title.trim()) updateTask(selectedTask.id, { title: 'Untitled task' });
                if (selectedTask.id === newTaskId) {
                  savedNewTaskRef.current = selectedTask.id;
                  if (Capacitor.isNativePlatform()) Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
                  if (selectedTask.scheduledDate && selectedTask.scheduledDate > today) {
                    setToast(`Planned for ${new Date(selectedTask.scheduledDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`);
                  }
                }
              }}
              categories={categories}
              onAddCategory={addNewCategory}
              onShareDetails={() => handleShareDetails(selectedTask)}
              onInvite={FEATURES.collaboration ? () => setCollabTaskId(selectedTask.id) : undefined}
              canRepeat={tasks.some(t => t.id === selectedTask.id)}
              notificationPermission={notificationPermission}
              onRequestNotificationPermission={requestNotificationPermission}
              isDarkMode={isDarkMode}
            />
          ) : (
            <TaskViewer
              task={selectedTask}
              onClose={closeTaskPanel}
              categories={categories}
              isDarkMode={isDarkMode}
              onEdit={() => {
                setEditSnapshot(selectedTask);
                setIsEditingTask(true);
              }}
              onRestore={() => updateTask(selectedTask.id, selectedTask.deletedAt ? { deletedAt: undefined } : { isPrivate: false })}
              isCreator={true}
            />
          )}
        </aside>
      )}

      {/* Collaboration Invite Modal */}
      {(collabTask || showAccount) && (
        <CollaborateModal
          task={collabTask}
          pendingEmails={collabTask?.cloudId ? sharedDocs[collabTask.cloudId]?.pendingEmails : []}
          user={cloudUser}
          onUserChanged={setCloudUser}
          onSendInvite={handleSendInvite}
          onClose={() => { setCollabTaskId(null); setShowAccount(false); }}
          isDarkMode={isDarkMode}
        />
      )}

      {listPickerFor && (
        <AddToListsModal
          taskTitle={listPickerFor.title}
          categories={categories}
          onDone={(listIds) => applyListChoice(listPickerFor.cloudId, listIds)}
          isDarkMode={isDarkMode}
        />
      )}

      {themeReveal && (
        <ThemeSwitchOverlay theme={themeReveal} onDone={closeThemeReveal} />
      )}

      <DialogHost isDarkMode={isDarkMode} />

      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[110] max-w-[calc(100vw-2rem)] px-4 py-3 rounded-2xl shadow-2xl text-sm font-medium bg-slate-900 text-white text-center"
          key={toast}
          style={{
            bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
            animation: toastLeaving ? 'toastOut 0.3s ease-in forwards' : 'toastIn 0.38s cubic-bezier(0.22, 0.61, 0.36, 1) both',
          }}
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Celebration Modal - All Tasks Completed */}
      {showCelebrationModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-end md:items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={() => setShowCelebrationModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="celebration-title"
            className={`relative w-full max-w-md md:mx-4 rounded-t-3xl md:rounded-3xl p-6 md:p-8 shadow-2xl text-center overflow-hidden animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 fade-in duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-sheet text-ink'}`}
            style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: 'var(--theme-primary)' }} />
            <div className="check-pop w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}>
              <Trophy size={42} weight="duotone" />
            </div>
            <h2 id="celebration-title" className="font-display text-2xl md:text-3xl font-extrabold tracking-tight">All done for today</h2>
            <p className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>Every task on the list is finished. Rest up, or get tomorrow ready.</p>
            <blockquote className={`mt-5 mb-6 rounded-2xl p-4 text-sm italic leading-relaxed ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[color:var(--theme-paper)] text-muted'}`}>
              “{VICTORY_QUOTES[victoryIdx]}”
            </blockquote>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setShowCelebrationModal(false); planAheadTask(); }}
                className="h-12 rounded-xl font-semibold text-on-accent flex items-center justify-center gap-2 transition-transform active:scale-[0.97]"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <CalendarPlus size={18} /> Plan tomorrow
              </button>
              <div className="flex gap-3">
                <button
                  onClick={triggerThemedConfetti}
                  className={`flex-1 h-12 rounded-xl font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.97] ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`}
                >
                  <PartyPopper size={18} /> More confetti
                </button>
                <button
                  onClick={() => setShowCelebrationModal(false)}
                  className={`flex-1 h-12 rounded-xl font-semibold transition-transform active:scale-[0.97] ${isDarkMode ? 'bg-slate-800 text-slate-100' : 'bg-slate-100 text-slate-700'}`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className={`fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50 backdrop-blur-sm ${settingsClosing ? 'animate-out fade-out duration-200 fill-mode-forwards' : 'animate-in fade-in duration-200'}`}
          onClick={closeSettings}
        >
          <div 
            className={`rounded-t-3xl md:rounded-3xl max-w-md w-full md:mx-4 shadow-2xl overflow-hidden h-[88dvh] md:h-auto md:max-h-[85vh] flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-white'} ${
              settingsClosing ? 'animate-out slide-out-to-bottom-1/4 md:slide-out-to-bottom-0 md:zoom-out-95 fade-out duration-200 fill-mode-forwards' : 'animate-in slide-in-from-bottom-1/4 md:slide-in-from-bottom-0 md:zoom-in-95 fade-in duration-300'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Settings Panel */}
            <div 
              className={`flex flex-col flex-1 min-h-0 transition-all duration-300 ease-out ${settingsPanel !== 'main' ? 'hidden' : ''}`}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/[0.07] text-accent' : 'bg-[color:var(--theme-secondary)] text-accent'}`}>
                    <Icons.Settings />
                  </div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>Settings</h2>
                </div>
                <button aria-label="Close settings" 
                  onClick={closeSettings}
                  className={`w-11 h-11 -mr-2 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icons.X />
                </button>
              </div>

              {/* Main Content */}
              <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-2 ${isDarkMode ? 'bg-slate-900' : ''}`} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                
                {/* Quick Toggles Section */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <p className={`text-[13px] font-semibold mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Workflow</p>
                  
                  {/* Carry Forward */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Workflow /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Carry Forward Tasks</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Move incomplete tasks to today</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCarryForwardEnabled(!carryForwardEnabled)}
                      aria-label="Carry forward tasks"
                      role="switch"
                      aria-checked={carryForwardEnabled}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${carryForwardEnabled ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${carryForwardEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Rotating Inspiration */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Sparkles /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Rotating quotes</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>A new quote every hour</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRotationEnabled(!rotationEnabled)}
                      aria-label="Rotating quotes"
                      role="switch"
                      aria-checked={rotationEnabled}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${rotationEnabled ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${rotationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Suggestions */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Lists /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Suggestions</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Task ideas under Today, new every 20 minutes</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSuggestionsEnabled(!suggestionsEnabled)}
                      role="switch"
                      aria-checked={suggestionsEnabled}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${suggestionsEnabled ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Suggestions"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${suggestionsEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Confetti when all done */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><PartyPopper size={16} /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Confetti when all done</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Celebrate finishing the day's tasks</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfettiOnComplete(!confettiOnComplete)}
                      role="switch"
                      aria-checked={confettiOnComplete}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${confettiOnComplete ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Confetti when all done"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${confettiOnComplete ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Sort by priority */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><ArrowDownWideNarrow size={16} /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Sort by priority</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>High-priority tasks and subtasks first</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSortByPriorityEnabled(!sortByPriorityEnabled)}
                      role="switch"
                      aria-checked={sortByPriorityEnabled}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${sortByPriorityEnabled ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Sort by priority"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${sortByPriorityEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Done tasks move down */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.CheckCircle /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Move done tasks down</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Finished tasks gather at the bottom of the list</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDoneToBottom(!doneToBottom)}
                      role="switch"
                      aria-checked={doneToBottom}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${doneToBottom ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Move done tasks down"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${doneToBottom ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Search History & Hidden */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Search /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Search History & Hidden</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Include deleted and hidden tasks in search</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSearchIncludeArchived(!searchIncludeArchived)}
                      role="switch"
                      aria-checked={searchIncludeArchived}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${searchIncludeArchived ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Search History & Hidden"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${searchIncludeArchived ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Completed tasks disappear */}
                  <div className="py-2">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.CheckCircle /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Hide completed tasks</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>They stay available in History</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {COMPLETED_DISAPPEAR_OPTIONS.map(option => (
                        <button
                          key={option.id}
                          onClick={() => setCompletedDisappearTime(option.id)}
                          className={`h-9 px-3 rounded-full text-sm font-medium border transition-all ${
                            completedDisappearTime === option.id
                              ? 'text-on-accent border-transparent'
                              : isDarkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600 bg-white'
                          }`}
                          style={completedDisappearTime === option.id ? { backgroundColor: 'var(--theme-primary)' } : undefined}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Account */}
                {FEATURES.collaboration && (
                <button
                  onClick={() => { closeSettings(); setShowAccount(true); }}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 active:scale-[0.98]' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-emerald-900/50 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                      <Icons.Users size={20} />
                    </div>
                    <div className="text-left min-w-0">
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Account & collaboration</p>
                      <p className={`text-xs truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        {!isCloudConfigured ? 'Not set up yet' : cloudUser ? cloudUser.email : 'Sign in to collaborate'}
                      </p>
                    </div>
                  </div>
                  <CaretRight size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} aria-hidden="true" />
                </button>
                )}

                {/* Navigation Cards */}
                <button
                  onClick={() => setSettingsPanel('lists')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-750 active:scale-[0.98]' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      <Icons.Lists size={20} />
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Manage Lists</p>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{categories.filter(isListShown).length} lists · Reorder, rename and change icons</p>
                    </div>
                  </div>
                  <CaretRight size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} aria-hidden="true" />
                </button>

                <button
                  onClick={() => setSettingsPanel('appearance')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-750 active:scale-[0.98]' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-white/[0.07] text-accent' : 'bg-[color:var(--theme-secondary)] text-accent'}`}>
                      <Icons.Palette />
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Appearance</p>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{displayMode === 'system' ? 'System' : displayMode === 'dark' ? 'Dark' : 'Light'} mode • {THEMES[theme as keyof typeof THEMES]?.name} theme</p>
                    </div>
                  </div>
                  <CaretRight size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} aria-hidden="true" />
                </button>

                {/* Notifications Section */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <p className={`text-[13px] font-semibold mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reminders</p>

                  {/* Permission status */}
                  <div className="flex items-center justify-between gap-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Bell /></span>
                      <div className="min-w-0">
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Notifications</p>
                        <p className={`text-xs ${notificationPermission === 'granted' ? 'text-emerald-500' : isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {notificationPermission === 'granted' ? 'Allowed'
                            : notificationPermission === 'denied' ? (Capacitor.isNativePlatform() ? 'Off. Turn on in iPhone Settings → MentaList' : 'Blocked. Allow notifications for this site in your browser settings')
                            : notificationPermission === 'unsupported' ? 'Not supported in this browser'
                            : 'Not allowed yet'}
                        </p>
                      </div>
                    </div>
                    {notificationPermission === 'prompt' && (
                      <button onClick={requestNotificationPermission} className="shrink-0 h-9 px-4 rounded-full text-sm font-semibold text-on-accent" style={{ backgroundColor: 'var(--theme-primary)' }}>
                        Allow
                      </button>
                    )}
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Daily summaries: today's tasks in the morning, the day's progress in the evening */}
                  {([
                    { key: 'morning', label: 'Morning summary', hint: 'Today’s tasks, at the start of your day', icon: <Sun size={16} />, enabled: summarySettings.morningEnabled, time: summarySettings.morningTime },
                    { key: 'evening', label: 'Evening wrap-up', hint: 'How the day went, and what’s still open', icon: <Moon size={16} />, enabled: summarySettings.eveningEnabled, time: summarySettings.eveningTime },
                  ] as const).map(row => (
                    <div key={row.key} className="py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}>{row.icon}</span>
                          <div className="min-w-0">
                            <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>{row.label}</p>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{row.enabled ? `Every day at ${new Date(`2000-01-01T${row.time}:00`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}` : row.hint}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const on = !row.enabled;
                            setSummarySettings(prev => ({ ...prev, [row.key === 'morning' ? 'morningEnabled' : 'eveningEnabled']: on }));
                            if (on && notificationPermission === 'prompt') requestNotificationPermission();
                            if (on && notificationPermission === 'denied') setToast(Capacitor.isNativePlatform() ? 'Turn on notifications for MentaList in iPhone Settings to receive it' : 'Allow notifications for this site in your browser to receive it');
                          }}
                          role="switch"
                          aria-checked={row.enabled}
                          aria-label={row.label}
                          className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${row.enabled ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${row.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                        </button>
                      </div>
                      {row.enabled && (
                        <div className="mt-2.5 pl-11 animate-in fade-in slide-in-from-top-1 duration-200">
                          <TimeField
                            compact
                            value={row.time}
                            onChange={(value) => value && setSummarySettings(prev => ({ ...prev, [row.key === 'morning' ? 'morningTime' : 'eveningTime']: value }))}
                            isDarkMode={isDarkMode}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Music /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Sound</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{!soundSettings.enabled ? 'Silent reminders' : Capacitor.isNativePlatform() ? 'A soft chime with each reminder, at your ringer volume' : 'A soft chime with each reminder'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const enabled = !soundSettings.enabled;
                        setSoundSettings(prev => ({ ...prev, enabled }));
                        if (enabled) reminderService.playPreviewSound();
                      }}
                      role="switch"
                      aria-checked={soundSettings.enabled}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${soundSettings.enabled ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Sound"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${soundSettings.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {(Capacitor.isNativePlatform() || isTouchDevice()) && (<>
                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Vibration Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-slate-600 shadow-sm'}`}><Icons.Vibrate /></span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Vibration</p>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {Capacitor.isNativePlatform() ? 'When the app is open. Locked-screen vibration follows iPhone Sounds & Haptics' : 'On phones that support it'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const vibration = !soundSettings.vibration;
                        setSoundSettings(prev => ({ ...prev, vibration }));
                        // The service gets the new setting straight away so the test buzz below works
                        reminderService.updateSettings({ ...soundSettings, vibration });
                        if (vibration) reminderService.triggerVibration();
                      }}
                      role="switch"
                      aria-checked={soundSettings.vibration}
                      className={`w-11 h-6 shrink-0 rounded-full transition-all duration-200 relative ${soundSettings.vibration ? 'bg-accent' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                      aria-label="Vibration"
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${soundSettings.vibration ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  </>)}

                  <button
                    onClick={async () => {
                      await reminderService.testNotification();
                      setNotificationPermission(await reminderService.getPermissionState());
                      if (Capacitor.isNativePlatform()) setToast('Test notification arrives in 3 seconds. Try locking your phone.');
                    }}
                    className={`mt-2 w-full h-11 rounded-xl text-sm font-semibold ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-white border border-slate-200 text-slate-700'}`}
                  >
                    Send test notification
                  </button>
                </div>

                {/* Guide */}
                <button
                  onClick={() => setSettingsPanel('guide')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between text-left transition-colors ${isDarkMode ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}><Lifebuoy size={20} weight="duotone" /></span>
                    <div>
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>Guide</p>
                      <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Every feature, explained, and how to reach us</p>
                    </div>
                  </div>
                  <CaretRight size={18} className={isDarkMode ? 'text-slate-500' : 'text-slate-400'} aria-hidden="true" />
                </button>

                {/* Why MentaList and the privacy policy: kept quiet, at the very end */}
                <div className={`pt-4 pb-1 flex items-center justify-center gap-1 text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <button onClick={() => { setGuideOpenedStory(false); setSettingsPanel('story'); }} className="px-2 py-2 transition-opacity hover:opacity-70">Why MentaList</button>
                  <span aria-hidden="true">·</span>
                  <button onClick={() => { setGuideOpenedStory(false); setSettingsPanel('privacy'); }} className="px-2 py-2 transition-opacity hover:opacity-70">Privacy policy</button>
                  <span aria-hidden="true">·</span>
                  <span className="px-2 py-2">Version {APP_VERSION}</span>
                </div>
              </div>
            </div>

            {/* Guide and Why MentaList */}
            {(['guide', 'story', 'privacy'] as const).map(panel => (
              <div
                key={panel}
                className={`flex flex-col flex-1 min-h-0 ${settingsPanel !== panel ? 'hidden' : ''}`}
                style={{ animation: settingsPanel === panel ? 'slideInRight 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none' }}
              >
                <div className={`p-5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                  <button
                    onClick={() => setSettingsPanel(panel !== 'guide' && guideOpenedStory ? 'guide' : 'main')}
                    aria-label="Back"
                    className={`w-11 h-11 -ml-3 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                  >
                    <CaretLeft size={20} aria-hidden="true" />
                  </button>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>{panel === 'guide' ? 'Guide' : panel === 'story' ? 'Why MentaList' : 'Privacy policy'}</h2>
                </div>
                <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 ${isDarkMode ? 'bg-slate-900' : ''}`} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                  {/* Only the open page is rendered, so its animations start when it's shown */}
                  {settingsPanel === 'guide' && panel === 'guide' && <GuideContent isDarkMode={isDarkMode} onOpenStory={() => { setGuideOpenedStory(true); setSettingsPanel('story'); }} onOpenPrivacy={() => { setGuideOpenedStory(true); setSettingsPanel('privacy'); }} />}
                  {settingsPanel === 'story' && panel === 'story' && <StoryContent isDarkMode={isDarkMode} />}
                  {/* The policy is one page (public/privacy.html), shared with the web address given to the App Store */}
                  {settingsPanel === 'privacy' && panel === 'privacy' && (
                    <iframe src={`privacy.html?embedded&look=${isDarkMode ? 'dark' : 'light'}`} title="Privacy policy" className="w-full h-full min-h-[70vh] rounded-xl border-0 bg-transparent" />
                  )}
                </div>
              </div>
            ))}

            {/* Lists Panel */}
            <div 
              className={`flex flex-col flex-1 min-h-0 ${settingsPanel !== 'lists' ? 'hidden' : ''}`}
              style={{ animation: settingsPanel === 'lists' ? 'slideInRight 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none' }}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <button aria-label="Back" 
                  onClick={() => setSettingsPanel('main')}
                  className={`w-11 h-11 -ml-3 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <CaretLeft size={20} aria-hidden="true" />
                </button>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <Icons.Lists size={18} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>Manage Lists</h2>
                    <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Tip: {isTouchDevice() ? 'long-press' : 'double-click'} a list in the sidebar to rename it</p>
                  </div>
                </div>
              </div>

              {/* Lists Content */}
              <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-2 ${isDarkMode ? 'bg-slate-900' : ''}`} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                {categories.filter(isListShown).map((category, index, shownLists) => {
                  const isProtected = PROTECTED_LISTS.includes(category.id);
                  return (
                    <div 
                      key={category.id}
                      className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-200 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50 border border-slate-200'}`}
                    >
                      {/* Drag Handle with Move Up/Down - Always visible */}
                      <div className="relative group">
                        <button
                          onClick={() => setShowIconPicker(showIconPicker === `reorder-${category.id}` ? null : `reorder-${category.id}`)}
                          aria-label={`Move ${category.name}`}
                          className={`w-11 h-11 -m-1.5 flex items-center justify-center rounded-lg transition-colors cursor-grab ${isDarkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                          title="Reorder list"
                        >
                          <DotsSixVertical size={16} aria-hidden="true" />
                        </button>
                        
                        {/* Move dropdown */}
                        {showIconPicker === `reorder-${category.id}` && (
                          <div 
                            className={`absolute top-full left-0 mt-1 z-50 rounded-lg shadow-xl border py-1 min-w-[120px] ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                            style={{ animation: 'fadeIn 0.15s ease-out' }}
                          >
                            <button
                              onClick={() => { moveCategoryUp(category.id); setShowIconPicker(null); }}
                              disabled={index === 0}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                index === 0 
                                  ? 'opacity-40 cursor-not-allowed' 
                                  : isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <CaretUp size={14} weight="bold" aria-hidden="true" />
                              Move Up
                            </button>
                            <button
                              onClick={() => { moveCategoryDown(category.id); setShowIconPicker(null); }}
                              disabled={index === shownLists.length - 1}
                              className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                                index === shownLists.length - 1 
                                  ? 'opacity-40 cursor-not-allowed' 
                                  : isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <CaretDown size={14} weight="bold" aria-hidden="true" />
                              Move Down
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Icon */}
                      <div className="relative">
                        <button aria-label="Change list icon"
                          onClick={() => setShowIconPicker(showIconPicker === category.id ? null : category.id)}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                        >
                          <ListIcon icon={category.icon} size={20} />
                        </button>
                        
                        {showIconPicker === category.id && (
                          <div 
                            className={`absolute top-12 left-0 z-50 rounded-xl shadow-2xl border p-2 w-60 ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                            style={{ animation: 'fadeIn 0.15s ease-out' }}
                          >
                            <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto">
                              {CATEGORY_ICONS.map((icon, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => updateCategoryIcon(category.id, icon)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 active:scale-90 ${normalizeListIcon(category.icon) === icon ? 'bg-[color:var(--theme-secondary)] ring-2 ring-[color:var(--theme-primary)]' : isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
                                  aria-label={`Use the ${icon} icon`}
                                >
                                  <ListIcon icon={icon} size={18} />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* List Name */}
                      <div className="flex-1 min-w-0">
                        {editingListId === category.id ? (
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => updateCategoryName(category.id, e.target.value)}
                            onBlur={() => setEditingListId(null)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingListId(null); }}
                            autoFocus
                            className={`w-full px-3 py-1.5 rounded-lg border-2 border-[color:var(--theme-primary)] text-sm font-medium focus:outline-none ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0">
                              <p className={`font-semibold text-sm truncate ${isDarkMode ? 'text-white' : 'text-ink'}`}>{category.name}</p>
                              {isProtected && <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>System list</p>}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {/* Edit Button - Always visible for non-protected lists */}
                        {!isProtected && editingListId !== category.id && (
                          <button
                            onClick={() => setEditingListId(category.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1 ${isDarkMode ? 'bg-slate-700 text-slate-300 hover:brightness-110 hover:text-white' : 'bg-slate-100 text-slate-600 hover:brightness-110 hover:text-white'}`}
                          >
                            <Icons.Edit /> Edit
                          </button>
                        )}
                        
                        {/* Delete Button */}
                        {isProtected ? (
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                            <LockSimple size={16} aria-hidden="true" />
                          </div>
                        ) : (
                          <button aria-label="Delete list"
                            onClick={async () => {
                              const ok = await dialogs.confirm({
                                title: `Delete “${category.name}”?`,
                                message: 'Its tasks move to Today.',
                                confirmLabel: 'Delete list',
                                destructive: true,
                              });
                              if (ok) deleteCategory(category.id);
                            }}
                            className={`w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
                          >
                            <Icons.Trash />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Add New List */}
                <button
                  onClick={async () => {
                    // The Create button stays disabled until a name is typed
                    const result = await dialogs.promptChoice({ title: 'New list', placeholder: 'List name', confirmLabel: 'Create list', choices: NEW_LIST_CHOICES });
                    if (result === null) return;
                    const newId = addNewCategory(result.text, result.choice === 'quick' ? 'quick' : undefined);
                    setActiveCategory(newId);
                    setEditingListId(newId);
                  }}
                  className={`w-full p-3 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${isDarkMode ? 'border-slate-600 text-slate-400 hover:border-[color:var(--theme-primary)] hover:text-accent hover:bg-white/5' : 'border-slate-300 text-slate-500 hover:border-[color:var(--theme-primary)] hover:text-accent hover:bg-[color:var(--theme-secondary)]'}`}
                >
                  <Icons.Plus className="w-[18px] h-[18px]" /> Add New List
                </button>
              </div>
            </div>

            {/* Appearance Panel */}
            <div 
              className={`flex flex-col flex-1 min-h-0 ${settingsPanel !== 'appearance' ? 'hidden' : ''}`}
              style={{ animation: settingsPanel === 'appearance' ? 'slideInRight 0.32s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none' }}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <button aria-label="Back" 
                  onClick={() => setSettingsPanel('main')}
                  className={`w-11 h-11 -ml-3 flex items-center justify-center rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <CaretLeft size={20} aria-hidden="true" />
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-white/[0.07] text-accent' : 'bg-[color:var(--theme-secondary)] text-accent'}`}>
                    <Icons.Palette />
                  </div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>Appearance</h2>
                </div>
              </div>

              {/* Appearance Content */}
              <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 ${isDarkMode ? 'bg-slate-900' : ''}`} style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
                
                {/* Display Mode */}
                <div>
                  <p className={`text-sm font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-ink'}`}>Display mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'light', icon: <Sun size={22} />, label: 'Light' },
                      { id: 'dark', icon: <Moon size={22} />, label: 'Dark' },
                      { id: 'system', icon: <Monitor size={22} />, label: 'System' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setDisplayMode(mode.id as 'light' | 'dark' | 'system')}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                          displayMode === mode.id 
                            ? 'border-[color:var(--theme-primary)] bg-[color:var(--theme-secondary)]' 
                            : isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`flex justify-center mb-1.5 ${isDarkMode ? 'text-slate-200' : 'text-slate-600'}`}>{mode.icon}</div>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-ink'}`}>{mode.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Themes: light ones first, then the ones that switch the app to dark */}
                {[
                  { title: 'Light themes', note: 'Best in light mode. In dark mode the app uses its neutral dark look, and your theme returns when you switch back.', dark: false },
                  { title: 'Dark themes', note: 'These switch the whole app to dark, whatever your display mode.', dark: true },
                ].map(group => (
                  <div key={group.title}>
                    <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-ink'}`}>{group.title}</p>
                    <p className={`text-xs mt-0.5 mb-3 leading-snug ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>{group.note}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(THEMES).filter(([, t]) => !!t.isDark === group.dark).map(([key, themeData]) => {
                        const selected = theme === key;
                        const [ground, text, accent] = themeData.swatch as string[];
                        return (
                          <button
                            key={key}
                            onClick={() => selectTheme(key as ThemeType)}
                            aria-pressed={selected}
                            className={`group/theme rounded-2xl border-2 overflow-hidden text-left transition-[border-color,transform] duration-200 ease-out active:scale-[0.98] ${
                              selected ? '' : isDarkMode ? 'border-slate-700 hover:border-slate-500' : 'border-line hover:border-[color:var(--theme-primary-lighter)]'
                            }`}
                            style={selected ? { borderColor: 'var(--theme-primary)' } : undefined}
                          >
                            {/* A tiny picture of the theme: its ground, a line of text and its accent */}
                            <div className="h-14 px-3 flex items-center gap-2" style={{ backgroundColor: ground }}>
                              <span className="w-3.5 h-3.5 rounded-full border-2 shrink-0" style={{ borderColor: accent }} />
                              <span className="h-1.5 w-12 rounded-full" style={{ backgroundColor: text, opacity: 0.85 }} />
                              <span className="ml-auto" style={{ color: accent }}><ThemeIcon theme={key} size={18} /></span>
                            </div>
                            <div className={`px-3 py-2.5 ${isDarkMode ? 'bg-slate-800/60' : 'bg-sheet'}`}>
                              <span className={`flex items-center justify-between gap-2 font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-ink'}`}>
                                {themeData.name}
                                {selected && <span style={{ color: 'var(--theme-primary)' }}><Icons.Check /></span>}
                              </span>
                              <p className={`text-xs mt-0.5 leading-snug ${isDarkMode ? 'text-slate-400' : 'text-muted'}`}>{themeData.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Preview Button */}
                <button
                  onClick={triggerThemedConfetti}
                  className={`w-full p-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  <PartyPopper size={18} /> Preview Celebration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Floating Confetti Button - Hidden on mobile when sidebar or task details are open */}
      <button
        onClick={triggerThemedConfetti}
        aria-label="Celebrate with confetti"
        className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 w-12 h-12 md:w-14 md:h-14 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 border-slate-600' : 'bg-slate-100 hover:bg-slate-200 border-slate-200'} border rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-xl md:text-2xl transition-all hover:scale-110 active:scale-95 z-40 group ${selectedTask ? 'hidden' : sidebarOpen ? 'hidden md:flex' : ''}`}
        title="Celebrate"
      >
        <span className="group-hover:animate-bounce text-[var(--theme-primary)]"><Icons.Party size={22} /></span>
      </button>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-right {
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(30px); 
          }
          to { 
            opacity: 1;
            transform: translateX(0); 
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translate(-50%, 10px) scale(0.98); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translate(-50%, 0); }
          to { opacity: 0; transform: translate(-50%, 6px); }
        }
        /* animate-in / fade-in / zoom-in / slide-in-from-* come from tailwindcss-animate */
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95); 
          }
          to { 
            opacity: 1;
            transform: scale(1); 
          }
        }
      `}</style>
    </div>
  );
};

export default App;
