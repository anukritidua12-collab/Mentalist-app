import React from 'react';
import { Icons } from '../constants';
import { FEATURES } from '../config';
import { Lightning, CheckCircle as PhCheckCircle, FolderSimple, BellSimple, UsersThree, PaintBrush, Lightbulb, ChatCircleText, ArrowRight } from '@phosphor-icons/react';

// The Guide (help) and "Why MentaList" (about) pages, shown inside Settings.
// The little demos are drawn with the app's own parts and loop gently (themes.css, .guide-*).

// Where people can write to us (shown at the end of the Guide).
export const SUPPORT_EMAIL = 'mentalistishere@gmail.com';

export const APP_VERSION = '1.0';

type Props = { isDarkMode: boolean };

const useTone = (isDarkMode: boolean) => ({
  strong: isDarkMode ? 'text-white' : 'text-ink',
  muted: isDarkMode ? 'text-slate-400' : 'text-muted',
  card: isDarkMode ? 'bg-slate-800/60 border-slate-700' : 'bg-sheet border-line',
  demo: isDarkMode ? 'bg-slate-950/60 border-slate-700' : 'bg-[color:var(--theme-paper)] border-line',
  row: isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-sheet border-line',
});

// ---------- Demos ----------

const DemoRow: React.FC<{ isDarkMode: boolean; title: string; className?: string; children?: React.ReactNode }> = ({ isDarkMode, title, className = '', children }) => {
  const t = useTone(isDarkMode);
  return (
    <div className={`h-9 rounded-xl border flex items-center gap-2.5 px-3 text-[13px] ${t.row} ${className}`}>
      {children ?? <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${isDarkMode ? 'border-slate-500' : 'border-slate-300'}`} />}
      <span className={t.strong}>{title}</span>
    </div>
  );
};

const QuickAddDemo: React.FC<Props> = ({ isDarkMode }) => {
  const t = useTone(isDarkMode);
  return (
    <div className={`guide-demo rounded-2xl border p-3 space-y-1.5 ${t.demo}`} aria-hidden="true">
      <DemoRow isDarkMode={isDarkMode} title="Pay rent" />
      <DemoRow isDarkMode={isDarkMode} title="Buy milk" className="guide-qa-new" />
      <div className={`h-9 rounded-xl border border-dashed flex items-center gap-2 px-3 text-[13px] ${isDarkMode ? 'border-slate-600' : 'border-line'}`}>
        <span style={{ color: 'var(--theme-primary)' }}><Icons.Plus size={14} /></span>
        <span className="relative">
          <span className={`guide-qa-placeholder ${t.muted}`}>Quick add</span>
          <span className={`guide-qa-typed absolute left-0 top-0 whitespace-nowrap overflow-hidden ${t.strong}`}>Buy milk</span>
        </span>
        <span className="guide-caret w-px h-4" style={{ backgroundColor: 'var(--theme-primary)' }} />
      </div>
    </div>
  );
};

const TickDemo: React.FC<Props> = ({ isDarkMode }) => {
  const t = useTone(isDarkMode);
  return (
    <div className={`guide-demo rounded-2xl border p-3 ${t.demo}`} aria-hidden="true">
      <div className="relative h-[120px]">
        <div className="guide-tick-row absolute inset-x-0 top-0">
          <DemoRow isDarkMode={isDarkMode} title="">
            <span className={`guide-tick-box w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${isDarkMode ? 'border-slate-500' : 'border-slate-300'}`} />
            <span className={`guide-tick-text relative ${t.strong}`}>Send the invoice<span className="guide-tick-line absolute left-0 top-1/2 h-[1.5px] bg-current" /></span>
          </DemoRow>
        </div>
        <div className="guide-tick-other absolute inset-x-0 top-[42px]"><DemoRow isDarkMode={isDarkMode} title="Book train tickets" /></div>
        <div className="guide-tick-other absolute inset-x-0 top-[84px]"><DemoRow isDarkMode={isDarkMode} title="Call the bank" /></div>
      </div>
    </div>
  );
};

const RenameDemo: React.FC<Props> = ({ isDarkMode }) => {
  const t = useTone(isDarkMode);
  return (
    <div className={`guide-demo rounded-2xl border p-3 ${t.demo}`} aria-hidden="true">
      <div className={`relative h-10 rounded-xl flex items-center gap-2.5 px-3 text-[13px] ${t.row} border`}>
        <span style={{ color: 'var(--theme-primary)' }}><FolderSimple size={16} weight="duotone" /></span>
        <span className={`guide-rename-label ${t.strong}`}>Groceries</span>
        <span className={`guide-rename-input absolute left-9 right-3 h-7 rounded-md border px-2 flex items-center ${isDarkMode ? 'bg-slate-900 border-slate-500 text-white' : 'bg-white border-slate-300 text-ink'}`}>
          Weekly shop<span className="guide-caret w-px h-3.5 ml-px" style={{ backgroundColor: 'var(--theme-primary)' }} />
        </span>
        <span className="guide-press absolute left-24 top-1/2 w-8 h-8 -mt-4 rounded-full" style={{ backgroundColor: 'var(--theme-primary)' }} />
      </div>
      <p className={`text-[11px] mt-2 ${t.muted}`}>Hold on iPhone, double-click on a computer</p>
    </div>
  );
};

const ShareDemo: React.FC<Props> = ({ isDarkMode }) => {
  const t = useTone(isDarkMode);
  return (
    <div className={`guide-demo rounded-2xl border p-3 ${t.demo}`} aria-hidden="true">
      <div className={`h-11 rounded-xl border flex items-center gap-2.5 px-3 text-[13px] ${t.row}`}>
        <span className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${isDarkMode ? 'border-slate-500' : 'border-slate-300'}`} />
        <span className={t.strong}>Final group report</span>
        <span className="ml-auto flex -space-x-1.5">
          <span className="guide-avatar w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center text-white" style={{ backgroundColor: '#0B6E8A', animationDelay: '0.6s' }}>AR</span>
          <span className="guide-avatar w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center text-white" style={{ backgroundColor: '#A8601C', animationDelay: '1.1s' }}>SK</span>
          <span className="guide-avatar w-6 h-6 rounded-full text-[10px] font-semibold flex items-center justify-center text-white" style={{ backgroundColor: '#3D7A36', animationDelay: '1.6s' }}>MJ</span>
        </span>
      </div>
      <p className={`guide-share-note text-[11px] mt-2 ${t.muted}`}>Everyone can tick off subtasks; changes appear for all.</p>
    </div>
  );
};

