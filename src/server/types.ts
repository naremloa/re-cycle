// Define Cloudflare Pages environment bindings
export type Bindings = {
  // Static assets fetcher automatically provided by Cloudflare Pages
  ASSETS: Fetcher
  DB: D1Database
  VERSION?: string
}
