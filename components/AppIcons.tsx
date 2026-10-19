import React from 'react';
import {
  Icon as PhosphorIcon, IconWeight, Folder, Target, Star, Fire, Lightbulb, Palette, MusicNotes, BookOpen, Sneaker,
  Orange, Airplane, GameController, Sun, Briefcase, House, ClipboardText, Users, Backpack, Barbell, ShoppingCart,
  Envelope, Phone, FilmSlate, ForkKnife, PencilSimple, Books, Sparkle, Rocket, Laptop, Gift, Heart, GraduationCap,
  Car, PawPrint, Wallet, Stethoscope, Code, Wrench, Tag, Coffee, Waves, Leaf, MoonStars, FlowerLotus, Plant,
  CircleDashed, Camera, ChatCircle, MapPin, Play, FileText, FileXls, FileImage, FileAudio, FileVideo, FileZip, File,
  PresentationChart, Notepad, Feather, Mountains, Flower, PenNib, SunHorizon,
} from '@phosphor-icons/react';

// Icons come from Phosphor (phosphoricons.com, MIT licence). Lists use the two-tone
// "duotone" weight (a soft tinted fill behind the line); everything else is regular.

// ---------- List icons ----------
export const LIST_ICONS: Record<string, PhosphorIcon> = {
  sun: Sun, briefcase: Briefcase, home: House, clipboard: ClipboardText, users: Users, checklist: Notepad,
  folder: Folder, target: Target, star: Star, flame: Fire, lightbulb: Lightbulb,
  palette: Palette, music: MusicNotes, book: BookOpen, footprints: Sneaker, apple: Orange,
  plane: Airplane, gamepad: GameController, backpack: Backpack, dumbbell: Barbell, cart: ShoppingCart,
  mail: Envelope, phone: Phone, film: FilmSlate, utensils: ForkKnife, pencil: PencilSimple,
  library: Books, sparkles: Sparkle, rocket: Rocket, laptop: Laptop, gift: Gift,
  heart: Heart, school: GraduationCap, car: Car, paw: PawPrint, wallet: Wallet,
  health: Stethoscope, code: Code, tools: Wrench, tag: Tag,
  coffee: Coffee, plant: Plant, mountain: Mountains, feather: Feather,
};

export const LIST_ICON_KEYS = Object.keys(LIST_ICONS);

// Lists saved by earlier versions used emoji; map them to the matching icon
const EMOJI_TO_ICON: Record<string, string> = {
  '☀️': 'sun', '💼': 'briefcase', '🏠': 'home', '📋': 'clipboard', '👥': 'users',
  '📁': 'folder', '🎯': 'target', '⭐': 'star', '🔥': 'flame', '💡': 'lightbulb',
  '🎨': 'palette', '🎵': 'music', '📖': 'book', '🏃': 'footprints', '🍎': 'apple',
  '✈️': 'plane', '🎮': 'gamepad', '🎒': 'backpack', '💪': 'dumbbell', '🛒': 'cart',
  '📧': 'mail', '📞': 'phone', '🎬': 'film', '🍽️': 'utensils', '✏️': 'pencil',
  '📚': 'library', '🌟': 'sparkles', '🚀': 'rocket', '💻': 'laptop', '🎁': 'gift',
};

export const normalizeListIcon = (icon: string | undefined): string => {
  if (icon && LIST_ICONS[icon]) return icon;
  if (icon && EMOJI_TO_ICON[icon]) return EMOJI_TO_ICON[icon];
  return 'folder';
};

export const ListIcon: React.FC<{ icon?: string; size?: number; className?: string; weight?: IconWeight }> = ({ icon, size = 18, className, weight = 'duotone' }) => {
  const Glyph = LIST_ICONS[normalizeListIcon(icon)];
  return <Glyph size={size} weight={weight} className={className} aria-hidden="true" />;
};

// ---------- Theme icons ----------
const THEME_ICONS: Record<string, { emblem: PhosphorIcon; empty: PhosphorIcon }> = {
  clarity: { emblem: Sparkle, empty: Sparkle },
  focus: { emblem: Target, empty: CircleDashed },
  warmth: { emblem: SunHorizon, empty: SunHorizon },
  serenity: { emblem: Waves, empty: Waves },
  nature: { emblem: Leaf, empty: Plant },
  midnight: { emblem: MoonStars, empty: MoonStars },
  twilight: { emblem: FlowerLotus, empty: FlowerLotus },
  blossom: { emblem: Flower, empty: Flower },
  ink: { emblem: PenNib, empty: PenNib },
};

export const ThemeIcon: React.FC<{ theme: string; variant?: 'emblem' | 'empty'; size?: number; className?: string; style?: React.CSSProperties }> = ({ theme, variant = 'emblem', size = 18, className, style }) => {
  const Glyph = (THEME_ICONS[theme] || THEME_ICONS.clarity)[variant];
  return <Glyph size={size} weight={variant === 'empty' ? 'thin' : 'duotone'} className={className} style={style} aria-hidden="true" />;
};

// ---------- Smart link (app shortcut) icons ----------
const SMART_LINK_ICONS: Record<string, PhosphorIcon> = {
  mail: Envelope, camera: Camera, briefcase: Briefcase, message: ChatCircle, map: MapPin, video: Play, music: MusicNotes,
};

export const SmartLinkIcon: React.FC<{ icon: string; size?: number; className?: string }> = ({ icon, size = 16, className }) => {
  const Glyph = SMART_LINK_ICONS[icon] || Sparkle;
  return <Glyph size={size} className={className} aria-hidden="true" />;
};

// ---------- Attachment file-type icons ----------
const FILE_ICONS: Record<string, PhosphorIcon> = {
  pdf: FileText, doc: FileText, docx: FileText, txt: FileText, rtf: FileText,
  csv: FileXls, xls: FileXls, xlsx: FileXls, numbers: FileXls,
  ppt: PresentationChart, pptx: PresentationChart, key: PresentationChart,
  jpg: FileImage, jpeg: FileImage, png: FileImage, gif: FileImage, heic: FileImage, webp: FileImage,
  mp3: FileAudio, wav: FileAudio, m4a: FileAudio,
  mp4: FileVideo, mov: FileVideo, webm: FileVideo,
  zip: FileZip, rar: FileZip,
};

export const FileTypeIcon: React.FC<{ name: string; size?: number }> = ({ name, size = 24 }) => {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  const Glyph = FILE_ICONS[ext] || File;
  return <Glyph size={size} weight="light" aria-hidden="true" />;
};
