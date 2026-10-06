import AdminTrend, { calendarSeries } from "./AdminTrend";
import { useEffect, useState } from "react";
import { request } from "../services/api";
export default function AdminAnalytics({ stats, refresh = 0 }) {
  const [days, setDays] = useState(30),
    [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    setError("");
    request("admin/analytics&days=" + days, { signal: c.signal })
      .then(setData)
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, [days, refresh]);
  const totals = data?.timeline.reduce(
    (sum, d) => ({
      views: sum.views + d.views,
      downloads: sum.downloads + d.downloads,
      appDownloads: sum.appDownloads + d.appDownloads,
    }),
    { views: 0, downloads: 0, appDownloads: 0 },
  );
  return (
    <section className="admin-analytics">
      <div className="admin-list-heading">
        <div>
          <h2>Community activity</h2>
          <p>
            UTC · Anonymous page-session counts. Tracking starts when deployed.
          </p>
        </div>
        <label>
          Date range
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </label>
      </div>
      {stats && (
        <div className="admin-stats">
          {[
            ["Members", stats.users],
            ["Themes", stats.themes],
            ["Public themes", stats.published],
            ["Comments", stats.comments],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="notice error">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">Loading activity…</p>
      ) : (
        <>
          <div className="admin-stats">
            {[
              ["Theme views", totals.views],
              ["Theme downloads", totals.downloads],
              ["App downloads", totals.appDownloads],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-panel">
            <h3>Views and downloads</h3>
            <p>See how visitors discover and download themes over time.</p>
            <AdminTrend
              rows={calendarSeries(days, data.timeline)}
              series={[
                { key: "views", label: "Theme views", color: "#2c5945" },
                {
                  key: "downloads",
                  label: "Theme downloads",
                  color: "#b3814c",
                },
                {
                  key: "appDownloads",
                  label: "App downloads",
                  color: "#6e83a5",
                },
              ]}
              label="Theme views and downloads over the selected period"
            />
          </div>
          <details className="chart-data">
            <summary>View exact chart values</summary>
            <div className="admin-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Views</th>
                    <th>Theme downloads</th>
                    <th>App downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.map((d) => (
                    <tr key={d.day}>
                      <td>{d.day}</td>
                      <td>{d.views}</td>
                      <td>{d.downloads}</td>
                      <td>{d.appDownloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <h3>Popular themes</h3>
          <div className="admin-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Theme</th>
                  <th>Views</th>
                  <th>Downloads</th>
                  <th>Likes</th>
                  <th>Dislikes</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                {data.top.map((t) => (
                  <tr key={t.id}>
                    <td>{t.name}</td>
                    <td>{t.views}</td>
                    <td>{t.downloads}</td>
                    <td>{t.likes}</td>
                    <td>{t.dislikes}</td>
                    <td>{t.comments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.timeline.length && (
            <p className="quiet-empty">No recorded activity in this period.</p>
          )}
          {data.limited && <p>Activity results reached the query limit.</p>}
          <p className="small-note">
            Downloads count requests, not completed installs. Views exclude
            preview thumbnails and signed-in administrators. Reloading the
            website begins a new anonymous page session.
          </p>
        </>
      )}
    </section>
  );
}
