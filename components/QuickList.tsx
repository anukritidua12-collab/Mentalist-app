import React, { useRef, useState } from 'react';
import { Task } from '../types';
import { Icons } from '../constants';

// The Quick List: a checklist in the style of Apple Notes. Items are ordinary tasks
// (so they appear in search, History and counts), but they're added and edited
// right in the list instead of through the task panel.

interface QuickListProps {
  items: Task[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void; // Removes an empty line (Backspace or leaving it blank)
  onRemove: (id: string) => void; // The delete button: the item moves to History
  onOpen: (id: string) => void;
  isDarkMode: boolean;
}

export const QuickList: React.FC<QuickListProps> = ({ items, onAdd, onToggle, onRename, onDelete, onRemove, onOpen, isDarkMode }) => {
  const [draft, setDraft] = useState('');
  const newItemRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLInputElement>());

  const addDraft = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft('');
    newItemRef.current?.focus(); // ready for the next line, like Notes
  };

  const muted = isDarkMode ? 'text-slate-500' : 'text-slate-400';

  return (
    <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
      <ul className={`divide-y ${isDarkMode ? 'divide-slate-700/70' : 'divide-slate-100'}`}>
        {items.map((item, index) => (
          <li key={item.id} className="group flex items-center gap-1 pl-2 pr-1 min-h-[52px] animate-in fade-in slide-in-from-top-1 duration-200">
            <button
              onClick={() => onToggle(item.id)}
              className="w-10 h-10 flex items-center justify-center shrink-0 transition-transform active:scale-90"
              aria-label={item.isCompleted ? 'Mark not done' : 'Mark done'}
            >
              <span className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-colors ${
                item.isCompleted ? 'border-transparent text-on-accent' : isDarkMode ? 'border-slate-500' : 'border-slate-300'
              }`} style={item.isCompleted ? { backgroundColor: 'var(--theme-primary)' } : undefined}>
                {item.isCompleted && <Icons.Check />}
              </span>
            </button>
            <input
              ref={el => { if (el) rowRefs.current.set(item.id, el); else rowRefs.current.delete(item.id); }}
              value={item.title}
              onChange={e => onRename(item.id, e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  newItemRef.current?.focus();
                } else if (e.key === 'Backspace' && item.title === '') {
                  // Backspace on an empty line removes it and moves up, like Notes
                  e.preventDefault();
                  onDelete(item.id);
                  const previous = items[index - 1];
                  (previous ? rowRefs.current.get(previous.id) : newItemRef.current)?.focus();
                }
              }}
              onBlur={() => { if (!item.title.trim()) onDelete(item.id); }}
              enterKeyHint="next"
              aria-label="Item"
              className={`flex-1 min-w-0 h-11 bg-transparent text-base outline-none transition-colors ${
                item.isCompleted ? `line-through ${muted}` : isDarkMode ? 'text-slate-100' : 'text-ink'
              }`}
            />
            {/* Anything set through the details panel shows here too */}
            {(item.priority !== 'medium' || item.scheduledDate || item.dueDate || item.reminderTime || item.subTasks.length > 0) && (
              <span className={`flex items-center gap-1.5 shrink-0 text-[11px] font-medium ${muted}`}>
                {(item.scheduledDate || item.dueDate) && <span>{new Date((item.scheduledDate || item.dueDate) + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>}
                {item.reminderTime && <span className="hidden sm:inline">{new Date(`2000-01-01T${item.reminderTime}:00`).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>}
                {item.subTasks.length > 0 && <span>{item.subTasks.filter(st => st.isCompleted).length}/{item.subTasks.length}</span>}
                {item.priority !== 'medium' && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: item.priority === 'high' ? '#ef4444' : '#3b82f6' }}
                    title={item.priority === 'high' ? 'High priority' : 'Low priority'}
                    aria-label={item.priority === 'high' ? 'High priority' : 'Low priority'}
                  />
                )}
              </span>
            )}
            <button
              onClick={() => onOpen(item.id)}
              className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90 ${muted} md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100`}
              aria-label="Open details"
              title="Add a date, reminder or subtasks"
            >
              <Icons.ChevronRight />
            </button>
            <button
              onClick={() => onRemove(item.id)}
              className={`w-9 h-9 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90 hover:text-red-500 ${muted} md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100`}
              aria-label={`Delete ${item.title || 'item'}`}
              title="Delete (moves to History)"
            >
              <Icons.Trash />
            </button>
          </li>
        ))}

        {/* New item */}
        <li className="flex items-center gap-1 pl-2 pr-2 min-h-[52px]">
          <span className="w-10 h-10 flex items-center justify-center shrink-0" style={{ color: 'var(--theme-primary)' }}>
            <Icons.Plus />
          </span>
          <input
            ref={newItemRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }}
            placeholder={items.length ? 'New item' : 'Jot down your first item'}
            enterKeyHint="done"
            aria-label="New item"
            className={`flex-1 min-w-0 h-11 bg-transparent text-base outline-none ${isDarkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-ink placeholder:text-slate-400'}`}
          />
          {draft.trim() && (
            <button
              onClick={addDraft}
              className="h-9 px-4 rounded-xl text-sm font-semibold text-on-accent shrink-0 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-150"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              Add
            </button>
          )}
        </li>
      </ul>
    </div>
  );
};
