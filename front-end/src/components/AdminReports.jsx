import { reportResponse } from "../services/reports";
import AdminTrend, { calendarSeries } from "./AdminTrend";
import { useEffect, useState } from "react";
import { request } from "../services/api";
export default function AdminReports() {
  const [reports, setReports] = useState(null),
    [resolved, setResolved] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(null),
    [summary, setSummary] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    setError("");
    setReports(null);
    setSummary(null);
    request("admin/reports&resolved=" + Number(resolved), { signal: c.signal })
      .then((r) => {
        const result = reportResponse(r);
        setReports(result.reports);
        setSummary(result.summary);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [resolved]);
  async function toggle(r) {
    if (busy) return;
    setBusy(r.id);
    try {
      await request("admin/reports/" + r.id, {
        method: "PATCH",
        body: { resolved: !r.resolved },
      });
      setReports((v) => v.filter((t) => t.id !== r.id));
      setSummary((v) =>
        v
          ? {
              ...v,
              stats: {
                open: v.stats.open + (r.resolved ? 1 : -1),
                closed: v.stats.closed + (r.resolved ? -1 : 1),
              },
            }
          : null,
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  }
  return (
    <section>
      <div className="admin-list-heading">
        <div>
          <h2>Community reports</h2>
          <p>Review concerns and keep the collection welcoming.</p>
        </div>
        <div className="report-filters">
          <button
            disabled={!!busy}
            className={!resolved ? "selected" : ""}
            onClick={() => setResolved(false)}
          >
            Needs review
          </button>
          <button
            disabled={!!busy}
            className={resolved ? "selected" : ""}
            onClick={() => setResolved(true)}
          >
            Resolved
          </button>
        </div>
      </div>
      {reports && !summary && (
        <p className="notice" role="status">
          Reports are available, but activity summaries need the updated
          backend. Restart your local backend or redeploy Render.
        </p>
      )}
      {summary && (
        <>
          <div className="admin-stats">
            <div>
              <span>Needs review</span>
              <strong>{summary.stats.open}</strong>
            </div>
            <div>
              <span>Resolved</span>
              <strong>{summary.stats.closed}</strong>
            </div>
            <div>
              <span>Resolution rate</span>
              <strong>
                {summary.stats.open + summary.stats.closed
                  ? Math.round(
                      (summary.stats.closed /
                        (summary.stats.open + summary.stats.closed)) *
                        100,
                    )
                  : 0}
                %
              </strong>
            </div>
          </div>
          <div className="dashboard-panel">
            <h3>Reports received · last 7 days</h3>
            <AdminTrend
              rows={calendarSeries(
                7,
                [...new Set(summary.daily)].map((day) => ({
                  day,
                  reports: summary.daily.filter((d) => d === day).length,
                })),
              )}
              series={[
                { key: "reports", label: "New reports", color: "#b3814c" },
              ]}
              label="Reports received over the last seven days in UTC"
            />
            {summary.limited && <p>Chart capped at 10,000 recent reports.</p>}
          </div>
        </>
      )}
      {error && <p role="alert">{error}</p>}
      {!reports && error ? null : !reports ? (
        <p>Loading reports…</p>
      ) : (
        <div className="admin-list report-list">
          {!reports.length && (
            <div className="dashboard-empty">
              <h3>
                {resolved ? "No resolved reports" : "You’re all caught up"}
              </h3>
              <p>
                {resolved
                  ? "Resolved reports will appear here."
                  : "There are no reports waiting for review."}
              </p>
            </div>
          )}
          {reports.map((r) => (
            <article key={r.id}>
              <div className="admin-row-copy">
                <strong>{r.themeName || "Reported theme"}</strong>
                <span className="status-pill">
                  {r.resolved ? "Resolved" : "Needs review"}
                </span>
                <time>{new Date(r.createdAt).toLocaleString()}</time>
                <p>{r.reason}</p>
                <span>Reported by {r.reporter || "Community member"}</span>
              </div>
              <div className="admin-actions">
                <a href={"#/theme/" + r.themeId}>Review theme</a>
                <button disabled={!!busy} onClick={() => toggle(r)}>
                  {r.resolved ? "Reopen" : "Resolve"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
