
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Task, ListCategory, ThemeType, CollaborationRequest, SharedUser, Notification } from './types';
import { DEFAULT_CATEGORIES, Icons, MOTIVATIONAL_QUOTES, DAILY_QUOTES, THEMES, VICTORY_QUOTES, NOTIFICATION_SOUNDS, QUICK_ADD_SUGGESTIONS } from './constants';
import { Button } from './components/Button';
import { TaskItem } from './components/TaskItem';
import { TaskDetails } from './components/TaskDetails';
import { CollaborationInvite } from './components/CollaborationInvite';
import { generateId } from './utils';
import { reminderService } from './services/reminderService';
import { 
  onIncomingRequest, 
  sendCollaborationRequest, 
  acceptCollaborationRequest, 
  declineCollaborationRequest,
  addNotification,
  getNotifications,
  markAllNotificationsAsRead,
  onNewNotification
} from './services/collaborationService';

const COMMON_SUGGESTIONS = [
  "📧 Go through my emails",
  "💪 Squeeze in a workout",
  "📞 Give mom a call",
  "🛒 Pick up some groceries"
];

// Helper functions for rotation
const getRotatedQuoteIndex = (): number => {
  const lastUpdate = localStorage.getItem('mentalist_quote_last_update');
  const savedIndex = localStorage.getItem('mentalist_quote_index');
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  if (!lastUpdate || !savedIndex || (now - parseInt(lastUpdate)) >= oneHour) {
    // Time for a new quote
    const newIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    localStorage.setItem('mentalist_quote_index', newIndex.toString());
    localStorage.setItem('mentalist_quote_last_update', now.toString());
    return newIndex;
  }
  return parseInt(savedIndex);
};

const getRotatedSuggestionsIndex = (): number => {
  const lastUpdate = localStorage.getItem('mentalist_suggestions_last_update');
  const savedIndex = localStorage.getItem('mentalist_suggestions_index');
  const now = Date.now();
  const twelveHours = 12 * 60 * 60 * 1000;
  
  if (!lastUpdate || !savedIndex || (now - parseInt(lastUpdate)) >= twelveHours) {
    // Time for new suggestions
    const newIndex = Math.floor(Math.random() * (QUICK_ADD_SUGGESTIONS.length - 4)); // Ensure we can grab 4 consecutive
    localStorage.setItem('mentalist_suggestions_index', newIndex.toString());
    localStorage.setItem('mentalist_suggestions_last_update', now.toString());
    return newIndex;
  }
  return parseInt(savedIndex);
};

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  isDefault?: boolean;
}

const CATEGORY_ICONS = ['📁', '🎯', '⭐', '🔥', '💡', '🎨', '🎵', '📖', '🏃', '🍎', '✈️', '🎮', '☀️', '💼', '🏠', '📋', '👥', '🎒', '💪', '🛒', '📧', '📞', '🎬', '🍽️', '✏️', '📚', '🌟', '🚀', '💻', '🎁'];

