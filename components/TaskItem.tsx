
import React, { useState, useMemo } from 'react';
import { Task, SharedUser, Category } from '../types';
import { Icons } from '../constants';
import { Button } from './Button';
import { geminiService } from '../services/geminiService';
import { detectSmartLinks } from '../services/smartLinkService';
import { generateId } from '../utils';

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>
);

interface TaskItemProps {
  task: Task;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onSelect: (task: Task) => void;
  level?: number;
  privacyEnabled?: boolean; // Deprecated - kept for compatibility
  categories?: Category[];
  isInHiddenSection?: boolean; // Whether this task is being shown in the hidden tasks section
  isDarkMode?: boolean;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate, onDelete, onSelect, level = 0, categories = [], isInHiddenSection = false, isDarkMode = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task.title);
  const [showShareMenu, setShowShareMenu] = useState(false);
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
    const taskText = `📋 Task: ${task.title}${task.dueDate ? `\n📅 Due: ${new Date(task.dueDate).toLocaleDateString()}` : ''}${task.notes ? `\n📝 Notes: ${task.notes}` : ''}`;
    
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
        navigator.clipboard.writeText(taskText);
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

  const handleBreakdown = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAiLoading(true);
    const subtaskTitles = await geminiService.breakdownTask(task.title);
    const newSubTasks: Task[] = subtaskTitles.map(title => ({
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
      categoryIds: []
    }));
    onUpdate(task.id, { subTasks: [...task.subTasks, ...newSubTasks] });
    setIsAiLoading(false);
    setIsExpanded(true);
  };

  const priorityStyles = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-amber-500',
    low: 'border-l-4 border-l-blue-400'
  };

  const priorityBadgeStyles = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-blue-100 text-blue-700'
  };

  const isObscured = task.isPrivate && !isInHiddenSection;

  // If task is hidden and not in hidden section, show minimal placeholder
  if (isObscured) {
    return (
      <div className={`group transition-all ${level > 0 ? `ml-4 md:ml-6 mt-1 border-l pl-3 md:pl-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}` : 'mt-2 md:mt-3'}`}>
        <div className={`flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-xl border border-dashed ${isDarkMode ? 'bg-slate-800/60 border-slate-600' : 'bg-slate-100/60 border-slate-200'}`}>
          <div className={`w-7 h-7 md:w-6 md:h-6 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <Icons.EyeOff />
          </div>
          <div className="flex-1">
            <div className={`h-4 w-32 rounded animate-pulse ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div className={`h-3 w-20 rounded mt-1 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />
          </div>
          <span className={`text-[10px] md:text-[10px] italic ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Hidden task</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`group transition-all ${level > 0 ? `ml-4 md:ml-6 mt-1 border-l pl-3 md:pl-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}` : 'mt-2 md:mt-3'}`}>
      <div 
        onClick={() => onSelect(task)}
        className={`flex items-center gap-2 md:gap-3 p-3 md:p-3 rounded-xl transition-all border border-transparent cursor-pointer active:scale-[0.98] ${
          isDarkMode 
            ? `hover:bg-slate-700 hover:shadow-lg ${task.isCompleted ? 'bg-slate-800/50' : 'bg-slate-800/40'}` 
            : `hover:bg-white hover:shadow-md ${task.isCompleted ? 'bg-slate-50/50' : 'bg-white/40'}`
        } ${!task.isCompleted ? priorityStyles[task.priority] : ''}`}
      >
        <button 
          onClick={toggleComplete}
          className={`w-7 h-7 md:w-6 md:h-6 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${
            task.isCompleted 
              ? 'bg-emerald-500 border-emerald-500 text-white' 
              : isDarkMode 
                ? 'border-slate-500 bg-slate-700 group-hover:border-blue-400' 
                : 'border-slate-300 bg-white group-hover:border-blue-400'
          }`}
        >
          {task.isCompleted && <Icons.Check />}
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
                className={`text-base md:text-sm font-medium truncate cursor-text ${task.isCompleted ? 'text-slate-400 line-through' : isDarkMode ? 'text-white' : 'text-slate-800'}`}
                title="Double-click to edit"
              >
                {task.title}
              </h3>
            )}
            {!isEditingTitle && !task.isCompleted && (
              <div className="flex items-center gap-1 shrink-0">
                {smartLinks.slice(0, 1).map((link, idx) => (
                  <span key={idx} title={`Action detected: ${link.app}`} className="text-[14px] grayscale group-hover:grayscale-0 transition-all">
                    {link.icon}
                  </span>
                ))}
                <span className={`text-[10px] md:text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${priorityBadgeStyles[task.priority]}`}>
                  {task.priority}
                </span>
                {(task.reminderTime || task.dueDate) && (
                  <span 
                    className="text-purple-500" 
                    title={task.reminderTime ? `Reminder: ${task.reminderTime}` : `Due: ${new Date(task.dueDate!).toLocaleDateString()}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </span>
                )}
              </div>
            )}
            {task.isPrivate && <span className="text-amber-500" title="Hidden task"><Icons.EyeOff /></span>}
          </div>
          
          <div className={`flex items-center gap-2 md:gap-3 mt-1.5 md:mt-1 text-[11px] md:text-[10px] uppercase tracking-wider font-semibold flex-wrap ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {task.categoryIds && task.categoryIds.length > 1 && (
              <span className="flex items-center gap-1">
                {task.categoryIds.slice(0, 2).map(catId => {
                  const cat = categories.find(c => c.id === catId);
                  return cat ? (
                    <span key={catId} className={`px-1.5 py-0.5 rounded normal-case ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                      {cat.icon} {cat.name.replace(' List', '')}
                    </span>
                  ) : null;
                })}
                {task.categoryIds.length > 2 && (
                  <span className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>+{task.categoryIds.length - 2}</span>
                )}
              </span>
            )}
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <Icons.Calendar /> {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {task.reminderTime && (
              <span className={`flex items-center gap-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`} title={`Reminder at ${task.reminderTime}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {task.reminderTime}
              </span>
            )}
            {task.attachments.length > 0 && (
              <span className="flex items-center gap-1">
                <Icons.Attach /> {task.attachments.length} files
              </span>
            )}
            {task.subTasks.length > 0 && (
              <span className="flex items-center gap-1">
                 {task.subTasks.filter(s => s.isCompleted).length}/{task.subTasks.length} subtasks
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
            >
              <ShareIcon />
            </Button>
            {showShareMenu && (
              <div className={`absolute right-0 top-full mt-1 w-44 md:w-40 rounded-xl shadow-2xl border py-1.5 z-50 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <p className={`px-3 py-1 text-[10px] md:text-[9px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Share via</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('whatsapp'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <span>💬</span> WhatsApp
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('sms'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <span>📱</span> iMessage / SMS
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('email'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <span>✉️</span> Email
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShare('copy'); }}
                  className={`w-full px-3 py-2.5 md:py-1.5 text-left text-sm md:text-xs flex items-center gap-2 ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50'}`}
                >
                  <span>🔗</span> Copy to Clipboard
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
          >
            {task.isPrivate ? <Icons.EyeOff /> : <Icons.Eye />}
          </Button>
          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} className="text-slate-400 hover:text-red-500 p-2 md:p-1">
            <Icons.Trash />
          </Button>
        </div>

        {task.sharedWith.length > 0 && (
          <div className="flex -space-x-2 ml-2 shrink-0">
            {task.sharedWith.slice(0, 3).map((user) => (
              <img key={user.id} src={user.avatar} className="w-7 h-7 md:w-6 md:h-6 rounded-full border-2 border-white" alt={user.name} />
            ))}
            {task.sharedWith.length > 3 && (
              <div className="w-7 h-7 md:w-6 md:h-6 rounded-full bg-slate-100 flex items-center justify-center text-[11px] md:text-[10px] font-bold text-slate-600 border-2 border-white">
                +{task.sharedWith.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {isExpanded && task.subTasks.length > 0 && (
        <div className="space-y-1">
          {task.subTasks.map(subTask => (
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
            />
          ))}
        </div>
      )}
    </div>
  );
};
