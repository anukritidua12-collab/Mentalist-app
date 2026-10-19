import React, { useMemo, useState } from 'react';
import { Task, Attachment, Category } from '../types';
import { Button } from './Button';
import { Icons } from '../constants';
import { ListIcon } from './AppIcons';
import { attachmentSrc, attachmentMimeType, shareOrDownloadAttachment } from '../services/attachmentService';
import { Capacitor } from '@capacitor/core';
import { tapWord } from '../utils';
import { describeRepeat } from '../services/repeatService';

interface TaskViewerProps {
  task: Task;
  onClose: () => void;
  isDarkMode?: boolean;
  categories?: Category[];
  onEdit?: () => void;
  onRestore?: () => void; // For deleted or hidden tasks opened from search/History
  isCreator?: boolean;
}

const isWebLink = (url: string) => /^https?:\/\//i.test(url);

const TaskViewer: React.FC<TaskViewerProps> = ({ task, onClose, isDarkMode = false, categories = [], onEdit, onRestore, isCreator = true }) => {
  const [viewerAttachment, setViewerAttachment] = useState<Attachment | null>(null);

  const assignedLists = useMemo(() => {
    return categories.filter(cat => task.categoryIds?.includes(cat.id));
  }, [categories, task.categoryIds]);

  const createdBy = task.sharedBy?.name || 'You';
  const scheduledFor = task.scheduledDate || task.dueDate || '';
  const formatDay = (date: string) => new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const formatTime = (time: string) => new Date(`2000-01-01T${time}:00`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const visibleSubTasks = task.subTasks.filter(st => !st.deletedAt);
  const PRIORITY_COLORS: Record<Task['priority'], string> = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

  // Linked Office files aren't previewed: that would mean sending the link to an online
  // viewer. They open in the browser with Open Link instead.
  const getPreviewKind = (att: Attachment): 'image' | 'pdf' | 'text' | 'audio' | 'video' | 'web' | 'unsupported' => {
    if (isWebLink(att.url)) {
      const lower = att.url.toLowerCase();
      if (/(\.doc|\.docx|\.xls|\.xlsx|\.ppt|\.pptx)(\?|$)/.test(lower)) return 'unsupported';
      return 'web';
    }

    const mime = attachmentMimeType(att);
    if (!mime) return 'unsupported';
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('text/')) return 'text';
    if (mime.startsWith('audio/')) return 'audio';
    if (mime.startsWith('video/')) return 'video';
    return 'unsupported';
  };

  const renderPreview = (att: Attachment) => {
    const kind = getPreviewKind(att);
    const src = attachmentSrc(att);

    if (kind === 'image') {
      return <img src={src} alt={att.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />;
    }

    if (kind === 'pdf' || kind === 'web') {
      return <iframe src={src} title={att.name} className="w-full h-[68vh] rounded-lg border border-slate-700/20 bg-white" />;
    }

    if (kind === 'text') {
      return (
        <iframe
          src={src}
          title={att.name}
          className={`w-full h-[68vh] rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}
        />
      );
    }

    if (kind === 'audio') {
      return <audio controls src={src} className="w-full" />;
    }

    if (kind === 'video') {
      return <video controls src={src} className="max-w-full max-h-[70vh] rounded-lg" />;
    }

    return (
      <div className="text-center">
        <p className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>No preview for this file type</p>
        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Use Save / Share to open it in another app.</p>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col shadow-xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border-l border-slate-700' : 'bg-white border-l border-slate-200'}`}>
      <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700 bg-slate-800/60' : 'border-slate-100 bg-slate-50/60'}`}>
        <h2 className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-ink'}`}>Task View</h2>
        <div className="flex items-center gap-2">
          {isCreator && onEdit && !task.deletedAt && (
            <Button 
              variant="secondary" 
              size="icon" 
              onClick={onEdit}
              className={`p-2 ${isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-ink hover:bg-slate-100'}`}
              title="Edit task details"
              aria-label="Edit task"
            >
              <Icons.Edit />
            </Button>
          )}
          <Button aria-label="Close task" variant="ghost" size="icon" onClick={onClose} className={`p-2 ${isDarkMode ? 'text-slate-400 hover:text-white' : ''}`}>
            <Icons.X />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {(task.deletedAt || task.isPrivate) && (
          <div className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
            task.deletedAt
              ? (isDarkMode ? 'bg-red-900/20 border-red-900/50' : 'bg-red-50 border-red-100')
              : (isDarkMode ? 'bg-amber-900/20 border-amber-900/50' : 'bg-amber-50 border-amber-100')
          }`}>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${task.deletedAt ? (isDarkMode ? 'text-red-300' : 'text-red-700') : (isDarkMode ? 'text-amber-300' : 'text-amber-700')}`}>
                {task.deletedAt ? 'Deleted · in History' : 'Hidden task'}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {task.deletedAt
                  ? `Deleted ${new Date(task.deletedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                  : 'Only shown on the Hidden page'}
              </p>
            </div>
            {onRestore && (
              <button
                onClick={onRestore}
                className="shrink-0 h-9 px-4 rounded-full text-sm font-semibold text-on-accent transition-all active:scale-95"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                {task.deletedAt ? 'Restore' : 'Unhide'}
              </button>
            )}
          </div>
        )}
        <div>
          <h3 className={`text-xl font-bold leading-snug ${isDarkMode ? 'text-white' : 'text-ink'}`}>{task.title}</h3>
          {task.notes && (
            <p className={`mt-2 text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{task.notes}</p>
          )}
        </div>

        <div className={`space-y-2 p-3 rounded-xl border ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-[13px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Task details</p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className={`rounded-lg px-2.5 py-2 ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Priority</p>
              <p className="font-semibold capitalize flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />{task.priority}</p>
            </div>
            <div className={`rounded-lg px-2.5 py-2 ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Status</p>
              <p className={`font-semibold ${task.isCompleted ? 'text-emerald-500' : ''}`}>{task.isCompleted ? 'Done' : 'To do'}</p>
            </div>
            <div className={`rounded-lg px-2.5 py-2 ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Created by</p>
              <p className="font-semibold truncate">{createdBy}</p>
            </div>
            <div className={`rounded-lg px-2.5 py-2 ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Access</p>
              <p className="font-semibold truncate">{task.sharedWith.length > 0 ? `${task.sharedWith.length} collaborator${task.sharedWith.length > 1 ? 's' : ''}` : 'Only you'}</p>
            </div>
            <div className={`rounded-lg px-2.5 py-2 ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Scheduled for</p>
              <p className="font-semibold truncate">{scheduledFor ? formatDay(scheduledFor) : 'Not scheduled'}</p>
            </div>
            <div className={`rounded-lg px-2.5 py-2 ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <p className={`text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Reminder</p>
              <p className="font-semibold truncate">{task.reminderTime ? formatTime(task.reminderTime) : 'None'}</p>
            </div>
          </div>

          {task.repeat && (
            <div className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold ${isDarkMode ? 'bg-slate-800/60 text-slate-300' : 'bg-white text-slate-600 border border-slate-100'}`}>
              <span style={{ color: 'var(--theme-primary)' }}><Icons.Repeat size={15} /></span>
              {describeRepeat(task.repeat, task.scheduledDate || task.dueDate)}
            </div>
          )}

          {assignedLists.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {assignedLists.map(list => (
                <span key={list.id} className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-white/[0.07] text-accent' : 'bg-[color:var(--theme-secondary)] text-accent'}`}>
                  <span className="inline-flex items-center gap-1"><ListIcon icon={list.icon} size={12} /> {list.name}</span>
                </span>
              ))}
            </div>
          )}

          {task.sharedWith.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {task.sharedWith.map(user => (
                <span key={user.id} className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-900/40 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                  {user.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {visibleSubTasks.length > 0 && (
          <div className="space-y-2">
            <p className={`text-[13px] font-semibold flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Icons.ListChecks /> Subtasks
              <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>({visibleSubTasks.filter(st => st.isCompleted).length}/{visibleSubTasks.length})</span>
            </p>
            <ul className={`rounded-xl border divide-y ${isDarkMode ? 'border-slate-600 divide-slate-700' : 'border-slate-200 divide-slate-100'}`}>
              {visibleSubTasks.map(st => (
                <li key={st.id} className="flex items-center gap-2.5 px-3 py-2.5 border-l-4 first:rounded-tl-xl last:rounded-bl-xl" style={{ borderLeftColor: st.isCompleted ? '#10b981' : PRIORITY_COLORS[st.priority] }}>
                  <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center ${st.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isDarkMode ? 'border-slate-500' : 'border-slate-300'}`}>
                    {st.isCompleted && <Icons.Check />}
                  </span>
                  <span className={`flex-1 min-w-0 text-sm truncate ${st.isCompleted ? 'line-through opacity-60' : ''} ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{st.title || 'Untitled subtask'}</span>
                  {(st.scheduledDate || st.dueDate || st.reminderTime) && (
                    <span className={`text-[11px] shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {[st.scheduledDate || st.dueDate ? formatDay((st.scheduledDate || st.dueDate)!) : '', st.reminderTime ? formatTime(st.reminderTime) : ''].filter(Boolean).join(' · ')}
                    </span>
                  )}
                  <span className={`text-[11px] font-semibold capitalize shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{st.priority}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-[13px] font-semibold flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Icons.Attach /> Attachments
              {task.attachments.length > 0 && <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>({task.attachments.length})</span>}
            </label>
          </div>

          {task.attachments.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {task.attachments.map(att => (
                <button
                  key={att.id}
                  onClick={() => setViewerAttachment(att)}
                  className={`text-left p-2 rounded-lg border transition-all ${isDarkMode ? 'border-slate-600 bg-slate-700 hover:border-[color:var(--theme-primary)]' : 'border-slate-200 bg-slate-50 hover:border-[color:var(--theme-primary)]'}`}
                >
                  <p className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{att.name}</p>
                  <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{tapWord()} to view</p>
                </button>
              ))}
            </div>
          ) : (
            <div className={`text-xs italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>No attachments</div>
          )}
        </div>
      </div>

      {viewerAttachment && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setViewerAttachment(null)}>
          <div className={`w-full max-w-3xl max-h-[90vh] rounded-2xl overflow-hidden border shadow-2xl flex flex-col ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} onClick={(e) => e.stopPropagation()}>
            <div className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <div className="min-w-0">
                <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-ink'}`}>{viewerAttachment.name}</p>
                <p className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Attachment preview</p>
              </div>
              <button aria-label="Close preview" onClick={() => setViewerAttachment(null)} className={`p-2 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100'}`}>
                <Icons.X />
              </button>
            </div>

            <div className={`flex-1 min-h-[260px] md:min-h-[420px] ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'} flex items-center justify-center p-3`}>
              {renderPreview(viewerAttachment)}
            </div>

            <div className={`px-4 py-3 border-t flex items-center justify-end gap-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              {isWebLink(viewerAttachment.url) && (
                <a
                  href={viewerAttachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isDarkMode ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  Open Link
                </a>
              )}
              <button
                onClick={() => shareOrDownloadAttachment(viewerAttachment).catch(() => {})}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {Capacitor.isNativePlatform() ? 'Save / Share' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskViewer;
