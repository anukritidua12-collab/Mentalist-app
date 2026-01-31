import { CollaborationRequest, SharedUser, Task, Notification } from '../types';
import { generateId } from '../utils';

// Simulated current user (in production, this would come from auth)
export const CURRENT_USER: SharedUser = {
  id: 'current-user',
  name: 'You',
  avatar: 'https://picsum.photos/seed/currentuser/100/100',
  email: 'you@mentalist.app'
};

// Storage keys
const COLLAB_REQUESTS_KEY = 'mentalist_collab_requests';
const NOTIFICATIONS_KEY = 'mentalist_notifications';

// Get all collaboration requests from storage
export const getCollaborationRequests = (): CollaborationRequest[] => {
  const stored = localStorage.getItem(COLLAB_REQUESTS_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Save collaboration requests to storage
const saveCollaborationRequests = (requests: CollaborationRequest[]) => {
  localStorage.setItem(COLLAB_REQUESTS_KEY, JSON.stringify(requests));
};

// Get all notifications from storage
export const getNotifications = (): Notification[] => {
  const stored = localStorage.getItem(NOTIFICATIONS_KEY);
  return stored ? JSON.parse(stored) : [];
};

// Save notifications to storage
export const saveNotifications = (notifications: Notification[]) => {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
};

// Add a notification
export const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification => {
  const newNotification: Notification = {
    ...notification,
    id: generateId(),
    createdAt: Date.now(),
    isRead: false
  };
  
  const notifications = getNotifications();
  notifications.unshift(newNotification);
  saveNotifications(notifications);
  
  // Trigger callback if set
  if (notificationCallback) {
    notificationCallback(newNotification);
  }
  
  return newNotification;
};

// Mark notification as read
export const markNotificationAsRead = (notificationId: string) => {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index !== -1) {
    notifications[index].isRead = true;
    saveNotifications(notifications);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = () => {
  const notifications = getNotifications();
  notifications.forEach(n => n.isRead = true);
  saveNotifications(notifications);
};

// Notification callback for real-time updates
let notificationCallback: ((notification: Notification) => void) | null = null;

export const onNewNotification = (callback: (notification: Notification) => void) => {
  notificationCallback = callback;
};

// Send a collaboration request to another user
export const sendCollaborationRequest = (
  task: Task,
  toUser: SharedUser,
  type: 'collaborate' | 'inform' = 'collaborate'
): CollaborationRequest => {
  const request: CollaborationRequest = {
    id: generateId(),
    taskId: task.id,
    taskTitle: task.title,
    fromUser: CURRENT_USER,
    toUserId: toUser.id,
    status: 'pending',
    createdAt: Date.now(),
    type
  };

  const requests = getCollaborationRequests();
  requests.push(request);
  saveCollaborationRequests(requests);

  // In production: This would send a push notification / real-time update to toUser
  // For demo: We'll simulate receiving the request immediately
  simulateIncomingRequest(request, toUser);

  return request;
};

// Simulate receiving a request (for demo purposes)
// In production, this would be handled by WebSocket/Push notifications
let incomingRequestCallback: ((request: CollaborationRequest, fromUser: SharedUser) => void) | null = null;

export const onIncomingRequest = (callback: (request: CollaborationRequest, fromUser: SharedUser) => void) => {
  incomingRequestCallback = callback;
};

const simulateIncomingRequest = (request: CollaborationRequest, toUser: SharedUser) => {
  // Simulate a slight delay as if it's coming from a server
  setTimeout(() => {
    // For demo, we pretend the current user is also the recipient
    // In production, this would only trigger on the recipient's device
    if (incomingRequestCallback) {
      // Swap the perspective - make it look like it's from another user
      const incomingRequest: CollaborationRequest = {
        ...request,
        fromUser: toUser, // The person we "sent" to is now "sending" to us (for demo)
      };
      incomingRequestCallback(incomingRequest, toUser);
    }
  }, 500);
};

// Accept a collaboration request
export const acceptCollaborationRequest = (requestId: string): CollaborationRequest | null => {
  const requests = getCollaborationRequests();
  const index = requests.findIndex(r => r.id === requestId);
  
  if (index !== -1) {
    requests[index].status = 'accepted';
    saveCollaborationRequests(requests);
    return requests[index];
  }
  return null;
};

// Decline a collaboration request
export const declineCollaborationRequest = (requestId: string): CollaborationRequest | null => {
  const requests = getCollaborationRequests();
  const index = requests.findIndex(r => r.id === requestId);
  
  if (index !== -1) {
    requests[index].status = 'declined';
    saveCollaborationRequests(requests);
    return requests[index];
  }
  return null;
};

// Get pending requests for the current user
export const getPendingRequests = (): CollaborationRequest[] => {
  return getCollaborationRequests().filter(r => r.status === 'pending');
};
