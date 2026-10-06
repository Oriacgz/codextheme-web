import { fail } from "../auth/security.js";
let cached,
  expires = 0,
  pending;
export async function latestRelease() {
  if (cached && expires > Date.now()) return cached;
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch(
      "https://api.github.com/repos/Oriacgz/codexskin/releases/latest",
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      fail(503, "Release information is temporarily unavailable.");
    const release = await response.json();
    const asset =
      release.assets?.find((a) =>
        /^codexskin.*windows.*x64.*\.exe$/i.test(a.name),
      ) ||
      release.assets?.find((a) =>
        /^codexskin.*windows.*x64.*\.zip$/i.test(a.name),
      );
    if (
      !asset ||
      !asset.browser_download_url.startsWith(
        "https://github.com/Oriacgz/codexskin/releases/download/",
      ) ||
      !/^v\d+\.\d+\.\d+$/.test(release.tag_name)
    )
      fail(503, "No verified Windows release is available.");
    cached = {
      version: release.tag_name,
      publishedAt: release.published_at,
      notes: String(release.body || "").slice(0, 16000),
      url: asset.browser_download_url,
      page: `https://github.com/Oriacgz/codexskin/releases/tag/${release.tag_name}`,
      filename: asset.name,
      size: asset.size,
      sha256: asset.digest?.startsWith("sha256:")
        ? asset.digest.slice(7)
        : null,
      format: asset.name.endsWith(".exe") ? "exe" : "zip",
    };
    expires = Date.now() + 300000;
    return cached;
  })().finally(() => {
    pending = null;
  });
  return pending;
}
