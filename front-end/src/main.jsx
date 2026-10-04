import { Suspense, lazy, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LazyMotion, domAnimation } from 'motion/react';
import { request, setCsrf } from './services/api';
import Landing from './pages/Landing';
const Community = lazy(() => import('./pages/Community'));
import Icon from './components/Icon';
import Avatar from './components/Avatar';
import './styles/global.css';
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Upload = lazy(() => import('./pages/Upload'));
const Theme = lazy(() => import('./pages/Theme'));
const Admin = lazy(() => import('./pages/Admin'));
const route = () => location.hash.slice(2) || 'home';
function App() {
  const [page, setPage] = useState(route),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [configured, setConfigured] = useState(true),
    [authError, setAuthError] = useState('');
  useEffect(() => {
    const listener = () => {
      setPage(route());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  async function refreshUser() {
    try {
      const session = await request('session');
      setUser(session.user);
      setCsrf(session.csrf);
      setConfigured(session.configured);
      setAuthError('');
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    void refreshUser();
  }, []);
  function navigate(next) {
    location.hash = '/' + next;
  }
  async function logout() {
    try {
      await request('logout', { method: 'POST' });
      setUser(null);
      setCsrf('');
      navigate('home');
    } catch (error) {
      setAuthError(error.message);
    }
  }
  const context = { user, ready, configured, navigate, refreshUser, setUser };
  const current = page.split('/')[0];
  return (
    <LazyMotion features={domAnimation}>
      <div className="site-shell">
        <header className="site-header">
          <a className="brand" href="#/home">
            <img src="/brand.ico" width="30" height="30" alt="" />
            codexskin<span> / community</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="#/community" aria-current={current === 'community' ? 'page' : undefined}>
              Explore themes
            </a>
            <a href="#/upload" aria-current={current === 'upload' ? 'page' : undefined}>
              Share a theme
            </a>
            {user?.role === 'ADMIN' && <a href="#/admin">Dashboard</a>}
          </nav>
          <div className="account-nav">
            {user ? (
              <>
                <Avatar user={user} viewerId={user.id} size={36} />
                <a href="#/profile" className="profile-link">
                  {user.name}
                </a>
                <button className="text-button" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <a href="#/login">Sign in</a>
                <a className="button small primary" href="#/signup">
                  Join the community <Icon name="ArrowRight" size={16} />
                </a>
              </>
            )}
          </div>
        </header>
        {authError && (
          <div className="notice error" role="alert">
            {authError}
            <button onClick={refreshUser}>Retry</button>
          </div>
        )}
        <main>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                Opening your space…
              </div>
            }
          >
            {current === 'home' ? (
              <Landing {...context} />
            ) : current === 'community' ? (
              <Community {...context} />
            ) : ['login', 'signup'].includes(current) ? (
              <Auth {...context} signup={current === 'signup'} />
            ) : current === 'profile' ? (
              <Profile {...context} />
            ) : current === 'upload' ? (
              <Upload {...context} />
            ) : current === 'theme' ? (
              <Theme key={page} {...context} id={page.split('/')[1]} />
            ) : current === 'admin' ? (
              <Admin {...context} />
            ) : (
              <section className="empty-state">
                <h1>That page wandered off.</h1>
                <a className="button primary" href="#/home">
                  Back home
                </a>
              </section>
            )}
          </Suspense>
        </main>
        <footer className="site-footer">
          <a className="brand" href="#/home">
            codexskin<span> / community</span>
          </a>
          <p>Made by people who make their workspace their own.</p>
          <span>Unofficial. Not affiliated with OpenAI.</span>
        </footer>
      </div>
    </LazyMotion>
  );
}
createRoot(document.getElementById('root')).render(<App />);
