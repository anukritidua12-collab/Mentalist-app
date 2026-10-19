import { initializeApp, FirebaseApp } from 'firebase/app';
import { FEATURES } from '../config';
import {
  Auth, User, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification,
  sendPasswordResetEmail, updateProfile, onAuthStateChanged, signOut as fbSignOut, reload,
} from 'firebase/auth';
import {
  Firestore, initializeFirestore, collection, doc, setDoc, updateDoc, deleteDoc, getDoc,
  onSnapshot, query, where, arrayUnion, arrayRemove, Unsubscribe,
} from 'firebase/firestore';
import { Task } from '../types';
import { generateId } from '../utils';

// Collaboration runs on Firebase (Auth + Firestore). The project's keys come from
// .env.local (see FIREBASE_SETUP.md). Without them the app works fully offline and
// only the "Invite to collaborate" feature explains that it isn't set up.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Where people without the app can get it. Swap for the App Store link once published.
export const APP_DOWNLOAD_URL = import.meta.env.VITE_APP_DOWNLOAD_URL || 'https://anukritidua12-collab.github.io/Mentalist-app/';

// Firebase only starts when collaboration is switched on (config.ts) and keys are set
export const isCloudConfigured = FEATURES.collaboration && Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isCloudConfigured) {
  app = initializeApp(firebaseConfig);
  // initializeAuth (not getAuth) with no popup/redirect resolver: getAuth hangs inside
  // the iOS app's web view because it tries to load Google's sign-in iframe.
  auth = initializeAuth(app, { persistence: [indexedDBLocalPersistence, browserLocalPersistence] });
  // Long polling is more reliable than WebChannel streams inside WKWebView
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
}

const requireCloud = () => {
  if (!auth || !db) throw new Error('Collaboration is not set up yet.');
  return { auth, db };
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// ---------- Accounts ----------

export interface CloudUser {
  uid: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

const toCloudUser = (user: User): CloudUser => ({
  uid: user.uid,
  email: normalizeEmail(user.email || ''),
  name: user.displayName || (user.email || '').split('@')[0],
  emailVerified: user.emailVerified,
});

export const onCloudUserChanged = (callback: (user: CloudUser | null) => void): Unsubscribe => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, user => callback(user ? toCloudUser(user) : null));
};

// Lets inviters see whether the person already has MentaList (only reveals that an
// account exists for that email, plus its display name).
const registerEmail = async (user: CloudUser) => {
  const { db } = requireCloud();
  await setDoc(doc(db, 'userEmails', user.email), { uid: user.uid, name: user.name });
};

const friendlyAuthError = (err: unknown): Error => {
  const code = (err as { code?: string })?.code || '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
    'auth/invalid-email': 'That email address doesn\'t look right.',
    'auth/weak-password': 'Please use a password with at least 6 characters.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/too-many-requests': 'Too many attempts. Please wait a minute and try again.',
    'auth/network-request-failed': 'No internet connection. Please check your connection and try again.',
  };
  return new Error(messages[code] || (err as Error)?.message || 'Something went wrong. Please try again.');
};

export const signUp = async (name: string, email: string, password: string): Promise<CloudUser> => {
  const { auth } = requireCloud();
  try {
    const cred = await createUserWithEmailAndPassword(auth, normalizeEmail(email), password);
    await updateProfile(cred.user, { displayName: name.trim() });
    await sendEmailVerification(cred.user);
    const user = toCloudUser(cred.user);
    await registerEmail(user);
    return user;
  } catch (err) {
    throw friendlyAuthError(err);
  }
};

export const signIn = async (email: string, password: string): Promise<CloudUser> => {
  const { auth } = requireCloud();
  try {
    const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    const user = toCloudUser(cred.user);
    await registerEmail(user);
    return user;
  } catch (err) {
    throw friendlyAuthError(err);
  }
};

export const signOut = async () => {
  if (auth) await fbSignOut(auth);
};

export const resetPassword = async (email: string) => {
  const { auth } = requireCloud();
  try {
    await sendPasswordResetEmail(auth, normalizeEmail(email));
  } catch (err) {
    throw friendlyAuthError(err);
  }
};

export const resendVerificationEmail = async () => {
  const { auth } = requireCloud();
  if (auth.currentUser) await sendEmailVerification(auth.currentUser);
};

