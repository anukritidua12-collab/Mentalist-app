import React, { useState } from 'react';
import { Category } from '../types';
import { Icons } from '../constants';
import { ListIcon } from './AppIcons';

// Shown after accepting a collaboration invite: the task is always in "Shared with Me",
// and the person can also add it to any of their own lists.

interface AddToListsModalProps {
  taskTitle: string;
  categories: Category[];
  onDone: (listIds: string[]) => void;
  isDarkMode: boolean;
}

export const AddToListsModal: React.FC<AddToListsModalProps> = ({ taskTitle, categories, onDone, isDarkMode }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lists = categories.filter(c => c.id !== 'shared');
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center animate-in fade-in duration-200">
      <div
        className={`w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[88dvh] flex flex-col animate-in slide-in-from-bottom-8 md:slide-in-from-bottom-0 md:zoom-in-95 fade-in duration-300 ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-ink'}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}>
            <Icons.Check />
          </div>
          <h2 className="font-display font-bold text-xl">You're collaborating!</h2>
          <p className={`text-sm mt-1 ${muted}`}>
            "{taskTitle}" is in <span className="font-semibold">Shared with Me</span>. Would you like it in any of your lists too?
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-2 space-y-2">
          {lists.map(list => {
            const on = selected.has(list.id);
            return (
              <button
                key={list.id}
                onClick={() => toggle(list.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                  on ? '' : isDarkMode ? 'border-slate-700' : 'border-slate-200'
                }`}
                style={on ? { borderColor: 'var(--theme-primary)', backgroundColor: isDarkMode ? 'rgba(99,102,241,0.12)' : 'var(--theme-secondary)' } : undefined}
                aria-pressed={on}
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <ListIcon icon={list.icon} size={20} />
                </span>
                <span className="flex-1 font-medium">{list.name}</span>
                <span
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-on-accent transition-colors ${on ? 'border-transparent' : isDarkMode ? 'border-slate-600' : 'border-slate-300'}`}
                  style={on ? { backgroundColor: 'var(--theme-primary)' } : undefined}
                >
                  {on && <Icons.Check />}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 p-5 pt-3">
          <button
            onClick={() => onDone([])}
            className={`flex-1 h-12 rounded-xl font-semibold transition-all active:scale-[0.97] ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
          >
            Just Shared with Me
          </button>
          <button
            onClick={() => onDone([...selected])}
            disabled={selected.size === 0}
            className="flex-1 h-12 rounded-xl font-semibold text-on-accent transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            Add to {selected.size || ''} list{selected.size === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
};
