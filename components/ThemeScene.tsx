import React, { useEffect, useMemo } from 'react';
import { ThemeType } from '../types';
import { THEMES } from '../constants';
import { ThemeIcon } from './AppIcons';

// Decorative, animated scenery for each theme. Purely visual: fixed behind the
// content, ignores taps, and stops moving when the user prefers reduced motion
// (animations are defined in themes.css).

// Deterministic pseudo-random numbers so scenes don't jump around on re-render
const seeded = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

const WaveLayer: React.FC<{ color: string; opacity: number; duration: number; height: number; offset: number }> = ({ color, opacity, duration, height, offset }) => (
  <svg className="scene-wave" style={{ animationDuration: `${duration}s`, bottom: offset, height }} viewBox="0 0 1440 120" preserveAspectRatio="none">
    <path
      d="M0,60 C120,20 240,100 360,60 C480,20 600,100 720,60 C840,20 960,100 1080,60 C1200,20 1320,100 1440,60 L1440,120 L0,120 Z M1440,60 C1560,20 1680,100 1800,60 C1920,20 2040,100 2160,60 C2280,20 2400,100 2520,60 C2640,20 2760,100 2880,60 L2880,120 L1440,120 Z"
      fill={color}
      fillOpacity={opacity}
    />
  </svg>
);

const SerenityScene: React.FC<{ dark: boolean }> = ({ dark }) => (
  <>
    <div className="scene-glow" style={{ top: '-10%', right: '-10%', background: dark ? 'rgba(34,211,238,0.10)' : 'rgba(255,226,160,0.30)' }} />
    {/* Rising bubbles */}
    {range(7).map(i => {
      const size = 6 + seeded(i, 1) * 12;
      return (
        <span
          key={i}
          className="scene-bubble"
          style={{
            left: `${seeded(i, 2) * 100}%`,
            width: size,
            height: size,
            animationDuration: `${12 + seeded(i, 3) * 14}s`,
            animationDelay: `${-seeded(i, 4) * 20}s`,
            borderColor: dark ? 'rgba(165,243,252,0.4)' : 'rgba(11,110,138,0.26)',
          }}
        />
      );
    })}
    <WaveLayer color={dark ? '#155e75' : '#BFE1EA'} opacity={dark ? 0.55 : 0.6} duration={26} height={110} offset={0} />
    <WaveLayer color={dark ? '#0e7490' : '#7FC3D3'} opacity={dark ? 0.45 : 0.35} duration={18} height={80} offset={0} />
    <WaveLayer color={dark ? '#0891b2' : '#3E97AE'} opacity={dark ? 0.35 : 0.2} duration={12} height={55} offset={0} />
  </>
);

const LEAF_PATH = 'M10 0 C18 6 18 16 10 24 C2 16 2 6 10 0 Z M10 3 L10 22';

const NatureScene: React.FC<{ dark: boolean }> = ({ dark }) => {
  const leafColors = dark ? ['#34d399', '#10b981', '#6ee7b7', '#a3e635'] : ['#6A9E5F', '#A7C79A', '#3D7A36', '#C9B46A'];
  return (
    <>
      <div className="scene-glow" style={{ top: '-12%', left: '-8%', background: dark ? 'rgba(52,211,153,0.10)' : 'rgba(217,194,122,0.22)' }} />
      {range(6).map(i => (
        <svg
          key={i}
          className="scene-leaf"
          width="20"
          height="24"
          viewBox="0 0 20 24"
          style={{
            left: `${seeded(i, 5) * 100}%`,
            animationDuration: `${14 + seeded(i, 6) * 12}s`,
            animationDelay: `${-seeded(i, 7) * 24}s`,
            transform: `scale(${0.7 + seeded(i, 8) * 0.8})`,
          }}
        >
          <path d={LEAF_PATH} fill={leafColors[i % leafColors.length]} fillOpacity="0.6" stroke={dark ? '#064e3b' : '#1D2B1F'} strokeOpacity="0.25" strokeWidth="1" />
        </svg>
      ))}
      <svg className="scene-hills" viewBox="0 0 1440 160" preserveAspectRatio="none" style={{ height: 140 }}>
        <path d="M0,90 C200,40 380,120 620,80 C860,40 1060,110 1240,70 C1340,50 1400,60 1440,70 L1440,160 L0,160 Z" fill={dark ? '#065f46' : '#CFE3C6'} fillOpacity={dark ? 0.5 : 0.75} />
        <path d="M0,120 C240,80 460,140 720,110 C980,80 1200,140 1440,105 L1440,160 L0,160 Z" fill={dark ? '#047857' : '#A7C79A'} fillOpacity={dark ? 0.45 : 0.45} />
      </svg>
    </>
  );
};

