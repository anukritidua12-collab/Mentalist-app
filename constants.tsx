
import {
  Icon as PhosphorIcon, IconWeight, Plus, Check, CalendarBlank, Paperclip, UserPlus, CaretRight, CaretDown, Sparkle, Trash,
  Eye, EyeSlash, Export, ChatCircle, ListChecks, Trophy, Bell, X, GearSix, SpeakerHigh, SpeakerSlash, Vibrate,
  Palette, ClockCounterClockwise, ArrowCounterClockwise, Repeat, PencilSimple, Clock, Users, Rows, MusicNotes,
  Confetti, MagnifyingGlass, PaperPlaneTilt, FlowArrow, CheckCircle, List, DotsThree, ChartLineUp,
} from '@phosphor-icons/react';

export const DEFAULT_CATEGORIES = [
  { id: 'daily', name: 'Today', icon: 'sun', color: 'bg-blue-500', isDefault: true },
  { id: 'work', name: 'Work', icon: 'briefcase', color: 'bg-indigo-500', isDefault: true },
  { id: 'personal', name: 'Personal', icon: 'home', color: 'bg-emerald-500', isDefault: true },
  { id: 'quick', name: 'Quick List', icon: 'checklist', color: 'bg-sky-500', isDefault: true },
  { id: 'other', name: 'Other', icon: 'clipboard', color: 'bg-orange-500', isDefault: true },
  { id: 'shared', name: 'Shared with Me', icon: 'users', color: 'bg-purple-500', isDefault: true },
];

// Legacy export for backwards compatibility
export const CATEGORIES = DEFAULT_CATEGORIES;

export const MOTIVATIONAL_QUOTES = [
  // Stoic Philosophy (15)
  "We suffer more in imagination than in reality. — Seneca",
  "The impediment to action advances action. What stands in the way becomes the way. — Marcus Aurelius",
  "First say to yourself what you would be; then do what you have to do. — Epictetus",
  "Waste no more time arguing about what a good man should be. Be one. — Marcus Aurelius",
  "It is not that we have a short time to live, but that we waste a lot of it. — Seneca",
  "Begin at once to live, and count each day as a separate life. — Seneca",
  "How long are you going to wait before you demand the best for yourself? — Epictetus",
  "He who fears death will never do anything worthy of a man who is alive. — Seneca",
  "You have power over your mind — not outside events. Realize this, and you will find strength. — Marcus Aurelius",
  "Difficulties strengthen the mind, as labor does the body. — Seneca",
  "No person has the power to have everything they want, but it is in their power not to want what they don't have. — Seneca",
  "The happiness of your life depends upon the quality of your thoughts. — Marcus Aurelius",
  "Make the best use of what is in your power, and take the rest as it happens. — Epictetus",
  "It's not what happens to you, but how you react to it that matters. — Epictetus",
  "Very little is needed to make a happy life; it is all within yourself. — Marcus Aurelius",
  // Task & Focus Wisdom (20)
  "The secret of getting ahead is getting started. — Mark Twain",
  "You don't have to be great to start, but you have to start to be great. — Zig Ziglar",
  "Action is the foundational key to all success. — Pablo Picasso",
  "A year from now you'll wish you had started today. — Karen Lamb",
  "Done is better than perfect. — Sheryl Sandberg",
  "Small daily improvements are the key to staggering long-term results. — Robin Sharma",
  "The way to get started is to quit talking and begin doing. — Walt Disney",
  "Focus on being productive instead of busy. — Tim Ferriss",
  "You can do anything, but not everything. — David Allen",
  "The key is not to prioritize what's on your schedule, but to schedule your priorities. — Stephen Covey",
  "Start where you are. Use what you have. Do what you can. — Arthur Ashe",
  "What gets measured gets managed. — Peter Drucker",
  "Simplicity boils down to two steps: Identify the essential. Eliminate the rest. — Leo Babauta",
  "Your mind is for having ideas, not holding them. — David Allen",
  "The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
  "Progress, not perfection, is what we should be asking of ourselves. — Julia Cameron",
  "Work expands to fill the time available for its completion. — Parkinson's Law",
  "Eat the frog first thing in the morning. — Mark Twain",
  "Either you run the day, or the day runs you. — Jim Rohn",
  "Amateurs sit and wait for inspiration. The rest of us just get up and go to work. — Stephen King",
  // Witty & Fun (15)
  "I love deadlines. I love the whooshing noise they make as they go by. — Douglas Adams",
  "The only thing standing between you and your goal is the story you keep telling yourself. — Jordan Belfort",
  "I'm not procrastinating. I'm doing side quests. — Unknown",
  "Productivity tip: Rename your WiFi to 'Get Back To Work'",
  "Coffee: because adulting is hard and naps are frowned upon.",
  "My to-do list and I have an agreement: it pretends to be reasonable, I pretend to finish it.",
  "Procrastination is like a credit card: it's fun until you get the bill.",
  "I didn't fail. I just found 10,000 ways that won't work. — Thomas Edison",
  "The elevator to success is out of order. You'll have to take the stairs. — Joe Girard",
  "Behind every successful person is a substantial amount of coffee. — Stephanie Piro",
  "I have not failed. I've just been too busy looking at cat videos.",
  "The road to success is always under construction. — Lily Tomlin",
  "I'm on a seafood diet. I see food and I eat it. Then I nap. Then I work.",
  "Success is going from failure to failure without losing your enthusiasm. — Winston Churchill",
  "Hard work never killed anybody, but why take a chance? — Edgar Bergen"
];

