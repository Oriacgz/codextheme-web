// One anonymous identifier per page session; no cookies or browser storage.
export const activityVisitor = [...crypto.getRandomValues(new Uint8Array(16))]
  .map((n) => n.toString(16).padStart(2, "0"))
  .join("");
