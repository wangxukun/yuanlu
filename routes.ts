// routes.ts
export const apiAuthPrefix = "/api";
export const DEFAULT_LOGIN_REDIRECT = "/home";

export const publicRoutes = [
  "/home",
  "/discover",
  "/podcast/:id",
  "/episode/:id",
  "/series/:id",
  "/contact",
  "/auth/user-agreement",
  "/auth/privacy-policy",
];

export const userRoutes = [
  "/library/favorites",
  "/library/history",
  "/library/vocabulary",
  "/library/learning-paths",
];

export const adminRoutes = [
  "/admin",
  "/admin/podcasts",
  "/admin/podcasts/create",
  "/admin/episodes",
  "/admin/episodes/create",
  "/admin/users",
  "/admin/tags",
];

export const premiumRoutes = ["/library/premiums"];