// Re-reads the account after the user taps the link in the verification email.
// Refreshes the sign-in token too, since security rules check its "verified" flag.
export const refreshVerification = async (): Promise<CloudUser | null> => {
  const { auth } = requireCloud();
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  await auth.currentUser.getIdToken(true);
  return toCloudUser(auth.currentUser);
};

// ---------- Shared tasks ----------

export interface MemberInfo {
  name: string;
  email: string;
}

export interface SharedTaskDoc {
  id: string;
  ownerUid: string;
  memberUids: string[];
  memberInfo: Record<string, MemberInfo>;
  pendingEmails: string[];
  task: CloudTaskContent;
  updatedAt: number;
  updatedBy: string;
}

// The parts of a task that collaborators share. Attachments stay on each device.
// (title, notes, priority, completion, dates, reminder, and subtasks with the same fields)
export type CloudTaskContent = Record<string, any>;

export const toCloudContent = (task: Task): CloudTaskContent => {
  const strip = (t: Task): CloudTaskContent => ({
    id: t.id,
    title: t.title,
    notes: t.notes,
    priority: t.priority,
    isCompleted: t.isCompleted,
    completedAt: t.completedAt,
    dueDate: t.dueDate,
    reminderTime: t.reminderTime,
    scheduledDate: t.scheduledDate,
    createdAt: t.createdAt,
    subTasks: t.subTasks.filter(s => !s.deletedAt).map(strip),
  });
  // JSON round trip drops undefined fields, which Firestore rejects
  return JSON.parse(JSON.stringify(strip(task)));
};

// Rebuilds full local subtasks from cloud content, keeping local-only fields
// (attachments, privacy) of subtasks that already exist on this device.
export const fromCloudSubTasks = (cloud: any[], local: Task[]): Task[] =>
  (cloud || []).map(c => {
    const existing = local.find(l => l.id === c.id);
    return {
      ...(existing || { attachments: [], sharedWith: [], isPrivate: false, categoryIds: [] }),
      id: c.id || generateId(),
      title: c.title || '',
      notes: c.notes || '',
      priority: c.priority || 'medium',
      isCompleted: !!c.isCompleted,
      completedAt: c.completedAt,
      dueDate: c.dueDate,
      reminderTime: c.reminderTime,
      scheduledDate: c.scheduledDate,
      createdAt: c.createdAt || Date.now(),
      subTasks: fromCloudSubTasks(c.subTasks, existing?.subTasks || []),
    } as Task;
  });

// Creates the shared copy of a task the first time someone is invited to it.
export const createSharedTask = async (task: Task, owner: CloudUser, id: string = generateId()): Promise<string> => {
  const { db } = requireCloud();
  const data: Omit<SharedTaskDoc, 'id'> = {
    ownerUid: owner.uid,
    memberUids: [owner.uid],
    memberInfo: { [owner.uid]: { name: owner.name, email: owner.email } },
    pendingEmails: [],
    task: toCloudContent(task),
    updatedAt: Date.now(),
    updatedBy: owner.uid,
  };
  await setDoc(doc(db, 'sharedTasks', id), data);
  return id;
};

export const pushSharedTask = async (cloudId: string, task: Task, user: CloudUser, updatedAt: number) => {
  const { db } = requireCloud();
  await updateDoc(doc(db, 'sharedTasks', cloudId), {
    task: toCloudContent(task),
    updatedAt,
    updatedBy: user.uid,
  });
};

export const deleteSharedTask = async (cloudId: string) => {
  const { db } = requireCloud();
  await deleteDoc(doc(db, 'sharedTasks', cloudId));
};

export const leaveSharedTask = async (cloudId: string, user: CloudUser) => {
  const { db } = requireCloud();
  await updateDoc(doc(db, 'sharedTasks', cloudId), {
    memberUids: arrayRemove(user.uid),
    updatedAt: Date.now(),
  });
};

export const watchSharedTasks = (
  user: CloudUser,
  callback: (docs: SharedTaskDoc[], fromCache: boolean) => void,
  onError: (err: Error) => void,
): Unsubscribe => {
  const { db } = requireCloud();
  const q = query(collection(db, 'sharedTasks'), where('memberUids', 'array-contains', user.uid));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedTaskDoc)), snap.metadata.fromCache);
  }, onError);
};

