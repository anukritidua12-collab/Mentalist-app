
import React, { useState, useMemo } from 'react';
import { Task, Category } from '../types';
import { Icons } from '../constants';
import { Button } from './Button';
import { detectSmartLinks } from '../services/smartLinkService';
import { copyText, shareText, taskShareText } from '../services/shareService';
import { SmartLinkIcon, ListIcon } from './AppIcons';
import { useSettledDone, doneOrder } from './useSettledDone';
import { useFlip } from './useFlip';
import { REPEAT_OPTIONS, describeRepeat } from '../services/repeatService';
import { ChatCircleText as MessageCircle, DeviceMobile as Smartphone, Envelope as Mail, LinkSimple as Link, ShareNetwork } from '@phosphor-icons/react';

const ShareIcon = () => <ShareNetwork size={16} aria-hidden="true" />;

const PRIORITY_RANK: Record<Task['priority'], number> = { high: 0, medium: 1, low: 2 };

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onSelect: (task: Task) => void;
  level?: number;
  categories?: Category[];
  isInHiddenSection?: boolean; // Whether this task is being shown in the hidden tasks section
  isDarkMode?: boolean;
  sortSubtasksByPriority?: boolean;
  doneToBottom?: boolean; // Finished subtasks move below the open ones
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete, onSelect, level = 0, categories = [], isInHiddenSection = false, isDarkMode = false, sortSubtasksByPriority = true, doneToBottom = true }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const mobileMenuRef = React.useRef<HTMLDivElement>(null);
  const settledSubTasks = useSettledDone(task.subTasks);
  const subListRef = React.useRef<HTMLDivElement>(null);
  useFlip(subListRef);

  // Close the phone actions menu when tapping elsewhere
  React.useEffect(() => {
    if (!showMobileMenu) return;
    const close = (e: Event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) setShowMobileMenu(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [showMobileMenu]);
  const clickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const shareMenuRef = React.useRef<HTMLDivElement>(null);

  // Close share menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    if (showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  const handleShare = (method: 'whatsapp' | 'sms' | 'email' | 'copy') => {
    const taskText = `📋 Task: ${task.title}${task.dueDate ? `\n📅 Due: ${new Date(task.dueDate + 'T00:00:00').toLocaleDateString()}` : ''}${task.notes ? `\n📝 Notes: ${task.notes}` : ''}`;
    
    switch (method) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(taskText)}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${encodeURIComponent(taskText)}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(`Task: ${task.title}`)}&body=${encodeURIComponent(taskText)}`, '_blank');
        break;
      case 'copy':
        copyText(taskText);
        break;
    }
    setShowShareMenu(false);
  };

  const smartLinks = useMemo(() => detectSmartLinks(task.title), [task.title]);

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(task.id, { isCompleted: !task.isCompleted });
  };

  const togglePrivacy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(task.id, { isPrivate: !task.isPrivate });
  };

  const handleTitleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (e.detail === 2) {
      // Double-click detected - edit mode
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      setEditedTitle(task.title);
      setIsEditingTitle(true);
    } else if (e.detail === 1) {
      // Single click - delay to check for double-click
      clickTimeoutRef.current = setTimeout(() => {
        onSelect(task);
      }, 300);
    }
  };

  const handleTitleSave = () => {
    if (editedTitle.trim() && editedTitle !== task.title) {
      onUpdate(task.id, { title: editedTitle.trim() });
    } else {
      setEditedTitle(task.title);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditedTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const priorityStyles = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-amber-500',
    low: 'border-l-4 border-l-blue-400'
  };

  const priorityBadgeStyles = isDarkMode
    ? { high: 'bg-rose-500/15 text-rose-300', medium: 'bg-amber-500/15 text-amber-300', low: 'bg-sky-500/15 text-sky-300' }
    : { high: 'bg-rose-100 text-rose-600', medium: 'bg-amber-50 text-amber-600', low: 'bg-sky-50 text-sky-600' };

  const isObscured = task.isPrivate && !isInHiddenSection;

  // If task is hidden and not in hidden section, show minimal placeholder
  if (isObscured) {
    return (
      <div data-flip-id={task.id} className={`group ${level > 0 ? `ml-4 md:ml-6 mt-1 border-l pl-3 md:pl-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}` : 'mt-2 md:mt-3'}`}>
        <div className={`flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-xl border border-dashed ${isDarkMode ? 'bg-slate-800/60 border-slate-600' : 'bg-slate-100/60 border-slate-200'}`}>
          <div className={`w-7 h-7 md:w-6 md:h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <Icons.EyeOff />
          </div>
          <div className="flex-1">
            <div className={`h-4 w-32 rounded animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`h-3 w-20 rounded mt-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
          </div>
          <span className={`text-xs italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Hidden task</span>
        </div>
      </div>
    );
  }

  return (
    <div data-flip-id={task.id} className={`group ${level > 0 ? `ml-4 md:ml-6 mt-1 border-l pl-3 md:pl-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200/50'}` : 'mt-3 md:mt-4'}`}>
      <div 
        onClick={() => onSelect(task)}
        className={`task-card flex items-center gap-3 md:gap-4 p-4 md:p-4 rounded-2xl border cursor-pointer ${
          isDarkMode 
            ? `shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/30 border-slate-700/30 bg-slate-800` 
            : `shadow-sm shadow-slate-200/50 hover:shadow-md hover:shadow-slate-300/50 border-slate-200/50 bg-sheet`
        } ${!task.isCompleted ? priorityStyles[task.priority] : ''}`}
      >
        <button 
          onClick={toggleComplete}
          className={`task-check relative w-8 h-8 md:w-7 md:h-7 rounded-full border-2 flex items-center justify-center shrink-0 -m-1 p-1 ${
            task.isCompleted 
              ? 'border-transparent text-on-accent' 
              : isDarkMode 
                ? 'border-slate-500 bg-slate-700 hover:border-[color:var(--theme-primary)]' 
                : 'border-slate-300 bg-white hover:border-[color:var(--theme-primary)]'
          }`}
          style={task.isCompleted ? { backgroundColor: 'var(--theme-primary)' } : undefined}
          aria-label={task.isCompleted ? 'Mark not done' : 'Mark done'}
        >
          {task.isCompleted && <span className="check-pop flex"><Icons.Check /></span>}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isEditingTitle ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className={`text-base md:text-sm font-medium border border-blue-400 rounded px-2 py-1 md:py-0.5 outline-none focus:ring-2 focus:ring-blue-200 flex-1 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}
              />
            ) : (
              <h3 
                onClick={handleTitleClick}
                className={`text-base md:text-[15px] font-medium truncate cursor-text leading-relaxed transition-colors duration-300 ${task.isCompleted ? (isDarkMode ? 'text-slate-500' : 'text-muted') : isDarkMode ? 'text-slate-50' : 'text-ink'}`}
                title="Double-click to edit"
              >
                {/* The line is drawn through the name when the task is completed */}
                <span className={`strike-line ${task.isCompleted ? 'is-done' : ''}`}>
                  {task.title || <span className="italic opacity-60">Untitled task</span>}
                </span>
              </h3>
            )}
            {!isEditingTitle && !task.isCompleted && (
              <div className="flex items-center gap-1 shrink-0">
                {smartLinks.slice(0, 1).map((link, idx) => (
                  <span key={idx} title={`Action detected: ${link.app}`} className="text-[14px] grayscale group-hover:grayscale-0 transition-all">
                    <SmartLinkIcon icon={link.icon} size={14} />
                  </span>
                ))}
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-md capitalize ${priorityBadgeStyles[task.priority]}`}>
                  {task.priority}
                </span>
              </div>
            )}
            {task.isPrivate && <span className="text-amber-500" title="Hidden task"><Icons.EyeOff /></span>}
          </div>
          
          <div className={`flex items-center gap-2 md:gap-3 mt-2 md:mt-1.5 text-xs font-medium flex-wrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {task.categoryIds && task.categoryIds.length > 1 && (
              <span className="flex items-center gap-1">
                {task.categoryIds.slice(0, 2).map(catId => {
                  const cat = categories.find(c => c.id === catId);
                  return cat ? (
                    <span key={catId} className={`px-1.5 py-0.5 rounded normal-case ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      <span className="inline-flex items-center gap-1"><ListIcon icon={cat.icon} size={12} /> {cat.name.replace(' List', '')}</span>
                    </span>
                  ) : null;
                })}
                {task.categoryIds.length > 2 && (
                  <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>+{task.categoryIds.length - 2}</span>
                )}
              </span>
            )}
            {task.dueDate && (
              <span className="flex items-center gap-1" style={{ color: 'var(--theme-primary)' }}>
                <Icons.Calendar /> {new Date(task.dueDate + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
              </span>
            )}
            {task.reminderTime && (
              <span className="flex items-center gap-1" style={{ color: 'var(--theme-primary)' }} title={`Reminder at ${task.reminderTime}`}>
                <Icons.Clock size={13} />
                {task.reminderTime}
              </span>
            )}
            {task.repeat && (
              <span className="flex items-center gap-1" style={{ color: 'var(--theme-primary)' }} title={describeRepeat(task.repeat, task.scheduledDate || task.dueDate)}>
                <Icons.Repeat size={13} /> {REPEAT_OPTIONS.find(o => o.id === task.repeat!.frequency)?.label}
              </span>
            )}
            {task.attachments.length > 0 && (
              <span className="flex items-center gap-1">
                <Icons.Attach /> {task.attachments.length} {task.attachments.length === 1 ? 'file' : 'files'}
              </span>
            )}
            {task.subTasks.length > 0 && (
              <span className="flex items-center gap-1">
                 {task.subTasks.filter(s => s.isCompleted).length}/{task.subTasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        {/* Phones: one menu button, so the task name gets the full width */}
        <div className="relative md:hidden shrink-0" ref={mobileMenuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMobileMenu(!showMobileMenu); }}
            className={`w-10 h-10 -mr-2 rounded-full flex items-center justify-center ${isDarkMode ? 'text-slate-400 active:bg-slate-700' : 'text-slate-400 active:bg-slate-100'}`}
            aria-label="Task actions"
          >
            <Icons.More />
          </button>
          {showMobileMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className={`absolute right-0 top-full mt-1 w-56 rounded-2xl shadow-2xl border py-1.5 z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}
            >
              {task.subTasks.length > 0 && (
                <button className={`w-full px-4 h-12 text-left text-base flex items-center gap-3 ${isDarkMode ? 'text-slate-200 active:bg-slate-700' : 'text-slate-700 active:bg-slate-100'}`} onClick={() => { setIsExpanded(!isExpanded); setShowMobileMenu(false); }}>
                  <Icons.ListChecks /> {isExpanded ? 'Hide subtasks' : 'Show subtasks'}
                </button>
              )}
              <button className={`w-full px-4 h-12 text-left text-base flex items-center gap-3 ${isDarkMode ? 'text-slate-200 active:bg-slate-700' : 'text-slate-700 active:bg-slate-100'}`} onClick={() => { setShowMobileMenu(false); shareText(task.title, taskShareText(task)); }}>
                <ShareIcon /> Share details
              </button>
              <button className={`w-full px-4 h-12 text-left text-base flex items-center gap-3 ${isDarkMode ? 'text-slate-200 active:bg-slate-700' : 'text-slate-700 active:bg-slate-100'}`} onClick={(e) => { setShowMobileMenu(false); togglePrivacy(e); }}>
                {task.isPrivate ? <Icons.Eye /> : <Icons.EyeOff />} {task.isPrivate ? 'Unhide task' : 'Hide task'}
              </button>
              <button className="w-full px-4 h-12 text-left text-base flex items-center gap-3 text-red-500" onClick={() => { setShowMobileMenu(false); onDelete(task.id); }}>
                <Icons.Trash /> Delete
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-slate-500 hover:bg-slate-100 p-2 md:p-1"
            title={task.subTasks.length > 0 ? `${isExpanded ? 'Collapse' : 'Expand'} subtasks` : 'No subtasks'}
          >
            <Icons.ListChecks />
          </Button>
          
          {/* Quick Share */}
          <div className="relative" ref={shareMenuRef}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); setShowShareMenu(!showShareMenu); }}
              className={`p-2 md:p-1 ${isDarkMode ? 'text-slate-400 hover:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}
              title="Share task"
              aria-label="Share task"
            >
              <ShareIcon />
            </Button>
            {showShareMenu && (
              <div className={`absolute right-0 top-full mt-1 w-44 md:w-40 rounded-xl shadow-2xl border py-1.5 z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`px-3 py-1 text-xs font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Share via</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('whatsapp'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <MessageCircle size={16} /> WhatsApp
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('sms'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <Smartphone size={16} /> iMessage / SMS
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('email'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <Mail size={16} /> Email
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('copy'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <Link size={16} /> Copy to Clipboard
                </button>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={togglePrivacy} 
            className={`p-2 md:p-1 ${task.isPrivate ? 'text-amber-500' : 'text-slate-400'}`}
            title={task.isPrivate ? 'Unhide task' : 'Hide task'}
            aria-label={task.isPrivate ? 'Unhide task' : 'Hide task'}
          >
            {task.isPrivate ? <Icons.EyeOff /> : <Icons.Eye />}
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-slate-400 hover:text-red-500 p-2 md:p-1" title="Delete task" aria-label="Delete task">
            <Icons.Trash />
          </Button>
        </div>

        {task.sharedWith.length > 0 && (
          <div className="flex -space-x-2 ml-2 shrink-0">
            {task.sharedWith.slice(0, 3).map((user) => (
              <img key={user.id} src={user.avatar} className="w-7 h-7 md:w-6 md:h-6 rounded-full border-2 border-white" alt={user.name} />
            ))}
            {task.sharedWith.length > 3 && (
              <div className="w-7 h-7 md:w-6 md:h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] md:text-xs font-bold text-slate-600 border-2 border-white">
                +{task.sharedWith.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && task.subTasks.length > 0 && (
        <div ref={subListRef} className="relative space-y-1">
          {[...task.subTasks]
            .sort((a, b) =>
              (doneToBottom ? doneOrder(settledSubTasks, a, b) : 0) ||
              (sortSubtasksByPriority ? PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] : 0))
            .filter(st => !st.deletedAt).map(subTask => (
            <TaskItem 
              key={subTask.id} 
              task={subTask} 
              onUpdate={(sid, updates) => {
                const updatedSubtasks = task.subTasks.map(s => s.id === sid ? { ...s, ...updates } : s);
                onUpdate(task.id, { subTasks: updatedSubtasks });
              }}
              onDelete={(sid) => {
                const remaining = task.subTasks.filter(s => s.id !== sid);
                onUpdate(task.id, { subTasks: remaining });
              }}
              onSelect={onSelect}
              level={level + 1}
              categories={categories}
              isInHiddenSection={isInHiddenSection}
              isDarkMode={isDarkMode}
              sortSubtasksByPriority={sortSubtasksByPriority}
              doneToBottom={doneToBottom}
            />
          ))}
        </div>
      )}
    </div>
  );
};
