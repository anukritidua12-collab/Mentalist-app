
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tailwind.css';
// Fonts bundled with the app so they work offline
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/plus-jakarta-sans/600.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';

import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { TextZoom } from '@capacitor/text-zoom';

// In the iPhone app: no pinch-to-zoom (it's a native app, not a web page), and text
// follows the size chosen in iPhone Settings → Display & Brightness → Text Size.
// The web version keeps pinch-to-zoom for accessibility.
if (Capacitor.isNativePlatform()) {
  document.querySelector('meta[name="viewport"]')?.setAttribute(
    'content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
  );
  const followTextSize = () => TextZoom.getPreferred()
    // Kept within a range the layout is designed for; very large sizes would break it
    .then(({ value }) => TextZoom.set({ value: Math.min(Math.max(value, 0.85), 1.4) }))
    .catch(() => {});
  followTextSize();
  NativeApp.addListener('resume', followTextSize);
}

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('MentaList Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // A calm screen with a way out; details go to the console, not the screen
      return (
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32, textAlign: 'center', fontFamily: '-apple-system, system-ui, sans-serif', color: '#1F2433', background: '#F3F5F9' }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Something went wrong</h1>
          <p style={{ margin: 0, maxWidth: 320, color: '#5D6577', lineHeight: 1.5 }}>MentaList hit a problem and needs to reload. Your tasks are saved on this device.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 8, height: 48, padding: '0 24px', borderRadius: 14, border: 0, background: '#3B5BDB', color: '#fff', fontSize: 16, fontWeight: 600 }}
          >
            Reload MentaList
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

