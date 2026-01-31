
export enum AttachmentType {
  IMAGE = 'image',
  PDF = 'pdf',
  NOTE = 'note'
}

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  url: string; // Base64 or Object URL
  createdAt: number;
}

export interface SharedUser {
  id: string;
  name: string;
  avatar: string;
  email: string;
}

export interface Task {
  id: string;
  title: string;
  isCompleted: boolean;
  notes: string;
  subTasks: Task[];
  attachments: Attachment[];
  dueDate?: string;
  reminderTime?: string;
  scheduledDate?: string; // For scheduling tasks on specific dates (YYYY-MM-DD format)
  sharedWith: SharedUser[];
  sharedBy?: SharedUser; // User who shared this task with you (for "Shared with Me" list)
  createdAt: number;
  priority: 'low' | 'medium' | 'high';
  isPrivate?: boolean;
  categoryIds: string[]; // Categories this task belongs to
}

export interface ListCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type ThemeType = 'clarity' | 'midnight' | 'emerald' | 'crimson' | 'amber';

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
  type: 'invite_received' | 'invite_accepted' | 'invite_declined' | 'task_shared';
  title: string;
  message: string;
  fromUser?: SharedUser;
  taskTitle?: string;
  taskId?: string;
  requestId?: string;
  createdAt: number;
  isRead: boolean;
}
