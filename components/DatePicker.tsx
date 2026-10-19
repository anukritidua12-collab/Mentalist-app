import React, { useMemo, useState } from 'react';
import { Icons } from '../constants';
import { toLocalDateString } from '../utils';

// MentaList's own calendar. The system date picker on iPhone ignores `min`, so it
// can't grey out past dates; this one disables them and looks the same everywhere.

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const parse = (date: string) => new Date(date + 'T00:00:00');

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

export const formatPickerDate = (date: string) => {
  const today = toLocalDateString();
  if (date === today) return 'Today';
  if (date === toLocalDateString(addDays(new Date(), 1))) return 'Tomorrow';
  return parse(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: parse(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
};

// Handy shortcuts, filtered to those on or after `min`
export const quickDates = (min: string) => {
  const now = new Date();
  // Upcoming Saturday (a week away if today is Saturday)
  const saturday = addDays(now, ((6 - now.getDay() + 7) % 7) || 7);
  return [
    { label: 'Today', date: toLocalDateString(now) },
    { label: 'Tomorrow', date: toLocalDateString(addDays(now, 1)) },
    { label: 'This weekend', date: toLocalDateString(saturday) },
    { label: 'Next week', date: toLocalDateString(addDays(now, 7)) }, // same weekday, a week ahead
  ].filter((q, i, all) => q.date >= min && all.findIndex(o => o.date === q.date) === i);
};

interface CalendarProps {
  value?: string;
  min: string;
  onSelect: (date: string) => void;
  isDarkMode: boolean;
}

export const CalendarGrid: React.FC<CalendarProps> = ({ value, min, onSelect, isDarkMode }) => {
  const initial = parse(value && value >= min ? value : min);
  const [month, setMonth] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const today = toLocalDateString();
  const minMonth = new Date(parse(min).getFullYear(), parse(min).getMonth(), 1);
  const canGoBack = month > minMonth;

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const blanks = Array.from({ length: first.getDay() }, () => null);
    const days = Array.from({ length: daysInMonth }, (_, i) => toLocalDateString(new Date(month.getFullYear(), month.getMonth(), i + 1)));
    return [...blanks, ...days];
  }, [month]);

  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => canGoBack && setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          disabled={!canGoBack}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-25 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          aria-label="Previous month"
        >
          <span className="rotate-180 inline-flex"><Icons.ChevronRight /></span>
        </button>
        <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-ink'}`}>
          {month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
        <button
          type="button"
          onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
          aria-label="Next month"
        >
          <Icons.ChevronRight />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={i} className={`text-xs font-semibold py-1 ${muted}`}>{d}</span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`b${i}`} />;
          const disabled = date < min;
          const selected = date === value;
          const isToday = date === today;
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(date)}
              className={`mx-auto w-10 h-10 rounded-full text-[15px] font-medium transition-all active:scale-90 ${
                selected
                  ? 'text-white shadow-md'
                  : disabled
                    ? `cursor-not-allowed ${isDarkMode ? 'text-slate-700' : 'text-slate-300'}`
                    : isDarkMode ? 'text-slate-100 hover:bg-slate-700' : 'text-ink hover:bg-slate-100'
              } ${isToday && !selected ? 'ring-2 ring-inset ring-[var(--theme-primary)]' : ''}`}
              style={selected ? { backgroundColor: 'var(--theme-primary)' } : undefined}
              aria-label={parse(date).toDateString()}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const QuickDateChips: React.FC<{ min: string; value?: string; onSelect: (date: string) => void; isDarkMode: boolean }> = ({ min, value, onSelect, isDarkMode }) => (
  <div className="flex flex-wrap gap-2">
    {quickDates(min).map(q => {
      const active = q.date === value;
      return (
        <button
          key={q.label}
          type="button"
          onClick={() => onSelect(q.date)}
          className={`h-9 px-3.5 rounded-full text-sm font-medium border transition-all active:scale-95 ${
            active ? 'text-on-accent border-transparent' : isDarkMode ? 'border-slate-600 text-slate-300' : 'border-slate-200 text-slate-600 bg-white'
          }`}
          style={active ? { backgroundColor: 'var(--theme-primary)' } : undefined}
        >
          {q.label}
        </button>
      );
    })}
  </div>
);

interface DateFieldProps {
  value?: string;
  min: string;
  onChange: (date: string | undefined) => void;
  placeholder?: string;
  isDarkMode: boolean;
  compact?: boolean;
}

