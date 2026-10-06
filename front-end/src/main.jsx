import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useTransition,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import { LazyMotion, domAnimation } from "motion/react";
import { request, setCsrf } from "./services/api";
import Landing from "./pages/Landing";
import FloatingScrollbar from "./components/FloatingScrollbar";
import { pageLoaders, preloadLink } from "./services/navigation";
const Community = lazy(pageLoaders.community);
import Icon from "./components/Icon";
import Avatar from "./components/Avatar";
import "./styles/global.css";
const Auth = lazy(pageLoaders.login);
const Profile = lazy(pageLoaders.profile);
const Upload = lazy(pageLoaders.upload);
const Theme = lazy(pageLoaders.theme);
const Admin = lazy(pageLoaders.admin);
const DownloadApp = lazy(pageLoaders.download);
const route = () => location.hash.slice(2) || "home";
function App() {
  const [pending, startTransition] = useTransition();
  const [page, setPage] = useState(route),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(false),
    [configured, setConfigured] = useState(true),
    [authError, setAuthError] = useState("");
  useEffect(() => {
    const listener = () => {
      startTransition(() => setPage(route()));
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  async function refreshUser() {
    try {
      const session = await request("session");
      setUser(session.user);
      setCsrf(session.csrf);
      setConfigured(session.configured);
      setAuthError("");
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
    location.hash = "/" + next;
  }
  async function logout() {
    try {
      await request("logout", { method: "POST" });
      setUser(null);
      setCsrf("");
      navigate("home");
    } catch (error) {
      setAuthError(error.message);
    }
  }
  const context = { user, ready, configured, navigate, refreshUser, setUser };
  const current = page.split("/")[0];
  return (
    <LazyMotion features={domAnimation}>
      <div
        className="site-shell"
        onPointerOver={preloadLink}
        onFocus={preloadLink}
      >
        <header className="site-header">
          <a className="brand" href="#/home">
            <img src="/brand.ico" width="30" height="30" alt="" />
            codexskin<span> / community</span>
          </a>
          <nav aria-label="Main navigation">
            <a
              href="#/community"
              aria-current={current === "community" ? "page" : undefined}
            >
              Explore themes
            </a>
            <a
              href="#/upload"
              aria-current={current === "upload" ? "page" : undefined}
            >
              Share a theme
            </a>
            <a
              href="#/download"
              aria-current={current === "download" ? "page" : undefined}
            >
              Download App
            </a>
            {user?.role === "ADMIN" && <a href="#/admin">Dashboard</a>}
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
        <main id="page-content" aria-busy={pending}>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                Opening your space…
              </div>
            }
          >
            {current === "home" ? (
              <Landing {...context} />
            ) : current === "community" ? (
              <Community {...context} />
            ) : ["login", "signup"].includes(current) ? (
              <Auth {...context} signup={current === "signup"} />
            ) : current === "profile" ? (
              <Profile {...context} />
            ) : current === "upload" ? (
              <Upload {...context} />
            ) : current === "theme" ? (
              <Theme key={page} {...context} id={page.split("/")[1]} />
            ) : current === "download" ? (
              <DownloadApp />
            ) : current === "admin" ? (
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
        <FloatingScrollbar />
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
createRoot(document.getElementById("root")).render(<App />);
