import ReportTheme from "../components/ReportTheme";
import { activityVisitor } from "../services/activity";
import EditThemeButton from "../components/EditThemeButton";
import DeleteThemeButton from "../components/DeleteThemeButton";
import { applyVote } from "../services/votes";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import ThemePreview from "../components/ThemePreview";
import { useEffect, useRef, useState } from "react";
import { request, imageUrl, downloadUrl } from "../services/api";
import Avatar from "../components/Avatar";
import Icon from "../components/Icon";
export default function Theme({ id, user, navigate }) {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [comment, setComment] = useState(""),
    [refresh, setRefresh] = useState(0);
  const mutation = useRef(null);
  const tracked = useRef(null);
  useEffect(() => () => mutation.current?.abort(), []);
  useEffect(() => {
    setData(null);
    setError("");
  }, [id]);
  useEffect(() => {
    const controller = new AbortController();
    request("themes/" + id, { signal: controller.signal })
      .then((result) => {
        setData(result);
        if (
          !controller.signal.aborted &&
          document.visibilityState === "visible" &&
          tracked.current !== id && user?.role !== "ADMIN"
        ) {
          tracked.current = id;
          void request("themes/" + id + "/view", {
            method: "POST",
            body: { visitor: activityVisitor },
            signal: controller.signal,
          }).catch(() => {
            if (!controller.signal.aborted) tracked.current = null;
          });
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [id, refresh]);
  async function mutate(route, body, method = "POST") {
    if (!user) {
      navigate("login");
      return;
    }
    if (mutation.current) return;
    const controller = new AbortController();
    mutation.current = controller;
    const voting = route.endsWith("/vote"),
      previous = data.theme;
    setBusy(true);
    setError("");
    if (voting)
      setData((current) => ({
        ...current,
        theme: applyVote(current.theme, body.value),
      }));
    try {
      const result = await request(route, {
        method,
        body,
        signal: controller.signal,
      });
      if (voting)
        setData((current) => ({
          ...current,
          theme: { ...current.theme, ...result },
        }));
      else {
        if (method === "POST" && route.endsWith("/comments")) setComment("");
        setRefresh((n) => n + 1);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        if (voting) setData((current) => ({ ...current, theme: previous }));
        setError(error.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        mutation.current = null;
        setBusy(false);
      }
    }
  }

  if (!data)
    return (
      <section className="content-page">
        <div className="notice" role={error ? "alert" : "status"}>
          {error || "Opening this theme…"}
        </div>
        <a href="#/community">← Back to the collection</a>
      </section>
    );
  const { theme, comments } = data;
  return (
    <section className="content-page theme-detail">
      <a className="back-link" href="#/community">
        ← All themes
      </a>
      <header className="theme-detail-heading">
        <div>
          <p className="eyebrow">
            {(theme.categories || [theme.category]).join(" · ")} / COMMUNITY
            THEME
          </p>
          <h1>{theme.name}</h1>
          <div className="author">
            <Avatar user={theme.author} viewerId={user?.id} size={38} />
            <div>
              <strong>{theme.author.name}</strong>
              <span>
                Shared{" "}
                {new Date(theme.createdAt).toLocaleDateString(undefined, {
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
        <a className="button primary" href={downloadUrl(id)}>
          <Icon name="Download" />
          Download theme <small>{(theme.size / 1048576).toFixed(2)} MiB</small>
        </a>
      </header>
      <div className="theme-preview-layout">
        <div className="detail-image">
          <ThemePreview theme={theme.preview} image={imageUrl(id)} />
          <div className="preview-caption">
            <span>
              <i />
              Live appearance preview
            </span>
            <span>Rendered from this theme’s saved settings</span>
          </div>
        </div>
        <div className="theme-preview-sidebar">
          <aside className="theme-install">
            <h3>Bring it to your workspace</h3>
            <ol>
              <li>Download the theme package.</li>
              <li>Open codexskin and choose Import theme.</li>
              <li>Select the downloaded file and apply it.</li>
            </ol>
            <dl>
              <div>
                <dt>Artwork usage</dt>
                <dd>{theme.license}</dd>
              </div>
              <div>
                <dt>Package size</dt>
                <dd>{(theme.size / 1048576).toFixed(2)} MiB</dd>
              </div>
            </dl>
            <p>Keep the artwork credits with your download.</p>
          </aside>
          <section className="theme-about">
            <p className="eyebrow">THE STORY</p>
            <h2>About this theme</h2>
            <p className="detail-description">{theme.description}</p>
            <div className="vote-controls" aria-label="Theme feedback">
              <button
                disabled={busy}
                aria-pressed={theme.vote === 1}
                className={theme.vote === 1 ? "active" : ""}
                onClick={() =>
                  mutate(`themes/${id}/vote`, {
                    value: theme.vote === 1 ? 0 : 1,
                  })
                }
              >
                <ThumbsUp size={17} aria-hidden="true" />
                Like <strong>{theme.likes}</strong>
              </button>
              <button
                disabled={busy}
                aria-pressed={theme.vote === -1}
                className={theme.vote === -1 ? "active" : ""}
                onClick={() =>
                  mutate(`themes/${id}/vote`, {
                    value: theme.vote === -1 ? 0 : -1,
                  })
                }
              >
                <ThumbsDown size={17} aria-hidden="true" />
                Dislike <strong>{theme.dislikes}</strong>
              </button>
              <span>
                {theme.comments} {theme.comments === 1 ? "comment" : "comments"}
              </span>
            </div>
          </section>
        </div>
      </div>

      {user?.id === theme.author.id && (
        <EditThemeButton
          theme={theme}
          onEdited={(updated) =>
            setData((current) => ({
              ...current,
              theme: { ...current.theme, ...updated },
            }))
          }
        />
      )}
      {user?.id === theme.author.id && (
        <DeleteThemeButton
          theme={theme}
          onDeleted={() => navigate("community")}
        />
      )}
      <ReportTheme id={id} user={user} />
      <section className="comments-section">
        <div className="section-label">
          <div>
            <p className="eyebrow">COMMUNITY FEEDBACK</p>
            <h2>Join the conversation.</h2>
          </div>
          <span>
            {theme.comments} {theme.comments === 1 ? "comment" : "comments"}
          </span>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {user ? (
          <form
            className="comment-form"
            onSubmit={(e) => {
              e.preventDefault();
              mutate(`themes/${id}/comments`, { body: comment });
            }}
          >
            <Avatar user={user} viewerId={user.id} size={42} />
            <div>
              <textarea
                aria-label="Your comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share a thought. Keep it thoughtful."
                required
                maxLength={1000}
                rows={3}
              />
              <div>
                <span>{comment.length}/1000</span>
                <button
                  className="button primary small"
                  disabled={busy || !comment.trim()}
                >
                  Post comment
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="comment-signin">
            <p>The conversation’s better with you in it.</p>
            <a className="button small" href="#/login">
              Sign in to comment
            </a>
          </div>
        )}
        <div className="comment-list">
          {comments.map((c) => (
            <article key={c.id}>
              <Avatar user={c.author} viewerId={user?.id} size={42} />
              <div>
                <div className="comment-heading">
                  <strong>{c.author.name}</strong>
                  <time>{new Date(c.createdAt).toLocaleDateString()}</time>
                  {user &&
                    (c.author.id === user.id || user.role === "ADMIN") && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() =>
                          mutate("comments/" + c.id, { hidden: true }, "PATCH")
                        }
                      >
                        Remove
                      </button>
                    )}
                </div>
                <p>{c.body}</p>
              </div>
            </article>
          ))}
          {!comments.length && (
            <p className="quiet-empty">
              No comments yet. A kind word is a good start.
            </p>
          )}
        </div>
      </section>
    </section>
  );
}
