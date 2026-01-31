
import React from 'react';

export const DEFAULT_CATEGORIES = [
  { id: 'daily', name: 'Daily List', icon: '☀️', color: 'bg-blue-500', isDefault: true },
  { id: 'work', name: 'Work List', icon: '💼', color: 'bg-indigo-500', isDefault: true },
  { id: 'personal', name: 'Personal List', icon: '🏠', color: 'bg-emerald-500', isDefault: true },
  { id: 'other', name: 'Other List', icon: '📋', color: 'bg-orange-500', isDefault: true },
  { id: 'shared', name: 'Shared with Me', icon: '👥', color: 'bg-purple-500', isDefault: true },
];

// Legacy export for backwards compatibility
export const CATEGORIES = DEFAULT_CATEGORIES;

export const MOCK_USERS = [
  { id: 'u1', name: 'Alex River', avatar: 'https://picsum.photos/seed/alex/100/100', email: 'alex@example.com' },
  { id: 'u2', name: 'Sarah Sun', avatar: 'https://picsum.photos/seed/sarah/100/100', email: 'sarah@example.com' },
  { id: 'u3', name: 'Leo Night', avatar: 'https://picsum.photos/seed/leo/100/100', email: 'leo@example.com' },
];

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
  "📧 Go through my emails",
  "💪 Squeeze in a workout",
  "📞 Give mom a call",
  "🛒 Pick up some groceries",
  "🧹 Tidy up the living room",
  "💊 Take my vitamins",
  "🚶 Go for a 20-min walk",
  "💤 Get to bed by 10pm",
  "🥗 Prep meals for the week",
  "📱 Catch up with a friend",
  "🪴 Water the plants",
  "🧘 10 minutes of meditation",
  "📖 Read for 30 minutes",
  "💧 Drink 8 glasses of water",
  "🛏️ Change the bed sheets",
  // Work & Productivity (15)
  "📊 Review the project status",
  "✍️ Draft that proposal",
  "🗓️ Schedule team sync",
  "📝 Update meeting notes",
  "💻 Clear out Slack messages",
  "🎯 Set weekly goals",
  "📁 Organize desktop files",
  "🤝 Follow up on that lead",
  "📈 Check analytics dashboard",
  "💡 Brainstorm new ideas",
  "🔍 Research competitors",
  "📋 Review task backlog",
  "⏰ Block focus time on calendar",
  "🎤 Prepare presentation slides",
  "💼 Update LinkedIn profile",
  // Self Care & Learning (10)
  "🎵 Create a focus playlist",
  "📚 Finish that online course",
  "✨ Practice gratitude journaling",
  "🧠 Learn something new today",
  "🎨 Do something creative",
  "☕ Take a proper coffee break",
  "🌅 Watch the sunrise/sunset",
  "📓 Write in journal",
  "🏋️ Do a 15-min stretch routine",
  "🧩 Solve a puzzle or brain teaser",
  // Errands & Chores (10)
  "🏦 Pay the bills",
  "📬 Check the mailbox",
  "🛠️ Fix that thing I've been avoiding",
  "🧺 Do a load of laundry",
  "🚗 Get the car washed",
  "📦 Return that online order",
  "🏪 Restock household supplies",
  "🗑️ Take out the trash",
  "🔧 Schedule maintenance appointment",
  "📄 File important documents"
];

