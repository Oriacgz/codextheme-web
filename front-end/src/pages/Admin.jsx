import { useEffect, useState } from 'react';
import { request, imageUrl } from '../services/api';
import Avatar from '../components/Avatar';
export default function Admin({ user, ready }) {
  const [tab, setTab] = useState('Themes'),
    [data, setData] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const controller = new AbortController();
    request('admin', { signal: controller.signal })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [user?.role, refresh]);
  async function update(route, body) {
    setBusy(true);
    setError('');
    try {
      await request(route, { method: 'PATCH', body });
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready) return <div className="page-loading">Opening dashboard…</div>;
  if (user?.role !== 'ADMIN')
    return (
      <section className="empty-state">
        <p className="eyebrow">COMMUNITY CARE</p>
        <h1>Admins only.</h1>
        <p>This dashboard is available to authorized community administrators.</p>
        <a className="button primary" href={user ? '#/community' : '#/login'}>
          {user ? 'Back to the community' : 'Sign in'}
        </a>
      </section>
    );
  return (
    <section className="content-page admin-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">COMMUNITY CARE / ADMIN</p>
          <h1>Keep this a good place.</h1>
          <p>Uploads publish immediately after validation. Moderation stays in your hands.</p>
        </div>
        <button className="button" onClick={() => setRefresh((x) => x + 1)}>
          Refresh dashboard
        </button>
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {!data ? (
        <div className="page-loading">Loading community activity…</div>
      ) : (
        <>
          <div className="admin-stats">
            {[
              ['Members', data.stats.users],
              ['Themes', data.stats.themes],
              ['Public themes', data.stats.published],
              ['Comments', data.stats.comments],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="admin-tabs" role="tablist">
            {['Themes', 'Members', 'Comments'].map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>
          <section className="admin-list" role="tabpanel" aria-label={tab}>
            <div className="admin-list-heading">
              <h2>
                {tab === 'Themes'
                  ? 'Recent themes'
                  : tab === 'Members'
                    ? 'Community members'
                    : 'Recent conversations'}
              </h2>
              <span>Most recent 50 entries</span>
            </div>
            {tab === 'Themes'
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
                        {t.author.name} · {t.category} · {t.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="admin-actions">
                      <button
                        disabled={busy}
                        onClick={() => update('admin/themes/' + t.id, { featured: !t.featured })}
                      >
                        {t.featured ? 'Unfeature' : 'Feature'}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() =>
                          update('admin/themes/' + t.id, {
                            status: t.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED',
                          })
                        }
                      >
                        {t.status === 'PUBLISHED' ? 'Hide' : 'Restore'}
                      </button>
                      <a href={'#/theme/' + t.id}>View ↗</a>
                    </div>
                  </article>
                ))
              : tab === 'Members'
                ? data.users.map((member) => (
                    <article key={member.id}>
                      <Avatar user={member} viewerId={user.id} />
                      <div className="admin-row-copy">
                        <strong>{member.name}</strong>
                        <span>
                          {member.email} · {member.role.toLowerCase()}
                          {member.suspended ? ' · suspended' : ''}
                        </span>
                      </div>
                      <div className="admin-actions">
                        <button
                          disabled={busy || member.id === user.id}
                          onClick={() =>
                            update('admin/users/' + member.id, { suspended: !member.suspended })
                          }
                        >
                          {member.suspended ? 'Restore access' : 'Suspend'}
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
                          onClick={() => update('comments/' + c.id, { hidden: !c.hidden })}
                        >
                          {c.hidden ? 'Restore' : 'Hide'}
                        </button>
                      </div>
                    </article>
                  ))}
            {!(tab === 'Themes' ? data.themes : tab === 'Members' ? data.users : data.comments)
              .length && <p className="quiet-empty">Nothing to review here yet.</p>}
          </section>
        </>
      )}
    </section>
  );
}
