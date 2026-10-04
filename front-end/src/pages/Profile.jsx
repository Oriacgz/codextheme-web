import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import ThemeCard from "../components/ThemeCard";
import { request } from "../services/api";
import {
  initialAvatarChoices,
  shuffleAvatarChoices,
} from "../services/avatars";
export default function Profile({ user, ready, setUser, navigate }) {
  const [name, setName] = useState(user?.name || ""),
    [avatar, setAvatar] = useState(user?.avatar || 0),
    [themes, setThemes] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [choices, setChoices] = useState(() =>
      initialAvatarChoices(user?.avatar || 0),
    ),
    [shuffleCount, setShuffleCount] = useState(0);
  function shuffle() {
    setChoices((previous) => shuffleAvatarChoices(avatar, previous));
    setShuffleCount((count) => count + 1);
  }
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setName(user.name);
    setAvatar(user.avatar);
    setChoices(initialAvatarChoices(user.avatar));
    setShuffleCount(0);
    request("themes&mine=1", { signal: controller.signal })
      .then((data) => setThemes(data.themes))
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [user?.id]);

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const data = await request("profile", {
        method: "PATCH",
        body: { name, avatar },
      });
      setUser(data.user);
      setNotice("Saved. Looking like yourself.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="page-loading">Opening your profile…</div>;
  if (!user)
    return (
      <section className="empty-state">
        <h1>A space of your own.</h1>
        <p>Sign in to choose your avatar and manage your profile.</p>
        <a className="button primary" href="#/login">
          Sign in
        </a>
      </section>
    );
  return (
    <section className="content-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR CORNER OF THE COMMUNITY</p>
          <h1>Make yourself recognizable.</h1>
          <p>A little face with a lot of character.</p>
        </div>
      </div>
      <div className="profile-layout">
        <aside className="profile-summary">
          <Avatar
            user={{ ...user, avatar, name }}
            viewerId={user.id}
            size={132}
          />
          <h2>{name}</h2>
          <p>{user.email}</p>
          <span>Watches your cursor. Reacts to a hello.</span>
        </aside>
        <form className="profile-settings stack-form" onSubmit={save}>
          <div>
            <p className="eyebrow">THE BASICS</p>
            <h2>Your profile</h2>
            <label>
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={40}
              />
            </label>
          </div>
          <div className="avatar-selector">
            <div className="avatar-picker-heading">
              <h3>Pick your Blobatar</h3>
              <button
                type="button"
                className="button small"
                onClick={shuffle}
                disabled={busy}
                aria-label="Shuffle avatar choices"
              >
                Shuffle ↻
              </button>
            </div>
            <p>Six columns. Four rows. Shuffle to meet more personalities.</p>
            <div className="avatar-grid" aria-label="Choose your avatar">
              {choices.map((seed, index) => (
                <Avatar
                  key={seed}
                  user={{ avatar: seed }}
                  choice
                  choiceLabel={`Choose avatar ${index + 1}`}
                  selected={avatar === seed}
                  size={54}
                  onChoose={() => {
                    setAvatar(seed);
                    setNotice("");
                  }}
                />
              ))}
            </div>
            <p className="avatar-shuffle-status" role="status">
              {shuffleCount
                ? "Fresh choices ready. Your selected avatar stays until you choose another."
                : "Choose a face, then save your profile."}
            </p>
          </div>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
            </div>
          )}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </button>
            <span>Your choice follows you across the community.</span>
          </div>
        </form>
      </div>
      <section className="profile-uploads">
        <div className="section-label">
          <h2>Your contributions</h2>
          <a href="#/upload" className="text-link">
            Share another theme ↗
          </a>
        </div>
        {themes.length ? (
          <div className="theme-grid">
            {themes.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                viewerId={user.id}
                navigate={navigate}
                onDeleted={(id) =>
                  setThemes((current) =>
                    current.filter((theme) => theme.id !== id),
                  )
                }
              />
            ))}
          </div>
        ) : (
          <div className="quiet-empty">
            Your first theme has a place here.{" "}
            <a href="#/upload">Share it with the community.</a>
          </div>
        )}
      </section>
    </section>
  );
}