const ThemeDemo: React.FC<Props> = ({ isDarkMode }) => {
  const t = useTone(isDarkMode);
  return (
    <div className={`guide-demo rounded-2xl border p-3 ${t.demo}`} aria-hidden="true">
      <div className="guide-theme-ground h-[76px] rounded-xl p-3 flex flex-col justify-between">
        <span className="guide-theme-ink h-1.5 w-16 rounded-full" />
        <div className="guide-theme-sheet h-8 rounded-lg flex items-center gap-2 px-2.5">
          <span className="guide-theme-accent w-3 h-3 rounded-full border-2" />
          <span className="guide-theme-ink h-1.5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
};

// ---------- Layout pieces ----------

const Section: React.FC<{ isDarkMode: boolean; icon: React.ReactNode; title: string; intro?: string; demo?: React.ReactNode; children: React.ReactNode }> = ({ isDarkMode, icon, title, intro, demo, children }) => {
  const t = useTone(isDarkMode);
  return (
    <section className={`rounded-2xl border p-4 ${t.card}`}>
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}>{icon}</span>
        <h3 className={`font-semibold text-[15px] ${t.strong}`}>{title}</h3>
      </div>
      {intro && <p className={`text-sm mt-2 leading-relaxed ${t.muted}`}>{intro}</p>}
      {demo && <div className="mt-3">{demo}</div>}
      <dl className="mt-3 space-y-2.5">{children}</dl>
    </section>
  );
};

const Item: React.FC<{ isDarkMode: boolean; term: string; children: React.ReactNode }> = ({ isDarkMode, term, children }) => {
  const t = useTone(isDarkMode);
  return (
    <div>
      <dt className={`text-sm font-semibold ${t.strong}`}>{term}</dt>
      <dd className={`text-sm leading-relaxed ${t.muted}`}>{children}</dd>
    </div>
  );
};

