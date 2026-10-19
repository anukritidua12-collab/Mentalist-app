import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Task, Attachment, AttachmentType, Category } from '../types';
import { Icons } from '../constants';
import { dialogs } from './Dialogs';
import { REPEAT_OPTIONS, describeRepeat, nextOccurrenceDate } from '../services/repeatService';
import { RepeatFrequency } from '../types';
import { detectSmartLinks } from '../services/smartLinkService';
import { createAttachment, deleteAttachmentFile, attachmentSrc } from '../services/attachmentService';
import { PermissionState } from '../services/reminderService';
import { generateId, toLocalDateString, tapWord } from '../utils';
import { DateField, TimeField, CalendarGrid, QuickDateChips, formatPickerDate } from './DatePicker';
import { FileTypeIcon, SmartLinkIcon, ListIcon } from './AppIcons';

interface TaskDetailsProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onClose: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  isNewTask?: boolean;
  planAhead?: boolean; // Opened from Plan Ahead: date picker shown up front
  categories?: Category[];
  onAddCategory?: (name: string) => string; // Creates the list and returns its id
  onShareDetails?: () => void;
  onInvite?: () => void;
  notificationPermission?: PermissionState;
  onRequestNotificationPermission?: () => void;
  isDarkMode?: boolean;
  canRepeat?: boolean; // Main tasks can repeat; subtasks follow their parent
}

const MAX_ATTACHMENT_MB = 25;

const getTodayDate = () => toLocalDateString();

const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

const newSubTask = (): Task => ({
  id: generateId(),
  title: '',
  isCompleted: false,
  notes: '',
  subTasks: [],
  attachments: [],
  sharedWith: [],
  createdAt: Date.now(),
  priority: 'medium',
  isPrivate: false,
  categoryIds: []
});


const fileExtension = (name: string) => name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';

