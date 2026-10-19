import { useEffect, useRef, useState } from 'react';
import { Task } from '../types';

// When each finished task "settles" into the done section (for ordering). A task that
// has just been ticked stays where it is while its strike line draws and for a short
// beat after, then moves. Un-ticking moves it back straight away.
// Done tasks are ordered most recent first, so each newly finished task lands just
// below the open ones, on top of the tasks finished before it.
export const STRIKE_MS = 480;  // Strike line drawing time (matches .strike-line in themes.css)
const SETTLE_MS = 1050;        // Line drawn, then a beat to see it, then the move

export const useSettledDone = (tasks: Task[]): Map<string, number> => {
  const initial = () => new Map(tasks.filter(t => t.isCompleted).map(t => [t.id, t.completedAt || 0] as [string, number]));
  const [settled, setSettled] = useState<Map<string, number>>(initial);
  const timers = useRef(new Map<string, number>());
  const seen = useRef(new Set<string>(tasks.map(t => t.id)));
  const settledRef = useRef(settled);
  settledRef.current = settled;

  useEffect(() => {
    const doneNow = new Map(tasks.filter(t => t.isCompleted).map(t => [t.id, t] as [string, Task]));
    // Tasks appearing for the first time (loaded, synced, switched list) that are
    // already done go straight to their place; only fresh ticks wait for the line
    const arrivedDone = tasks.filter(t => !seen.current.has(t.id) && t.isCompleted);
    tasks.forEach(t => seen.current.add(t.id));
    setSettled(prev => {
      let changed = arrivedDone.some(t => !prev.has(t.id));
      const next = new Map<string, number>(arrivedDone.map(t => [t.id, t.completedAt || 0] as [string, number]));
      prev.forEach((at, id) => { if (doneNow.has(id)) next.set(id, at); else changed = true; });
      return changed ? next : prev;
    });
    doneNow.forEach((_, id) => {
      if (timers.current.has(id) || arrivedDone.some(t => t.id === id) || settledRef.current.has(id)) return;
      const timer = window.setTimeout(() => {
        timers.current.delete(id);
        setSettled(prev => (prev.has(id) ? prev : new Map(prev).set(id, Date.now())));
      }, SETTLE_MS);
      timers.current.set(id, timer);
    });
    // Cancel pending moves for tasks that were un-ticked in the meantime
    timers.current.forEach((timer, id) => {
      if (!doneNow.has(id)) { clearTimeout(timer); timers.current.delete(id); }
    });
  }, [tasks]);

  useEffect(() => () => timers.current.forEach(timer => clearTimeout(timer)), []);

  return settled;
};

// Sort helper: open tasks first (in their own order), then done tasks, newest first
export const doneOrder = (settled: Map<string, number>, a: Task, b: Task): number => {
  const aDone = settled.has(a.id), bDone = settled.has(b.id);
  if (aDone !== bDone) return aDone ? 1 : -1;
  if (aDone && bDone) return (settled.get(b.id) || 0) - (settled.get(a.id) || 0);
  return 0;
};
