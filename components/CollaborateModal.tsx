import React, { useState } from 'react';
import { Task } from '../types';
import { Icons } from '../constants';
import {
  CloudUser, InviteResult, isCloudConfigured, signIn, signUp, signOut, resetPassword,
  resendVerificationEmail, refreshVerification, inviteMessage, normalizeEmail,
} from '../services/cloudService';
import { shareText } from '../services/shareService';
import { tapWord } from '../utils';

interface CollaborateModalProps {
  // With a task: invite people to it. Without: just the account screen (from Settings).
  task?: Task;
  pendingEmails?: string[];
  user: CloudUser | null;
  onUserChanged: (user: CloudUser | null) => void;
  onSendInvite?: (email: string) => Promise<InviteResult>;
  onClose: () => void;
  isDarkMode: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CollaborateModal: React.FC<CollaborateModalProps> = ({
  task, pendingEmails = [], user, onUserChanged, onSendInvite, onClose, isDarkMode,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAuth = () => run(async () => {
    if (authMode === 'signup' && !name.trim()) throw new Error('Please enter your name so collaborators know who you are.');
    if (!EMAIL_PATTERN.test(email.trim())) throw new Error('Please enter a valid email address.');
    const signedIn = authMode === 'signup' ? await signUp(name, email, password) : await signIn(email, password);
    onUserChanged(signedIn);
  });

  const handleInvite = () => run(async () => {
    if (!onSendInvite) return;
    if (!EMAIL_PATTERN.test(inviteEmail.trim())) throw new Error('Please enter a valid email address.');
    setResult(await onSendInvite(inviteEmail));
  });

  const sendInviteMessage = async (r: InviteResult) => {
    if (!user || !task) return;
    const outcome = await shareText(
      `Collaborate on "${task.title}"`,
      inviteMessage(user.name, task.title, r.invite.toEmail, r.recipientHasApp),
    );
    if (outcome === 'copied') setInfo('Message copied. Paste it into WhatsApp, Messages or email.');
  };

  const surface = isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-ink';
  const muted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const field = `w-full px-4 py-3 rounded-xl border text-base outline-none transition-colors focus:border-[var(--theme-primary)] ${
    isDarkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 placeholder:text-slate-400'
  }`;
  const primaryBtn = 'w-full py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50';
  const secondaryBtn = `w-full py-3 rounded-xl font-semibold transition-all active:scale-[0.98] ${isDarkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`;

  const renderBody = () => {
    if (!isCloudConfigured) {
      return (
        <div className="space-y-3 text-center py-4">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}><Icons.Users size={28} /></div>
          <p className="font-semibold">Collaboration is coming soon</p>
          <p className={`text-sm ${muted}`}>
            Inviting people to edit tasks with you isn't available yet. In the meantime, use “Share details” to send a task to anyone.
          </p>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="space-y-4">
          <p className={`text-sm ${muted}`}>
            {task
              ? 'To invite someone to edit this task with you, sign in first. Your collaborators will see your name.'
              : 'Sign in to collaborate on tasks with other people.'}
          </p>
          <div className={`grid grid-cols-2 p-1 rounded-xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {(['signup', 'signin'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setAuthMode(mode); setError(null); }}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${authMode === mode ? (isDarkMode ? 'bg-slate-700 text-white shadow' : 'bg-white text-ink shadow') : muted}`}
              >
                {mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            ))}
          </div>
          {authMode === 'signup' && (
            <input className={field} placeholder="Your name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
          )}
          <input className={field} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" autoCapitalize="none" />
          <input
            className={field}
            type="password"
            placeholder={authMode === 'signup' ? 'Password (6+ characters)' : 'Password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAuth(); }}
            autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
          />
          <button onClick={handleAuth} disabled={busy} className={primaryBtn} style={{ backgroundColor: 'var(--theme-primary)' }}>
            {busy ? 'Please wait…' : authMode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
          {authMode === 'signin' && (
            <button
              onClick={() => run(async () => {
                if (!EMAIL_PATTERN.test(email.trim())) throw new Error('Enter your email above first.');
                await resetPassword(email);
                setInfo('Password reset email sent. Check your inbox.');
              })}
              className={`w-full text-sm font-medium ${muted}`}
            >
              Forgot password?
            </button>
          )}
        </div>
      );
    }

    if (!user.emailVerified) {
      return (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}><Icons.Send size={28} /></div>
          <p className="font-semibold">Verify your email</p>
          <p className={`text-sm ${muted}`}>
            We sent a link to <span className="font-semibold">{user.email}</span>. {tapWord()} it, then come back here.
            This makes sure invites reach the right person.
          </p>
          <button
            onClick={() => run(async () => {
              const refreshed = await refreshVerification();
              onUserChanged(refreshed);
              if (refreshed && !refreshed.emailVerified) setInfo(`Not verified yet. ${tapWord()} the link in the email first (check spam too).`);
            })}
            disabled={busy}
            className={primaryBtn}
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            {busy ? 'Checking…' : 'I\'ve verified my email'}
          </button>
          <button onClick={() => run(async () => { await resendVerificationEmail(); setInfo('Verification email sent again.'); })} className={secondaryBtn}>
            Resend email
          </button>
          <button onClick={() => run(async () => { await signOut(); onUserChanged(null); })} className={`text-sm ${muted}`}>
            Use a different account
          </button>
        </div>
      );
    }

    if (!task) {
      return (
        <div className="space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center text-on-accent font-bold" style={{ backgroundColor: 'var(--theme-primary)' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{user.name}</p>
              <p className={`text-sm truncate ${muted}`}>{user.email}</p>
            </div>
          </div>
          <p className={`text-sm ${muted}`}>Invites people send you appear in Notifications (the bell at the top), where you can accept or decline them.</p>
          <button onClick={() => run(async () => { await signOut(); onUserChanged(null); })} className={secondaryBtn}>
            Sign out
          </button>
        </div>
      );
    }

    if (result) {
      const who = result.recipientName || result.invite.toEmail;
      return (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}>{result.recipientHasApp ? <Icons.CheckCircle size={30} /> : <Icons.Send size={28} />}</div>
          {result.recipientHasApp ? (
            <>
              <p className="font-semibold">Invite sent to {who}</p>
              <p className={`text-sm ${muted}`}>It's waiting in their MentaList Notifications, where they can accept or decline. You'll be notified when they reply.</p>
            </>
          ) : (
            <>
              <p className="font-semibold">{result.invite.toEmail} doesn't have MentaList yet</p>
              <p className={`text-sm ${muted}`}>Your invite is saved. Send them a message with the download link; once they create an account with this email, the invite appears in their Notifications.</p>
            </>
          )}
          <button onClick={() => sendInviteMessage(result)} className={primaryBtn} style={{ backgroundColor: 'var(--theme-primary)' }}>
            {result.recipientHasApp ? 'Also send them a message' : 'Send download link & invite'}
          </button>
          <button onClick={() => { setResult(null); setInviteEmail(''); setInfo(null); }} className={secondaryBtn}>
            Invite someone else
          </button>
        </div>
      );
    }

    const collaborators = task.sharedWith;
    return (
      <div className="space-y-4">
        <p className={`text-sm ${muted}`}>Collaborators can add, edit, complete and delete this task and its subtasks. Attachments stay on your device.</p>

        {(collaborators.length > 0 || pendingEmails.length > 0) && (
          <div className="space-y-2">
            {collaborators.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <img src={c.avatar} alt="" className="w-8 h-8 rounded-full" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className={`text-xs truncate ${muted}`}>{c.email}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-500">Joined</span>
              </div>
            ))}
            {pendingEmails.map(e => (
              <div key={e} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}><Icons.Clock size={16} /></div>
                <p className="text-sm truncate flex-1">{e}</p>
                <span className={`text-xs font-semibold ${muted}`}>Invited</span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <label className={`text-[13px] font-semibold ${muted}`}>Their email</label>
          <input
            className={field}
            type="email"
            inputMode="email"
            autoCapitalize="none"
            placeholder="friend@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleInvite(); }}
          />
        </div>
        <button
          onClick={handleInvite}
          disabled={busy || pendingEmails.includes(normalizeEmail(inviteEmail))}
          className={primaryBtn}
          style={{ backgroundColor: 'var(--theme-primary)' }}
        >
          {busy ? 'Sending…' : 'Send invite'}
        </button>
        <p className={`text-xs text-center ${muted}`}>Signed in as {user.email}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={onClose} style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div
        className={`w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto ${surface}`}
        style={{ animation: 'scaleIn 0.25s ease-out', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--theme-secondary)', color: 'var(--theme-primary)' }}><Icons.Users size={20} /></div>
            <div className="min-w-0">
              <h2 className="font-bold text-lg leading-tight">{task ? 'Invite to collaborate' : 'Account'}</h2>
              {task && <p className={`text-sm truncate ${muted}`}>{task.title}</p>}
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-lg ${muted}`} aria-label="Close"><Icons.X /></button>
        </div>
        <div className="p-5">
          {renderBody()}
          {error && <p className="mt-4 text-sm text-red-500 text-center">{error}</p>}
          {info && <p className="mt-4 text-sm text-emerald-500 text-center">{info}</p>}
        </div>
      </div>
    </div>
  );
};