export const QUICK_ADD_SUGGESTIONS = [
  // Daily Life (15)
  "Go through my emails",
  "Squeeze in a workout",
  "Give mom a call",
  "Pick up some groceries",
  "Tidy up the living room",
  "Take my vitamins",
  "Go for a 20-min walk",
  "Get to bed by 10pm",
  "Prep meals for the week",
  "Catch up with a friend",
  "Water the plants",
  "10 minutes of meditation",
  "Read for 30 minutes",
  "Drink 8 glasses of water",
  "Change the bed sheets",
  // Work & Productivity (15)
  "Review the project status",
  "Draft that proposal",
  "Schedule team sync",
  "Update meeting notes",
  "Clear out Slack messages",
  "Set weekly goals",
  "Organize desktop files",
  "Follow up on that lead",
  "Check analytics dashboard",
  "Brainstorm new ideas",
  "Research competitors",
  "Review task backlog",
  "Block focus time on calendar",
  "Prepare presentation slides",
  "Update LinkedIn profile",
  // Self Care & Learning (10)
  "Create a focus playlist",
  "Finish that online course",
  "Practice gratitude journaling",
  "Learn something new today",
  "Do something creative",
  "Take a proper coffee break",
  "Watch the sunrise/sunset",
  "Write in journal",
  "Do a 15-min stretch routine",
  "Solve a puzzle or brain teaser",
  // Errands & Chores (10)
  "Pay the bills",
  "Check the mailbox",
  "Fix that thing I've been avoiding",
  "Do a load of laundry",
  "Get the car washed",
  "Return that online order",
  "Restock household supplies",
  "Take out the trash",
  "Schedule maintenance appointment",
  "File important documents"
];

export const DAILY_QUOTES = [
  "Seize the day",
  "Make today count",
  "Today is your canvas",
  "One day at a time",
  "Today's goals, tomorrow's achievements",
  "Make it happen",
  "Your day, your way",
  "Rise and shine",
  "Today is a fresh start",
  "Embrace the day ahead"
];
export const VICTORY_QUOTES = [
  "Well done is better than well said. And you've done it! — Benjamin Franklin",
  "The discipline of finishing is the discipline of freedom. You're free! — Robin Sharma",
  "Success is the sum of small efforts, repeated. Today you proved it. — Robert Collier",
  "You didn't come this far to only come this far. Rest up, champion.",
  "Plot twist: You actually finished everything. The simulation is glitching.",
  "Productivity: 100%. Excuses: 0%. Legend status: Confirmed.",
  "Somewhere, a procrastinator just felt a disturbance in the force."
];

