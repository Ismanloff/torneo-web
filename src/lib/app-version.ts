export const APP_VERSION =
  process.env.VERCEL_DEPLOYMENT_ID ??
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ??
  process.env.npm_package_version ??
  "dev";
