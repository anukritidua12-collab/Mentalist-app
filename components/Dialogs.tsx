import React, { useEffect, useRef, useState } from 'react';

// In-app dialogs in place of the browser's confirm/prompt/alert, which on iPhone appear
// as untitled alerts with an "Ok" button. Each has a title, buttons named for what they
// do, and a red button for anything that can't be undone.
//   await dialogs.confirm({ title, message, confirmLabel, destructive }) -> true / false
//   await dialogs.prompt({ title, placeholder, confirmLabel })          -> text, or null if cancelled
//   await dialogs.alert({ title, message })                             -> resolves when dismissed

type ConfirmOptions = { title: string; message?: string; confirmLabel: string; cancelLabel?: string; destructive?: boolean };
type Choice = { id: string; label: string; hint?: string };
type PromptOptions = { title: string; message?: string; placeholder?: string; initialValue?: string; confirmLabel: string; choices?: Choice[]; initialChoice?: string };
type AlertOptions = { title: string; message?: string; buttonLabel?: string };

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null, choice?: string) => void }
  | { kind: 'alert'; options: AlertOptions; resolve: () => void };

let enqueue: ((request: Request) => void) | null = null;

const open = <T,>(make: (resolve: (value: T) => void) => Request, fallback: () => T): Promise<T> =>
  new Promise<T>(resolve => {
    if (!enqueue) { resolve(fallback()); return; } // Host not mounted yet (very early startup)
    enqueue(make(resolve));
  });

export const dialogs = {
  confirm: (options: ConfirmOptions) =>
    open<boolean>(resolve => ({ kind: 'confirm', options, resolve }), () => window.confirm(options.message || options.title)),
  prompt: (options: PromptOptions) =>
    open<string | null>(resolve => ({ kind: 'prompt', options, resolve }), () => window.prompt(options.title, options.initialValue || '')),
  // A name plus a choice between a few kinds (e.g. a list or a quick list)
  promptChoice: (options: PromptOptions & { choices: Choice[] }) =>
    open<{ text: string; choice: string } | null>(
      resolve => ({ kind: 'prompt', options, resolve: (value, choice) => resolve(value === null ? null : { text: value, choice: choice || options.choices[0].id }) }),
      () => { const text = window.prompt(options.title, ''); return text ? { text, choice: options.choices[0].id } : null; },
    ),
  alert: (options: AlertOptions) =>
    open<void>(resolve => ({ kind: 'alert', options, resolve }), () => window.alert(options.message || options.title)),
};

export const DialogHost: React.FC<{ isDarkMode: boolean }> = ({ isDarkMode }) => {
  const [queue, setQueue] = useState<Request[]>([]);
  const [value, setValue] = useState('');
  const [choice, setChoice] = useState<string | undefined>();
  const [leaving, setLeaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const current = queue[0];

  useEffect(() => {
    enqueue = request => setQueue(q => [...q, request]);
    return () => { enqueue = null; };
  }, []);

  useEffect(() => {
    if (current?.kind === 'prompt') {
      setValue(current.options.initialValue || '');
      setChoice(current.options.initialChoice || current.options.choices?.[0]?.id);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [current]);

  if (!current) return null;

  // Fade out, then answer and move to the next dialog
  const finish = (answer: () => void) => {
    setLeaving(true);
    setTimeout(() => { answer(); setLeaving(false); setQueue(q => q.slice(1)); }, 160);
  };
  const cancel = () => finish(() => {
    if (current.kind === 'confirm') current.resolve(false);
    else if (current.kind === 'prompt') current.resolve(null);
    else current.resolve();
  });
  const accept = () => finish(() => {
    if (current.kind === 'confirm') current.resolve(true);
    else if (current.kind === 'prompt') current.resolve(value.trim() ? value.trim() : null, choice);
    else current.resolve();
  });

  const { title, message } = current.options;
  const strong = isDarkMode ? 'text-white' : 'text-ink';
  const muted = isDarkMode ? 'text-slate-400' : 'text-muted';
  const destructive = current.kind === 'confirm' && current.options.destructive;
  const primaryLabel = current.kind === 'alert' ? (current.options.buttonLabel || 'OK') : current.options.confirmLabel;
  const promptEmpty = current.kind === 'prompt' && !value.trim();

  return (
    <div
      className={`fixed inset-0 z-[120] bg-black/45 backdrop-blur-[2px] flex items-center justify-center p-6 ${leaving ? 'animate-out fade-out duration-150 fill-mode-forwards' : 'animate-in fade-in duration-200'}`}
      onClick={current.kind === 'alert' ? accept : cancel}
    >
      <div
        role={current.kind === 'alert' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => { if (e.key === 'Escape') cancel(); }}
        className={`w-full max-w-[340px] rounded-3xl p-5 shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} ${leaving ? 'animate-out zoom-out-95 fade-out duration-150 fill-mode-forwards' : 'animate-in zoom-in-95 fade-in duration-200'}`}
      >
        <h2 id="app-dialog-title" className={`font-display font-bold text-lg leading-snug ${strong}`}>{title}</h2>
        {message && <p className={`text-sm mt-1.5 leading-relaxed whitespace-pre-line ${muted}`}>{message}</p>}
        {current.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { e.preventDefault(); accept(); } }}
            placeholder={current.options.placeholder}
            aria-label={title}
            enterKeyHint="done"
            className={`mt-4 w-full h-12 px-4 rounded-xl border text-base outline-none focus:ring-2 focus:ring-[color:var(--theme-primary-lighter)] ${isDarkMode ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-white border-slate-200 text-ink placeholder:text-muted'}`}
          />
        )}
        {current.kind === 'prompt' && current.options.choices && (
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Type">
            {current.options.choices.map(option => {
              const active = choice === option.id;
              return (
                <button
                  key={option.id}
                  role="radio"
                  aria-checked={active}
                  onClick={() => setChoice(option.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-[border-color,background-color] duration-150 ${active ? '' : isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}
                  style={active ? { borderColor: 'var(--theme-primary)', backgroundColor: 'var(--theme-secondary)' } : undefined}
                >
                  <span className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-transparent' : isDarkMode ? 'border-slate-500' : 'border-slate-300'}`} style={active ? { backgroundColor: 'var(--theme-primary)' } : undefined}>
                    {active && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-semibold ${strong}`}>{option.label}</span>
                    {option.hint && <span className={`block text-xs mt-0.5 leading-snug ${muted}`}>{option.hint}</span>}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <div className="flex gap-3 mt-5">
          {current.kind !== 'alert' && (
            <button
              onClick={cancel}
              className={`flex-1 h-12 rounded-xl font-semibold transition-transform active:scale-[0.97] ${isDarkMode ? 'bg-slate-700 text-slate-100' : 'bg-slate-100 text-slate-700'}`}
            >
              {current.kind === 'confirm' ? (current.options.cancelLabel || 'Cancel') : 'Cancel'}
            </button>
          )}
          <button
            onClick={accept}
            disabled={promptEmpty}
            className={`flex-1 h-12 rounded-xl font-semibold transition-transform active:scale-[0.97] disabled:opacity-40 ${destructive ? 'bg-red-600 text-white' : 'text-on-accent'}`}
            style={destructive ? undefined : { backgroundColor: 'var(--theme-primary)' }}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
