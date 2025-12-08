// routes.ts
export const apiAuthPrefix = "/api";
export const DEFAULT_LOGIN_REDIRECT = "/home";

export const publicRoutes = [
  "/home",
  "/browse",
  "/charts",
  "/podcast/:id",
  "/episode/:id",
  "/auth/user-agreement",
  "/auth/privacy-policy",
];

export const userRoutes = ["/library/podcasts", "/library/episodes"];

export const adminRoutes = [
  "/admin",
  "/admin/podcasts",
  "/admin/podcasts/create",
  "/admin/episodes",
  "/admin/episodes/create",
  "/admin/users",
  "/admin/tags",
  "/admin/tags/create",
  "/admin/tag-groups",
  "/admin/tag-groups/create",
];

export const premiumRoutes = ["/library/premiums"];
