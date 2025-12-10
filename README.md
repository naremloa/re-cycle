# Re-Cycle

A fullstack application built with Hono and Vue 3, deployed on Cloudflare Pages.

## Tech Stack

- **Frontend:** Vue 3 + TypeScript
- **Backend:** Hono (Cloudflare Workers)
- **Runtime:** Bun
- **Deployment:** Cloudflare Pages

## Getting Started

```bash
# Install dependencies
bun install

# Start development
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview

# Deploy
bun run deploy
```

## Project Structure

```
src/
├── client/     # Vue 3 frontend
└── server/     # Hono API backend
```

## Environment Variables

- **Client:** Create `.env` with `VITE_` prefix variables
- **Server:** Create `.dev.vars` for local development

For production, configure environment variables in Cloudflare Pages dashboard.
