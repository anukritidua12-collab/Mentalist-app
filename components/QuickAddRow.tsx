import React, { useRef, useState } from 'react';
import { Icons } from '../constants';

// "Add a task" line at the end of a list: type a name, press Enter (or Add), and it's
// on the list with no details panel. Focus stays put so the next one can follow.

interface QuickAddRowProps {
  onAdd: (title: string) => void;
  isDarkMode: boolean;
  placeholder?: string;
}

export const QuickAddRow: React.FC<QuickAddRowProps> = ({ onAdd, isDarkMode, placeholder = 'Quick add' }) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const title = draft.trim();
    if (!title) return;
    onAdd(title);
    setDraft('');
    inputRef.current?.focus();
  };

  return (
    <div
      className={`mt-3 md:mt-4 flex items-center gap-1 pl-2 pr-2 min-h-[56px] rounded-2xl border border-dashed transition-colors focus-within:border-solid ${
        isDarkMode ? 'border-slate-700 focus-within:bg-slate-800/70' : 'border-line focus-within:bg-sheet'
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      <span className="w-10 h-10 flex items-center justify-center shrink-0" style={{ color: 'var(--theme-primary)' }}>
        <Icons.Plus />
      </span>
      <input
        ref={inputRef}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        placeholder={placeholder}
        aria-label="Quick add a task"
        enterKeyHint="done"
        className={`flex-1 min-w-0 h-11 bg-transparent text-base md:text-[15px] outline-none ${isDarkMode ? 'text-slate-100 placeholder:text-slate-500' : 'text-ink placeholder:text-muted'}`}
      />
      {draft.trim() && (
        <button
          onClick={(e) => { e.stopPropagation(); add(); }}
          className="h-9 px-4 rounded-xl text-sm font-semibold text-on-accent shrink-0 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-150"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          Add
        </button>
      )}
    </div>
  );
};
