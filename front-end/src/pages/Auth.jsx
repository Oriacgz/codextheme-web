import { useEffect, useState } from 'react';
import { request, setCsrf } from '../services/api';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
export default function Auth({ signup, user, configured, navigate, setUser }) {
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    setError('');
  }, [signup]);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const input = Object.fromEntries(new FormData(event.currentTarget));
      const result = await request(signup ? 'signup' : 'login', { method: 'POST', body: input });
      setCsrf(result.csrf);
      setUser(result.user);
      navigate(signup ? 'profile' : 'community');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (user)
    return (
      <section className="empty-state">
        <h1>You’re already home.</h1>
        <a className="button primary" href="#/community">
          Explore themes
        </a>
      </section>
    );
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">A LITTLE MORE YOU</p>
        <h1>
          Good things start
          <br />
          <em>with showing up.</em>
        </h1>
        <p>A place for your ideas, your workspaces, and your very own little companion.</p>
        <div className="auth-creatures">
          {[4, 11, 19].map((avatar) => (
            <Avatar key={avatar} user={{ avatar, name: 'your future companion' }} size={110} />
          ))}
        </div>
        <span>Tap a face. Say hello.</span>
      </div>
      <div className="auth-panel">
        <p className="eyebrow">{signup ? 'MAKE YOURSELF AT HOME' : 'WELCOME BACK'}</p>
        <h2>{signup ? 'Join the community.' : 'Your space is waiting.'}</h2>
        <p>
          {signup
            ? 'Create an account to share, react, and join the conversation.'
            : 'Sign in to pick up where you left off.'}
        </p>
        {!configured && (
          <div className="notice" role="status">
            The community is being set up. Accounts open after Prisma Postgres is connected.
          </div>
        )}
        <form onSubmit={submit} className="stack-form">
          {signup && (
            <label>
              Your name
              <input
                name="name"
                required
                minLength={2}
                maxLength={40}
                autoComplete="nickname"
                placeholder="What should we call you?"
              />
            </label>
          )}
          <label>
            Email address
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              maxLength={254}
            />
          </label>
          <label>
            Password
            <div className="password-field">
              <input
                aria-label="Password"
                name="password"
                type={visible ? 'text' : 'password'}
                required
                minLength={12}
                maxLength={128}
                autoComplete={signup ? 'new-password' : 'current-password'}
                placeholder="At least 12 characters"
              />
              <button
                type="button"
                onClick={() => setVisible((x) => !x)}
                aria-label={visible ? 'Hide password' : 'Show password'}
              >
                {visible ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary wide" disabled={busy || !configured}>
            {busy ? 'One moment…' : signup ? 'Create your account' : 'Sign in'}
            <Icon name="ArrowRight" />
          </button>
        </form>
        <p className="auth-switch">
          {signup ? 'Already part of the community?' : 'New around here?'}{' '}
          <a href={signup ? '#/login' : '#/signup'}>{signup ? 'Sign in' : 'Create an account'}</a>
        </p>
        <small>Your password is protected. Your avatar is yours to choose.</small>
      </div>
    </section>
  );
}
