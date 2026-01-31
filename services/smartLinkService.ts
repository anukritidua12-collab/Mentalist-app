
export interface SmartLink {
  app: string;
  icon: string;
  url: string;
  color: string;
  label: string;
}

const APP_CONFIGS = [
  {
    keywords: /\b(email|mail|gmail|outlook)\b/i,
    app: 'Gmail',
    icon: '📧',
    url: 'mailto:',
    color: 'bg-red-500',
    label: 'Compose Email'
  },
  {
    keywords: /\b(instagram|ig|post)\b/i,
    app: 'Instagram',
    icon: '📸',
    url: 'https://www.instagram.com',
    color: 'bg-pink-600',
    label: 'Open Instagram'
  },
  {
    keywords: /\b(linkedin|connect|profile)\b/i,
    app: 'LinkedIn',
    icon: '💼',
    url: 'https://www.linkedin.com',
    color: 'bg-blue-700',
    label: 'Open LinkedIn'
  },
  {
    keywords: /\b(whatsapp|wa|message|text)\b/i,
    app: 'WhatsApp',
    icon: '💬',
    url: 'https://wa.me',
    color: 'bg-green-500',
    label: 'Send WhatsApp'
  },
  {
    keywords: /\b(maps|location|directions|place|at)\b/i,
    app: 'Google Maps',
    icon: '📍',
    url: 'https://www.google.com/maps',
    color: 'bg-emerald-600',
    label: 'Open Maps'
  },
  {
    keywords: /\b(youtube|yt|video|watch)\b/i,
    app: 'YouTube',
    icon: '🎬',
    url: 'https://www.youtube.com',
    color: 'bg-red-600',
    label: 'Watch Video'
  },
  {
    keywords: /\b(spotify|music|listen|song|playlist)\b/i,
    app: 'Spotify',
    icon: '🎧',
    url: 'https://open.spotify.com',
    color: 'bg-green-600',
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
