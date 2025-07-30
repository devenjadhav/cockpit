# Daydream Portal - Agent Guide

## Commands
- **Backend**: `npm run dev` (port 3001), `npm run build`, `npm run start`
- **Frontend**: `cd frontend && npm run dev` (port 3000), `npm run build`, `npm run lint`
- **Full stack**: `./run-local.sh` (starts both servers with logging)
- **Setup**: `./setup.sh` (initial environment setup)
- **Testing**: No automated tests configured - uses manual testing with test-data.sql

## Architecture
- **Backend**: Express.js + TypeScript (src/), Airtable DB, JWT auth, magic link via Loops
- **Frontend**: Next.js 14 + TypeScript (frontend/src/), Tailwind CSS, React hooks
- **Structure**: src/{routes,services,middleware,types,utils}/, frontend/src/{app,components,hooks,lib}/
- **APIs**: REST endpoints (/api/auth, /api/events, /api/dashboard), Airtable service layer
- **Auth**: Magic link → JWT tokens, passwordless authentication

## Code Style
- **TypeScript**: Strict mode, interfaces for all data structures, explicit types
- **Imports**: Absolute paths with @ aliases (@/components, @/hooks, @/types, @/lib)
- **Naming**: camelCase variables/functions, PascalCase classes/interfaces, kebab-case files
- **Error handling**: try/catch with ApiResponse<T> pattern, console.error for logging
- **Components**: Functional components with hooks, defensive programming with default values
- **Services**: Class-based with singleton exports (authService, airtableService)
- **Routes**: Express router pattern with middleware, typed request/response interfaces
