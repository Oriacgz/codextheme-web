import { useEffect, useState } from "react";
import { request } from "../services/api";

export default function AdminAccess({ user, onChanged }) {
  const [accounts, setAccounts] = useState([]),
    [action, setAction] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [credential, setCredential] = useState(null);
  const reset = user.mustChangePassword;
  useEffect(() => {
    if (reset) return;
    const controller = new AbortController();
    request("admin/administrators", { signal: controller.signal })
      .then((r) => setAccounts(r.users))
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [reset, action]);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    setCredential(null);
    try {
      if (reset || action?.kind === "password") {
        await request("admin/password", { method: "POST", body: values });
        location.hash = "#/login";
        await onChanged();
      } else {
        const kind = action.kind;
        const result = await request(
          "admin/administrators" + (action.id ? "/" + action.id : ""),
          {
            method:
              kind === "create"
                ? "POST"
                : kind === "delete"
                  ? "DELETE"
                  : "PATCH",
            body: {
              ...values,
              ...(kind === "promote"
                ? { role: "ADMIN" }
                : kind === "demote"
                  ? { role: "USER" }
                  : {}),
            },
          },
        );
        if (result.temporaryPassword)
          setCredential({
            email: values.email,
            password: result.temporaryPassword,
          });
        setAction(null);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-access">
      <div className="admin-list-heading">
        <div>
          <h2>
            {reset ? "Secure your administrator account" : "Administrators"}
          </h2>
          <p>Use a second administrator to remove the starter account.</p>
        </div>
        {!reset && (
          <button
            className="button primary"
            onClick={() => setAction({ kind: "create" })}
          >
            Add administrator
          </button>
        )}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {credential && (
        <div className="notice" role="status">
          <strong>Copy these temporary credentials now.</strong>
          <p>Email: {credential.email}</p>
          <p>
            Password: <code>{credential.password}</code>
          </p>
          <button className="button" onClick={() => setCredential(null)}>
            Dismiss credentials
          </button>
        </div>
      )}
      {reset || action ? (
        <form className="stack-form admin-access-form" onSubmit={submit}>
          <h3>
            {reset
              ? "Replace temporary password"
              : action.kind === "create"
                ? "Create administrator"
                : action.kind === "password"
                  ? "Change password"
                  : `${action.kind === "delete" ? "Delete" : "Demote"} ${action.name}`}
          </h3>
          <fieldset disabled={busy}>
            {action?.kind === "create" && (
              <>
                <label>
                  Name
                  <input name="name" required minLength={2} maxLength={40} />
                </label>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
              </>
            )}
            <label>
              Your current password
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
            {reset || action?.kind === "password" ? (
              <label>
                New password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
                />
              </label>
            ) : (
              <label>
                Reason
                <input name="reason" required minLength={3} maxLength={300} />
              </label>
            )}
            {action?.kind === "delete" && (
              <label className="check-label">
                <input type="checkbox" required />I confirm permanent deletion
                of this administrator account.
              </label>
            )}
          </fieldset>
          <div className="form-actions">
            {!reset && (
              <button
                type="button"
                className="button"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Cancel
              </button>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Confirm"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="admin-list">
            {accounts.map((member) => (
              <article key={member.id}>
                <div className="admin-row-copy">
                  <strong>{member.name}</strong>
                  <span>
                    {member.email}
                    {member.suspended ? " · Suspended" : ""}
                    {member.mustChangePassword
                      ? " · Password reset required"
                      : ""}
                  </span>
                </div>
                <div className="admin-actions">
                  <button
                    disabled={member.id === user.id}
                    onClick={() =>
                      setAction({
                        kind: "demote",
                        id: member.id,
                        name: member.name,
                      })
                    }
                  >
                    Remove admin access
                  </button>
                  <button
                    disabled={member.id === user.id}
                    onClick={() =>
                      setAction({
                        kind: "delete",
                        id: member.id,
                        name: member.name,
                      })
                    }
                  >
                    Delete account
                  </button>
                </div>
              </article>
            ))}
          </div>
          <button
            className="button"
            onClick={() => setAction({ kind: "password" })}
          >
            Change my password
          </button>
        </>
      )}
    </section>
  );
}
