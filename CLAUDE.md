# Project: Fullstack Hono + Vue (Cloudflare Pages)

## Architecture
- **Runtime:** Bun
- **Frontend:** Vue 3 + TypeScript (`src/client`)
- **Backend:** Hono + Cloudflare Workers (`src/server`)
- **Build:** Vite (Rolldown) - Dual-mode (client/server)
- **Deploy:** Cloudflare Pages (Advanced Mode)
- **Code Quality:** ESLint (@antfu/eslint-config)

## Project Structure
```
re-cycle/
├── src/
│   ├── client/           # Vue 3 frontend
│   │   ├── index.html    # Entry HTML
│   │   ├── main.ts       # Vue app entry
│   │   ├── App.vue       # Root component
│   │   └── style.css     # Global styles
│   └── server/           # Hono backend
│       └── index.ts      # API routes + static serving
├── tsconfig.json         # Root TypeScript config
├── tsconfig.client.json  # Client-side config
├── tsconfig.server.json  # Server-side config (Workers)
├── tsconfig.node.json    # Build tools config
├── vite.config.ts        # Vite configuration
├── wrangler.toml         # Cloudflare deployment config
└── eslint.config.mjs     # ESLint configuration
```

## TypeScript Configuration
Strict "Solution Style" with modern ESM:
- **`tsconfig.json`**: Root references to sub-configs
- **`tsconfig.client.json`**: Vue/DOM environment with path aliases (`@/*`)
- **`tsconfig.server.json`**: Cloudflare Workers environment (no DOM)
- **`tsconfig.node.json`**: Build tooling environment (Vite, Wrangler)

All configs use:
- `import.meta.dirname` for path resolution
- Strict linting rules
- ESNext target with bundler module resolution

## Vite Configuration
Three-mode build system:
1. **Dev Mode** (`bun run dev`):
   - Root: `src/client`
   - Hono dev server with Cloudflare Pages adapter
   - Hot module replacement (HMR)
   - API routes excluded from static serving

2. **Client Build** (`--mode client`):
   - Builds Vue SPA to `dist/`
   - Entry: `src/client/index.html`

3. **Server Build** (`--mode server`):
   - Builds Hono worker to `dist/_worker.js`
   - SSR mode, ESNext target
   - Entry: `src/server/index.ts`

## Backend Features
- **API Routes**: `/api/*` handled by Hono
- **Static Serving**: Uses Cloudflare Pages `ASSETS` binding
- **SPA Fallback**: Returns `index.html` for client-side routing
- **Type Safety**: Cloudflare Workers types (`Bindings`, `D1Database`)

## Environment Variables

### Client-side (Frontend)
**File**: `.env` (local development only)

Client-side environment variables **must** have the `VITE_` prefix to be exposed to the browser:

```bash
# .env
VITE_APP_TITLE=Re-Cycle
VITE_API_BASE_URL=https://api.example.com
```

**Type definition**:
```typescript
// src/client/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_BASE_URL: string
}
```

**Access in code**:
```typescript
// src/client/App.vue
const title = import.meta.env.VITE_APP_TITLE
```

**Important**:
- Variables **without** `VITE_` prefix are NOT exposed to client (security)
- Environment variables are **statically replaced** at build time

### Server-side (Backend)

#### Development
**File**: `.dev.vars` (local development only)

```bash
# .dev.vars
VERSION=v1.0.0-dev
DB_URL=http://localhost:8787
API_SECRET=dev-secret-key
```

**Type definition**:
```typescript
// src/server/index.ts
type Bindings = {
  ASSETS: Fetcher // Auto-provided by Cloudflare Pages
  DB: D1Database // D1 database binding
  VERSION?: string // Custom environment variable
}
```

**Access in code**:
```typescript
// src/server/index.ts
app.get('/api/hello', (c) => {
  const version = c.env.VERSION ?? 'V0'
  return c.json({ version })
})
```

#### Production
**Cloudflare Dashboard**: Settings → Environment Variables

Environment variables are configured in Cloudflare Pages dashboard and accessed via `c.env` in Hono handlers.

### Overview

| File | Purpose | Used By |
|------|---------|---------|
| `.env` | Client env vars (dev) | Vite (Frontend) |
| `.dev.vars` | Server env vars (dev) | Wrangler (Backend) |
| Cloudflare Dashboard | Server env vars (prod) | Cloudflare Pages |

**Security Notes**:
- Never commit `.env` or `.dev.vars` to git
- Use `.env.example` & `.dev.vars.example` to document required variables
- Client variables are **public** (embedded in build)
- Server variables are **private** (only accessible in Workers runtime)

## Commands
- `bun run dev`: Start development server with HMR
- `bun run type-check`: Type check all environments (client/server/node)
- `bun run build`: Full build pipeline (type-check + client + server)
- `bun run build:client`: Build client only
- `bun run build:server`: Build server only
- `bun run preview`: Preview production build locally (Wrangler)
- `bun run deploy`: Deploy to Cloudflare Pages
- `bun run lint`: Run ESLint
- `bun run lint:fix`: Auto-fix ESLint issues

## Key Dependencies
**Runtime:**
- `hono`: Web framework for Cloudflare Workers
- `vue`: Progressive JavaScript framework

**Dev Tools:**
- `@hono/vite-dev-server`: Hono integration with Vite
- `@vitejs/plugin-vue`: Vue 3 plugin for Vite
- `wrangler`: Cloudflare CLI tool
- `@antfu/eslint-config`: Opinionated ESLint config
- `vue-tsc`: Vue TypeScript compiler