export const THEMES: Record<string, any> = {
  clarity: {
    confettiPath: 'M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#F3F5F9', '#1F2433', '#3B5BDB'], // Ground, text, accent (shown in the theme picker)
    name: 'Clarity',
    primary: 'indigo-600',
    secondary: 'indigo-50',
    bg: 'theme-ground',
    paper: '#F3F5F9', // Page background, also used behind the iPhone status bar
    accent: 'blue-500',
    description: 'Ink and pen blue',
    confettiColors: ['#3B5BDB', '#6F86E8', '#A9B8F2', '#FFD84D', '#FF8FAB'],
    confettiShapes: ['circle', 'square'],
    tagline: 'Clear mind, clear list',
    emptyTitle: 'A clean slate',
    emptyText: 'Nothing on your plate. Enjoy the clarity.',
    darkBg: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
    revealGradient: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EBEFFC 55%, #C9D3F7 100%)',
  },
  focus: {
    confettiPath: '', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#F4F4F2', '#1C1C1E', '#2F2F33'], // Ground, text, accent (shown in the theme picker)
    name: 'Graphite',
    primary: 'slate-600',
    secondary: 'slate-100',
    bg: 'theme-ground',
    paper: '#F4F4F2', // Page background, also used behind the iPhone status bar
    accent: 'indigo-500',
    description: 'Graphite, nothing else',
    confettiColors: ['#2F2F33', '#6B6B70', '#A3A3A0', '#D4D4D0', '#1C1C1E'],
    confettiShapes: ['circle'],
    tagline: 'One thing at a time',
    emptyTitle: 'Nothing to focus on',
    emptyText: 'Quiet. Exactly how it should be.',
    darkBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900',
    revealGradient: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #ECECE9 60%, #D4D4D0 100%)',
  },
  warmth: {
    confettiPath: 'M10 18 C-4 9 3 -1 10 5 C17 -1 24 9 10 18 Z', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#F7F1E8', '#2B2119', '#A8601C'], // Ground, text, accent (shown in the theme picker)
    name: 'Warmth',
    primary: 'amber-600',
    secondary: 'amber-50',
    bg: 'theme-ground',
    paper: '#F7F1E8', // Page background, also used behind the iPhone status bar
    accent: 'orange-600',
    description: 'Honey and linen',
    confettiColors: ['#A8601C', '#C98A45', '#E3B57A', '#F3E7D6', '#E8735A'],
    confettiShapes: ['circle', 'square'],
    tagline: 'Cozy, steady progress',
    emptyTitle: 'Time for a cuppa',
    emptyText: 'Your list is empty. Put the kettle on.',
    darkBg: 'bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900',
    revealGradient: 'radial-gradient(circle at 50% 40%, #FFFDF9 0%, #F3E7D6 55%, #E3C7A0 100%)',
  },
  serenity: {
    confettiPath: 'M10 0 C10 0 18 9 18 13.5 A8 8 0 0 1 2 13.5 C2 9 10 0 10 0 Z', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#EBF3F5', '#10303A', '#0B6E8A'], // Ground, text, accent (shown in the theme picker)
    name: 'Serenity',
    primary: 'cyan-600',
    secondary: 'cyan-50',
    bg: 'theme-ground',
    paper: '#EBF3F5', // Page background, also used behind the iPhone status bar
    accent: 'sky-500',
    description: 'Deep tide and sea air',
    confettiColors: ['#0B6E8A', '#3E97AE', '#7FC3D3', '#BFE1EA', '#FFD84D'],
    confettiShapes: ['circle'],
    tagline: 'Calm seas, clear sailing',
    emptyTitle: 'Calm waters ahead',
    emptyText: 'Nothing on the horizon. Breathe in the sea air.',
    darkBg: 'bg-gradient-to-b from-slate-950 via-cyan-950 to-sky-950',
    revealGradient: 'linear-gradient(180deg, #F4FAFB 0%, #D7ECF1 50%, #7FC3D3 85%, #0B6E8A 100%)',
  },
  nature: {
    confettiPath: 'M10 0 C18 6 18 16 10 24 C2 16 2 6 10 0 Z', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#EFF3EA', '#1D2B1F', '#3D7A36'], // Ground, text, accent (shown in the theme picker)
    name: 'Nature',
    primary: 'emerald-600',
    secondary: 'emerald-50',
    bg: 'theme-ground',
    paper: '#EFF3EA', // Page background, also used behind the iPhone status bar
    accent: 'teal-500',
    description: 'Sage and moss',
    confettiColors: ['#3D7A36', '#6A9E5F', '#A7C79A', '#D9C27A', '#F2A65A'],
    confettiShapes: ['circle'],
    tagline: 'Grow a little every day',
    emptyTitle: 'Room to grow',
    emptyText: 'Plant your first task and watch it bloom.',
    darkBg: 'bg-gradient-to-b from-slate-950 via-emerald-950 to-green-950',
    revealGradient: 'linear-gradient(180deg, #F7F9F3 0%, #E4EDDD 50%, #A7C79A 88%, #3D7A36 100%)',
  },
  blossom: {
    confettiPath: 'M10 0 C15 3 16 10 10 20 C4 10 5 3 10 0 Z', // Petal
    swatch: ['#F9F1F3', '#33202A', '#B2476E'], // Ground, text, accent (shown in the theme picker)
    name: 'Blossom',
    primary: 'rose-700',
    secondary: 'rose-50',
    bg: 'theme-ground',
    paper: '#F9F1F3', // Page background, also used behind the iPhone status bar
    accent: 'rose-400',
    description: 'Rose and petal',
    confettiColors: ['#B2476E', '#CF7A9A', '#F1CFDB', '#E8B4C4', '#FFD1A6'],
    confettiShapes: ['circle'],
    tagline: 'Gentle and in bloom',
    emptyTitle: 'Nothing but petals',
    emptyText: 'Your list is clear. Let the day unfold.',
    darkBg: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
    revealGradient: 'radial-gradient(circle at 50% 40%, #FFFFFF 0%, #F6E6EC 55%, #E8B4C4 100%)',
  },
  midnight: {
    confettiPath: 'M10 0 L12.9 6.9 L20 7.6 L14.6 12.3 L16.2 19.5 L10 15.8 L3.8 19.5 L5.4 12.3 L0 7.6 L7.1 6.9 Z', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#0F1222', '#E6E8F5', '#8E9CFF'], // Ground, text, accent (shown in the theme picker)
    name: 'Midnight',
    primary: 'slate-900',
    secondary: 'slate-800',
    bg: 'theme-ground',
    paper: '#0F1222', // Page background, also used behind the iPhone status bar
    accent: 'purple-500',
    description: 'Ink-blue night',
    confettiColors: ['#8E9CFF', '#B3BCFF', '#E6E8F5', '#5B67C9', '#F5D88A'],
    confettiShapes: ['star', 'circle'],
    tagline: 'Quiet focus under the stars',
    emptyTitle: 'A still, starry night',
    emptyText: 'Nothing left to do. Rest easy.',
    darkBg: 'theme-ground',
    revealGradient: 'radial-gradient(circle at 50% 35%, #2E3463 0%, #171B2E 55%, #0F1222 100%)',
    isDark: true, // Always uses dark styling, whatever the display mode
  },
  twilight: {
    confettiPath: 'M10 0 C15 3 16 10 10 20 C4 10 5 3 10 0 Z', // Confetti piece shape (SVG path); '' = plain dots
    swatch: ['#1A1422', '#F3E9F1', '#E79BBE'], // Ground, text, accent (shown in the theme picker)
    name: 'Twilight',
    primary: 'pink-400',
    secondary: 'pink-900',
    bg: 'theme-ground',
    paper: '#1A1422', // Page background, also used behind the iPhone status bar
    accent: 'rose-300',
    description: 'Plum dusk and rose',
    confettiColors: ['#E79BBE', '#F2BED6', '#B97AA0', '#F3E9F1', '#F0C48A'],
    confettiShapes: ['heart', 'circle'],
    tagline: 'Soft light, gentle progress',
    emptyTitle: 'Petals and peace',
    emptyText: 'All clear as the evening settles in.',
    darkBg: 'theme-ground',
    revealGradient: 'linear-gradient(180deg, #1A1422 0%, #3A2440 55%, #8A4F72 90%, #E79BBE 100%)',
    isDark: true, // Always uses dark styling, whatever the display mode
  },
  ink: {
    confettiPath: '', // Plain dots
    swatch: ['#000000', '#F2F2F2', '#9A9A9A'], // Ground, text, accent (shown in the theme picker)
    name: 'Ink',
    primary: 'white',
    secondary: 'neutral-900',
    bg: 'theme-ground',
    paper: '#000000', // Page background, also used behind the iPhone status bar
    accent: 'white',
    description: 'True black',
    confettiColors: ['#F2F2F2', '#9A9A9A', '#5A5A5A', '#FFFFFF', '#D4D4D4'],
    confettiShapes: ['circle'],
    tagline: 'Nothing but the list',
    emptyTitle: 'Blank page',
    emptyText: 'Nothing here. Enjoy the quiet.',
    darkBg: 'theme-ground',
    revealGradient: 'radial-gradient(circle at 50% 40%, #1C1C1C 0%, #0A0A0A 60%, #000000 100%)',
    isDark: true, // Always uses dark styling, whatever the display mode
  },
};

