import AdminReports from "../components/AdminReports";
import AdminAudit from "../components/AdminAudit";
import AdminAnalytics from "../components/AdminAnalytics";
import AdminAccess from "../components/AdminAccess";
import { useEffect, useState } from "react";
import { request, imageUrl } from "../services/api";
import Avatar from "../components/Avatar";
export default function Admin({ user, ready, refreshUser }) {
  const [tab, setTab] = useState("Overview"),
    [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [memberAction, setMemberAction] = useState(null),
    [page, setPage] = useState(0),
    [search, setSearch] = useState("");
  useEffect(() => {
    if (user?.role !== "ADMIN" || user.mustChangePassword) return;
    if (!["Overview", "Themes", "Members", "Comments"].includes(tab)) return;
    const controller = new AbortController();
    setError("");
    setData(null);
    request(
      "admin&section=" +
        (tab === "Overview" ? "stats" : tab.toLowerCase()) +
        "&page=" +
        page +
        "&search=" +
        encodeURIComponent(search),
      {
        signal: controller.signal,
      },
    )
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [user?.role, user?.mustChangePassword, refresh, page, search, tab]);
  async function update(route, body) {
    setBusy(true);
    setError("");
    try {
      await request(route, { method: "PATCH", body });
      setRefresh((x) => x + 1);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="page-loading">Opening dashboard…</div>;
  if (user?.role !== "ADMIN")
    return (
      <section className="empty-state">
        <p className="eyebrow">COMMUNITY CARE</p>
        <h1>Admins only.</h1>
        <p>
          This dashboard is available to authorized community administrators.
        </p>
        <a className="button primary" href={user ? "#/community" : "#/login"}>
          {user ? "Back to the community" : "Sign in"}
        </a>
      </section>
    );
  return (
    <section className="content-page admin-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COMMUNITY CARE / ADMIN</p>
          <h1>Keep this a good place.</h1>
          <p>
            Uploads publish immediately after validation. Moderation stays in
            your hands.
          </p>
        </div>
        <button className="button" onClick={() => setRefresh((x) => x + 1)}>
          Refresh dashboard
        </button>
      </div>
      {memberAction && (
        <form
          className="stack-form admin-access-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const values = Object.fromEntries(
              new FormData(event.currentTarget),
            );
            const success = await update("admin/users/" + memberAction.id, {
              ...values,
              suspended: !memberAction.suspended,
            });
            if (success) setMemberAction(null);
          }}
        >
          <h2>
            {memberAction.suspended ? "Restore" : "Suspend"} {memberAction.name}
          </h2>
          <label>
            Your password
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </label>
          <label>
            Reason
            <input name="reason" required minLength={3} maxLength={300} />
          </label>
          <div className="form-actions">
            <button
              className="button"
              type="button"
              onClick={() => setMemberAction(null)}
            >
              Cancel
            </button>
            <button className="button primary" disabled={busy}>
              Confirm
            </button>
          </div>
        </form>
      )}
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {!user.mustChangePassword && (
        <>
          <div className="admin-tabs" role="tablist">
            {[
              "Overview",
              "Themes",
              "Members",
              "Comments",
              "Administrators",
              "Audit log",
              "Reports",
            ].map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => {
                  setPage(0);
                  setTab(t);
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}
      {user.mustChangePassword || tab === "Administrators" ? (
        <AdminAccess user={user} onChanged={refreshUser} />
      ) : tab === "Reports" ? (
        <AdminReports />
      ) : tab === "Audit log" ? (
        <AdminAudit />
      ) : tab === "Overview" ? (
        <AdminAnalytics stats={data?.stats} refresh={refresh} />
      ) : !data ? (
        <div className="page-loading">Loading community activity…</div>
      ) : (
        <>
          <form
            className="admin-search"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
              setSearch(new FormData(event.currentTarget).get("search").trim());
            }}
          >
            <label>
              Search members, themes or comments
              <input
                name="search"
                type="search"
                maxLength={80}
                placeholder="Search the community"
              />
            </label>
            <button className="button">Search</button>
          </form>
          <div className="admin-pagination" aria-label="Management pagination">
            <button
              className="button"
              disabled={!page}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              className="button"
              disabled={
                (tab === "Themes"
                  ? data.themes
                  : tab === "Members"
                    ? data.users
                    : data.comments
                ).length < 50
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <section className="admin-list" role="tabpanel" aria-label={tab}>
            <div className="admin-list-heading">
              <h2>
                {tab === "Themes"
                  ? "Recent themes"
                  : tab === "Members"
                    ? "Community members"
                    : "Recent conversations"}
              </h2>
              <span>Most recent 50 entries</span>
            </div>
            {tab === "Themes"
              ? data.themes.map((t) => (
                  <article key={t.id}>
                    <img
                      loading="lazy"
                      decoding="async"
                      className="admin-thumbnail"
                      src={imageUrl(t.id)}
                      alt=""
                    />
                    <div className="admin-row-copy">
                      <strong>{t.name}</strong>
                      <span>
                        {t.author.name} · {t.category} ·{" "}
                        {t.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="admin-actions">
                      <button
                        disabled={busy}
                        onClick={() =>
                          update("admin/themes/" + t.id, {
                            featured: !t.featured,
                          })
                        }
                      >
                        {t.featured ? "Unfeature" : "Feature"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          update("admin/themes/" + t.id, {
                            status:
                              t.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED",
                          })
                        }
                      >
                        {t.status === "PUBLISHED" ? "Hide" : "Restore"}
                      </button>
                      <a href={"#/theme/" + t.id}>View ↗</a>
                    </div>
                  </article>
                ))
              : tab === "Members"
                ? data.users.map((member) => (
                    <article key={member.id}>
                      <Avatar user={member} viewerId={user.id} />
                      <div className="admin-row-copy">
                        <strong>{member.name}</strong>
                        <span>
                          {member.email} · {member.role.toLowerCase()}
                          {member.suspended ? " · suspended" : ""}
                        </span>
                      </div>
                      <div className="admin-actions">
                        <button
                          disabled={busy || member.id === user.id}
                          onClick={() => setMemberAction(member)}
                        >
                          {member.suspended ? "Restore access" : "Suspend"}
                        </button>
                      </div>
                    </article>
                  ))
                : data.comments.map((c) => (
                    <article key={c.id}>
                      <Avatar user={c.author} viewerId={user.id} />
                      <div className="admin-row-copy">
                        <strong>
                          {c.author.name} <span>on {c.theme.name}</span>
                        </strong>
                        <p>{c.body}</p>
                        {c.hidden && <span>Hidden from public view</span>}
                      </div>
                      <div className="admin-actions">
                        <button
                          disabled={busy}
                          onClick={() =>
                            update("comments/" + c.id, { hidden: !c.hidden })
                          }
                        >
                          {c.hidden ? "Restore" : "Hide"}
                        </button>
                      </div>
                    </article>
                  ))}
            {!(
              tab === "Themes"
                ? data.themes
                : tab === "Members"
                  ? data.users
                  : data.comments
            ).length && (
              <p className="quiet-empty">Nothing to review here yet.</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}
