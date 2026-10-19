
export interface SmartLink {
  app: string;
  icon: string; // Key for SmartLinkIcon (components/AppIcons.tsx)
  url: string;
  color: string;
  label: string;
}

// A task name that mentions one of these apps gets a button to open it. Only clear
// mentions count (an app's name, or a phrase like "send an email"), not everyday words.
const APP_CONFIGS = [
  {
    keywords: /\b(e-?mails?|gmail|outlook)\b/i,
    app: 'Mail',
    icon: 'mail',
    url: 'mailto:',
    color: 'bg-red-500',
    label: 'Write an email'
  },
  {
    keywords: /\binstagram\b/i,
    app: 'Instagram',
    icon: 'camera',
    url: 'https://www.instagram.com',
    color: 'bg-pink-600',
    label: 'Open Instagram'
  },
  {
    keywords: /\blinkedin\b/i,
    app: 'LinkedIn',
    icon: 'briefcase',
    url: 'https://www.linkedin.com',
    color: 'bg-blue-700',
    label: 'Open LinkedIn'
  },
  {
    keywords: /\bwhats\s?app\b/i,
    app: 'WhatsApp',
    icon: 'message',
    url: 'https://wa.me',
    color: 'bg-green-600',
    label: 'Open WhatsApp'
  },
  {
    keywords: /\b(maps|directions)\b/i,
    app: 'Maps',
    icon: 'map',
    url: 'https://maps.apple.com',
    color: 'bg-emerald-600',
    label: 'Open Maps'
  },
  {
    keywords: /\byoutube\b/i,
    app: 'YouTube',
    icon: 'video',
    url: 'https://www.youtube.com',
    color: 'bg-red-600',
    label: 'Open YouTube'
  },
  {
    keywords: /\b(spotify|playlist)\b/i,
    app: 'Spotify',
    icon: 'music',
    url: 'https://open.spotify.com',
    color: 'bg-green-700',
    label: 'Open Spotify'
  }
];

export const detectSmartLinks = (text: string): SmartLink[] => {
  if (!text) return [];
  return APP_CONFIGS
    .filter(config => config.keywords.test(text))
    .map(({ app, icon, url, color, label }) => ({
      app,
      icon,
      url,
      color,
      label
    }));
};
