# Project: Fullstack Hono + Vue (Cloudflare Pages)

## Architecture
- **Runtime:** Bun
- **Frontend:** Vue 3 + TypeScript (`src/client`)
- **Backend:** Hono + Cloudflare Workers (`src/server`)
- **Database:** Cloudflare D1 (SQLite) with Drizzle ORM
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
│       ├── index.ts      # Main entry + static serving
│       ├── auth.ts       # Authentication routes (register/login)
│       ├── middlewares.ts # Auth middleware (JWT verification)
│       ├── types.ts      # Type definitions (Bindings)
│       ├── api/
│       │   └── v1/
│       │       └── index.ts # API v1 routes
│       └── db/
│           └── schema.ts # Drizzle database schema
├── drizzle/              # Database migrations (generated)
├── drizzle.config.ts     # Drizzle Kit configuration
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

## Backend Architecture

### Server Structure
The backend is modularized for better maintainability:

1. **[src/server/index.ts](src/server/index.ts)** - Main application entry
   - Routes authentication requests to `/api/auth` (→ [auth.ts](src/server/auth.ts))
   - Routes API requests to versioned modules (`/api/v1` → [api/v1/index.ts](src/server/api/v1/index.ts))
   - Handles static file serving via Cloudflare Pages `ASSETS` binding
   - Implements SPA fallback (returns `index.html` for client-side routing)

2. **[src/server/auth.ts](src/server/auth.ts)** - Authentication routes
   - `/api/auth/register` - User registration with email/password
   - `/api/auth/login` - User login with JWT token generation
   - Uses bcryptjs for password hashing
   - Generates JWT tokens with 7-day expiration
   - Independent Hono app mounted on main router

3. **[src/server/middlewares.ts](src/server/middlewares.ts)** - Middleware functions
   - `authMiddleware` - JWT token verification
   - Extracts and validates Bearer tokens from Authorization header
   - Sets `currentUserId` in context for protected routes
   - Returns 401 for invalid/missing tokens

4. **[src/server/api/v1/index.ts](src/server/api/v1/index.ts)** - API v1 routes
   - **Protected routes** (requires JWT authentication via `authMiddleware`)
   - Collections CRUD: `GET/POST /collections`, `DELETE /collections/:id`
   - Cards CRUD: `GET /collections/:id/cards`, `POST /cards`, `PUT/DELETE /cards/:id`
   - Review system: `GET /collections/:id/review`, `POST /cards/:id/review`
   - Implements SM-2 spaced repetition algorithm for card reviews
   - Uses Drizzle ORM for database operations
   - Uses Zod for request validation
   - Independent Hono app mounted on main router

5. **[src/server/types.ts](src/server/types.ts)** - Type definitions
   - Defines `Bindings` type for Cloudflare Workers environment
   - Includes `ASSETS` (static fetcher), `DB` (D1Database), `JWT_SECRET`, and custom env vars

6. **[src/server/db/schema.ts](src/server/db/schema.ts)** - Database schema
   - Drizzle ORM table definitions:
     - `users` - User accounts (email, password)
     - `collections` - Card collections/decks with user ownership
     - `cards` - Flashcards with SM-2 algorithm fields (state, easeFactor, dueDate, etc.)
   - Auto-generates TypeScript types for Select/Insert operations

### Database Integration (Cloudflare D1 + Drizzle)

- **Schema**: `src/server/db/schema.ts` - Drizzle table definitions with auto-generated TypeScript types
- **Timezone Standard**:
  - **Storage**: Store as UTC Integer (Timestamp) using `{ mode: 'timestamp_ms' }`.
  - **Transport**: API returns ISO 8601 strings (UTC).
  - **Display**: Client (Vue) converts to local time
- **Config (`drizzle.config.ts`)**: Auto-detects `.wrangler` SQLite file for `drizzle-kit studio` (requires `better-sqlite3`).

### API Routes Overview

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT token)

#### API v1 (`/api/v1`) - Protected Routes
All v1 routes require JWT authentication via `Authorization: Bearer <token>` header.

**Collections:**
- `GET /api/v1/collections` - List user's collections
- `POST /api/v1/collections` - Create new collection
- `GET /api/v1/collections/:id` - Get collection details
- `DELETE /api/v1/collections/:id` - Delete collection (cascades to cards)

**Cards:**
- `GET /api/v1/collections/:id/cards` - List cards in collection
- `POST /api/v1/cards` - Create new card
- `PUT /api/v1/cards/:id` - Update card content
- `DELETE /api/v1/cards/:id` - Delete card

**Review System:**
- `GET /api/v1/collections/:id/review` - Get due cards for review
- `POST /api/v1/cards/:id/review` - Submit review (SM-2 algorithm)

### API Versioning
API routes are organized by version:
- **v1**: `/api/v1/*` - Current stable API (flashcard system with SM-2)
- **auth**: `/api/auth/*` - Authentication endpoints (unversioned)
- Future versions can be added as separate modules (e.g., `api/v2/index.ts`)

### Type Safety
- `Bindings` type ensures environment variables are properly typed
- Drizzle ORM provides compile-time type safety for database queries
- All API handlers have type-safe context via `Hono<{ Bindings: Bindings }>`
- Middleware sets typed Variables (`currentUserId`) for protected routes
- Zod schemas validate all incoming request payloads

## Environment Variables

| File | Type | Prefix | Loaded By | Usage |
|------|------|--------|-----------|-------|
| .env | Client (Public) | VITE_ | Vite | import.meta.env.VITE_API_URL |
| .dev.vars | Server (Secret) | None | Wrangler | c.env.DB_SECRET |
| Dashboard | Production | Mixed | Cloudflare | injected at runtime |

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
- `bun run db:generate`: Generate SQL from schema
- `bun run db:migrate:local`: Apply SQL to local D1
- `bun run db:studio`: Open Drizzle Studio (local data).

## Key Dependencies
**Runtime:**
- `hono`: Web framework for Cloudflare Workers
- `vue`: Progressive JavaScript framework
- `drizzle-orm`: TypeScript ORM for SQL databases
- `bcryptjs`: Password hashing for authentication
- `zod`: TypeScript-first schema validation

**Hono Plugins:**
- `@hono/zod-validator`: Zod integration for request validation
- `hono/jwt`: JWT authentication utilities (sign/verify)

**Dev Tools:**
- `@hono/vite-dev-server`: Hono integration with Vite
- `@vitejs/plugin-vue`: Vue 3 plugin for Vite
- `wrangler`: Cloudflare CLI tool
- `@antfu/eslint-config`: Opinionated ESLint config
- `vue-tsc`: Vue TypeScript compiler
- `better-sqlite3`: SQLite driver for Drizzle Studio
