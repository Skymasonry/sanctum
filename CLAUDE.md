# Sanctum Neo

Sanctum is the Skymasons platform — a members-only portal for a fraternal organization. This repo contains **Neo**, the Next.js frontend that serves as the unified UI.

## Stack

- **Next.js 16** / React 19 / TypeScript / Tailwind 4
- **Backend:** Nextcloud (files, chat, calendar, contacts, wiki, forms) + Authentik (SSO)
- **Path aliases:** `@/*` maps to `./src/*`

## Build

```bash
npm install
npm run dev          # Local dev server
npm run build        # Production build (.next/standalone)
npm run lint         # ESLint
```

Requires Node.js 22.x.

## Architecture

### Authentication

All requests pass through Authentik SSO via Caddy forward auth. User identity is available via headers: `X-Authentik-Username`, `X-Authentik-Groups`, `X-Authentik-Email`, `X-Authentik-Name`. See `src/lib/auth.ts`.

### API Routes (`src/app/api/`)

API routes proxy to Nextcloud's backend. Key routes:

| Route | Backend | Purpose |
|-------|---------|---------|
| `/api/guilds` | Nextcloud `skymasonsnav` app (`/api/orders`) | Guild (order) management |
| `/api/talk/[token]` | Nextcloud Talk | Chat messages |
| `/api/deck/[boardId]` | Nextcloud Deck | Kanban boards |
| `/api/calendar/[calendarUri]` | Nextcloud Calendar | Events |
| `/api/files/[folderId]` | Nextcloud Files | Document storage |
| `/api/forms` | Nextcloud Forms | Surveys |
| `/api/userinfo` | Authentik headers | Current user info |
| `/api/invite` | Account API | Member invitations |
| `/api/account` | Account API | Account management |

### Chambers (per-guild pages)

Each guild has these pages at `/guild/[guildId]/`:

| Chamber | Route | Component | Backend |
|---------|-------|-----------|---------|
| Threshold | `/guild/[id]` | FocusCard + EntryGrid | Guilds API + focus logic |
| Pulse | `/guild/[id]/pulse` | MessageList + ChatInput | Nextcloud Talk |
| Quests | `/guild/[id]/quests` | QuestBoard | Nextcloud Deck |
| Rites | `/guild/[id]/rites` | RitesView | Nextcloud Calendar |
| Brotherhood | `/guild/[id]/brotherhood` | Member grid | Guilds API |
| Archive | `/guild/[id]/archive` | ArchiveBrowser | Nextcloud Files |
| Scrolls | `/guild/[id]/scrolls` | ScrollsView | Nextcloud Forms |

### Key directories

```
src/
  app/           # Next.js app router (pages + API routes)
  components/    # UI components (shell/, shared/, threshold/, pulse/, etc.)
  lib/           # Data fetching, auth, hooks, utilities
  types/         # TypeScript interfaces (guild.ts, user.ts)
  styles/        # Fonts (Cinzel display + Cormorant Garamond body)
```

## Contribution Rules

- **Branch strategy:** Work on feature branches, open PRs against `main`
- **Don't break SSO:** All authenticated routes depend on Authentik forward auth headers
- **Don't hardcode Nextcloud URLs:** Use the proxy routes in `src/lib/api.ts` (`fetchFromNextcloud`, `postToNextcloud`)
- **Guild/order mapping:** Keep "guilds" in frontend, "orders" stays in backend API responses
- **Fonts & theming:** Each guild has a `--guild-color` CSS variable set in the guild layout. Use it for guild-specific styling
- **Keep it accessible:** The portal is used by members of varying technical ability