const attachmentSize = (att: Attachment) => {
  if (!att.url.startsWith('data:')) return '';
  // Base64 data URLs are ~4/3 the size of the original file
  const bytes = Math.round(att.url.length * 0.75);
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Defined at module level: a component declared inside TaskDetails would be recreated
// on every render, making text fields inside it lose focus after each keystroke.
const Section: React.FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode; isDarkMode: boolean; children: React.ReactNode }> = ({ icon, title, action, isDarkMode, children }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between min-h-[32px]">
      <h3 className={`flex items-center gap-2 text-[13px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        <span className="opacity-80">{icon}</span>{title}
      </h3>
      {action}
    </div>
    {children}
  </section>
);

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  task, onUpdate, onClose, onComplete, onCancel, isNewTask = false, planAhead = false,
  categories = [], onAddCategory, onShareDetails, onInvite, notificationPermission, onRequestNotificationPermission,
  isDarkMode = false, canRepeat = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const smartLinks = useMemo(() => detectSmartLinks(task.title), [task.title]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);
  const [newListName, setNewListName] = useState('');
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [scheduleWarning, setScheduleWarning] = useState<string | null>(null);
  const [isAttaching, setIsAttaching] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const subtaskInputRef = useRef<HTMLInputElement>(null);
  // The task as it was when the panel opened, to tell whether anything was changed
  const initialTaskRef = useRef(JSON.stringify(task));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const hasChanges = JSON.stringify(task) !== initialTaskRef.current;

  // × and Cancel: discard straight away if nothing changed, otherwise ask first
  const requestCancel = () => {
    if (hasChanges) { setConfirmDiscard(true); return; }
    onCancel?.();
    onClose();
  };

  const today = getTodayDate();
  const hasTitle = task.title.trim().length > 0;

  // Focus the task name when creating a task; select it if it was pre-filled (Quick Add)
  useEffect(() => {
    if (isNewTask && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [task.id, isNewTask]);

  // Grow the task name box with its text
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [task.title]);

  // ---------- Styles ----------
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const strong = isDarkMode ? 'text-slate-100' : 'text-ink';
  const card = isDarkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200';
  const field = `w-full h-12 px-3 rounded-xl border text-base outline-none transition-colors focus:border-[var(--theme-primary)] ${
    isDarkMode ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-slate-50 border-slate-200 text-ink'
  }`;
  const linkButton = 'text-sm font-semibold flex items-center gap-1 px-2 py-1 -mr-2 rounded-lg';

  // ---------- Date & time ----------
  // Planned-ahead tasks keep their date in scheduledDate (it decides when they
  // move into Today); other tasks use dueDate.
  const dateKey: 'scheduledDate' | 'dueDate' = planAhead || task.scheduledDate ? 'scheduledDate' : 'dueDate';
  const taskDate = task[dateKey];

  // Messages fade away on their own
  useEffect(() => {
    if (!scheduleWarning) return;
    const timer = setTimeout(() => setScheduleWarning(null), 4000);
    return () => clearTimeout(timer);
  }, [scheduleWarning]);

  const warnIfTimePassed = (date: string | undefined, time: string | undefined) => {
    if (time && (date || today) === today && time <= getCurrentTime()) {
      setScheduleWarning('That time has already passed today, so the reminder won\'t go off. Pick a later time or another date.');
    }
  };

  const setTaskDate = (date: string | undefined) => {
    // A monthly or yearly repeat follows the new day of the month
    onUpdate(task.repeat && date
      ? { [dateKey]: date, repeat: { ...task.repeat, anchorDay: Number(date.slice(8, 10)) } }
      : { [dateKey]: date });
    warnIfTimePassed(date, task.reminderTime);
  };

  const setReminderTime = (value: string | undefined) => {
    // A reminder with no date is for today
    onUpdate(value && !task.dueDate && !task.scheduledDate
      ? { reminderTime: value, dueDate: today }
      : { reminderTime: value });
    warnIfTimePassed(taskDate, value);
    if (value && notificationPermission === 'prompt') onRequestNotificationPermission?.();
  };

  // ---------- Repeat ----------
  // A repeating task needs a date to repeat from; if it has none, it starts today
  const setRepeat = (frequency: RepeatFrequency | null) => {
    if (!frequency) { onUpdate({ repeat: undefined }); return; }
    const date = taskDate || today;
    onUpdate({ repeat: { frequency, anchorDay: Number(date.slice(8, 10)) }, ...(taskDate ? {} : { [dateKey]: date }) });
  };
  const repeatDate = taskDate || today;
  const repeatField = canRepeat && (
    <div className="min-w-0">
      <p className={`text-sm font-semibold mb-1.5 ${strong}`}>Repeat</p>
      {/* A native menu: the iPhone shows its picker wheel, computers a dropdown */}
      <label className={`relative flex items-center w-full h-12 rounded-xl border cursor-pointer focus-within:border-[var(--theme-primary)] transition-colors ${isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <span className={`pl-3 shrink-0 ${task.repeat ? '' : 'opacity-70'} ${isDarkMode ? 'text-white' : 'text-ink'}`} style={task.repeat ? { color: 'var(--theme-primary)' } : undefined}><Icons.Repeat /></span>
        <select
          value={task.repeat?.frequency || ''}
          onChange={e => setRepeat((e.target.value || null) as RepeatFrequency | null)}
          aria-label="Repeat"
          className={`appearance-none flex-1 min-w-0 h-full pl-2 pr-9 bg-transparent text-base outline-none cursor-pointer ${task.repeat ? (isDarkMode ? 'text-white' : 'text-ink') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}
        >
          <option value="">Never</option>
          {REPEAT_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
        <span className={`pointer-events-none absolute right-3 ${muted}`}><Icons.ChevronDown /></span>
      </label>
      {task.repeat && (
        <p className={`text-xs mt-1.5 leading-relaxed animate-in fade-in duration-200 ${muted}`}>
          {describeRepeat(task.repeat, repeatDate)}. The next one appears on{' '}
          {new Date(nextOccurrenceDate(task.repeat, repeatDate, today) + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
          {' '}when you tick this off.
        </p>
      )}
    </div>
  );

  // ---------- Lists ----------
  const handleCreateNewList = () => {
    const trimmed = newListName.trim();
    if (!trimmed) return;
    if (onAddCategory) {
      const newId = onAddCategory(trimmed);
      onUpdate({ categoryIds: [...(task.categoryIds || []), newId] });
    }
    setNewListName('');
    setIsCreatingList(false);
  };

  const toggleCategory = (categoryId: string) => {
    const currentIds = task.categoryIds || [];
    if (currentIds.includes(categoryId)) {
      // A task always stays in at least one list
      if (currentIds.length > 1) onUpdate({ categoryIds: currentIds.filter(id => id !== categoryId) });
    } else {
      onUpdate({ categoryIds: [...currentIds, categoryId] });
    }
  };

  // ---------- Subtasks ----------
  const visibleSubTasks = task.subTasks.filter(s => !s.deletedAt);

  // Adds the subtask typed in the "Add a subtask" box
  // With openDetails (the › button), the new subtask opens straight away for its
  // priority, date, reminder and notes
  const addSubTask = (openDetails = false) => {
    const title = newSubtaskTitle.trim();
    if (!title) {
      subtaskInputRef.current?.focus();
      return;
    }
    const created = { ...newSubTask(), title };
    onUpdate({ subTasks: [...task.subTasks, created] });
    setNewSubtaskTitle('');
    if (openDetails) {
      setExpandedSubtasks(prev => new Set(prev).add(created.id));
      subtaskInputRef.current?.blur();
    } else {
      subtaskInputRef.current?.focus(); // ready for the next one
    }
  };

  const updateSubTask = (subtaskId: string, updates: Partial<Task>) => {
    onUpdate({ subTasks: task.subTasks.map(st => st.id === subtaskId ? { ...st, ...updates } : st) });
  };

  const deleteSubTask = (subtaskId: string) => {
    onUpdate({ subTasks: task.subTasks.filter(st => st.id !== subtaskId) });
  };

  const finishEditingSubtask = (subtask: Task) => {
    setEditingSubtask(null);
    // Discard a new subtask that was left empty
    if (!subtask.title.trim()) deleteSubTask(subtask.id);
  };

  const toggleSubtaskExpanded = (subtaskId: string) => {
    setExpandedSubtasks(prev => {
      const next = new Set(prev);
      if (next.has(subtaskId)) next.delete(subtaskId); else next.add(subtaskId);
      return next;
    });
  };

  // ---------- Attachments ----------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;
    // Large files (long videos especially) can run the app out of memory while saving
    if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
      dialogs.alert({ title: 'That file is too large', message: `Attachments can be up to ${MAX_ATTACHMENT_MB} MB. Try a shorter video or a smaller file.` });
      return;
    }
    setIsAttaching(true);
    try {
      const attachment = await createAttachment(file);
      onUpdate({ attachments: [...task.attachments, attachment] });
    } catch (err) {
      console.error('Failed to attach file', err);
      dialogs.alert({ title: 'Couldn’t attach that file', message: 'Try a different file, or one that’s smaller.' });
    } finally {
      setIsAttaching(false);
    }
  };

  const removeAttachment = (att: Attachment) => {
    onUpdate({ attachments: task.attachments.filter(a => a.id !== att.id) });
    deleteAttachmentFile(att);
  };

  const priorityOptions: { value: Task['priority']; label: string; color: string }[] = [
    { value: 'high', label: 'High', color: '#ef4444' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'low', label: 'Low', color: '#3b82f6' },
  ];

  const showPermissionHint = !!task.reminderTime && (notificationPermission === 'denied' || notificationPermission === 'prompt');

  const scheduleMessages = (
    <>
      {scheduleWarning && (
        <p className={`text-sm rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-200 ${isDarkMode ? 'text-amber-300 bg-amber-900/30' : 'text-amber-700 bg-amber-50'}`}>{scheduleWarning}</p>
      )}
      {showPermissionHint && (
        <div className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 ${isDarkMode ? 'bg-slate-900/60' : 'bg-slate-100'}`}>
          <p className={`text-sm ${muted}`}>
            {notificationPermission === 'denied'
              ? (Capacitor.isNativePlatform()
                ? 'Notifications are off for MentaList. Turn them on in Settings → MentaList → Notifications.'
                : 'Notifications are blocked for this site. Allow them in your browser\'s site settings.')
              : 'Allow notifications so this reminder can reach you.'}
          </p>
          {notificationPermission === 'prompt' && (
            <button onClick={onRequestNotificationPermission} className="shrink-0 text-sm font-semibold active:opacity-60" style={{ color: 'var(--theme-primary)' }}>Allow</button>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={`relative h-full flex flex-col overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <h2 className={`font-display font-bold text-lg ${strong}`}>{planAhead ? 'Plan ahead' : isNewTask ? 'New task' : 'Edit task'}</h2>
        <button
          // Same as Cancel: discards a new task, or undoes edits to an existing one
          onClick={requestCancel}
          className={`w-10 h-10 -mr-2 rounded-xl flex items-center justify-center transition-all active:scale-90 ${muted} ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
          aria-label="Cancel and close"
        >
          <Icons.X />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-7">
        {/* Task name (highlighted) */}
        <div
          className="rounded-2xl p-4 border-2 transition-shadow focus-within:shadow-lg"
          style={{
            borderColor: 'var(--theme-primary)',
            backgroundColor: isDarkMode ? 'rgba(var(--theme-shadow-color), 0.12)' : 'var(--theme-secondary)',
          }}
        >
          <label htmlFor="task-title" className="block text-[13px] font-semibold mb-2" style={{ color: 'var(--theme-primary)' }}>
            Task name
          </label>
          <textarea
            id="task-title"
            ref={titleRef}
            className={`w-full min-h-[56px] text-2xl leading-snug font-display font-bold p-0 resize-none border-none outline-none focus:ring-0 bg-transparent ${isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-ink placeholder:text-slate-400'}`}
            style={{ fontSize: '1.5rem' }}
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value.replace(/\n/g, ' ') })}
            placeholder="What needs to be done?"
            rows={1}
            enterKeyHint="done"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }}
          />
          {smartLinks.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {smartLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 h-11 px-4 rounded-full text-white text-sm font-semibold ${link.color}`}
                >
                  <SmartLinkIcon icon={link.icon} />{link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {planAhead && (
          <div
            className="rounded-2xl p-4 border-2 space-y-4"
            style={{ borderColor: 'var(--theme-primary)', backgroundColor: isDarkMode ? 'rgba(var(--theme-shadow-color), 0.10)' : 'white' }}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold" style={{ color: 'var(--theme-primary)' }}>When?</p>
              <p className={`text-base font-semibold ${strong}`}>{taskDate ? formatPickerDate(taskDate) : 'Pick a date'}</p>
            </div>
            <QuickDateChips min={today} value={taskDate} onSelect={setTaskDate} isDarkMode={isDarkMode} />
            <CalendarGrid value={taskDate} min={today} onSelect={setTaskDate} isDarkMode={isDarkMode} />
            <div>
              <p className={`text-sm font-semibold mb-1.5 ${strong}`}>Reminder time <span className={`font-normal ${muted}`}>(optional)</span></p>
              <TimeField value={task.reminderTime} onChange={setReminderTime} isDarkMode={isDarkMode} />
            </div>
            {repeatField}
            {scheduleMessages}
          </div>
        )}

        {/* Priority */}
        <Section isDarkMode={isDarkMode} icon={<Icons.Sparkles />} title="Priority">
          <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200/70'}`}>
            {priorityOptions.map(opt => {
              const active = task.priority === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ priority: opt.value })}
                  className={`h-11 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                    active ? (isDarkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-ink shadow') : muted
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: opt.color }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Lists */}
        {categories.length > 0 && (
          <Section isDarkMode={isDarkMode} icon={<Icons.ListChecks />} title="Lists">
            <div className="flex flex-wrap gap-2">
              {categories.filter(cat => cat.id !== 'shared').map(category => {
                const isSelected = task.categoryIds?.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`h-10 flex items-center gap-2 px-3.5 rounded-full border text-sm font-medium transition-all active:scale-95 ${
                      isSelected ? 'text-on-accent border-transparent' : isDarkMode ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                    style={isSelected ? { backgroundColor: 'var(--theme-primary)' } : undefined}
                  >
                    <ListIcon icon={category.icon} size={16} />
                    {category.name}
                  </button>
                );
              })}
              {isCreatingList ? (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    autoFocus
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateNewList();
                      if (e.key === 'Escape') { setNewListName(''); setIsCreatingList(false); }
                    }}
                    placeholder="New list name"
                    className={`${field} flex-1`}
                  />
                  <button onClick={handleCreateNewList} disabled={!newListName.trim()} className="h-12 px-4 rounded-xl text-on-accent font-semibold disabled:opacity-40" style={{ backgroundColor: 'var(--theme-primary)' }}>
                    Add
                  </button>
                  <button onClick={() => { setNewListName(''); setIsCreatingList(false); }} className={`h-12 px-3 rounded-xl ${muted}`} aria-label="Cancel">
                    <Icons.X />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsCreatingList(true)}
                  className={`h-10 flex items-center gap-1.5 px-3.5 rounded-full border border-dashed text-sm font-medium ${isDarkMode ? 'border-slate-600 text-slate-400' : 'border-slate-300 text-slate-500'}`}
                >
                  <Icons.Plus /> New list
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Schedule (Plan Ahead shows its own "When?" card at the top instead) */}
        {!planAhead && (
          <Section isDarkMode={isDarkMode} icon={<Icons.Calendar />} title="Schedule">
            <div className={`rounded-2xl border p-4 space-y-4 ${card}`}>
              <div className="min-w-0">
                <p className={`text-sm font-semibold mb-1.5 ${strong}`}>Date</p>
                <DateField value={taskDate} min={today} onChange={setTaskDate} isDarkMode={isDarkMode} />
                {task.scheduledDate && task.scheduledDate > today && (
                  <p className={`text-xs mt-1.5 ${muted}`}>Planned ahead. It moves to Today on this date.</p>
                )}
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-semibold mb-1.5 ${strong}`}>Reminder time</p>
                <TimeField value={task.reminderTime} onChange={setReminderTime} isDarkMode={isDarkMode} />
                {task.reminderTime && (
                  <p className={`text-xs mt-1.5 animate-in fade-in duration-200 ${muted}`}>You'll be reminded at this time.</p>
                )}
              </div>
              {repeatField}
              {scheduleMessages}
            </div>
          </Section>
        )}

        {/* Subtasks */}
        <Section
          isDarkMode={isDarkMode}
          icon={<Icons.ListChecks />}
          title={`Subtasks${visibleSubTasks.length ? ` · ${visibleSubTasks.filter(s => s.isCompleted).length}/${visibleSubTasks.length}` : ''}`}
        >
          {visibleSubTasks.length > 0 && (
            <div className="space-y-2.5">
              {visibleSubTasks.map(subtask => {
                const expanded = expandedSubtasks.has(subtask.id);
                const priorityColor = priorityOptions.find(o => o.value === subtask.priority)?.color || '#f59e0b';
                return (
                  <div
                    key={subtask.id}
                    className={`rounded-2xl border-2 overflow-hidden transition-all ${isDarkMode ? 'bg-slate-800' : 'bg-white'} ${expanded ? 'shadow-md' : 'shadow-sm'}`}
                    style={{ borderColor: expanded ? 'var(--theme-primary)' : (isDarkMode ? '#334155' : '#e2e8f0') }}
                  >
                    <div className="flex items-center min-h-[56px] border-l-4" style={{ borderLeftColor: subtask.isCompleted ? '#10b981' : priorityColor }}>
                      <button
                        onClick={() => updateSubTask(subtask.id, { isCompleted: !subtask.isCompleted, completedAt: !subtask.isCompleted ? Date.now() : undefined })}
                        className="w-12 h-12 flex items-center justify-center shrink-0 transition-transform active:scale-90"
                        aria-label={subtask.isCompleted ? 'Mark not done' : 'Mark done'}
                      >
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${subtask.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isDarkMode ? 'border-slate-500' : 'border-slate-300'}`}>
                          {subtask.isCompleted && <Icons.Check />}
                        </span>
                      </button>

                      <div className="flex-1 min-w-0 py-2">
                        {editingSubtask === subtask.id ? (
                          <input
                            type="text"
                            value={subtask.title}
                            placeholder="Subtask name"
                            onChange={(e) => updateSubTask(subtask.id, { title: e.target.value })}
                            onBlur={() => finishEditingSubtask(subtask)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
                            autoFocus
                            className={`w-full h-10 px-2.5 rounded-lg border-2 text-base font-medium outline-none border-[var(--theme-primary)] ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-ink'}`}
                          />
                        ) : (
                          <button onClick={() => setEditingSubtask(subtask.id)} className="w-full text-left">
                            <span className={`block text-base font-medium truncate ${subtask.isCompleted ? 'line-through text-slate-400' : strong}`}>
                              {subtask.title || <span className={muted}>Untitled step</span>}
                            </span>
                            {(subtask.dueDate || subtask.reminderTime || subtask.notes) && (
                              <span className={`flex items-center gap-2.5 mt-0.5 text-sm ${muted}`}>
                                {subtask.dueDate && <span className="flex items-center gap-1"><Icons.Calendar />{formatPickerDate(subtask.dueDate)}</span>}
                                {subtask.reminderTime && <span className="flex items-center gap-1"><Icons.Clock size={14} />{subtask.reminderTime}</span>}
                                {subtask.notes && <span className="flex items-center gap-1"><Icons.Edit />Note</span>}
                              </span>
                            )}
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => toggleSubtaskExpanded(subtask.id)}
                        className={`w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90 ${expanded ? '' : muted}`}
                        style={expanded ? { color: 'var(--theme-primary)' } : undefined}
                        aria-label={expanded ? 'Hide details' : 'Show details'}
                        aria-expanded={expanded}
                      >
                        <span className={`inline-flex transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}><Icons.ChevronRight /></span>
                      </button>
                      <button onClick={() => deleteSubTask(subtask.id)} className={`w-10 h-10 mr-1 flex items-center justify-center rounded-full transition-all active:scale-90 ${muted} hover:text-red-500`} aria-label="Delete subtask">
                        <Icons.Trash />
                      </button>
                    </div>

                    {expanded && (
                      <div
                        className="px-4 pt-4 pb-4 space-y-4 border-t animate-in fade-in slide-in-from-top-1 duration-200"
                        style={{
                          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                          backgroundColor: isDarkMode ? 'rgba(15,23,42,0.5)' : 'var(--theme-secondary)',
                        }}
                      >
                        <div>
                          <p className={`text-[13px] font-semibold mb-1.5 ${muted}`}>Priority</p>
                          <div className={`grid grid-cols-3 gap-1 p-1 rounded-xl ${isDarkMode ? 'bg-slate-900/70' : 'bg-white/80'}`}>
                            {priorityOptions.map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => updateSubTask(subtask.id, { priority: opt.value })}
                                className={`h-10 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-95 ${subtask.priority === opt.value ? (isDarkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-ink shadow') : muted}`}
                              >
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />{opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className={`text-[13px] font-semibold mb-1.5 ${muted}`}>Date</p>
                          <DateField compact value={subtask.dueDate} min={today} onChange={(date) => updateSubTask(subtask.id, { dueDate: date })} isDarkMode={isDarkMode} />
                        </div>
                        <div>
                          <p className={`text-[13px] font-semibold mb-1.5 ${muted}`}>Reminder time</p>
                          <TimeField
                            compact
                            value={subtask.reminderTime}
                            onChange={(value) => {
                              updateSubTask(subtask.id, value && !subtask.dueDate ? { reminderTime: value, dueDate: today } : { reminderTime: value });
                              warnIfTimePassed(subtask.dueDate, value);
                              if (value && notificationPermission === 'prompt') onRequestNotificationPermission?.();
                            }}
                            isDarkMode={isDarkMode}
                          />
                        </div>
                        <div>
                          <p className={`text-[13px] font-semibold mb-1.5 ${muted}`}>Notes</p>
                          <textarea
                            className={`w-full p-3 rounded-xl border text-base resize-none outline-none focus:border-[var(--theme-primary)] ${isDarkMode ? 'bg-slate-900/60 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 placeholder:text-slate-400'}`}
                            placeholder="Notes for this step…"
                            rows={2}
                            value={subtask.notes}
                            onChange={(e) => updateSubTask(subtask.id, { notes: e.target.value })}
                          />
                        </div>
                        <button
                          onClick={() => toggleSubtaskExpanded(subtask.id)}
                          className="w-full h-11 rounded-xl text-sm font-semibold text-on-accent transition-all active:scale-[0.98]"
                          style={{ backgroundColor: 'var(--theme-primary)' }}
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add a subtask */}
          <div
            className={`flex items-center gap-2 p-1.5 pl-3 rounded-2xl border-2 border-dashed transition-colors focus-within:border-solid focus-within:border-[var(--theme-primary)] ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-300 bg-white'}`}
          >
            <Icons.Plus />
            <input
              ref={subtaskInputRef}
              type="text"
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubTask(); } }}
              placeholder={visibleSubTasks.length ? 'Add another subtask' : 'Add a subtask'}
              enterKeyHint="done"
              className={`flex-1 min-w-0 h-10 bg-transparent text-base outline-none ${isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-ink placeholder:text-slate-400'}`}
            />
            {/* › adds the subtask and opens its details */}
            <button
              onClick={() => addSubTask(true)}
              disabled={!newSubtaskTitle.trim()}
              className={`w-10 h-10 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90 disabled:opacity-35 disabled:active:scale-100 ${muted}`}
              aria-label="Add and show details"
              title="Add with priority, date, reminder and notes"
            >
              <Icons.ChevronRight />
            </button>
            <button
              onClick={() => addSubTask()}
              disabled={!newSubtaskTitle.trim()}
              className="h-10 px-4 rounded-xl text-sm font-semibold text-on-accent transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              Add
            </button>
          </div>
          {visibleSubTasks.length > 0 && (
            <p className={`text-xs ${muted}`}>{tapWord()} a subtask's name to rename it, or › for its date, reminder and notes.</p>
          )}
        </Section>

        {/* Notes */}
        <Section isDarkMode={isDarkMode} icon={<Icons.Edit />} title="Notes">
          <textarea
            className={`w-full min-h-[96px] p-3.5 rounded-2xl border text-base outline-none resize-none focus:border-[var(--theme-primary)] ${isDarkMode ? 'bg-slate-800/70 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 placeholder:text-slate-400'}`}
            placeholder="Add details, links or context…"
            value={task.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
          />
        </Section>

        {/* Attachments */}
        <Section
          isDarkMode={isDarkMode}
          icon={<Icons.Attach />}
          title={`Attachments${task.attachments.length ? ` · ${task.attachments.length}` : ''}`}
          action={task.attachments.length > 0 && (
            <button onClick={() => fileInputRef.current?.click()} className={linkButton} style={{ color: 'var(--theme-primary)' }}><Icons.Plus /> Add</button>
          )}
        >
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          {task.attachments.length > 0 ? (
            <div className="space-y-2">
              {task.attachments.map(att => (
                <div key={att.id} className={`flex items-center gap-3 p-2.5 rounded-2xl border ${card}`}>
                  {att.type === AttachmentType.IMAGE ? (
                    <img src={attachmentSrc(att)} className="w-14 h-14 rounded-xl object-cover shrink-0" alt="" />
                  ) : (
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                      <FileTypeIcon name={att.name} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${strong}`}>{att.name}</p>
                    <p className={`text-xs mt-0.5 ${muted}`}>
                      {(fileExtension(att.name) || 'file').toUpperCase()}{attachmentSize(att) && ` · ${attachmentSize(att)}`}
                    </p>
                  </div>
                  <button onClick={() => removeAttachment(att)} className={`w-10 h-10 flex items-center justify-center rounded-lg ${muted} hover:text-red-500`} aria-label="Remove attachment">
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isAttaching}
              className={`w-full h-12 border border-dashed rounded-xl text-sm font-medium ${isDarkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'}`}
            >
              {isAttaching ? 'Attaching…' : '+ Add photos or files'}
            </button>
          )}
        </Section>

        {/* Share & collaborate */}
        <Section isDarkMode={isDarkMode} icon={<Icons.UserPlus />} title={onInvite ? 'Share & collaborate' : 'Share'}>
          {/* With collaboration off, Share details stands alone, centred */}
          <div className={onInvite ? 'grid grid-cols-2 gap-3' : 'flex justify-center'}>
            <button
              onClick={onShareDetails}
              disabled={!hasTitle}
              className={`p-4 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-50 ${onInvite ? 'text-left' : 'w-full max-w-[300px] flex flex-col items-center text-center'} ${card}`}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}><Icons.Send size={20} /></span>
              <p className={`mt-2 font-semibold text-sm ${strong}`}>Share details</p>
              <p className={`text-xs mt-0.5 ${muted}`}>Send a copy by message or email</p>
            </button>
            {onInvite && <button
              onClick={onInvite}
              disabled={!hasTitle}
              className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] disabled:opacity-50 ${card}`}
            >
              <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}><Icons.Users size={20} /></span>
              <p className={`mt-2 font-semibold text-sm ${strong}`}>Invite to collaborate</p>
              <p className={`text-xs mt-0.5 ${muted}`}>Add, edit & complete together</p>
            </button>}
          </div>
          {task.sharedWith.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {task.sharedWith.map(user => (
                <span key={user.id} className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}>
                  <img src={user.avatar} className="w-6 h-6 rounded-full" alt="" />{user.name}
                </span>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Footer */}
      <div className={`px-5 pt-3 pb-3 border-t flex gap-3 ${isDarkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <button
          className={`flex-1 h-12 rounded-xl font-semibold transition-all duration-150 active:scale-[0.97] ${isDarkMode ? 'bg-slate-800 text-slate-200 active:bg-slate-700' : 'bg-slate-100 text-slate-700 active:bg-slate-200'}`}
          onClick={requestCancel}
        >
          Cancel
        </button>
        <button
          className="flex-1 h-12 rounded-xl font-semibold text-on-accent flex items-center justify-center gap-2 shadow-md transition-all duration-150 active:scale-[0.97] active:brightness-110 disabled:opacity-40 disabled:active:scale-100"
          style={{ backgroundColor: 'var(--theme-primary)' }}
          disabled={!hasTitle}
          onClick={() => {
            onComplete?.();
            onClose();
          }}
        >
          <Icons.Check /> {planAhead ? 'Plan task' : isNewTask ? 'Add task' : 'Save'}
        </button>
      </div>

      {/* Unsaved changes */}
      {confirmDiscard && (
        <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[2px] flex items-end md:items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setConfirmDiscard(false)}>
          <div
            role="alertdialog"
            aria-label={isNewTask ? 'Discard this task?' : 'Discard your changes?'}
            onClick={e => e.stopPropagation()}
            className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}
          >
            <p className={`font-display font-bold text-lg ${strong}`}>{isNewTask ? 'Discard this task?' : 'Discard your changes?'}</p>
            <p className={`text-sm mt-1 ${muted}`}>
              {isNewTask ? "It won't be added to your list." : `Your edits won't be saved. Choose ${planAhead ? 'Plan task' : 'Save'} to keep them.`}
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmDiscard(false)}
                className={`flex-1 h-11 rounded-xl font-semibold transition-all active:scale-[0.97] ${isDarkMode ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700'}`}
              >
                Keep editing
              </button>
              <button
                onClick={() => { setConfirmDiscard(false); onCancel?.(); onClose(); }}
                className="flex-1 h-11 rounded-xl font-semibold text-white bg-red-600 transition-all active:scale-[0.97]"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
