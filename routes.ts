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
  "/dashboard",
  "/dashboard/podcasts",
  "/dashboard/podcasts/create",
  "/dashboard/episodes",
  "/dashboard/episodes/create",
  "/dashboard/users",
  "/dashboard/tags",
  "/dashboard/tags/create",
  "/dashboard/tag-groups",
  "/dashboard/tag-groups/create",
];

export const premiumRoutes = ["/library/premiums"];