// ---------- Guide ----------

export const GuideContent: React.FC<Props & { onOpenStory: () => void; onOpenPrivacy?: () => void }> = ({ isDarkMode, onOpenStory, onOpenPrivacy }) => {
  const t = useTone(isDarkMode);
  const I = (p: { term: string; children: React.ReactNode }) => <Item isDarkMode={isDarkMode} term={p.term}>{p.children}</Item>;
  return (
    <div className="space-y-3">
      <div className="px-1 pb-1">
        <p className={`font-display text-2xl font-extrabold tracking-tight ${t.strong}`}>Everything MentaList can do</p>
        <p className={`text-sm mt-1.5 leading-relaxed ${t.muted}`}>A short tour, from the obvious to the easy to miss. It takes about three minutes, and it works the same on iPhone and on a computer.</p>
      </div>

      <Section isDarkMode={isDarkMode} icon={<Lightning size={18} weight="duotone" />} title="Adding tasks"
        intro="Three ways in, depending on how much you want to say about a task."
        demo={<QuickAddDemo isDarkMode={isDarkMode} />}>
        <I term="Quick add">The line at the end of a list. Type a name and press Enter; it’s on the list, and you can type the next one straight away.</I>
        <I term="New task">Opens the full details: date, reminder time, repeat, priority, lists, subtasks, notes, photos and files.</I>
        <I term="Seeing and editing a task">Tap any task to see everything about it. Tap the pencil to change it, then Save. Double-click a task’s name on a computer to rename it right in the list.</I>
        <I term="Quick lists">Lists that work like a checklist in Notes. Every line is a task, Enter starts the next one, and › opens its details if you need them. The bin removes a line, and Clear empties the list (both go to History, so nothing is lost). Make your own with New list → Quick list, for groceries, packing or anything you tick off in one go.</I>
        <I term="Repeating tasks">In a task’s details, under Schedule, pick how often it Repeats: every day, every weekday, week, two weeks, month or year. When you tick it off, the next one appears on its next date with the same notes, subtasks and attachments. Choose Never to stop.</I>
        <I term="Plan ahead">Starts a task for tomorrow with the calendar already open. Tasks for later days wait under their date until the day arrives.</I>
        <I term="Suggested">Ideas under Today, refreshed every 20 minutes and never repeated within five days. Tap one to add it. Turn them off in Settings → Workflow.</I>
      </Section>

      <Section isDarkMode={isDarkMode} icon={<PhCheckCircle size={18} weight="duotone" />} title="Getting things done"
        intro="Ticking a task off draws a line through it. A moment later it moves down to join the other finished tasks, with the most recent on top."
        demo={<TickDemo isDarkMode={isDarkMode} />}>
        <I term="Move done tasks down">On by default. Turn it off in Settings → Workflow to keep tasks where they are.</I>
        <I term="Hide completed tasks">Choose when finished tasks leave the list: right away, after an hour, a day, a week, or never. They stay in History either way.</I>
        <I term="History">Deleted and finished tasks live here. Restore one, add it again as a new task, or delete it forever. Not sure what an icon does? Hover over it, or hold it on iPhone.</I>
        <I term="A small celebration">Finish everything for the day and MentaList marks the moment. The confetti can be turned off in Settings → Workflow.</I>
      </Section>

      <Section isDarkMode={isDarkMode} icon={<FolderSimple size={18} weight="duotone" />} title="Staying organised"
        demo={<RenameDemo isDarkMode={isDarkMode} />}>
        <I term="Lists">Make as many as you like with New list in the sidebar. Rename one by holding it on iPhone or double-clicking it on a computer. Reorder or delete lists in Settings → Manage lists.</I>
        <I term="One task, several lists">A task can belong to more than one list, for example Work and Today, and it stays in step everywhere.</I>
        <I term="Priority">High, medium or low. With Sort by priority on, the important ones rise to the top.</I>
        <I term="Subtasks">Break a big task into steps. Type a step and press Add, or tap › to add it and set its priority, date, reminder and notes straight away. Tap a subtask’s name later to rename it.</I>
        <I term="Photos and files">Attach photos, PDFs and other files (up to 25 MB each) under Attachments. Tap one to preview it, or save and share it from there.</I>
        <I term="Hidden tasks">Hide a task from your lists without deleting it. Hidden tasks wait on the Hidden page, tucked at the bottom of the sidebar.</I>
        <I term="Search">Finds tasks, subtasks and notes. To include History and Hidden too, turn on Search History & Hidden in Settings.</I>
        <I term="Carry forward">Unfinished tasks from earlier days move to today, so nothing is quietly left behind. You can turn this off.</I>
      </Section>

      <Section isDarkMode={isDarkMode} icon={<BellSimple size={18} weight="duotone" />} title="Reminders"
        intro="Give a task a reminder time and MentaList lets you know with a soft chime (or silently, if you turn Sound off in Settings).">
        <I term="On iPhone">Reminders arrive like any other app’s notifications, even when MentaList is closed, following your sound and Focus settings.</I>
        <I term="On a computer">Reminders appear while MentaList is open in your browser. Allow notifications when asked.</I>
        <I term="Morning summary">A note at the start of your day (9 am unless you choose another time) listing what’s on Today, most important first.</I>
        <I term="Evening wrap-up">A note at the end of the day with how many tasks you finished and what’s still open.</I>
        <I term="Turning them on">Both are off until you switch them on in Settings → Reminders, and both follow your notification settings.</I>
        <I term="Try it">Settings → Reminders → Send test notification.</I>
      </Section>

      {FEATURES.collaboration ? (
        <Section isDarkMode={isDarkMode} icon={<UsersThree size={18} weight="duotone" />} title="Working together"
          intro="Built for group projects at work, at college, or at home. Sign in under Settings → Account & collaboration to start."
          demo={<ShareDemo isDarkMode={isDarkMode} />}>
          <I term="Share details">Sends a copy of a task by message or email. The other person doesn’t need the app.</I>
          <I term="Invite to collaborate">Shares the task itself. Everyone invited can edit it, tick off subtasks and add notes, and changes appear for all.</I>
          <I term="Accepting an invite">Invites arrive under the bell. Accept one, and the task joins Shared with Me; you can add it to your own lists too.</I>
          <I term="Good practice for teams">Give each person their own subtasks, set a due date on the parent task, and use notes for decisions so everyone sees the same picture.</I>
        </Section>
      ) : (
        <Section isDarkMode={isDarkMode} icon={<UsersThree size={18} weight="duotone" />} title="Sharing a task"
          intro="Handing something over to a colleague, classmate or family member takes a tap.">
          <I term="Share details">Open a task and choose Share details, or use the task’s ⋯ menu. A tidy summary with its date, notes and subtasks goes out by message, email or any app on your device. The other person doesn’t need MentaList.</I>
          <I term="For group work">Share each person’s part as its own task, so everyone receives exactly what they’re responsible for.</I>
        </Section>
      )}

      <Section isDarkMode={isDarkMode} icon={<PaintBrush size={18} weight="duotone" />} title="Making it yours"
        demo={<ThemeDemo isDarkMode={isDarkMode} />}>
        <I term="Themes">Nine of them, under Settings → Appearance. Light themes suit light mode; Midnight, Twilight and Ink are dark themes and switch the whole app to dark.</I>
        <I term="Display mode">Light, dark, or follow your device. In dark mode, light themes rest and MentaList uses its neutral dark look.</I>
        <I term="Quotes">A new quote every hour, or keep one steady by turning off Rotating quotes.</I>
        <I term="Text size">On iPhone, MentaList follows the text size you choose in Settings → Display &amp; Brightness → Text Size.</I>
      </Section>

      <Section isDarkMode={isDarkMode} icon={<Lightbulb size={18} weight="duotone" />} title="Good to know">
        <I term="Nothing is lost by accident">Closing a task with unsaved changes asks first. Deleted tasks wait in History until you delete them forever.</I>
        <I term="Backspace on an empty line">In the Quick List, removes that line and moves up, just like Notes.</I>
        <I term="Shortcuts in task names">Mention an app in a task’s name, such as email, WhatsApp, Maps, YouTube or Spotify, and its details offer a button that opens that app.</I>
        <I term="Progress">The Progress page shows how much you’ve finished, and how your finished tasks spread across your lists.</I>
        <I term="Your tasks stay with you">Everything is kept on your device. Nothing leaves it unless you choose to share it.</I>
      </Section>

      {/* Contact: only shown once there's an address to show */}
      {SUPPORT_EMAIL && <section className="rounded-2xl p-5 text-center" style={{ backgroundColor: 'var(--theme-secondary)' }}>
        <span className="inline-flex" style={{ color: 'var(--theme-primary)' }}><ChatCircleText size={26} weight="duotone" /></span>
        <p className={`font-semibold mt-1.5 ${t.strong}`}>Still need help, or have an idea?</p>
        <p className={`text-sm mt-1 leading-relaxed ${t.muted}`}>
          Questions, bugs and suggestions are all welcome, and every message is read.
          {' '}Write to us at
        </p>
        <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('MentaList')}`} className="inline-block mt-2 font-semibold text-sm underline-offset-4 hover:underline" style={{ color: 'var(--theme-primary)' }}>
          {SUPPORT_EMAIL}
        </a>
      </section>}

      <button onClick={onOpenStory} className={`w-full flex items-center justify-center gap-1.5 py-3 text-sm ${t.muted} hover:opacity-80`}>
        Why we made MentaList <ArrowRight size={14} />
      </button>
      {onOpenPrivacy && (
        <button onClick={onOpenPrivacy} className={`w-full -mt-2 flex items-center justify-center gap-1.5 py-2 text-sm ${t.muted} hover:opacity-80`}>
          Privacy policy <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
};

// ---------- Why MentaList ----------

export const StoryContent: React.FC<Props> = ({ isDarkMode }) => {
  const t = useTone(isDarkMode);
  const p = `text-[15px] leading-[1.7] ${t.muted}`;
  return (
    <article className="px-1 space-y-5">
      <div className="guide-story-mark w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'var(--theme-on-primary)' }}>
        <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true">
          <path className="guide-story-enso" d="M69.3 27 A30 30 0 1 0 79 42.2" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" pathLength={1} />
          <path className="guide-story-tick" d="M38 51 L47 60 L64 41" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
        </svg>
      </div>
      <h3 className={`font-display text-[28px] leading-tight font-extrabold tracking-tight ${t.strong}`}>A clear mind starts with a written list.</h3>
      <p className={p}>
        Most of what weighs on us isn’t the work itself. It’s keeping track of it: the invoice to send, the call to return, the assignment due on Friday, the milk we keep forgetting.
        MentaList exists to hold those things for you, so your attention can go to doing them.
      </p>
      <p className={p}>
        It’s deliberately simple. Add a task in a second, tick it off with a satisfying line, and see your day settle into order.
        When a task needs more, it has room for dates, reminders, subtasks, notes and files, without making every other task feel heavy.
      </p>
      <p className={p}>
        It works across every part of life: a personal checklist, a busy week at the office, a college group project, or planning a family trip.
        Lists keep these worlds apart; Today brings what matters right now into one place.
      </p>
      <p className={p}>
        And because few things are done alone, any task can be passed on in a tap, with its date, notes and steps, to a colleague, a classmate or someone at home.
      </p>
      <div className={`rounded-2xl border p-4 ${t.card}`}>
        <p className={`text-sm font-semibold ${t.strong}`}>What we believe</p>
        <ul className={`mt-2 space-y-1.5 text-sm leading-relaxed ${t.muted}`}>
          <li>Calm beats clever. Nothing in the app should compete with your work for attention.</li>
          <li>Fast to capture, easy to finish. The shortest path is always the default.</li>
          <li>Your tasks are yours. They stay on your device unless you choose to share them.</li>
        </ul>
      </div>
      <p className={`text-xs pt-2 pb-4 ${t.muted}`}>MentaList, version {APP_VERSION}. Made with care, one list at a time.</p>
    </article>
  );
};