const MidnightScene: React.FC = () => (
  <>
    {range(34).map(i => {
      const size = 1 + seeded(i, 10) * 2.2;
      return (
        <span
          key={i}
          className="scene-star"
          style={{
            left: `${seeded(i, 11) * 100}%`,
            top: `${seeded(i, 12) * 70}%`,
            width: size,
            height: size,
            animationDuration: `${2.5 + seeded(i, 13) * 4}s`,
            animationDelay: `${-seeded(i, 14) * 6}s`,
          }}
        />
      );
    })}
    <span className="scene-shooting-star" style={{ top: '14%', left: '20%' }} />
    <span className="scene-shooting-star" style={{ top: '30%', left: '60%', animationDelay: '-6s' }} />
  </>
);

const TwilightScene: React.FC = () => (
  <>
    <div className="scene-glow" style={{ bottom: '-20%', left: '20%', width: '70vw', height: '50vh', background: 'rgba(231,155,190,0.12)' }} />
    {range(14).map(i => (
      <span
        key={`s${i}`}
        className="scene-star"
        style={{
          left: `${seeded(i, 15) * 100}%`,
          top: `${seeded(i, 16) * 45}%`,
          width: 1.5,
          height: 1.5,
          animationDuration: `${3 + seeded(i, 17) * 4}s`,
          animationDelay: `${-seeded(i, 18) * 6}s`,
        }}
      />
    ))}
    {range(9).map(i => (
      <span
        key={`p${i}`}
        className="scene-petal"
        style={{
          left: `${seeded(i, 19) * 100}%`,
          animationDuration: `${11 + seeded(i, 20) * 10}s`,
          animationDelay: `${-seeded(i, 21) * 20}s`,
          transform: `scale(${0.6 + seeded(i, 22) * 0.9})`,
        }}
      />
    ))}
    <svg className="scene-hills" viewBox="0 0 1440 160" preserveAspectRatio="none" style={{ height: 130 }}>
      <path d="M0,80 C220,30 420,110 700,70 C980,30 1180,100 1440,60 L1440,160 L0,160 Z" fill="#4A2B42" fillOpacity="0.6" />
      <path d="M0,115 C260,85 520,140 780,110 C1040,80 1260,130 1440,100 L1440,160 L0,160 Z" fill="#2A1A30" fillOpacity="0.8" />
    </svg>
  </>
);

const WarmthScene: React.FC<{ dark: boolean }> = ({ dark }) => (
  <>
    <div className="scene-glow" style={{ top: '-15%', left: '-10%', width: '60vw', height: '60vh', background: dark ? 'rgba(251,191,36,0.10)' : 'rgba(227,181,122,0.26)' }} />
    {range(6).map(i => {
      const size = 30 + seeded(i, 23) * 70;
      return (
        <span
          key={i}
          className="scene-bokeh"
          style={{
            left: `${seeded(i, 24) * 100}%`,
            top: `${seeded(i, 25) * 100}%`,
            width: size,
            height: size,
            animationDuration: `${10 + seeded(i, 26) * 10}s`,
            animationDelay: `${-seeded(i, 27) * 10}s`,
            background: dark ? 'rgba(251,146,60,0.10)' : 'rgba(201,138,69,0.12)',
          }}
        />
      );
    })}
    <div className="scene-glow" style={{ bottom: '-18%', right: '-12%', width: '55vw', height: '55vh', background: dark ? 'rgba(234,88,12,0.08)' : 'rgba(201,120,52,0.18)' }} />
  </>
);

const SPARKLE_PATH = 'M10 0 C11 7 13 9 20 10 C13 11 11 13 10 20 C9 13 7 11 0 10 C7 9 9 7 10 0 Z';

const ClarityScene: React.FC<{ dark: boolean }> = ({ dark }) => (
  <>
    <span className="scene-orb" style={{ top: '-8%', right: '-6%', width: '45vw', height: '45vw', background: dark ? 'rgba(99,102,241,0.16)' : 'rgba(111,134,232,0.16)', animationDuration: '28s' }} />
    <span className="scene-orb" style={{ bottom: '-12%', left: '10%', width: '40vw', height: '40vw', background: dark ? 'rgba(59,130,246,0.12)' : 'rgba(201,211,247,0.45)', animationDuration: '34s', animationDelay: '-8s' }} />
    {range(5).map(i => (
      <svg
        key={i}
        className="scene-sparkle"
        width="20"
        height="20"
        viewBox="0 0 20 20"
        style={{
          left: `${seeded(i, 28) * 100}%`,
          top: `${seeded(i, 29) * 100}%`,
          animationDuration: `${3 + seeded(i, 30) * 4}s`,
          animationDelay: `${-seeded(i, 31) * 6}s`,
          transform: `scale(${0.5 + seeded(i, 32) * 0.8})`,
        }}
      >
        <path d={SPARKLE_PATH} fill={dark ? '#a5b4fc' : '#3B5BDB'} fillOpacity="0.2" />
      </svg>
    ))}
  </>
);

