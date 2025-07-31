# Daydream Portal - Agent Guide

## Commands
- **Backend**: `npm run dev` (port 3001), `npm run build`, `npm run start`
- **Frontend**: `cd frontend && npm run dev` (port 3000), `npm run build`, `npm run lint`
- **Full stack**: `./run-local.sh` (starts both servers with logging)
- **Database**: `./scripts/start-postgres.sh` (starts PostgreSQL with Docker)
- **Setup**: `./setup.sh` (initial environment setup)
- **Testing**: `npm test` (Jest), `npm run test:watch`, `npm run test:coverage`, `jest <filename>` (single test file)
- **Security**: `npm run security-audit` (security audit script)

## Architecture
- **Backend**: Express.js + TypeScript (src/), PostgreSQL cache + Airtable primary, JWT auth, magic link via Loops
- **Database**: PostgreSQL local cache (Docker), syncs from Airtable every 2 minutes, SSL-enabled, read-only user for queries
- **Frontend**: Next.js 14 + TypeScript (frontend/src/), Tailwind CSS, React hooks
- **Structure**: src/{routes,services,middleware,types,utils}/, frontend/src/{app,components,hooks,lib}/
- **APIs**: REST endpoints (/api/auth, /api/events, /api/dashboard, /api/admin-console), PostgreSQL query layer
- **Auth**: Magic link → JWT tokens, passwordless authentication
- **Admin Console**: Claude-powered natural language SQL queries on PostgreSQL (requires ANTHROPIC_API_KEY)
- **Sync**: Automated Airtable → PostgreSQL sync with error handling, audit logging, PII protection

## Code Style
- **TypeScript**: Strict mode, interfaces for all data structures, explicit types
- **Imports**: Absolute paths with @ aliases (@/components, @/hooks, @/types, @/lib)
- **Naming**: camelCase variables/functions, PascalCase classes/interfaces, kebab-case files
- **Error handling**: try/catch with ApiResponse<T> pattern, console.error for logging
- **Components**: Functional components with hooks, defensive programming with default values
- **Services**: Class-based with singleton exports (authService, airtableService, claudeService, databaseService, syncService)
- **Routes**: Express router pattern with middleware, typed request/response interfaces
- **Security**: Read-only DB user for queries, SQL injection prevention, input sanitization, SSL connections
