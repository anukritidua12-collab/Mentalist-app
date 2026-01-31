
import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Task, SharedUser, AttachmentType, Category } from '../types';
import { Icons, MOCK_USERS } from '../constants';
import { Button } from './Button';
import { detectSmartLinks } from '../services/smartLinkService';
import { generateId } from '../utils';

interface TaskDetailsProps {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
  onClose: () => void;
  onComplete?: () => void;
  categories?: Category[];
  onAddCategory?: () => void;
  onSendCollaborationRequest?: (task: Task, toUser: SharedUser) => void;
  isDarkMode?: boolean;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({ task, onUpdate, onClose, onComplete, categories = [], onAddCategory, onSendCollaborationRequest, isDarkMode = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const smartLinks = useMemo(() => detectSmartLinks(task.title), [task.title]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<Set<string>>(new Set());
  const [editingSubtask, setEditingSubtask] = useState<string | null>(null);

  // Auto-focus and select title text when panel opens
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [task.id]);

  const toggleSubtaskExpanded = (subtaskId: string) => {
    const newExpanded = new Set(expandedSubtasks);
    if (newExpanded.has(subtaskId)) {
      newExpanded.delete(subtaskId);
    } else {
      newExpanded.add(subtaskId);
    }
    setExpandedSubtasks(newExpanded);
  };

  const addSubTask = () => {
    const newSubTask: Task = {
      id: generateId(),
      title: 'New Subtask',
      isCompleted: false,
      notes: '',
      subTasks: [],
      attachments: [],
      sharedWith: [],
      createdAt: Date.now(),
      priority: 'medium',
      isPrivate: false,
      categoryIds: []
    };
    onUpdate({ subTasks: [...task.subTasks, newSubTask] });
    setEditingSubtask(newSubTask.id);
  };

  const updateSubTask = (subtaskId: string, updates: Partial<Task>) => {
    const updatedSubTasks = task.subTasks.map(st => 
      st.id === subtaskId ? { ...st, ...updates } : st
    );
    onUpdate({ subTasks: updatedSubTasks });
  };

  const deleteSubTask = (subtaskId: string) => {
    onUpdate({ subTasks: task.subTasks.filter(st => st.id !== subtaskId) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newAttachment = {
        id: generateId(),
        type: file.type.includes('image') ? AttachmentType.IMAGE : AttachmentType.PDF,
        name: file.name,
        url: event.target?.result as string,
        createdAt: Date.now()
      };
      onUpdate({ attachments: [...task.attachments, newAttachment] });
    };
    reader.readAsDataURL(file);
  };

  const toggleShare = (user: SharedUser) => {
    const isShared = task.sharedWith.some(u => u.id === user.id);
    if (isShared) {
      onUpdate({ sharedWith: task.sharedWith.filter(u => u.id !== user.id) });
    } else {
      onUpdate({ sharedWith: [...task.sharedWith, user] });
    }
  };

  const priorityOptions: { value: 'high' | 'medium' | 'low'; label: string; activeClass: string }[] = [
    { value: 'high', label: 'High', activeClass: 'bg-red-500 text-white' },
    { value: 'medium', label: 'Medium', activeClass: 'bg-amber-500 text-white' },
    { value: 'low', label: 'Low', activeClass: 'bg-blue-500 text-white' },
  ];

  return (
    <div className={`h-full flex flex-col shadow-xl overflow-hidden ${isDarkMode ? 'bg-slate-800 border-l border-slate-700' : 'bg-white border-l border-slate-200'}`}>
      <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-100 bg-slate-50/50'}`}>
        <h2 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Task Details</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className={isDarkMode ? 'text-slate-400 hover:text-white' : ''}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
        {/* Title & Priority Row */}
        <div className="space-y-3">
          <textarea
            ref={titleRef}
            autoFocus
            className={`w-full text-lg font-bold border-none focus:ring-0 p-0 resize-none focus:outline-none bg-transparent ${isDarkMode ? 'text-white placeholder:text-slate-500' : 'text-slate-800 placeholder:text-slate-300'}`}
            value={task.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="✏️ What needs to be done?"
            rows={1}
          />
          
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Priority</span>
            <div className={`flex gap-1 p-0.5 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
              {priorityOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdate({ priority: opt.value })}
                  className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase transition-all ${
                    task.priority === opt.value 
                      ? opt.activeClass + ' shadow-sm' 
                      : isDarkMode ? 'text-slate-400 hover:bg-slate-600 hover:text-slate-200' : 'text-slate-500 hover:bg-white hover:text-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Assignment - Compact */}
        {categories.length > 0 && (
          <div className="space-y-2">
            <label className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Lists</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.filter(cat => cat.id !== 'shared').map(category => {
                const isSelected = task.categoryIds?.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => {
                      const currentIds = task.categoryIds || [];
                      if (isSelected) {
                        if (currentIds.length > 1) {
                          onUpdate({ categoryIds: currentIds.filter(id => id !== category.id) });
                        }
                      } else {
                        onUpdate({ categoryIds: [...currentIds, category.id] });
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-500/20 text-blue-400' 
                        : isDarkMode ? 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-sm">{category.icon}</span>
                    <span className="font-medium">{category.name}</span>
                  </button>
                );
              })}
              {onAddCategory && (
                <button
                  onClick={onAddCategory}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border border-dashed transition-all text-[11px] ${isDarkMode ? 'border-slate-600 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-300 text-slate-400 hover:border-indigo-400 hover:text-indigo-600'}`}
                >
                  <Icons.Plus /> New
                </button>
              )}
            </div>
          </div>
        )}

        {/* Smart Actions - Compact */}
        {smartLinks.length > 0 && (
          <div className={`space-y-2 p-3 rounded-xl border ${isDarkMode ? 'bg-indigo-900/30 border-indigo-800' : 'bg-indigo-50/50 border-indigo-100'}`}>
            <label className="text-[9px] font-bold text-indigo-600 uppercase tracking-wide flex items-center gap-1">
              <Icons.Sparkles /> Smart Actions
            </label>
            <div className="flex flex-col gap-1.5">
              {smartLinks.map((link, idx) => (
                <a 
                  key={idx} 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-white font-semibold text-xs shadow-sm transition-transform active:scale-[0.98] ${link.color}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{link.icon}</span>
                    <span>{link.label}</span>
                  </div>
                  <Icons.ChevronRight />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Schedule - Inline */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Icons.Calendar /> Schedule
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input 
                type="date" 
                className={`w-full p-1.5 rounded-lg border text-xs focus:border-blue-500 outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200 bg-white'}`}
                value={task.dueDate || ''}
                onChange={(e) => onUpdate({ dueDate: e.target.value })}
                title="Due date"
              />
            </div>
            <div>
              <input 
                type="time" 
                className={`w-full p-1.5 rounded-lg border text-xs focus:border-blue-500 outline-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'border-slate-200 bg-white'}`}
                value={task.reminderTime || ''}
                onChange={(e) => onUpdate({ reminderTime: e.target.value })}
                title="Reminder time"
              />
            </div>
          </div>
        </div>

        {/* Sub-Tasks - Moved Up */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Icons.ListChecks /> Subtasks
              {task.subTasks.length > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] ${isDarkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200'}`}>
                  {task.subTasks.filter(s => s.isCompleted).length}/{task.subTasks.length}
                </span>
              )}
            </label>
            <button onClick={addSubTask} className={`text-[10px] font-medium flex items-center gap-0.5 ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}>
              <Icons.Plus /> Add
            </button>
          </div>
          
          {task.subTasks.length === 0 ? (
            <button 
              onClick={addSubTask}
              className={`w-full py-3 border border-dashed rounded-lg text-xs transition-all ${isDarkMode ? 'border-slate-600 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}`}
            >
              + Add a subtask to break this down
            </button>
          ) : (
          <div className="space-y-1">
            {task.subTasks.map(subtask => (
              <div key={subtask.id} className={`border rounded-lg ${isDarkMode ? 'border-slate-700 bg-slate-700/50' : 'border-slate-100 bg-slate-50/50'}`}>
                <div className="p-2 flex items-center gap-2">
                  <button
                    onClick={() => updateSubTask(subtask.id, { isCompleted: !subtask.isCompleted })}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${subtask.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : isDarkMode ? 'border-slate-500 bg-slate-600' : 'border-slate-300 bg-white'}`}
                  >
                    {subtask.isCompleted && <Icons.Check />}
                  </button>
                  
                  {editingSubtask === subtask.id ? (
                    <input
                      type="text"
                      value={subtask.title}
                      onChange={(e) => updateSubTask(subtask.id, { title: e.target.value })}
                      onBlur={() => setEditingSubtask(null)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingSubtask(null); }}
                      autoFocus
                      className={`flex-1 text-xs font-medium border border-blue-400 rounded px-1.5 py-0.5 outline-none ${isDarkMode ? 'bg-slate-600 text-white' : 'bg-white'}`}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => setEditingSubtask(subtask.id)}
                      className={`flex-1 text-xs font-medium cursor-text truncate ${subtask.isCompleted ? 'line-through text-slate-400' : isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                    >
                      {subtask.title}
                    </span>
                  )}
                  
                  <button onClick={() => toggleSubtaskExpanded(subtask.id)} className={`p-0.5 ${isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                    {expandedSubtasks.has(subtask.id) ? <Icons.ChevronDown /> : <Icons.ChevronRight />}
                  </button>
                  <button onClick={() => deleteSubTask(subtask.id)} className={`p-0.5 ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>
                    <Icons.Trash />
                  </button>
                </div>
                
                {expandedSubtasks.has(subtask.id) && (
                  <div className={`px-2 pb-2 pt-1 space-y-2 border-t ${isDarkMode ? 'border-slate-600' : 'border-slate-100'}`}>
                    <div className="flex gap-1">
                      {priorityOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => updateSubTask(subtask.id, { priority: opt.value })}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${subtask.priority === opt.value ? opt.activeClass : isDarkMode ? 'bg-slate-600 text-slate-400' : 'bg-slate-100 text-slate-400'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <input type="date" className={`p-1 rounded border text-[10px] ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'border-slate-200'}`} value={subtask.dueDate || ''} onChange={(e) => updateSubTask(subtask.id, { dueDate: e.target.value })} />
                      <input type="time" className={`p-1 rounded border text-[10px] ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white' : 'border-slate-200'}`} value={subtask.reminderTime || ''} onChange={(e) => updateSubTask(subtask.id, { reminderTime: e.target.value })} />
                    </div>
                    <textarea className={`w-full p-1.5 rounded border text-[10px] resize-none ${isDarkMode ? 'bg-slate-600 border-slate-500 text-white placeholder:text-slate-400' : 'border-slate-200'}`} placeholder="Notes..." rows={1} value={subtask.notes} onChange={(e) => updateSubTask(subtask.id, { notes: e.target.value })} />
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        {/* Notes - Compact */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Notes</label>
          <textarea
            className={`w-full min-h-[60px] p-2.5 rounded-lg border text-xs focus:border-blue-500 outline-none resize-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-500' : 'border-slate-200 bg-slate-50/50'}`}
            placeholder="Add notes or details..."
            value={task.notes}
            onChange={(e) => onUpdate({ notes: e.target.value })}
          />
        </div>

        {/* Collaboration - Condensed */}
        <div className="space-y-2">
          <label className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            <Icons.UserPlus /> Share & Collaborate
          </label>
          
          {/* Quick Share Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                const shareText = `Check out this task: ${task.title}`;
                if (navigator.share) {
                  navigator.share({ title: 'MentaList Task', text: shareText });
                } else {
                  navigator.clipboard.writeText(shareText);
                  alert('Task details copied to clipboard!');
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-xs font-medium ${isDarkMode ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-blue-900/30 hover:border-blue-500' : 'border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600'}`}
            >
              📤 Share
            </button>
            
            <button
              onClick={() => {
                const inviteLink = `mentalist://invite?task=${task.id}`;
                navigator.clipboard.writeText(inviteLink);
                alert('Invite link copied! Share it with friends to collaborate.');
              }}
              className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-lg border transition-all text-xs font-medium ${isDarkMode ? 'border-slate-600 bg-slate-700 text-slate-300 hover:bg-indigo-900/30 hover:border-indigo-500' : 'border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-600'}`}
            >
              🤝 Invite
            </button>
          </div>
          
          {/* Collaborators */}
          {task.sharedWith.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {task.sharedWith.map(user => (
                <div key={user.id} className={`flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full border ${isDarkMode ? 'border-emerald-700 bg-emerald-900/30' : 'border-emerald-200 bg-emerald-50'}`}>
                  <img src={user.avatar} className="w-5 h-5 rounded-full" alt={user.name} />
                  <span className={`text-[10px] font-medium ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>{user.name}</span>
                  <button onClick={() => toggleShare(user)} className={`text-xs ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>×</button>
                </div>
              ))}
            </div>
          )}
          
          {/* Demo Contacts - Collapsed */}
          {MOCK_USERS.filter(u => !task.sharedWith.some(s => s.id === u.id)).length > 0 && (
            <div className={`pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
              <p className={`text-[9px] mb-1.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Add collaborators:</p>
              <div className="flex flex-wrap gap-1">
                {MOCK_USERS.filter(u => !task.sharedWith.some(s => s.id === u.id)).map(user => (
                  <button
                    key={user.id}
                    onClick={() => onSendCollaborationRequest ? onSendCollaborationRequest(task, user) : toggleShare(user)}
                    className={`flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full border transition-all ${isDarkMode ? 'border-slate-600 bg-slate-700 hover:border-blue-500 hover:bg-blue-900/30' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'}`}
                  >
                    <img src={user.avatar} className="w-5 h-5 rounded-full opacity-70" alt={user.name} />
                    <span className={`text-[10px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{user.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Attachments - Compact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className={`text-[10px] font-bold uppercase flex items-center gap-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Icons.Attach /> Attachments
              {task.attachments.length > 0 && <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>({task.attachments.length})</span>}
            </label>
            <button onClick={() => fileInputRef.current?.click()} className={`text-[10px] font-medium flex items-center gap-0.5 ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'}`}>
              <Icons.Plus /> Add
            </button>
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
          </div>
          
          {task.attachments.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {task.attachments.map(att => (
                <div key={att.id} className={`relative group rounded-lg overflow-hidden border ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-slate-50'}`}>
                  {att.type === AttachmentType.IMAGE ? (
                    <img src={att.url} className="w-full h-16 object-cover" />
                  ) : (
                    <div className={`w-full h-16 flex items-center justify-center ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}>
                      <span className="text-lg">📄</span>
                    </div>
                  )}
                  <button 
                    onClick={() => onUpdate({ attachments: task.attachments.filter(a => a.id !== att.id) })}
                    className={`absolute top-0.5 right-0.5 p-0.5 rounded-full shadow-sm text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'bg-slate-800/90' : 'bg-white/90'}`}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className={`w-full py-2 border border-dashed rounded-lg text-[10px] transition-all ${isDarkMode ? 'border-slate-600 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'}`}
            >
              + Add files or images
            </button>
          )}
        </div>
      </div>

      {/* Action Footer - Compact */}
      <div className={`p-3 border-t flex gap-2 ${isDarkMode ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
        <Button 
          variant="secondary" 
          className="flex-1 py-2 text-sm"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button 
          className="flex-1 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
          onClick={() => {
            if (onComplete) onComplete();
            onClose();
          }}
        >
          <Icons.Check /> Save Task
        </Button>
      </div>
    </div>
  );
};
