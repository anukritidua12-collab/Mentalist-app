import { Task } from '../types';

interface SoundSettings {
  enabled: boolean;
  soundId: string;
  vibration: boolean;
  volume: number;
}

// Sound frequencies for different notification tones
const SOUND_CONFIGS = {
  chime: { freq1: 800, freq2: 1000, duration: 0.5 },
  bell: { freq1: 600, freq2: 900, duration: 0.6 },
  ding: { freq1: 1200, freq2: 1400, duration: 0.3 },
  pop: { freq1: 400, freq2: 600, duration: 0.2 },
  gentle: { freq1: 500, freq2: 700, duration: 0.8 },
  alert: { freq1: 1000, freq2: 1200, duration: 0.4 },
};

class ReminderService {
  private checkInterval: number | null = null;
  private permissionGranted: boolean = false;
  private settings: SoundSettings = {
    enabled: true,
    soundId: 'chime',
    vibration: true,
    volume: 80
  };

  constructor() {
    this.requestPermissions();
  }

  updateSettings(settings: SoundSettings) {
    this.settings = settings;
  }

  async requestPermissions(): Promise<boolean> {
    // Request notification permission
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        this.permissionGranted = permission === 'granted';
        
        if (this.permissionGranted) {
          console.log('✅ Notification permissions granted');
        } else {
          console.log('⚠️ Notification permissions denied');
        }
        
        return this.permissionGranted;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return false;
  }

  private createSound(soundId: string) {
    const config = SOUND_CONFIGS[soundId as keyof typeof SOUND_CONFIGS] || SOUND_CONFIGS.chime;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.frequency.value = config.freq1;
      oscillator2.frequency.value = config.freq2;
      
      const volume = (this.settings.volume / 100) * 0.3;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration);
      
      oscillator1.start(audioContext.currentTime);
      oscillator2.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + config.duration);
      oscillator2.stop(audioContext.currentTime + config.duration);
    } catch (error) {
      console.warn('Could not play sound:', error);
    }
  }

  playReminderSound() {
    if (!this.settings.enabled) return;
    this.createSound(this.settings.soundId);
  }

  playPreviewSound(soundId: string) {
    const originalSoundId = this.settings.soundId;
    this.settings.soundId = soundId;
    this.createSound(soundId);
    this.settings.soundId = originalSoundId;
  }

  triggerVibration() {
    if (this.settings.vibration && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  testNotification() {
    // Play sound
    if (this.settings.enabled) {
      this.createSound(this.settings.soundId);
    }
    
    // Trigger vibration
    this.triggerVibration();
    
    // Show notification
    if (this.permissionGranted && 'Notification' in window) {
      const notification = new Notification('🔔 Test Notification', {
        body: 'Your notification settings are working!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test',
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 5000);
    } else {
      alert('🔔 Test Notification\n\nYour notification settings are working!');
    }
  }

  showNotification(task: Task) {
    this.playReminderSound();
    this.triggerVibration();
    
    if (this.permissionGranted && 'Notification' in window) {
      const notification = new Notification(`⏰ Reminder: ${task.title}`, {
        body: task.notes || 'Time to work on this task!',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: task.id,
        requireInteraction: true
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);
    } else {
      // Fallback: Show in-app alert
      alert(`⏰ Reminder: ${task.title}\n\n${task.notes || 'Time to work on this task!'}`);
    }
  }

  startMonitoring(tasks: Task[]) {
    // Clear existing interval
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
    }

    // Check every 30 seconds
    this.checkInterval = window.setInterval(() => {
      this.checkReminders(tasks);
    }, 30000);

    // Initial check
    this.checkReminders(tasks);
  }

  stopMonitoring() {
    if (this.checkInterval !== null) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkReminders(tasks: Task[]) {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    const checkTask = (task: Task) => {
      // Check if task has reminder set and matches current time
      if (task.dueDate === currentDate && task.reminderTime === currentTime && !task.isCompleted) {
        this.showNotification(task);
      }

      // Check subtasks
      task.subTasks.forEach(checkTask);
    };

    tasks.forEach(checkTask);
  }
}

export const reminderService = new ReminderService();