// ---------- Invites ----------

export interface InviteDoc {
  id: string;
  sharedTaskId: string;
  taskTitle: string;
  fromUid: string;
  fromName: string;
  fromEmail: string;
  toEmail: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: number;
  respondedAt?: number;
  respondedByName?: string;
}

export interface InviteResult {
  invite: InviteDoc;
  recipientHasApp: boolean;
  recipientName?: string;
}

export const sendInvite = async (
  sharedTaskId: string,
  taskTitle: string,
  from: CloudUser,
  toEmailRaw: string,
): Promise<InviteResult> => {
  const { db } = requireCloud();
  const toEmail = normalizeEmail(toEmailRaw);
  if (toEmail === from.email) throw new Error('You can\'t invite yourself.');

  const recipient = await getDoc(doc(db, 'userEmails', toEmail));

  await updateDoc(doc(db, 'sharedTasks', sharedTaskId), {
    pendingEmails: arrayUnion(toEmail),
  });

  const invite: InviteDoc = {
    id: generateId(),
    sharedTaskId,
    taskTitle,
    fromUid: from.uid,
    fromName: from.name,
    fromEmail: from.email,
    toEmail,
    status: 'pending',
    createdAt: Date.now(),
  };
  const { id, ...data } = invite;
  await setDoc(doc(db, 'invites', id), data);

  return {
    invite,
    recipientHasApp: recipient.exists(),
    recipientName: recipient.exists() ? (recipient.data().name as string) : undefined,
  };
};

export const respondToInvite = async (invite: InviteDoc, user: CloudUser, accept: boolean) => {
  const { db } = requireCloud();
  if (accept) {
    await updateDoc(doc(db, 'sharedTasks', invite.sharedTaskId), {
      memberUids: arrayUnion(user.uid),
      [`memberInfo.${user.uid}`]: { name: user.name, email: user.email },
      pendingEmails: arrayRemove(user.email),
      updatedAt: Date.now(),
    });
  }
  await updateDoc(doc(db, 'invites', invite.id), {
    status: accept ? 'accepted' : 'declined',
    respondedAt: Date.now(),
    respondedByName: user.name,
  });
};

// Invites sent to me (to accept/decline) and replies to invites I sent.
export const watchInvites = (
  user: CloudUser,
  onIncoming: (invites: InviteDoc[]) => void,
  onReplies: (invites: InviteDoc[]) => void,
  onError: (err: Error) => void,
): Unsubscribe => {
  const { db } = requireCloud();
  const toMe = onSnapshot(
    query(collection(db, 'invites'), where('toEmail', '==', user.email)),
    snap => onIncoming(snap.docs.map(d => ({ id: d.id, ...d.data() } as InviteDoc))),
    onError,
  );
  const fromMe = onSnapshot(
    query(collection(db, 'invites'), where('fromUid', '==', user.uid)),
    snap => onReplies(snap.docs.map(d => ({ id: d.id, ...d.data() } as InviteDoc)).filter(i => i.status !== 'pending')),
    onError,
  );
  return () => { toMe(); fromMe(); };
};

// Message for the share sheet that goes along with an invite.
export const inviteMessage = (fromName: string, taskTitle: string, toEmail: string, recipientHasApp: boolean) =>
  recipientHasApp
    ? `${fromName} invited you to collaborate on "${taskTitle}" in MentaList.\n\nOpen MentaList and check your Notifications (🔔) to accept.`
    : `${fromName} invited you to collaborate on "${taskTitle}" in MentaList.\n\n` +
      `1. Get MentaList: ${APP_DOWNLOAD_URL}\n` +
      `2. Create an account with this email: ${toEmail}\n` +
      `3. Open Notifications (🔔) and choose Accept.\n\n` +
      `Once you accept, you can both add, edit and complete the task and its subtasks.`;

// Initials avatar as an inline SVG, so it works offline (replaces random stock photos).
export const initialsAvatar = (name: string): string => {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || '?';
  let hue = 0;
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="hsl(${hue},55%,55%)"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="-apple-system,Helvetica,Arial" font-size="26" font-weight="600" fill="#fff">${initials}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
