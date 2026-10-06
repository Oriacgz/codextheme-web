import { useState } from "react";
import { request } from "../services/api";
export default function ReportTheme({ id, user }) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await request("themes/" + id + "/report", {
        method: "POST",
        body: { reason: new FormData(e.currentTarget).get("reason") },
      });
      setOpen(false);
      setMessage("Report sent to the administrators.");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="theme-report">
      {user && (
        <button className="text-button" onClick={() => setOpen(!open)}>
          Report this theme
        </button>
      )}
      {open && (
        <form className="stack-form" onSubmit={submit}>
          <label>
            What should we review?
            <textarea
              name="reason"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
            />
          </label>
          <button className="button" disabled={busy}>
            {busy ? "Sending…" : "Send report"}
          </button>
        </form>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
