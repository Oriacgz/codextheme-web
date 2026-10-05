export const pageLoaders = {
  community: () => import("../pages/Community"),
  login: () => import("../pages/Auth"),
  signup: () => import("../pages/Auth"),
  profile: () => import("../pages/Profile"),
  upload: () => import("../pages/Upload"),
  theme: () => import("../pages/Theme"),
  admin: () => import("../pages/Admin"),
};
export function preloadLink(event) {
  const link = event.target.closest?.('a[href^="#/"]');
  const page = link?.getAttribute("href").slice(2).split("/")[0];
  pageLoaders[page]?.().catch(() => {});
}
