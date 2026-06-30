# MEI Fácil

Plataforma SaaS para Microempreendedores Individuais (MEI) — assistente financeiro e administrativo inteligente.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, serves at /api)
- `pnpm --filter @workspace/mei-facil run dev` — run the React frontend (port 24200, serves at /)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `JWT_SECRET`, `JWT_REFRESH_SECRET` — override default signing secrets (required in production)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + shadcn/ui + Recharts + Wouter
- API: Express 5, JWT auth (bcrypt + jsonwebtoken)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (users, revenue, taxes, documents, alerts, declarations, ai-conversations)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/middlewares/auth.ts` — JWT middleware + token generation
- `artifacts/mei-facil/src/` — React frontend
- `artifacts/mei-facil/src/contexts/AuthContext.tsx` — Auth state + JWT storage

## Architecture decisions

- JWT authentication with bcrypt password hashing — no Replit Auth / Clerk dependency, fully portable
- Access tokens (15min) + refresh tokens (7 days) stored in localStorage
- `setAuthTokenGetter()` from `@workspace/api-client-react` injects Bearer token into every API call automatically
- All business logic in route handlers; no ORM abstraction layer beyond Drizzle
- AI assistant uses pattern-matching on real DB data (no external AI API required — plug in any later)
- Document storage layer is metadata-only (name, folder, URL); actual file upload goes to S3-compatible storage

## Product

- **Landing page** — marketing page with CTA
- **Auth** — register (CPF, CNPJ, email, password) + login + token refresh
- **Onboarding** — multi-step wizard to collect MEI profile data
- **Dashboard** — annual revenue progress bar, next DAS countdown, status (Regular/Atenção/Risco), unread alerts count
- **Faturamento** — full CRUD for revenue entries, monthly bar chart (Recharts), stats cards, limit alerts at 70%/90%/100%
- **DAS** — tax payment tracking with paid/pending/overdue status, late penalty simulator (2% multa + 0.033%/day juros)
- **Documentos** — digital archive with folder categories (DAS, Notas Fiscais, Declarações, Certidões, Outros)
- **Declaração Anual** — checklist progress for DASN-SIMEI preparation
- **Alertas** — notification feed with priority levels
- **Assistente IA** — context-aware chat bot using real DB data (faturamento, DAS, limites)
- **Perfil** — user profile editing

## Gotchas

- Run `pnpm run typecheck:libs` after any change to `lib/db/src/schema/` before typechecking leaf packages
- `req.params.id` in Express 5 with TypeScript must be cast with `as string` before `parseInt()`
- JWT secrets default to hardcoded values for dev — MUST set `JWT_SECRET` and `JWT_REFRESH_SECRET` env vars in production
- After `pnpm --filter @workspace/api-spec run codegen`, do NOT read generated files (they fill context)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