// Lists that cannot be deleted
const PROTECTED_LISTS = ['daily', 'shared'];

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState<string>('daily');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<ThemeType>('clarity');
  const [privacyMode, setPrivacyMode] = useState(false); // Deprecated - kept for compatibility
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [victoryIdx, setVictoryIdx] = useState(0);
  const [lastCompletedCount, setLastCompletedCount] = useState(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [pendingCollabRequest, setPendingCollabRequest] = useState<CollaborationRequest | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHiddenTasks, setShowHiddenTasks] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [carryForwardEnabled, setCarryForwardEnabled] = useState(true);
  const [rotationEnabled, setRotationEnabled] = useState(true);
  const [suggestionsIndex, setSuggestionsIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'lists' | 'appearance'>('main');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'light' | 'dark' | 'system'>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [soundSettings, setSoundSettings] = useState({
    enabled: true,
    soundId: 'chime',
    vibration: true,
    volume: 80
  });

  // Load persistence
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mentalist_tasks');
      const savedTheme = localStorage.getItem('mentalist_theme');
      const savedCategories = localStorage.getItem('mentalist_categories');
      const savedSoundSettings = localStorage.getItem('mentalist_sound_settings');
      if (saved) {
        const parsedTasks = JSON.parse(saved);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks);
          setLastCompletedCount(parsedTasks.filter((t: Task) => t.isCompleted).length);
        }
      }
      if (savedTheme) setTheme(savedTheme as ThemeType);
      if (savedCategories) {
        const parsedCategories = JSON.parse(savedCategories);
        if (Array.isArray(parsedCategories)) {
          setCategories(parsedCategories);
        }
      }
      if (savedSoundSettings) {
        const parsedSoundSettings = JSON.parse(savedSoundSettings);
        setSoundSettings(parsedSoundSettings);
        // Update reminder service with loaded settings
        reminderService.updateSettings(parsedSoundSettings);
      }
      const savedCarryForward = localStorage.getItem('mentalist_carry_forward');
      if (savedCarryForward !== null) {
        setCarryForwardEnabled(JSON.parse(savedCarryForward));
      }
      const savedRotation = localStorage.getItem('mentalist_rotation_enabled');
      if (savedRotation !== null) {
        setRotationEnabled(JSON.parse(savedRotation));
      }
      const savedDisplayMode = localStorage.getItem('mentalist_display_mode');
      if (savedDisplayMode) {
        setDisplayMode(savedDisplayMode as 'light' | 'dark' | 'system');
      }
      
      // Load notifications
      setNotifications(getNotifications());
    } catch (e) {
      console.error("Failed to load persistence", e);
    }
    
    // Initialize quote and suggestions indices with rotation logic
    setQuoteIdx(getRotatedQuoteIndex());
    setVictoryIdx(Math.floor(Math.random() * VICTORY_QUOTES.length));
    setSuggestionsIndex(getRotatedSuggestionsIndex());
    
    // Request notification permissions on app load
    reminderService.requestPermissions();
    
    // Listen for incoming collaboration requests
    onIncomingRequest((request, fromUser) => {
      setPendingCollabRequest(request);
      // Also add a notification for the invite
      addNotification({
        type: 'invite_received',
        title: 'Collaboration Invite',
        message: `${fromUser.name} invited you to collaborate`,
        fromUser: fromUser,
        taskTitle: request.taskTitle,
        taskId: request.taskId,
        requestId: request.id
      });
      setNotifications(getNotifications());
    });
    
    // Listen for new notifications
    onNewNotification((notification) => {
      setNotifications(getNotifications());
    });
  }, []);

  // Detect system dark mode preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mediaQuery.matches);
    
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Compute effective dark mode
  const isDarkMode = displayMode === 'dark' || (displayMode === 'system' && systemPrefersDark);

  // Rotation interval for quotes (every hour) and suggestions (every 12 hours)
  useEffect(() => {
    if (!rotationEnabled) return;
    
    // Check for quote rotation every minute (to catch the hour boundary)
    const quoteInterval = setInterval(() => {
      const newQuoteIdx = getRotatedQuoteIndex();
      setQuoteIdx(newQuoteIdx);
    }, 60 * 1000); // Check every minute
    
    // Check for suggestions rotation every minute
    const suggestionsInterval = setInterval(() => {
      const newSuggestionsIdx = getRotatedSuggestionsIndex();
      setSuggestionsIndex(newSuggestionsIdx);
    }, 60 * 1000); // Check every minute
    
    return () => {
      clearInterval(quoteInterval);
      clearInterval(suggestionsInterval);
    };
  }, [rotationEnabled]);

  // Save persistence and monitor reminders
  useEffect(() => {
    localStorage.setItem('mentalist_tasks', JSON.stringify(tasks));
    localStorage.setItem('mentalist_theme', theme);
    localStorage.setItem('mentalist_categories', JSON.stringify(categories));
    localStorage.setItem('mentalist_sound_settings', JSON.stringify(soundSettings));
    localStorage.setItem('mentalist_carry_forward', JSON.stringify(carryForwardEnabled));
    localStorage.setItem('mentalist_rotation_enabled', JSON.stringify(rotationEnabled));
    localStorage.setItem('mentalist_display_mode', displayMode);
    
    // Start monitoring reminders whenever tasks change
    reminderService.startMonitoring(tasks);
    
    return () => {
      reminderService.stopMonitoring();
    };
  }, [tasks, theme, categories, soundSettings, carryForwardEnabled]);

  // Carry forward yesterday's incomplete tasks
  useEffect(() => {
    if (!carryForwardEnabled) return;
    
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastCarryForwardDate = localStorage.getItem('mentalist_last_carry_forward');
    
    // Only run once per day
    if (lastCarryForwardDate === today) return;
    
    // Find yesterday's incomplete tasks and update their due date to today
    const updatedTasks = tasks.map(task => {
      if (task.dueDate === yesterday && !task.isCompleted) {
        return { ...task, dueDate: today };
      }
      return task;
    });
    
    // Check if any tasks were updated
    const hasUpdates = updatedTasks.some((t, i) => t.dueDate !== tasks[i]?.dueDate);
    if (hasUpdates) {
      setTasks(updatedTasks);
      localStorage.setItem('mentalist_last_carry_forward', today);
    } else {
      localStorage.setItem('mentalist_last_carry_forward', today);
    }
  }, [carryForwardEnabled, tasks.length]);

  // Category management functions
  const handleCategoryTap = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const updateCategoryName = (categoryId: string, newName: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, name: newName } : cat
    ));
  };

  const addNewCategory = () => {
    const newCategory: Category = {
      id: generateId(),
      name: 'New List',
      icon: CATEGORY_ICONS[Math.floor(Math.random() * CATEGORY_ICONS.length)],
      color: 'bg-slate-500',
      isDefault: false
    };
    setCategories(prev => [...prev, newCategory]);
    setActiveCategory(newCategory.id);
  };

  const deleteCategory = (categoryId: string) => {
    // Can't delete protected lists (Daily, Shared)
    if (PROTECTED_LISTS.includes(categoryId)) return;
    
    // Move tasks from this category to daily
    setTasks(prev => prev.map(task => {
      if (task.categoryIds?.includes(categoryId)) {
        const newCategoryIds = task.categoryIds.filter(id => id !== categoryId);
        return { ...task, categoryIds: newCategoryIds.length > 0 ? newCategoryIds : ['daily'] };
      }
      return task;
    }));
    
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    if (activeCategory === categoryId) {
      setActiveCategory('daily');
    }
  };

  const updateCategoryIcon = (categoryId: string, newIcon: string) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, icon: newIcon } : cat
    ));
    setShowIconPicker(null);
  };

  const moveCategoryUp = (categoryId: string) => {
    setCategories(prev => {
      const index = prev.findIndex(c => c.id === categoryId);
      if (index <= 0) return prev;
      const newCategories = [...prev];
      [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
      return newCategories;
    });
  };

  const moveCategoryDown = (categoryId: string) => {
    setCategories(prev => {
      const index = prev.findIndex(c => c.id === categoryId);
      if (index < 0 || index >= prev.length - 1) return prev;
      const newCategories = [...prev];
      [newCategories[index], newCategories[index + 1]] = [newCategories[index + 1], newCategories[index]];
      return newCategories;
    });
  };

  // Completion Detection Logic - check tasks in current category
  const categoryTasks = useMemo(() => {
    return tasks.filter(t => 
      !t.isPrivate && 
      (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))
    );
  }, [tasks, activeCategory]);

  const isAllCompleted = useMemo(() => {
    return categoryTasks.length > 0 && categoryTasks.every(t => t.isCompleted);
  }, [categoryTasks]);

  useEffect(() => {
    const currentCompleted = categoryTasks.filter(t => t.isCompleted).length;
    
    // Trigger celebration if all tasks in category are completed and this is a new "all complete" state
    if (isAllCompleted && currentCompleted > lastCompletedCount && categoryTasks.length > 0) {
      triggerCelebration();
      setShowCelebrationModal(true);
    }
    setLastCompletedCount(currentCompleted);
  }, [categoryTasks, isAllCompleted]);

  // Different confetti celebration types - enhanced for realism
  const confettiTypes = [
    // Realistic side cannons with physics
    () => {
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ['#6366f1', '#a855f7', '#ec4899', '#fbbf24', '#10b981', '#3b82f6'];
      
      const frame = () => {
        const timeLeft = animationEnd - Date.now();
        const ticks = Math.max(200, 500 * (timeLeft / duration));
        
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.6 },
          colors: colors,
          ticks: ticks,
          gravity: 1.2,
          scalar: 1,
          drift: 0.5
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.6 },
          colors: colors,
          ticks: ticks,
          gravity: 1.2,
          scalar: 1,
          drift: -0.5
        });
        
        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    },
    // Realistic fireworks burst from center
    () => {
      const count = 250;
      const defaults = { 
        origin: { y: 0.7 },
        gravity: 1,
        ticks: 300
      };
      
      function fire(particleRatio: number, opts: any) {
        confetti({ 
          ...defaults, 
          ...opts, 
          particleCount: Math.floor(count * particleRatio)
        });
      }
      
      // Multiple sequential bursts for realism
      fire(0.25, { spread: 26, startVelocity: 55, decay: 0.95, colors: ['#ff0000', '#ffa500', '#ffff00'] });
      fire(0.2, { spread: 60, decay: 0.93, colors: ['#00ff00', '#00ffff', '#0000ff'] });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, colors: ['#ff00ff', '#ff69b4', '#ffffff'] });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, colors: ['#ffd700', '#ff6347', '#7b68ee'] });
      fire(0.1, { spread: 120, startVelocity: 45, decay: 0.9, colors: ['#98fb98', '#87ceeb', '#dda0dd'] });
      
      // Second wave
      setTimeout(() => {
        fire(0.2, { spread: 80, startVelocity: 45, decay: 0.92, colors: ['#ffd700', '#ff6347'] });
        fire(0.3, { spread: 100, decay: 0.91, colors: ['#6366f1', '#a855f7'] });
      }, 250);
    },
    // Stars falling with sparkle effect
    () => {
      const defaults = { 
        spread: 360, 
        ticks: 150, 
        gravity: 0.4, 
        decay: 0.94, 
        startVelocity: 25, 
        colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'] 
      };
      
      confetti({ ...defaults, particleCount: 60, scalar: 1.2, shapes: ['star'] });
      confetti({ ...defaults, particleCount: 30, scalar: 0.75, shapes: ['circle'] });
      
      setTimeout(() => {
        confetti({ ...defaults, particleCount: 50, scalar: 1.2, shapes: ['star'], origin: { x: 0.3, y: 0.5 } });
        confetti({ ...defaults, particleCount: 25, scalar: 0.75, shapes: ['circle'], origin: { x: 0.7, y: 0.5 } });
      }, 200);
      
      setTimeout(() => {
        confetti({ ...defaults, particleCount: 40, scalar: 1, shapes: ['star'], origin: { x: 0.5, y: 0.3 } });
      }, 400);
    },
    // Rainbow waterfall
    () => {
      const colors = ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#90be6d', '#43aa8b', '#577590'];
      
      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          confetti({ 
            particleCount: 40, 
            angle: 60 + (i * 12), 
            spread: 60, 
            origin: { x: 0.15 + (i * 0.12), y: 0.5 }, 
            colors: [colors[i], colors[(i + 1) % 7]],
            gravity: 0.8,
            ticks: 250,
            startVelocity: 45
          });
        }, i * 80);
      }
      
      // Second wave from opposite side
      setTimeout(() => {
        for (let i = 0; i < 7; i++) {
          setTimeout(() => {
            confetti({ 
              particleCount: 30, 
              angle: 120 - (i * 12), 
              spread: 50, 
              origin: { x: 0.85 - (i * 0.12), y: 0.6 }, 
              colors: [colors[6 - i], colors[(5 - i + 7) % 7]],
              gravity: 0.8,
              ticks: 200,
              startVelocity: 40
            });
          }, i * 60);
        }
      }, 400);
    },
    // Realistic snow/glitter falling
    () => {
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      const colors = ['#ffffff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#f0f9ff', '#e0f2fe'];
      
      const frame = () => {
        confetti({ 
          particleCount: 3, 
          angle: 90, 
          spread: 160, 
          origin: { x: Math.random(), y: -0.1 }, 
          colors: colors, 
          ticks: 400, 
          gravity: 0.4, 
          scalar: 0.9, 
          drift: (Math.random() - 0.5) * 2,
          shapes: ['circle']
        });
        
        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    },
    // Emoji party with physics
    () => {
      const scalar = 2;
      const emojis = ['🎉', '✨', '💫', '🌟', '🎊', '🏆', '💪', '🔥'];
      const shapes = emojis.map(e => confetti.shapeFromText({ text: e, scalar }));
      const defaults = { 
        spread: 180, 
        particleCount: 25, 
        origin: { y: 0.6 }, 
        scalar,
        gravity: 0.8,
        ticks: 250
      };
      
      confetti({ ...defaults, shapes, startVelocity: 35 });
      setTimeout(() => confetti({ ...defaults, shapes, origin: { x: 0.3, y: 0.5 }, startVelocity: 40 }), 200);
      setTimeout(() => confetti({ ...defaults, shapes, origin: { x: 0.7, y: 0.5 }, startVelocity: 40 }), 400);
    }
  ];

  const triggerCelebration = () => {
    // Use theme-specific confetti
    triggerThemedConfetti();
    setVictoryIdx(Math.floor(Math.random() * VICTORY_QUOTES.length));
  };
  
  const triggerThemedConfetti = () => {
    const currentTheme = THEMES[theme as keyof typeof THEMES];
    const colors = currentTheme?.confettiColors || ['#6366f1', '#a855f7', '#ec4899', '#fbbf24'];
    const themeEmojis = (currentTheme as any)?.confettiEmojis;
    
    // Theme-specific emoji confetti if available
    if (themeEmojis && themeEmojis.length > 0) {
      const scalar = 2;
      const shapes = themeEmojis.map((e: string) => confetti.shapeFromText({ text: e, scalar }));
      const defaults = { 
        spread: 180, 
        particleCount: 30, 
        origin: { y: 0.6 }, 
        scalar,
        gravity: 0.8,
        ticks: 300
      };
      
      confetti({ ...defaults, shapes, startVelocity: 40 });
      setTimeout(() => confetti({ ...defaults, shapes, origin: { x: 0.3, y: 0.5 }, startVelocity: 45 }), 200);
      setTimeout(() => confetti({ ...defaults, shapes, origin: { x: 0.7, y: 0.5 }, startVelocity: 45 }), 400);
      setTimeout(() => confetti({ ...defaults, shapes, origin: { x: 0.5, y: 0.4 }, startVelocity: 50 }), 600);
    } else {
      // Default color-based confetti
      const duration = 4 * 1000;
      const animationEnd = Date.now() + duration;
      
      const frame = () => {
        const timeLeft = animationEnd - Date.now();
        const ticks = Math.max(200, 500 * (timeLeft / duration));
        
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          startVelocity: 60,
          origin: { x: 0, y: 0.6 },
          colors: colors,
          ticks: ticks,
          gravity: 1.2,
          scalar: 1,
          drift: 0.5
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          startVelocity: 60,
          origin: { x: 1, y: 0.6 },
          colors: colors,
          ticks: ticks,
          gravity: 1.2,
          scalar: 1,
          drift: -0.5
        });
        
        if (Date.now() < animationEnd) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  };
  
  const triggerRandomConfetti = () => {
    triggerThemedConfetti();
  };

  const addTask = (title: string = 'New Task', taskScheduledDate?: string) => {
    const newTask: Task = {
      id: generateId(),
      title,
      isCompleted: false,
      notes: '',
      subTasks: [],
      attachments: [],
      sharedWith: [],
      createdAt: Date.now(),
      priority: 'medium',
      isPrivate: false,
      scheduledDate: taskScheduledDate,
      categoryIds: [activeCategory] // Assign to current category
    };
    setTasks([newTask, ...tasks]);
    setSelectedTaskId(newTask.id);
  };

  const addScheduledTask = () => {
    if (scheduledDate) {
      addTask('New Task', scheduledDate);
      setShowScheduleModal(false);
      setScheduledDate('');
    }
  };

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const deepUpdate = (items: Task[]): Task[] => {
      return items.map(t => {
        if (t.id === id) return { ...t, ...updates };
        if (t.subTasks.length > 0) return { ...t, subTasks: deepUpdate(t.subTasks) };
        return t;
      });
    };
    setTasks(prev => deepUpdate(prev));
  }, []);

  const deleteTask = useCallback((id: string) => {
    const deepDelete = (items: Task[]): Task[] => {
      return items.filter(t => t.id !== id).map(t => ({
        ...t,
        subTasks: deepDelete(t.subTasks)
      }));
    };
    setTasks(prev => deepDelete(prev));
    if (selectedTaskId === id) setSelectedTaskId(null);
  }, [selectedTaskId]);

  const clearAllTasks = () => {
    if (confirm("Are you sure you want to clear your finished list?")) {
      setTasks([]);
    }
  };

  // Collaboration handlers
  const handleSendCollaborationRequest = (task: Task, toUser: SharedUser) => {
    sendCollaborationRequest(task, toUser, 'collaborate');
    // Add notification that invite was sent
    addNotification({
      type: 'task_shared',
      title: 'Invite Sent',
      message: `Collaboration invite sent to ${toUser.name}`,
      fromUser: toUser,
      taskTitle: task.title,
      taskId: task.id
    });
    setNotifications(getNotifications());
  };

  const handleAcceptCollaboration = (request: CollaborationRequest) => {
    acceptCollaborationRequest(request.id);
    
    // Notify the sender that their invite was accepted
    addNotification({
      type: 'invite_accepted',
      title: 'Invite Accepted! 🎉',
      message: `You accepted ${request.fromUser.name}'s collaboration invite`,
      fromUser: request.fromUser,
      taskTitle: request.taskTitle,
      taskId: request.taskId
    });
    
    // In production: This would notify the original sender
    // Simulating the sender receiving acceptance notification
    setTimeout(() => {
      addNotification({
        type: 'invite_accepted',
        title: 'Collaboration Accepted! 🎉',
        message: `Your collaboration invite for "${request.taskTitle}" was accepted`,
        taskTitle: request.taskTitle,
        taskId: request.taskId
      });
      setNotifications(getNotifications());
    }, 300);
    
    // Add a shared task to the user's list (in "Shared with Me" category)
    const sharedTask: Task = {
      id: generateId(),
      title: request.taskTitle,
      isCompleted: false,
      notes: '',
      subTasks: [],
      attachments: [],
      sharedWith: [],
      sharedBy: request.fromUser,
      createdAt: Date.now(),
      priority: 'medium',
      isPrivate: false,
      categoryIds: ['shared']
    };
    setTasks(prev => [sharedTask, ...prev]);
    setPendingCollabRequest(null);
    setNotifications(getNotifications());
    
    // Switch to "Shared with Me" category to show the new task
    setActiveCategory('shared');
  };

  const handleDeclineCollaboration = (request: CollaborationRequest) => {
    declineCollaborationRequest(request.id);
    
    // Notify that you declined
    addNotification({
      type: 'invite_declined',
      title: 'Invite Declined',
      message: `You declined ${request.fromUser.name}'s collaboration invite`,
      fromUser: request.fromUser,
      taskTitle: request.taskTitle,
      taskId: request.taskId
    });
    
    // In production: This would notify the original sender
    // Simulating the sender receiving rejection notification
    setTimeout(() => {
      addNotification({
        type: 'invite_declined',
        title: 'Invite Declined',
        message: `Your collaboration invite for "${request.taskTitle}" was declined`,
        taskTitle: request.taskTitle,
        taskId: request.taskId
      });
      setNotifications(getNotifications());
    }, 300);
    
    setPendingCollabRequest(null);
    setNotifications(getNotifications());
  };
  
  // Notification handlers
  const handleOpenNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // Mark all as read when opening
      markAllNotificationsAsRead();
      setNotifications(getNotifications());
    }
  };
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const findTask = (items: Task[], id: string): Task | null => {
    for (const t of items) {
      if (t.id === id) return t;
      const found = findTask(t.subTasks, id);
      if (found) return found;
    }
    return null;
  };

  const selectedTask = selectedTaskId ? findTask(tasks, selectedTaskId) : null;

  // Search functionality with predictive results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const results: { task: Task; categoryName: string; categoryIcon: string }[] = [];
    
    tasks.forEach(task => {
      if (task.title.toLowerCase().includes(query)) {
        const taskCategory = categories.find(c => task.categoryIds?.includes(c.id)) || categories[0];
        results.push({
          task,
          categoryName: taskCategory.name,
          categoryIcon: taskCategory.icon
        });
      }
      // Also search subtasks
      task.subTasks.forEach(subtask => {
        if (subtask.title.toLowerCase().includes(query)) {
          const taskCategory = categories.find(c => task.categoryIds?.includes(c.id)) || categories[0];
          results.push({
            task: subtask,
            categoryName: taskCategory.name,
            categoryIcon: taskCategory.icon
          });
        }
      });
    });
    
    return results.slice(0, 8); // Limit to 8 results
  }, [searchQuery, tasks, categories]);
  
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  const recurringSuggestions = useMemo(() => {
    const counts: Record<string, number> = {};
    const traverse = (items: Task[]) => {
      items.forEach(t => {
        const title = t.title.trim();
        if (title && title !== 'New Task' && title.length > 2) {
          counts[title] = (counts[title] || 0) + 1;
        }
        traverse(t.subTasks);
      });
    };
    traverse(tasks);
    return Object.entries(counts)
      .filter(([_, count]) => count > 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title]) => `🔄 ${title}`);
  }, [tasks]);

  const allSuggestions = useMemo(() => {
    // Get rotated suggestions from the curated list
    const rotatedSuggestions = rotationEnabled 
      ? QUICK_ADD_SUGGESTIONS.slice(suggestionsIndex, suggestionsIndex + 4)
      : COMMON_SUGGESTIONS;
    
    // Prioritize user's recurring tasks, then fill with rotated suggestions
    const combined = [...recurringSuggestions, ...rotatedSuggestions];
    const seen = new Set();
    return combined.filter(s => {
      const pure = s.replace(/[^a-zA-Z0-9 ]/g, '').trim().toLowerCase();
      if (seen.has(pure)) return false;
      seen.add(pure);
      return true;
    }).slice(0, 5);
  }, [recurringSuggestions, rotationEnabled, suggestionsIndex]);

  // Keep the user's selected theme (no theme switch on completion)
  const activeTheme = THEMES[theme];

  // Dark mode background
  const darkBg = 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
  const lightBg = activeTheme.bg;

  return (
    <div className={`flex h-screen ${isDarkMode ? darkBg : lightBg} ${isDarkMode ? 'text-slate-100' : 'text-slate-900'} overflow-hidden transition-all duration-500`}>
      {/* Sidebar */}
      <aside className={`w-72 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-r flex flex-col shadow-sm z-20`}>
        <div className="p-6 flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg ${isDarkMode ? 'shadow-indigo-900/50' : 'shadow-indigo-200'} transition-colors`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 2a10 10 0 0 1 10 10"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <h1 className={`text-xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>MentaList</h1>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
          <div className="mb-4">
            <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-2 px-3`}>Categories</p>
            {categories.map(cat => (
              <div
                key={cat.id}
                onClick={() => handleCategoryTap(cat.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                  activeCategory === cat.id 
                    ? `bg-${activeTheme.secondary} text-${activeTheme.primary} shadow-sm font-bold` 
                    : isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg">{cat.icon}</span>
                  <span className="text-sm truncate">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-100'} px-1.5 py-0.5 rounded shadow-sm border`}>
                    {tasks.filter(t => t.categoryIds?.includes(cat.id) || (!t.categoryIds && cat.id === 'daily')).length}
                  </span>
                  {!cat.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this category?')) {
                          deleteCategory(cat.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                    >
                      <Icons.Trash />
                    </button>
                  )}
                </div>
              </div>
            ))}
            
            {/* Add New Category Button */}
            <button
              onClick={addNewCategory}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-indigo-400 border-slate-600 hover:border-indigo-500' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600 border-slate-200 hover:border-indigo-300'} transition-all mt-2 border-2 border-dashed`}
            >
              <Icons.Plus />
              <span className="text-sm font-medium">Create New List</span>
            </button>
          </div>

          <div className="mb-4">
             <p className={`text-[10px] font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mb-2 px-3`}>Hidden Tasks</p>
             {tasks.filter(t => t.isPrivate).length > 0 ? (
               <button
                  onClick={() => setShowHiddenTasks(!showHiddenTasks)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                    showHiddenTasks ? 'bg-amber-50 text-amber-700' : isDarkMode ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'
                  }`}
               >
                  <div className="flex items-center gap-3">
                    <Icons.EyeOff />
                    <span className="text-sm font-semibold">
                      {showHiddenTasks ? 'Hide Archive' : 'Show Hidden'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    {tasks.filter(t => t.isPrivate).length}
                  </span>
               </button>
             ) : (
               <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} px-3 italic`}>No hidden tasks</p>
             )}
          </div>
        </nav>

        {/* Dynamic Card */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
          <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-slate-700/50 border-slate-600' : `bg-${activeTheme.secondary} border-${activeTheme.primary}/10`} border transition-all duration-500`}>
            <p className={`text-[10px] font-bold text-${activeTheme.primary} uppercase tracking-widest mb-2`}>
              {isAllCompleted ? 'Victory Achieved!' : 'Daily Inspiration'}
            </p>
            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} font-medium italic leading-relaxed`}>
              "{isAllCompleted ? VICTORY_QUOTES[victoryIdx] : MOTIVATIONAL_QUOTES[quoteIdx]}"
            </p>
          </div>
        </div>
      </aside>

      {/* Main List Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className={`p-6 flex flex-col gap-4 ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-md border-b sticky top-0 z-10 shadow-sm`}>
          <div className="flex items-center justify-between w-full">
            <div className="relative flex-1 max-w-md">
              <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input 
                type="text" 
                placeholder="Search your tasks..." 
                className={`w-full pl-10 pr-4 py-2 ${isDarkMode ? 'bg-slate-700 text-white placeholder-slate-400' : 'bg-slate-100 text-slate-800 placeholder-slate-400'} border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              />
              
              {/* Search Predictive Dropdown */}
              {showSearchDropdown && searchQuery.trim() && (
                <div className={`absolute top-full left-0 right-0 mt-2 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-xl shadow-2xl border overflow-hidden z-50`}>
                  {searchResults.length === 0 ? (
                    <div className={`p-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                      <p className="text-sm">No tasks found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto">
                      {searchResults.map((result, idx) => (
                        <button
                          key={`${result.task.id}-${idx}`}
                          onClick={() => {
                            setSelectedTaskId(result.task.id);
                            setSearchQuery('');
                            setShowSearchDropdown(false);
                          }}
                          className={`w-full p-3 flex items-start gap-3 ${isDarkMode ? 'hover:bg-slate-700 border-slate-700' : 'hover:bg-slate-50 border-slate-50'} transition-colors text-left border-b last:border-b-0`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            result.task.isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'
                          }`}>
                            {result.task.isCompleted && <Icons.Check />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              result.task.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800'
                            }`}>
                              {result.task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 flex items-center gap-1">
                                {result.categoryIcon} {result.categoryName}
                              </span>
                              {result.task.scheduledDate && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 rounded text-blue-600 flex items-center gap-1">
                                  <Icons.Calendar /> {new Date(result.task.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                              {result.task.dueDate && !result.task.scheduledDate && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 rounded text-amber-600 flex items-center gap-1">
                                  <Icons.Calendar /> Due: {new Date(result.task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              
              {/* Notification Bell */}
              <div className="relative">
                <Button 
                  variant="secondary" 
                  size="icon" 
                  onClick={handleOpenNotifications}
                  title="Notifications"
                  className={showNotifications ? 'bg-indigo-100 text-indigo-600' : ''}
                >
                  <Icons.Bell />
                </Button>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl border overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <div className={`p-4 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                      <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Notifications</h3>
                      <button 
                        onClick={() => setShowNotifications(false)}
                        className={isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}
                      >
                        <Icons.X />
                      </button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className={`p-8 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                          <span className="text-4xl mb-2 block">🔔</span>
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div 
                            key={notification.id}
                            className={`p-4 border-b transition-colors ${
                              isDarkMode 
                                ? `border-slate-700 hover:bg-slate-700 ${!notification.isRead ? 'bg-indigo-900/30' : ''}` 
                                : `border-slate-50 hover:bg-slate-50 ${!notification.isRead ? 'bg-indigo-50/50' : ''}`
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                notification.type === 'invite_received' ? 'bg-indigo-100 text-indigo-600' :
                                notification.type === 'invite_accepted' ? 'bg-emerald-100 text-emerald-600' :
                                notification.type === 'invite_declined' ? 'bg-red-100 text-red-600' :
                                'bg-blue-100 text-blue-600'
                              }`}>
                                {notification.type === 'invite_received' ? '🤝' :
                                 notification.type === 'invite_accepted' ? '✅' :
                                 notification.type === 'invite_declined' ? '❌' : '📤'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{notification.title}</p>
                                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{notification.message}</p>
                                {notification.taskTitle && (
                                  <p className="text-xs text-indigo-400 mt-1 truncate">📋 {notification.taskTitle}</p>
                                )}
                                <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                  {new Date(notification.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Settings Button */}
              <Button 
                variant="secondary" 
                size="icon" 
                onClick={() => setShowSettings(true)}
                title="Settings"
                className={showSettings ? 'bg-indigo-100 text-indigo-600' : ''}
              >
                <Icons.Settings />
              </Button>
              
              <img src="https://picsum.photos/seed/user/100/100" className="w-8 h-8 rounded-full border border-slate-200" alt="Avatar" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-wider shrink-0`}>Quick Add</span>
            <div className="flex gap-2 flex-wrap">
              {allSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => addTask(suggestion.replace(/^[^\s]+\s/, ''))}
                  className={`whitespace-nowrap px-3.5 py-2 ${isDarkMode ? 'bg-slate-700 hover:bg-indigo-900/50 hover:text-indigo-300 border-slate-600 hover:border-indigo-500 text-slate-300' : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border-slate-200 hover:border-indigo-200 text-slate-600'} border rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 shadow-sm hover:shadow`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto relative">

            <div className="transition-all duration-700">
              {activeCategory === 'daily' ? (
                /* Daily List Special Header */
                <div className="mb-8">
                  <div className="mb-6">
                    <h2 className={`text-4xl font-black ${isDarkMode ? 'text-white' : 'text-slate-800'} tracking-tight`}>
                      Today - {(() => {
                        const date = new Date();
                        const day = date.getDate();
                        const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                        const month = date.toLocaleDateString('en-US', { month: 'long' });
                        const year = date.getFullYear();
                        return `${day}${suffix} ${month}, ${year}`;
                      })()}
                    </h2>
                    <p className={`mt-2 font-medium text-sm italic ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {isAllCompleted ? "All clear! You've finished everything." : DAILY_QUOTES[Math.floor(Date.now() / 86400000) % DAILY_QUOTES.length]}
                    </p>
                  </div>
                  {!isAllCompleted && (
                    <div className="flex gap-3 flex-wrap">
                      <Button size="lg" onClick={() => addTask()} className={`rounded-2xl shadow-xl shadow-${activeTheme.primary}/20 bg-${activeTheme.primary} hover:bg-${activeTheme.primary} opacity-90 hover:opacity-100 transition-all`}>
                        <Icons.Plus /> <span className="ml-2">Create Task</span>
                      </Button>
                      <Button size="lg" variant="secondary" onClick={() => setShowScheduleModal(true)} className={`rounded-2xl shadow-lg border-2 transition-all ${isDarkMode ? 'border-slate-600 hover:border-indigo-500 hover:bg-indigo-900/30' : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}`}>
                        <Icons.Calendar /> <span className="ml-2">Plan Ahead</span>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* Other Categories Header */
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className={`text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {categories.find(c => c.id === activeCategory)?.name || 'My Tasks'}
                    </h2>
                    <p className={`mt-2 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {activeCategory === 'shared' 
                        ? "Tasks that others have shared with you"
                        : isAllCompleted ? "All clear! You've finished everything." : "Capture your ideas and daily goals."}
                    </p>
                  </div>
                  {/* Hide Create Task button for Shared with Me list */}
                  {!isAllCompleted && activeCategory !== 'shared' && (
                    <Button size="lg" onClick={() => addTask()} className={`rounded-2xl shadow-xl shadow-${activeTheme.primary}/20 bg-${activeTheme.primary} hover:bg-${activeTheme.primary} opacity-90 hover:opacity-100 transition-all`}>
                      <Icons.Plus /> <span className="ml-2">Create Task</span>
                    </Button>
                  )}
                </div>
              )}

              {/* Hidden Tasks Archive Section - WhatsApp-style swipe reveal */}
              {showHiddenTasks && tasks.filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))).length > 0 && (
                <div className="mb-8 animate-in slide-in-from-top duration-300">
                  <div 
                    className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 border-amber-800' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'}`}
                  >
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => setShowHiddenTasks(false)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>
                          <Icons.EyeOff />
                        </div>
                        <div>
                          <h3 className={`font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>Hidden Tasks</h3>
                          <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            {tasks.filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))).length} hidden task{tasks.filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))).length > 1 ? 's' : ''} • Tap to collapse
                          </p>
                        </div>
                      </div>
                      <Icons.ChevronDown />
                    </div>
                    <div className="px-4 pb-4 space-y-2">
                      {tasks
                        .filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily')))
                        .map(task => (
                          <TaskItem 
                            key={task.id} 
                            task={task} 
                            privacyEnabled={false}
                            onUpdate={updateTask}
                            onDelete={deleteTask}
                            onSelect={(t) => setSelectedTaskId(t.id)}
                            categories={categories}
                            isInHiddenSection={true}
                            isDarkMode={isDarkMode}
                          />
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Pull to reveal hint when hidden tasks exist but section is collapsed */}
              {!showHiddenTasks && tasks.filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))).length > 0 && (
                <div 
                  className="mb-4 flex items-center justify-center cursor-pointer group"
                  onClick={() => setShowHiddenTasks(true)}
                >
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-all">
                    <Icons.ChevronDown />
                    <span>Tap to reveal {tasks.filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))).length} hidden task{tasks.filter(t => t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily'))).length > 1 ? 's' : ''}</span>
                    <Icons.EyeOff />
                  </div>
                </div>
              )}

              {/* Task List - with date grouping for Daily List */}
              {activeCategory === 'daily' ? (
                <div className="space-y-8">
                  {/* Today's Tasks */}
                  <div className="space-y-4">
                    {tasks
                      .filter(t => !t.isPrivate && (t.categoryIds?.includes('daily') || (!t.categoryIds && activeCategory === 'daily')) && !t.scheduledDate && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(task => (
                        <TaskItem 
                          key={task.id} 
                          task={task} 
                          privacyEnabled={privacyMode}
                          onUpdate={updateTask}
                          onDelete={deleteTask}
                          onSelect={(t) => setSelectedTaskId(t.id)}
                          categories={categories}
                          isInHiddenSection={false}
                          isDarkMode={isDarkMode}
                        />
                      ))}
                  </div>

                  {/* Future Dated Tasks - grouped by date */}
                  {(() => {
                    const futureTasks = tasks.filter(t => !t.isPrivate && (t.categoryIds?.includes('daily') || (!t.categoryIds && activeCategory === 'daily')) && t.scheduledDate && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
                    const groupedByDate = futureTasks.reduce((acc, task) => {
                      const date = task.scheduledDate!;
                      if (!acc[date]) acc[date] = [];
                      acc[date].push(task);
                      return acc;
                    }, {} as Record<string, Task[]>);
                    
                    const sortedDates = Object.keys(groupedByDate).sort();
                    
                    return sortedDates.map(dateStr => {
                      const date = new Date(dateStr + 'T00:00:00');
                      const day = date.getDate();
                      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                      const month = date.toLocaleDateString('en-US', { month: 'long' });
                      const year = date.getFullYear();
                      const formattedDate = `${day}${suffix} ${month}, ${year}`;
                      
                      return (
                        <div key={dateStr} className="space-y-4">
                          <div className={`flex items-center gap-3 pt-4 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                              <Icons.Calendar />
                            </div>
                            <div>
                              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{formattedDate}</h3>
                              <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{groupedByDate[dateStr].length} task{groupedByDate[dateStr].length > 1 ? 's' : ''} scheduled</p>
                            </div>
                          </div>
                          {groupedByDate[dateStr].map(task => (
                            <TaskItem 
                              key={task.id} 
                              task={task} 
                              privacyEnabled={privacyMode}
                              onUpdate={updateTask}
                              onDelete={deleteTask}
                              onSelect={(t) => setSelectedTaskId(t.id)}
                              categories={categories}
                              isInHiddenSection={false}
                              isDarkMode={isDarkMode}
                            />
                          ))}
                        </div>
                      );
                    });
                  })()}
                  
                  {tasks.filter(t => t.categoryIds?.includes('daily') || (!t.categoryIds && activeCategory === 'daily')).length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <Icons.Check />
                      </div>
                      <p className="text-lg font-medium">Peaceful workspace!</p>
                      <p className="text-sm italic">"Organize your world, one task at a time."</p>
                    </div>
                  )}
                </div>
              ) : activeCategory === 'shared' ? (
                /* Shared with Me - Group tasks by who shared them */
                <div className="space-y-6">
                  {(() => {
                    const sharedTasks = tasks.filter(t => t.categoryIds?.includes('shared') && t.title.toLowerCase().includes(searchQuery.toLowerCase()));
                    
                    if (sharedTasks.length === 0) {
                      return (
                        <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            <span className="text-3xl">👥</span>
                          </div>
                          <p className="text-lg font-medium">No tasks shared with you</p>
                          <p className="text-sm mt-2 text-center max-w-xs">When someone shares a task with you, it will appear here organized by who shared it.</p>
                        </div>
                      );
                    }
                    
                    // Group tasks by sharedBy user
                    const groupedByUser = sharedTasks.reduce((acc, task) => {
                      const sharerName = task.sharedBy?.name || 'Unknown';
                      const sharerId = task.sharedBy?.id || 'unknown';
                      if (!acc[sharerId]) {
                        acc[sharerId] = { user: task.sharedBy, tasks: [] };
                      }
                      acc[sharerId].tasks.push(task);
                      return acc;
                    }, {} as Record<string, { user: SharedUser | undefined; tasks: Task[] }>);
                    
                    return Object.entries(groupedByUser).map(([sharerId, { user, tasks: userTasks }]) => (
                      <div key={sharerId} className="space-y-3">
                        <div className={`flex items-center gap-3 pb-2 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                          {user?.avatar ? (
                            <img src={user.avatar} className="w-8 h-8 rounded-full" alt={user.name} />
                          ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                              👤
                            </div>
                          )}
                          <div>
                            <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              Shared by {user?.name || 'Unknown'}
                            </h3>
                            <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {userTasks.length} task{userTasks.length > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 pl-2">
                          {userTasks.map(task => (
                            <TaskItem 
                              key={task.id} 
                              task={task} 
                              privacyEnabled={privacyMode}
                              onUpdate={updateTask}
                              onDelete={deleteTask}
                              onSelect={(t) => setSelectedTaskId(t.id)}
                              categories={categories}
                              isInHiddenSection={false}
                              isDarkMode={isDarkMode}
                            />
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks
                    .filter(t => !t.isPrivate && (t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily')) && t.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(task => (
                      <TaskItem 
                        key={task.id} 
                        task={task} 
                        privacyEnabled={privacyMode}
                        onUpdate={updateTask}
                        onDelete={deleteTask}
                        onSelect={(t) => setSelectedTaskId(t.id)}
                        categories={categories}
                        isInHiddenSection={false}
                        isDarkMode={isDarkMode}
                      />
                  ))}
                
                  {tasks.filter(t => t.categoryIds?.includes(activeCategory) || (!t.categoryIds && activeCategory === 'daily')).length === 0 && (
                    <div className={`flex flex-col items-center justify-center py-20 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                         <Icons.Check />
                      </div>
                      <p className="text-lg font-medium">Peaceful workspace!</p>
                      <p className="text-sm italic">"Organize your world, one task at a time."</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Details Side Panel */}
      {selectedTask && (
        <aside className="w-[450px] shadow-2xl z-30 animate-in slide-in-from-right duration-300">
          <TaskDetails 
            task={selectedTask}
            onUpdate={(updates) => updateTask(selectedTask.id, updates)}
            onClose={() => setSelectedTaskId(null)}
            onComplete={() => {
              // Task creation completed - could trigger additional actions here
              console.log('Task added to list:', selectedTask.title);
            }}
            categories={categories}
            onAddCategory={addNewCategory}
            onSendCollaborationRequest={handleSendCollaborationRequest}
            isDarkMode={isDarkMode}
          />
        </aside>
      )}

      {/* Schedule Ahead Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Icons.Calendar />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-800">Plan Ahead</h3>
                <p className="text-sm text-slate-500">Schedule a task for a future date</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Select Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none text-lg"
                />
              </div>
              
              {scheduledDate && (
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <p className="text-sm text-indigo-700 font-medium">
                    📅 Task will be scheduled for: {(() => {
                      const date = new Date(scheduledDate + 'T00:00:00');
                      const day = date.getDate();
                      const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
                      const month = date.toLocaleDateString('en-US', { month: 'long' });
                      const year = date.getFullYear();
                      return `${day}${suffix} ${month}, ${year}`;
                    })()}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button 
                variant="secondary" 
                className="flex-1"
                onClick={() => {
                  setShowScheduleModal(false);
                  setScheduledDate('');
                }}
              >
                Cancel
              </Button>
              <Button 
                className={`flex-1 bg-${activeTheme.primary} hover:bg-${activeTheme.primary} opacity-90 hover:opacity-100`}
                onClick={addScheduledTask}
                disabled={!scheduledDate}
              >
                <Icons.Plus /> Create Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Invite Modal */}
      {pendingCollabRequest && (
        <CollaborationInvite
          request={pendingCollabRequest}
          onAccept={handleAcceptCollaboration}
          onDecline={handleDeclineCollaboration}
        />
      )}

      {/* Celebration Modal - All Tasks Completed */}
      {showCelebrationModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in"
          onClick={() => setShowCelebrationModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-white via-indigo-50 to-purple-50 rounded-3xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-yellow-300/30 to-orange-300/30 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-indigo-300/30 to-purple-300/30 rounded-full blur-2xl" />
            
            {/* Trophy animation */}
            <div className="relative">
              <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <span className="text-5xl">🏆</span>
              </div>
            </div>
            
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
              Woohoo! 🎉
            </h2>
            
            <p className="text-xl font-bold text-slate-700 mb-1">
              All tasks completed for today!
            </p>
            
            <p className="text-slate-500 mb-4">
              You crushed it! Time to rest up or plan ahead for tomorrow 💪
            </p>
            
            <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-6 border border-slate-100">
              <p className="text-sm text-slate-600 italic">
                "{VICTORY_QUOTES[victoryIdx]}"
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Button 
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white"
                onClick={() => {
                  setShowCelebrationModal(false);
                  // Add a task for planning tomorrow
                  addTask('📋 Plan tasks for tomorrow');
                }}
              >
                📝 Plan for Tomorrow
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => {
                    triggerThemedConfetti();
                  }}
                >
                  🎊 More Confetti!
                </Button>
                <Button 
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowCelebrationModal(false)}
                >
                  Thanks! ✨
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={() => { setShowSettings(false); setSettingsPanel('main'); }}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className={`rounded-3xl max-w-md w-full mx-4 shadow-2xl overflow-hidden max-h-[85vh] flex flex-col ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            {/* Main Settings Panel */}
            <div 
              className={`flex flex-col h-full transition-all duration-300 ease-out ${settingsPanel !== 'main' ? 'hidden' : ''}`}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-indigo-900/50 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Icons.Settings />
                  </div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Settings</h2>
                </div>
                <button 
                  onClick={() => { setShowSettings(false); setSettingsPanel('main'); }}
                  className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icons.X />
                </button>
              </div>

              {/* Main Content */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${isDarkMode ? 'bg-slate-900' : ''}`}>
                
                {/* Quick Toggles Section */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Workflow</p>
                  
                  {/* Carry Forward */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🔄</span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Carry Forward Tasks</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Move incomplete tasks to today</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCarryForwardEnabled(!carryForwardEnabled)}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${carryForwardEnabled ? 'bg-indigo-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${carryForwardEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Rotating Inspiration */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">✨</span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Rotating Inspiration</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Fresh quotes & suggestions</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setRotationEnabled(!rotationEnabled)}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${rotationEnabled ? 'bg-indigo-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${rotationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>

                {/* Navigation Cards */}
                <button
                  onClick={() => setSettingsPanel('lists')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-750 active:scale-[0.98]' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                      📋
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Manage Lists</p>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{categories.length} lists • Reorder & customize</p>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>

                <button
                  onClick={() => setSettingsPanel('appearance')}
                  className={`w-full p-4 rounded-xl flex items-center justify-between transition-all duration-200 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-750 active:scale-[0.98]' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDarkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                      🎨
                    </div>
                    <div className="text-left">
                      <p className={`font-semibold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Appearance</p>
                      <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{displayMode === 'system' ? 'System' : displayMode === 'dark' ? 'Dark' : 'Light'} mode • {THEMES[theme as keyof typeof THEMES]?.name} theme</p>
                    </div>
                  </div>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isDarkMode ? 'text-slate-500' : 'text-slate-400'}>
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </button>

                {/* Notifications Section */}
                <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Notifications</p>
                  
                  {/* Sound Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🔔</span>
                      <div>
                        <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Sound</p>
                        <p className={`text-[11px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{soundSettings.enabled ? NOTIFICATION_SOUNDS.find(s => s.id === soundSettings.soundId)?.name || 'On' : 'Off'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newSettings = { ...soundSettings, enabled: !soundSettings.enabled };
                        setSoundSettings(newSettings);
                        reminderService.updateSettings(newSettings);
                      }}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${soundSettings.enabled ? 'bg-indigo-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${soundSettings.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {soundSettings.enabled && (
                    <>
                      <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />
                      
                      {/* Sound Selection */}
                      <div className="grid grid-cols-3 gap-1.5 py-2">
                        {NOTIFICATION_SOUNDS.map(sound => (
                          <button
                            key={sound.id}
                            onClick={() => {
                              const newSettings = { ...soundSettings, soundId: sound.id };
                              setSoundSettings(newSettings);
                              reminderService.updateSettings(newSettings);
                              reminderService.playPreviewSound(sound.id);
                            }}
                            className={`p-2 rounded-lg border transition-all duration-200 text-center ${
                              soundSettings.soundId === sound.id 
                                ? 'border-indigo-500 bg-indigo-500/20' 
                                : isDarkMode ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <span className="text-base">{sound.emoji}</span>
                            <p className={`text-[9px] font-medium mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{sound.name}</p>
                          </button>
                        ))}
                      </div>

                      {/* Volume */}
                      <div className="py-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-[11px] font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Volume</p>
                          <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{soundSettings.volume}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={soundSettings.volume}
                          onChange={(e) => {
                            const newSettings = { ...soundSettings, volume: parseInt(e.target.value) };
                            setSoundSettings(newSettings);
                            reminderService.updateSettings(newSettings);
                          }}
                          className={`w-full h-1.5 rounded-full appearance-none cursor-pointer accent-indigo-500 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`}
                        />
                      </div>
                    </>
                  )}

                  <div className={`border-t my-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`} />

                  {/* Vibration Toggle */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg ${isDarkMode ? 'text-slate-400' : ''}`}><Icons.Vibrate size={18} /></span>
                      <p className={`font-medium text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Vibration</p>
                    </div>
                    <button
                      onClick={() => {
                        const newSettings = { ...soundSettings, vibration: !soundSettings.vibration };
                        setSoundSettings(newSettings);
                        reminderService.updateSettings(newSettings);
                        if (!soundSettings.vibration && navigator.vibrate) navigator.vibrate(200);
                      }}
                      className={`w-11 h-6 rounded-full transition-all duration-200 relative ${soundSettings.vibration ? 'bg-indigo-500' : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200 ${soundSettings.vibration ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lists Panel */}
            <div 
              className={`flex flex-col h-full ${settingsPanel !== 'lists' ? 'hidden' : ''}`}
              style={{ animation: settingsPanel === 'lists' ? 'slideInRight 0.25s ease-out' : 'none' }}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <button 
                  onClick={() => setSettingsPanel('main')}
                  className={`p-2 -ml-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isDarkMode ? 'bg-blue-900/50' : 'bg-blue-100'}`}>
                    📋
                  </div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Manage Lists</h2>
                </div>
              </div>

              {/* Lists Content */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-2 ${isDarkMode ? 'bg-slate-900' : ''}`}>
                {categories.map((category, index) => {
                  const isProtected = PROTECTED_LISTS.includes(category.id);
                  return (
                    <div 
                      key={category.id}
                      className={`flex items-center gap-2 p-3 rounded-xl transition-all duration-200 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50 border border-slate-200'}`}
                    >
                      {/* Reorder Buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => moveCategoryUp(category.id)}
                          disabled={index === 0}
                          className={`p-1 rounded transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m18 15-6-6-6 6"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => moveCategoryDown(category.id)}
                          disabled={index === categories.length - 1}
                          className={`p-1 rounded transition-colors ${index === categories.length - 1 ? 'opacity-30 cursor-not-allowed' : isDarkMode ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-200'}`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6"/>
                          </svg>
                        </button>
                      </div>

                      {/* Icon Picker */}
                      <div className="relative">
                        <button
                          onClick={() => setShowIconPicker(showIconPicker === category.id ? null : category.id)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
                        >
                          {category.icon}
                        </button>
                        
                        {showIconPicker === category.id && (
                          <div 
                            className={`absolute top-12 left-0 z-50 rounded-xl shadow-2xl border p-2 w-52 ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
                            style={{ animation: 'fadeIn 0.15s ease-out' }}
                          >
                            <div className="grid grid-cols-6 gap-1 max-h-36 overflow-y-auto">
                              {CATEGORY_ICONS.map((icon, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => updateCategoryIcon(category.id, icon)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all duration-150 ${category.icon === icon ? 'bg-indigo-500/30 ring-2 ring-indigo-500' : isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}
                                >
                                  {icon}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* List Name */}
                      <div className="flex-1 min-w-0">
                        {editingListId === category.id ? (
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => updateCategoryName(category.id, e.target.value)}
                            onBlur={() => setEditingListId(null)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingListId(null); }}
                            autoFocus
                            className={`w-full px-2 py-1 rounded-lg border-2 border-indigo-500 text-sm font-medium focus:outline-none ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white'}`}
                          />
                        ) : (
                          <button
                            onClick={() => !isProtected && setEditingListId(category.id)}
                            className={`text-left w-full ${isProtected ? 'cursor-default' : ''}`}
                          >
                            <p className={`font-medium text-sm truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{category.name}</p>
                            {isProtected && <p className={`text-[10px] ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Protected</p>}
                          </button>
                        )}
                      </div>

                      {/* Delete Button */}
                      {isProtected ? (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${category.name}"? Tasks will move to Daily List.`)) {
                              deleteCategory(category.id);
                            }
                          }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${isDarkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-50'}`}
                        >
                          <Icons.Trash size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}

                {/* Add New List */}
                <button
                  onClick={() => {
                    addNewCategory();
                    setShowSettings(false);
                    setSettingsPanel('main');
                  }}
                  className={`w-full p-3 rounded-xl border-2 border-dashed transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium ${isDarkMode ? 'border-slate-600 text-slate-400 hover:border-indigo-400 hover:text-indigo-400 hover:bg-indigo-900/20' : 'border-slate-300 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'}`}
                >
                  <Icons.Plus size={18} /> Add New List
                </button>
              </div>
            </div>

            {/* Appearance Panel */}
            <div 
              className={`flex flex-col h-full ${settingsPanel !== 'appearance' ? 'hidden' : ''}`}
              style={{ animation: settingsPanel === 'appearance' ? 'slideInRight 0.25s ease-out' : 'none' }}
            >
              {/* Header */}
              <div className={`p-5 border-b flex items-center gap-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
                <button 
                  onClick={() => setSettingsPanel('main')}
                  className={`p-2 -ml-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isDarkMode ? 'bg-purple-900/50' : 'bg-purple-100'}`}>
                    🎨
                  </div>
                  <h2 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Appearance</h2>
                </div>
              </div>

              {/* Appearance Content */}
              <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-slate-900' : ''}`}>
                
                {/* Display Mode */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Display Mode</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'light', icon: '☀️', label: 'Light' },
                      { id: 'dark', icon: '🌙', label: 'Dark' },
                      { id: 'system', icon: '💻', label: 'System' }
                    ].map(mode => (
                      <button
                        key={mode.id}
                        onClick={() => setDisplayMode(mode.id as 'light' | 'dark' | 'system')}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-center ${
                          displayMode === mode.id 
                            ? 'border-indigo-500 bg-indigo-500/20 scale-[1.02]' 
                            : isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-2xl mb-1">{mode.icon}</div>
                        <p className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{mode.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Themes */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-3 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Theme</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(THEMES).map(([key, themeData]) => (
                      <button
                        key={key}
                        onClick={() => setTheme(key as ThemeType)}
                        className={`p-3 rounded-xl border-2 transition-all duration-200 text-left ${
                          theme === key 
                            ? 'border-indigo-500 bg-indigo-500/20 scale-[1.02]' 
                            : isDarkMode ? 'border-slate-700 hover:border-slate-600' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{themeData.icon}</span>
                          <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{themeData.name}</span>
                        </div>
                        <div className="flex gap-1">
                          {themeData.confettiColors.slice(0, 5).map((color, idx) => (
                            <div 
                              key={idx} 
                              className="w-4 h-4 rounded-full shadow-sm" 
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Button */}
                <button
                  onClick={triggerThemedConfetti}
                  className={`w-full p-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  🎊 Preview Celebration
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Confetti Button */}
      <button
        onClick={triggerRandomConfetti}
        className="fixed bottom-6 right-6 w-14 h-14 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 z-40 group"
        title="Celebrate! 🎉"
      >
        <span className="group-hover:animate-bounce">🎊</span>
      </button>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-fade-right {
          mask-image: linear-gradient(to right, black 85%, transparent 100%);
        }
        @keyframes slide-in-from-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { 
            opacity: 0;
            transform: translateX(30px); 
          }
          to { 
            opacity: 1;
            transform: translateX(0); 
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95); 
          }
          to { 
            opacity: 1;
            transform: scale(1); 
          }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        .animate-in {
          animation: slide-in-from-right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .zoom-in {
          animation: zoom-in 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .fade-in {
          animation: fade-in 0.8s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
