import CategoryPicker from "../components/CategoryPicker";
import { useEffect, useRef, useState } from "react";
import Icon from "../components/Icon";
import { request, getCsrf, endpoint } from "../services/api";
export default function Upload({ user, ready, navigate }) {
  const [file, setFile] = useState(null),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [error, setError] = useState(""),
    [stage, setStage] = useState("");
  const activeUpload = useRef(null);
  useEffect(() => () => activeUpload.current?.abort(), []);
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (
      !file ||
      !/\.(zip|codextheme)$/i.test(file.name) ||
      file.size > 32 * 1048576
    ) {
      setError("Choose a ZIP or .codextheme package, up to 32 MiB.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form);
    const categories = form.getAll("categories");
    if (!categories.length) {
      setError("Choose at least one category.");
      return;
    }
    if (activeUpload.current) return;
    const controller = new AbortController();
    activeUpload.current = controller;
    setBusy(true);
    setProgress(0);
    setStage("Preparing your upload");
    try {
      const intent = await request("uploads", {
        method: "POST",
        signal: controller.signal,
        body: {
          ...values,
          categories,
          rights: values.rights === "on",
          extension: file.name.split(".").at(-1).toLowerCase(),
        },
      });
      setStage("Uploading your package");
      if (intent.cloudStorage) {
        const { upload } = await import("@vercel/blob/client");
        controller.signal.throwIfAborted();
        await upload(intent.pathname, file, {
          access: "private",
          abortSignal: controller.signal,
          contentType: "application/zip",
          handleUploadUrl: endpoint("blob-upload"),
          clientPayload: JSON.stringify({
            intentId: intent.id,
            csrf: getCsrf(),
          }),
          onUploadProgress: ({ percentage }) => {
            if (!controller.signal.aborted) setProgress(Math.round(percentage));
          },
        });
      } else {
        await request(`uploads/${intent.id}/file`, {
          method: "POST",
          body: file,
          signal: controller.signal,
        });
        setProgress(100);
      }
      controller.signal.throwIfAborted();
      setStage("Validating the theme and preparing its preview");
      const result = await request(`uploads/${intent.id}/complete`, {
        method: "POST",
        body: {},
        signal: controller.signal,
      });
      if (!controller.signal.aborted) navigate("theme/" + result.id);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message);
    } finally {
      activeUpload.current = null;
      if (!controller.signal.aborted) {
        setBusy(false);
        setStage("");
      }
    }
  }
  if (!ready) return <div className="page-loading">Getting ready…</div>;
  if (!user)
    return (
      <section className="empty-state">
        <p className="eyebrow">A PLACE FOR YOUR IDEAS</p>
        <h1>Your next contribution starts here.</h1>
        <p>Sign in to share a theme with the community.</p>
        <a href="#/login" className="button primary">
          Sign in to upload
        </a>
      </section>
    );
  return (
    <section className="content-page upload-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">MADE BY YOU. SHARED WITH EVERYONE.</p>
          <h1>Set a new atmosphere.</h1>
          <p>
            Give your theme a name, a little context, and a place in the
            collection.
          </p>
        </div>
      </div>
      <div className="upload-layout">
        <form className="stack-form upload-form" onSubmit={submit}>
          <fieldset disabled={busy}>
            <label className="package-drop">
              <Icon name="Upload" size={30} />
              <strong>{file ? file.name : "Choose your theme package"}</strong>
              <span>
                {file
                  ? (file.size / 1048576).toFixed(2) + " MiB · ready to upload"
                  : "ZIP or .codextheme · up to 32 MiB"}
              </span>
              <input
                type="file"
                name="package"
                accept=".zip,.codextheme"
                required
                aria-label="Choose theme package"
                onChange={(e) => {
                  setFile(e.target.files[0] || null);
                  setError("");
                }}
              />
            </label>
            <label>
              Theme name
              <input
                name="name"
                placeholder="Give it a name worth remembering"
                required
                minLength={3}
                maxLength={80}
              />
            </label>
            <label>
              The story behind it
              <textarea
                name="description"
                placeholder="What inspired it? Add artwork credits and anything people should know."
                required
                minLength={10}
                maxLength={1200}
                rows={4}
              />
            </label>
            <div className="form-columns">
              <CategoryPicker />
              <label>
                How can others use this artwork?
                <select name="license" aria-describedby="artwork-rights-help">
                  {[
                    ["Personal use only", "For personal use only"],
                    ["CC0", "Anyone can use it — no credit needed"],
                    ["CC BY 4.0", "Anyone can use it — credit the artist"],
                    ["CC BY-NC 4.0", "Non-commercial use — credit the artist"],
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
            </div>
            <p id="artwork-rights-help" className="small-note">
              Credit means naming the artist. Non-commercial means the artwork
              cannot be used for business or to make money. Choose the
              permission the artist actually gave you.
            </p>
            <label className="check-label">
              <input name="rights" type="checkbox" required />I made these
              assets or have permission to share them. I’ve included the
              required credits.
            </label>
          </fieldset>
          {busy && (
            <div className="upload-progress" role="status">
              <span>
                {stage}
                {stage === "Uploading your package" ? ` · ${progress}%` : "…"}
              </span>
              <progress
                value={progress}
                max={100}
                aria-label="Upload progress"
              />
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? "Publishing…" : "Publish to the community"}
            <Icon name="ArrowRight" />
          </button>
        </form>
        <aside className="upload-notes">
          <p className="eyebrow">BEFORE YOU SHARE</p>
          <h2>
            A good theme
            <br />
            comes with context.
          </h2>
          <ol>
            <li>
              <strong>Package, don’t extract.</strong>
              <p>Upload the same package you’d import into codexskin.</p>
            </li>
            <li>
              <strong>Give credit where it’s due.</strong>
              <p>
                Software licenses don’t automatically cover the artwork. Tell
                people who made it and how it can be used.
              </p>
            </li>
            <li>
              <strong>Make room for conversation.</strong>
              <p>
                Your theme publishes after validation. People can like, dislike,
                and share feedback.
              </p>
            </li>
          </ol>
          <p className="small-note">
            Admins can remove themes from public view if they violate community
            rules.
          </p>
        </aside>
      </div>
    </section>
  );
}
