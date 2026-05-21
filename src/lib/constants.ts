// Shared constants that are safe to import from BOTH Edge runtime
// (proxy/middleware) AND Node runtime (API routes).
// Keep this file free of any Node-only imports like `crypto`.

export const COOKIE_NAME = "sp_session";