const FocusScene: React.FC<{ dark: boolean }> = ({ dark }) => (
  <>
    <div className="scene-dotgrid" style={{ backgroundImage: `radial-gradient(${dark ? 'rgba(148,163,184,0.16)' : 'rgba(71,85,105,0.12)'} 1px, transparent 1px)` }} />
  </>
);

// Blossom: a soft rose glow and a few petals drifting down
const BlossomScene: React.FC = () => (
  <>
    <div className="scene-glow" style={{ top: '-14%', right: '-8%', width: '60vw', height: '55vh', background: 'rgba(241,207,219,0.55)' }} />
    <div className="scene-glow" style={{ bottom: '-20%', left: '-10%', width: '50vw', height: '45vh', background: 'rgba(232,180,196,0.28)' }} />
    {range(8).map(i => (
      <span
        key={i}
        className="scene-petal"
        style={{
          left: `${seeded(i, 40) * 100}%`,
          animationDuration: `${13 + seeded(i, 41) * 10}s`,
          animationDelay: `${-seeded(i, 42) * 20}s`,
          transform: `scale(${0.6 + seeded(i, 43) * 0.7})`,
          background: 'linear-gradient(135deg, #F6D7E2, #D98CA8)',
          opacity: 0.7,
        }}
      />
    ))}
  </>
);

export const ThemeBackdrop: React.FC<{ theme: ThemeType; isDarkMode: boolean }> = ({ theme, isDarkMode }) => {
  const scene = (() => {
    switch (theme) {
      case 'serenity': return <SerenityScene dark={isDarkMode} />;
      case 'nature': return <NatureScene dark={isDarkMode} />;
      case 'midnight': return <MidnightScene />;
      case 'twilight': return <TwilightScene />;
      case 'warmth': return <WarmthScene dark={isDarkMode} />;
      case 'focus': return <FocusScene dark={isDarkMode} />;
      case 'blossom': return <BlossomScene />;
      case 'ink': return null; // True black: nothing behind the list
      default: return <ClarityScene dark={isDarkMode} />;
    }
  })();
  return <div className="theme-scene" aria-hidden="true">{scene}</div>;
};

// Full-screen reveal shown briefly after choosing a theme
export const ThemeSwitchOverlay: React.FC<{ theme: ThemeType; onDone: () => void }> = ({ theme, onDone }) => {
  const data = THEMES[theme];
  const isDark = !!data.isDark;

  useEffect(() => {
    const timer = window.setTimeout(onDone, 2100);
    return () => clearTimeout(timer);
  }, [theme, onDone]);

  const burst = useMemo(() => range(14).map(i => ({
    angle: (i / 14) * Math.PI * 2 + seeded(i, 33) * 0.4,
    distance: 110 + seeded(i, 34) * 90,
    delay: seeded(i, 35) * 0.25,
    color: data.confettiColors[i % data.confettiColors.length] as string,
    rotate: Math.round(seeded(i, 36) * 360),
  })), [theme]);

  return (
    <div
      className="theme-switch-overlay"
      style={{ background: data.revealGradient }}
      onClick={onDone}
      role="status"
      aria-live="polite"
    >
      <div className="theme-switch-scene">
        <ThemeBackdrop theme={theme} isDarkMode={isDark} />
      </div>
      <div className="theme-switch-content">
        <div className="theme-switch-emblem">
          <ThemeIcon theme={theme} size={60} style={{ color: data.confettiColors[0] }} />
          {burst.map((b, i) => (
            <span
              key={i}
              className="theme-switch-particle"
              style={{
                '--dx': `${Math.cos(b.angle) * b.distance}px`,
                '--dy': `${Math.sin(b.angle) * b.distance}px`,
                animationDelay: `${0.35 + b.delay}s`,
              } as React.CSSProperties}
            >
              <svg width="20" height="20" viewBox="0 0 20 24" style={{ transform: `rotate(${b.rotate}deg)` }}>
                {data.confettiPath
                  ? <path d={data.confettiPath} fill={b.color} />
                  : <circle cx="10" cy="12" r="6" fill={b.color} />}
              </svg>
            </span>
          ))}
        </div>
        <p className={`theme-switch-title font-display ${isDark ? 'text-white' : 'text-ink'}`}>{data.name}</p>
        <p className={`theme-switch-tagline ${isDark ? 'text-white/80' : 'text-ink opacity-80'}`}>{data.tagline}</p>
      </div>
    </div>
  );
};
