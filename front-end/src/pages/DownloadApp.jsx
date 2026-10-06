import { activityVisitor } from "../services/activity";
import { useEffect, useState } from "react";
import { Download, Monitor, Apple, ExternalLink } from "lucide-react";
import { request, endpoint } from "../services/api";
export default function DownloadApp() {
  const [release, setRelease] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    request("app-release", { signal: controller.signal })
      .then(setRelease)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, []);
  return (
    <section className="content-page download-app">
      <p className="eyebrow">YOUR WORKSPACE, YOUR LOOK</p>
      <h1>Download codexskin.</h1>
      <p className="download-intro">
        Bring community themes to the Codex desktop app.
      </p>
      <div className="download-platforms">
        <article>
          <Monitor size={32} />
          <h2>Windows</h2>
          <p>Windows x64 · Portable application</p>
          {error ? (
            <p role="alert">{error}</p>
          ) : !release ? (
            <p role="status">Checking the latest release…</p>
          ) : (
            <>
              <strong className="release-version">{release.version}</strong>
              <p>
                Released {new Date(release.publishedAt).toLocaleDateString()} ·{" "}
                {(release.size / 1048576).toFixed(1)} MiB
              </p>
              <a
                className="button primary"
                href={endpoint("app-download&visitor=" + activityVisitor)}
              >
                <Download size={18} />
                {release.format === "exe"
                  ? "Install for Windows"
                  : "Download for Windows (ZIP)"}
              </a>
              {release.format === "zip" && (
                <p className="small-note">
                  Extract the download, then run codexskin-app.exe. A standalone
                  EXE download is not available yet.
                </p>
              )}
              <a href={release.page} target="_blank" rel="noreferrer">
                Release details <ExternalLink size={14} />
              </a>
              {release.sha256 && (
                <p className="release-hash">SHA-256: {release.sha256}</p>
              )}
              <details>
                <summary>What’s new in {release.version}</summary>
                <pre>{release.notes}</pre>
              </details>
            </>
          )}
        </article>
        <article>
          <Apple size={32} />
          <h2>macOS</h2>
          <span className="platform-soon">Coming soon</span>
          <p>We’ll add a download when the macOS build is ready.</p>
        </article>
      </div>
      <p className="small-note">
        The Windows executable is unsigned. This project is unofficial and is
        not affiliated with OpenAI.
      </p>
    </section>
  );
}
