declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS: Fetcher;
    TRAIL_ENV?: string;
    TRAIL_ADMIN_EMAIL?: string;
    TRAIL_PUBLIC_ORIGIN?: string;
  }
}
