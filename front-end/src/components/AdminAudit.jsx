import { useEffect, useState } from "react";
import { request } from "../services/api";
import { ShieldCheck } from "lucide-react";
const actions = {
  "admin-created": "Created an administrator",
  "admin-deleted": "Deleted an administrator",
  "account-access-changed": "Changed account access",
  "password-changed": "Changed their password",
  "report-status-changed": "Updated a report",
};
export default function AdminAudit() {
  const [entries, setEntries] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const c = new AbortController();
    request("admin/audit", { signal: c.signal })
      .then((r) => setEntries(r.entries))
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      });
    return () => c.abort();
  }, []);
  return (
    <section className="audit-page">
      <div className="admin-list-heading">
        <div>
          <h2>Account activity</h2>
          <p>Who made a change, what happened and why. Latest 100 changes.</p>
        </div>
        <ShieldCheck size={28} />
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {!entries && !error ? (
        <p role="status">Loading account activity…</p>
      ) : entries?.length ? (
        <ol className="audit-timeline">
          {entries.map((e) => (
            <li key={e.id}>
              <div className="audit-mark">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="audit-event-heading">
                  <strong>
                    {actions[e.action] || "Updated account settings"}
                  </strong>
                  <time dateTime={e.createdAt}>
                    {new Date(e.createdAt).toLocaleString()}
                  </time>
                </div>
                <p>
                  <b>{e.actorName}</b>
                  {e.targetId && e.targetId !== e.actorId && (
                    <> → {e.targetName}</>
                  )}
                </p>
                <p className="audit-reason">{e.reason}</p>
                <details>
                  <summary>Technical reference</summary>
                  <p>
                    Changed by: <code>{e.actorId}</code>
                  </p>
                  <p>
                    Affected record: <code>{e.targetId || "None"}</code>
                  </p>
                </details>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        !error && (
          <div className="dashboard-empty">
            <ShieldCheck />
            <h3>No account changes yet</h3>
            <p>Administrator actions will appear here.</p>
          </div>
        )
      )}
    </section>
  );
}
