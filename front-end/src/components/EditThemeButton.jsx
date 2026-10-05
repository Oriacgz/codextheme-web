import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { request } from "../services/api";
import CategoryPicker from "./CategoryPicker";
export default function EditThemeButton({ theme, onEdited }) {
  const dialog = useRef(null),
    form = useRef(null),
    pending = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (open) {
      form.current.reset();
      dialog.current.showModal();
    }
  }, [open]);
  async function save(event) {
    event.preventDefault();
    if (pending.current) return;
    const values = new FormData(event.currentTarget);
    const categories = values.getAll("categories");
    if (!categories.length) {
      setError("Choose at least one category.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await request(`themes/${theme.id}`, {
        method: "PATCH",
        body: {
          name: values.get("name"),
          description: values.get("description"),
          categories,
          license: values.get("license"),
          rights: values.get("rights") === "on",
        },
      });
      onEdited(result.theme);
      dialog.current.close();
    } catch (error) {
      setError(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="text-button edit-theme-button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Pencil size={16} aria-hidden="true" />
        Edit theme
      </button>
      <dialog
        ref={dialog}
        className="edit-theme-dialog"
        aria-label="Edit your theme"
        onClose={() => setOpen(false)}
        onCancel={(event) => {
          if (busy) event.preventDefault();
        }}
      >
        {open && (
          <>
            <h2>Edit your theme</h2>
            <p>
              Update the published details. Your package, likes and comments
              stay the same.
            </p>
            <form ref={form} className="stack-form" onSubmit={save}>
              <fieldset disabled={busy}>
                <label>
                  Theme name
                  <input
                    name="name"
                    defaultValue={theme.name}
                    required
                    minLength={3}
                    maxLength={80}
                  />
                </label>
                <label>
                  Description and credits
                  <textarea
                    name="description"
                    defaultValue={theme.description}
                    required
                    minLength={10}
                    maxLength={1200}
                    rows={4}
                  />
                </label>
                <CategoryPicker
                  selected={theme.categories || [theme.category]}
                />
                <label>
                  Artwork usage
                  <select name="license" defaultValue={theme.license}>
                    {[
                      ["Personal use only", "For personal use only"],
                      ["CC0", "Anyone can use it — no credit needed"],
                      ["CC BY 4.0", "Anyone can use it — credit the artist"],
                      [
                        "CC BY-NC 4.0",
                        "Non-commercial use — credit the artist",
                      ],
                      [
                        "Other — see description",
                        "Other rules — explain in the description",
                      ],
                    ].map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rights-confirm">
                  <input
                    type="checkbox"
                    name="rights"
                    defaultChecked
                    required
                  />
                  I have permission to share the included artwork.
                </label>
              </fieldset>
              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="button"
                  disabled={busy}
                  onClick={() => dialog.current.close()}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </>
        )}
      </dialog>
    </>
  );
}