// A field that shows the chosen date and opens the calendar in a sheet
export const DateField: React.FC<DateFieldProps> = ({ value, min, onChange, placeholder = 'Choose a date', isDarkMode, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = () => {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 180);
  };

  return (
    <>
      <div className={`flex items-center w-full rounded-xl border transition-colors ${compact ? 'h-11' : 'h-12'} ${
        isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex-1 min-w-0 h-full flex items-center gap-2 px-3 text-left text-base ${value ? (isDarkMode ? 'text-white' : 'text-ink') : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}
        >
          <span className="shrink-0 opacity-70"><Icons.Calendar /></span>
          <span className="truncate">{value ? formatPickerDate(value) : placeholder}</span>
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className={`w-10 h-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}
            aria-label="Clear date"
          >
            <Icons.X />
          </button>
        )}
      </div>

      {open && (
        <div
          className={`fixed inset-0 z-[80] bg-black/40 flex items-end md:items-center justify-center ${closing ? 'animate-out fade-out duration-200' : 'animate-in fade-in duration-200'}`}
          onClick={close}
        >
          <div
            className={`w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-5 shadow-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} ${
              closing ? 'animate-out slide-out-to-bottom-8 fade-out duration-200' : 'animate-in slide-in-from-bottom-8 fade-in duration-300'
            }`}
            style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="mb-4">
              <QuickDateChips min={min} value={value} onSelect={d => { onChange(d); close(); }} isDarkMode={isDarkMode} />
            </div>
            <CalendarGrid value={value} min={min} onSelect={d => { onChange(d); close(); }} isDarkMode={isDarkMode} />
            <div className="flex gap-3 mt-4">
              {value && (
                <button
                  type="button"
                  onClick={() => { onChange(undefined); close(); }}
                  className={`flex-1 h-11 rounded-xl font-semibold transition-all active:scale-[0.97] ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                >
                  Clear date
                </button>
              )}
              <button
                type="button"
                onClick={close}
                className={`flex-1 h-11 rounded-xl font-semibold transition-all active:scale-[0.97] ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface TimeFieldProps {
  value?: string;
  onChange: (time: string | undefined) => void;
  isDarkMode: boolean;
  compact?: boolean;
  placeholder?: string;
}

// Native time input (the iPhone wheel works well), with a clear button that sits
// outside the input so tapping it doesn't open the picker
export const TimeField: React.FC<TimeFieldProps> = ({ value, onChange, isDarkMode, compact = false, placeholder = 'Set a time' }) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  // Opens the picker from anywhere in the box (desktop browsers otherwise need their tiny icon)
  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    try { input.showPicker?.(); } catch { /* not supported */ }
  };
  return (
    <div
      onClick={openPicker}
      className={`flex items-center w-full rounded-xl border cursor-pointer focus-within:border-[var(--theme-primary)] transition-colors ${compact ? 'h-11' : 'h-12'} ${
        isDarkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200'
      }`}
    >
      <span className={`pl-3 shrink-0 opacity-70 ${isDarkMode ? 'text-white' : 'text-ink'}`}><Icons.Clock /></span>
      {/* No fixed height: iOS draws a fixed-height time input's text at the top. The box centres it instead. */}
      <span className="relative flex-1 min-w-0 self-center flex items-center">
        <input
          ref={inputRef}
          type="time"
          value={value || ''}
          onChange={e => onChange(e.target.value || undefined)}
          className={`hide-picker-icon w-full min-w-0 py-0 px-2 leading-normal bg-transparent text-base outline-none ${isDarkMode ? '[color-scheme:dark]' : ''} ${value ? (isDarkMode ? 'text-white' : 'text-ink') : 'text-transparent'}`}
          aria-label={value ? 'Reminder time' : placeholder}
        />
        {/* Empty time inputs show nothing (or --:--), so say what the box is for */}
        {!value && (
          <span className={`pointer-events-none absolute inset-y-0 left-2 flex items-center text-base ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{placeholder}</span>
        )}
      </span>
      {value && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange(undefined); }}
          className="w-10 h-full flex items-center justify-center shrink-0 text-slate-400 transition-transform active:scale-90"
          aria-label="Clear reminder time"
        >
          <Icons.X />
        </button>
      )}
    </div>
  );
};
