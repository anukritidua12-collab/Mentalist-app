import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Attachment, AttachmentType, Task } from '../types';
import { generateId } from '../utils';

// On iPhone, attachments are saved as real files in the app's data folder and
// only their path is stored with the task. This keeps task data small and avoids
// the browser's ~5MB storage limit. In the browser they stay as data URLs.
const isNative = Capacitor.isNativePlatform();
const FOLDER = 'attachments';

// file:// URI of the app's data folder. Resolved at startup because iOS can
// change the container path between app updates, so full URLs can't be stored.
let dataDirUri: string | null = null;

export const initAttachmentStorage = async (): Promise<void> => {
  if (!isNative) return;
  const { uri } = await Filesystem.getUri({ path: '', directory: Directory.Data });
  dataDirUri = uri.replace(/\/$/, '');
};

const fileUri = (path: string) => `${dataDirUri}/${path}`;

// URL to show an attachment in an <img>, <iframe>, etc.
export const attachmentSrc = (att: Attachment): string => {
  if (att.path && dataDirUri) return Capacitor.convertFileSrc(fileUri(att.path));
  return att.url;
};

export const attachmentMimeType = (att: Attachment): string => {
  if (att.mimeType) return att.mimeType;
  const match = att.url.match(/^data:([^;]+);/);
  return match?.[1] || '';
};

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);

const writeDataUrl = async (dataUrl: string, name: string): Promise<string> => {
  const path = `${FOLDER}/${generateId()}-${safeFileName(name)}`;
  await Filesystem.writeFile({
    path,
    data: dataUrl.slice(dataUrl.indexOf(',') + 1),
    directory: Directory.Data,
    recursive: true,
  });
  return path;
};

export const createAttachment = async (file: File): Promise<Attachment> => {
  const dataUrl = await readAsDataUrl(file);
  const base = {
    id: generateId(),
    type: file.type.startsWith('image/') ? AttachmentType.IMAGE : AttachmentType.PDF,
    name: file.name,
    mimeType: file.type,
    createdAt: Date.now(),
  };
  if (!isNative) return { ...base, url: dataUrl };
  const path = await writeDataUrl(dataUrl, file.name);
  return { ...base, url: '', path };
};

// A copy of an attachment for another task (a repeating task's next occurrence). On
// iPhone the file itself is copied, so each task owns its own file; `done` resolves when
// the copy is written. In the browser the data URL is simply reused.
export const duplicateAttachment = (att: Attachment): { copy: Attachment; done: Promise<void> } => {
  const copy: Attachment = { ...att, id: generateId(), createdAt: Date.now() };
  if (!isNative || !att.path) return { copy, done: Promise.resolve() };
  const path = `${FOLDER}/${generateId()}-${safeFileName(att.name)}`;
  copy.path = path;
  const done = Filesystem.copy({ from: att.path, to: path, directory: Directory.Data, toDirectory: Directory.Data })
    .then(() => undefined);
  return { copy, done };
};

export const deleteAttachmentFile = async (att: Attachment): Promise<void> => {
  if (!isNative || !att.path) return;
  try {
    await Filesystem.deleteFile({ path: att.path, directory: Directory.Data });
  } catch {
    // Already gone; nothing to do
  }
};

// Opens the iOS share sheet for the file (Save to Files, AirDrop, open in another app…).
// In the browser it downloads the file instead.
export const shareOrDownloadAttachment = async (att: Attachment): Promise<void> => {
  if (isNative && att.path) {
    await Share.share({ title: att.name, files: [fileUri(att.path)] });
    return;
  }
  const a = document.createElement('a');
  a.href = att.url;
  a.download = att.name;
  a.click();
};

// Moves attachments saved by earlier versions (data URLs inside task data) into files.
// Returns the same array if nothing needed moving.
export const migrateInlineAttachments = async (tasks: Task[]): Promise<Task[]> => {
  if (!isNative) return tasks;
  let changed = false;

  const migrateTask = async (task: Task): Promise<Task> => {
    const attachments = await Promise.all(task.attachments.map(async att => {
      if (att.path || !att.url.startsWith('data:')) return att;
      changed = true;
      const path = await writeDataUrl(att.url, att.name);
      return { ...att, url: '', path, mimeType: attachmentMimeType(att) };
    }));
    const subTasks = await Promise.all(task.subTasks.map(migrateTask));
    return { ...task, attachments, subTasks };
  };

  const migrated = await Promise.all(tasks.map(migrateTask));
  return changed ? migrated : tasks;
};
