import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { request } from "../services/api";

export default function DeleteThemeButton({ theme, onDeleted }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(`themes/${theme.id}`, { method: "DELETE" });
      dialog.current.close();
      onDeleted(theme.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="text-button delete-theme-button"
        onClick={() => {
          setError("");
          dialog.current.showModal();
        }}
      >
        <Trash2 size={16} aria-hidden="true" /> Delete theme
      </button>
      <dialog
        ref={dialog}
        className="delete-theme-dialog"
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        <h2>Delete this theme?</h2>
        <p>
          <strong>{theme.name}</strong> will be removed along with its files,
          likes and comments. This cannot be undone.
        </p>
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            className="button"
            disabled={busy}
            onClick={() => dialog.current.close()}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy} onClick={remove}>
            {busy ? "Deleting…" : "Delete theme"}
          </button>
        </div>
      </dialog>
    </>
  );
}
