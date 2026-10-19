
export enum AttachmentType {
  IMAGE = 'image',
  PDF = 'pdf',
  NOTE = 'note'
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  url: string; // Data URL (browser), or a display URL for a file on the device (iPhone)
  path?: string; // iPhone only: file path inside the app's data folder
  mimeType?: string;
  createdAt: number;
}

export interface SharedUser {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export type RepeatFrequency = 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RepeatRule {
  frequency: RepeatFrequency;
  anchorDay?: number; // Day of the month for monthly/yearly, so the 31st doesn't drift to the 30th
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: number; // Timestamp when task was marked complete
  deletedAt?: number; // Timestamp when task was deleted
  notes: string;
  subTasks: Task[];
  attachments: Attachment[];
  dueDate?: string;
  reminderTime?: string;
  scheduledDate?: string; // For scheduling tasks on specific dates (YYYY-MM-DD format)
  sharedWith: SharedUser[];
  sharedBy?: SharedUser; // User who shared this task with you (for "Shared with Me" list)
  cloudId?: string; // Set when the task is shared for collaboration and synced through Firebase
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  isPrivate?: boolean;
  categoryIds: string[]; // Categories this task belongs to
  repeat?: RepeatRule; // Repeating task: ticking it off creates the next one
  repeatSpawnedId?: string; // The next occurrence created when this one was ticked off
}

export interface ListCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type ThemeType = 'clarity' | 'focus' | 'warmth' | 'serenity' | 'nature' | 'blossom' | 'midnight' | 'twilight' | 'ink';

export interface CollaborationRequest {
  id: string;
  taskId: string;
  taskTitle: string;
  fromUser: SharedUser;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  type: 'collaborate' | 'inform'; // collaborate = can edit, inform = view only
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export interface Notification {
  id: string;
  type: 'invite_received' | 'invite_accepted' | 'invite_declined' | 'task_shared' | 'collaborator_left';
  title: string;
  message: string;
  fromUser?: SharedUser;
  taskTitle?: string;
  taskId?: string;
  requestId?: string;
  inviteStatus?: 'pending' | 'accepted' | 'declined'; // For invite_received: lets the tab show Accept/Reject
  createdAt: number;
  isRead: boolean;
}