// Dark mode always uses this neutral look (the chosen theme returns in light mode)
export const NEUTRAL_DARK_THEME = {
  name: 'Dark',
  tagline: 'Clear mind, clear list',
  emptyTitle: 'A clean slate',
  emptyText: 'Nothing on your plate right now.',
  bg: 'bg-slate-950',
  darkBg: 'bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950',
  confettiColors: ['#6366f1', '#818cf8', '#a5b4fc', '#38bdf8', '#e2e8f0'],
  confettiPath: 'M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z',
  revealGradient: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
  isDark: true,
};

// App-wide icons: Phosphor (phosphoricons.com, MIT), regular weight. One family,
// one stroke, so every screen reads as a set. Names and default sizes are unchanged.
type IconProps = { size?: number; className?: string };
const icon = (Glyph: PhosphorIcon, defaultSize: number, weight: IconWeight = 'regular') =>
  ({ size = defaultSize, className }: IconProps = {}) => <Glyph size={size} weight={weight} className={className} aria-hidden="true" />;

export const Icons = {
  Plus: icon(Plus, 18, 'bold'),
  Check: icon(Check, 16, 'bold'),
  Calendar: icon(CalendarBlank, 16),
  Attach: icon(Paperclip, 18),
  UserPlus: icon(UserPlus, 16),
  ChevronRight: icon(CaretRight, 16),
  ChevronDown: icon(CaretDown, 16),
  Sparkles: icon(Sparkle, 16),
  Trash: icon(Trash, 16),
  Eye: icon(Eye, 16),
  EyeOff: icon(EyeSlash, 16),
  Share: icon(Export, 16),
  MessageCircle: icon(ChatCircle, 16),
  ListChecks: icon(ListChecks, 16),
  Trophy: icon(Trophy, 48, 'light'),
  Bell: icon(Bell, 18),
  X: icon(X, 16),
  Settings: icon(GearSix, 18),
  Volume: icon(SpeakerHigh, 16),
  VolumeOff: icon(SpeakerSlash, 16),
  Vibrate: icon(Vibrate, 16),
  Palette: icon(Palette, 16),
  History: icon(ClockCounterClockwise, 16),
  RotateCcw: icon(ArrowCounterClockwise, 16),
  Repeat: icon(Repeat, 16),
  Edit: icon(PencilSimple, 16),
  Clock: icon(Clock, 16),
  Users: icon(Users, 16),
  Lists: icon(Rows, 16),
  Music: icon(MusicNotes, 16),
  Party: icon(Confetti, 16),
  Search: icon(MagnifyingGlass, 16),
  Send: icon(PaperPlaneTilt, 16),
  Workflow: icon(FlowArrow, 16),
  CheckCircle: icon(CheckCircle, 16),
  Menu: icon(List, 22),
  More: icon(DotsThree, 22, 'bold'),
  Chart: icon(ChartLineUp, 16),
};