export const DAILY_QUOTES = [
  "Seize the day ✨",
  "Make today count 🌟",
  "Today is your canvas 🎨",
  "One day at a time 💪",
  "Today's goals, tomorrow's achievements 🎯",
  "Make it happen ⚡",
  "Your day, your way 🌈",
  "Rise and shine ☀️",
  "Today is a fresh start 🌱",
  "Embrace the day ahead 🚀"
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

export const THEMES = {
  clarity: {
    name: 'Clarity',
    primary: 'indigo-600',
    secondary: 'indigo-50',
    bg: 'bg-gradient-to-br from-slate-100 via-indigo-50 to-slate-100',
    accent: 'blue-500',
    icon: '✨',
    description: 'Clean & professional',
    confettiColors: ['#6366f1', '#a855f7', '#ec4899', '#fbbf24', '#10b981', '#3b82f6'],
    confettiShapes: ['circle', 'square'],
    categoryIcons: { complete: '✓', priority: '!', reminder: '🔔' }
  },
  midnight: {
    name: 'Midnight',
    primary: 'slate-900',
    secondary: 'slate-800',
    bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
    accent: 'purple-500',
    icon: '🌙',
    description: 'Dark & elegant',
    confettiColors: ['#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6'],
    confettiShapes: ['star', 'circle'],
    categoryIcons: { complete: '⭐', priority: '💫', reminder: '🌟' }
  },
  love: {
    name: 'Love',
    primary: 'pink-500',
    secondary: 'pink-50',
    bg: 'bg-gradient-to-br from-pink-100 via-rose-50 to-pink-100',
    accent: 'rose-500',
    icon: '💕',
    description: 'Romantic & sweet',
    confettiColors: ['#ec4899', '#f472b6', '#fb7185', '#f43f5e', '#fda4af'],
    confettiShapes: ['heart'],
    confettiEmojis: ['❤️', '💕', '💖', '💗', '💘', '💝', '😍', '🥰', '💋', '🏹'],
    categoryIcons: { complete: '💖', priority: '💗', reminder: '💕' }
  },
  nature: {
    name: 'Nature',
    primary: 'emerald-600',
    secondary: 'emerald-50',
    bg: 'bg-gradient-to-br from-green-100 via-emerald-50 to-teal-50',
    accent: 'teal-500',
    icon: '🌿',
    description: 'Fresh & natural',
    confettiColors: ['#10b981', '#34d399', '#6ee7b7', '#a3e635', '#22c55e'],
    confettiShapes: ['circle'],
    confettiEmojis: ['🌿', '🍃', '🌱', '🌸', '🦋', '🌺', '🌻', '🍀'],
    categoryIcons: { complete: '🌱', priority: '🌿', reminder: '🍃' }
  },
  ocean: {
    name: 'Ocean',
    primary: 'cyan-600',
    secondary: 'cyan-50',
    bg: 'bg-gradient-to-br from-cyan-100 via-blue-50 to-sky-100',
    accent: 'sky-500',
    icon: '🌊',
    description: 'Calm & peaceful',
    confettiColors: ['#06b6d4', '#22d3ee', '#0ea5e9', '#38bdf8', '#7dd3fc'],
    confettiShapes: ['circle'],
    confettiEmojis: ['🌊', '🐚', '🐬', '🐳', '🦀', '⚓', '🏖️', '🐠'],
    categoryIcons: { complete: '🐚', priority: '🌊', reminder: '🐬' }
  },
  sunset: {
    name: 'Sunset',
    primary: 'orange-500',
    secondary: 'orange-50',
    bg: 'bg-gradient-to-br from-orange-100 via-amber-50 to-rose-100',
    accent: 'amber-500',
    icon: '🌅',
    description: 'Warm & cozy',
    confettiColors: ['#f97316', '#fb923c', '#fbbf24', '#f59e0b', '#ef4444'],
    confettiShapes: ['circle', 'star'],
    confettiEmojis: ['🌅', '☀️', '🌞', '🔥', '✨', '🌟'],
    categoryIcons: { complete: '🌟', priority: '🔥', reminder: '☀️' }
  },
  galaxy: {
    name: 'Galaxy',
    primary: 'violet-600',
    secondary: 'violet-50',
    bg: 'bg-gradient-to-br from-violet-200 via-purple-100 to-indigo-200',
    accent: 'purple-500',
    icon: '🌌',
    description: 'Cosmic & mystical',
    confettiColors: ['#8b5cf6', '#a855f7', '#d946ef', '#c084fc', '#e879f9'],
    confettiShapes: ['star'],
    confettiEmojis: ['🌌', '⭐', '🌟', '💫', '✨', '🚀', '🛸', '🌙'],
    categoryIcons: { complete: '⭐', priority: '🚀', reminder: '🌙' }
  },
  candy: {
    name: 'Candy',
    primary: 'fuchsia-500',
    secondary: 'fuchsia-50',
    bg: 'bg-gradient-to-br from-pink-200 via-fuchsia-100 to-purple-200',
    accent: 'pink-400',
    icon: '🍬',
    description: 'Fun & playful',
    confettiColors: ['#e879f9', '#f0abfc', '#f472b6', '#fb7185', '#a78bfa'],
    confettiShapes: ['circle', 'square'],
    confettiEmojis: ['🍬', '🍭', '🍫', '🧁', '🎂', '🍩', '🍪', '🎀'],
    categoryIcons: { complete: '🍬', priority: '🍭', reminder: '🧁' }
  },
  minimalist: {
    name: 'Minimalist',
    primary: 'gray-700',
    secondary: 'gray-50',
    bg: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
    accent: 'gray-500',
    icon: '◻️',
    description: 'Simple & focused',
    confettiColors: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#f3f4f6'],
    confettiShapes: ['square'],
    categoryIcons: { complete: '✓', priority: '•', reminder: '○' }
  }
};

// Sound settings for notifications
export const NOTIFICATION_SOUNDS = [
  { id: 'chime', name: 'Chime', emoji: '🔔' },
  { id: 'bell', name: 'Bell', emoji: '🛎️' },
  { id: 'ding', name: 'Ding', emoji: '✨' },
  { id: 'pop', name: 'Pop', emoji: '💫' },
  { id: 'gentle', name: 'Gentle', emoji: '🌊' },
  { id: 'alert', name: 'Alert', emoji: '⚡' },
];

export const Icons = {
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  ),
  Check: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  ),
  Calendar: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
  ),
  Attach: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
  ),
  UserPlus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
  ),
  ChevronDown: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 3.873L18 7.492l-3 2.924L15.708 15 12 13.047 8.292 15 9 10.416l-3-2.924 4.088-.619L12 3z"></path></svg>
  ),
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
  ),
  EyeOff: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
  ),
  Share: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
  ),
  MessageCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
  ),
  ListChecks: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 6H21"></path><path d="M10 12H21"></path><path d="M10 18H21"></path><polyline points="3 6 4 7 6 5"></polyline><polyline points="3 12 4 13 6 11"></polyline><polyline points="3 18 4 19 6 17"></polyline></svg>
  ),
  Trophy: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EAB308" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
  ),
  Bell: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  ),
  Settings: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
  ),
  Volume: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
  ),
  VolumeOff: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
  ),
  Vibrate: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M1 8v8M23 8v8"></path></svg>
  ),
  Palette: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="0.5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r="0.5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r="0.5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r="0.5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c0.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"></path></svg>
  ),
};
