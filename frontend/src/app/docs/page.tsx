'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Server,
  Database,
  Layout,
  Shield,
  Cog,
  GitBranch,
  Zap,
  Users,
  Mail,
  MessageSquare,
  RefreshCw,
  FileCode,
  Terminal,
  Key,
  Globe
} from 'lucide-react';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function CollapsibleSection({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="cockpit-panel mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-yellow-500">{icon}</span>
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-white/50" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white/50" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-white/10 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="my-3">
      {title && <p className="text-xs text-white/50 mb-1">{title}</p>}
      <pre className="bg-black/50 border border-white/20 p-3 overflow-x-auto text-sm">
        <code className="text-green-400">{children}</code>
      </pre>
    </div>
  );
}

function FileTree({ items }: { items: { name: string; description: string; indent?: number }[] }) {
  return (
    <div className="font-mono text-sm space-y-1">
      {items.map((item, index) => (
        <div key={index} className="flex" style={{ paddingLeft: `${(item.indent || 0) * 16}px` }}>
          <span className="text-yellow-500 min-w-fit">{item.name}</span>
          <span className="text-white/30 mx-2">-</span>
          <span className="text-white/60">{item.description}</span>
        </div>
      ))}
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="w-full border-b border-white/30 bg-black/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-white/50 hover:text-white transition-colors">
                <Home className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Cockpit Documentation</h1>
                <p className="text-xs text-white/50">Technical reference for the Hack Club Cockpit platform</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <div className="cockpit-panel p-6 mb-8 border-yellow-500/30">
          <h1 className="text-2xl font-bold text-white mb-4">Hack Club Cockpit</h1>
          <p className="text-white/70 mb-4">
            Cockpit is an event management portal for Hack Club hackathon organizers. It provides tools for
            managing events, tracking attendees, viewing venue information, and coordinating with the Hack Club team.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="text-center p-3 bg-white/5 border border-white/10">
              <Layout className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-xs text-white/60">Next.js Frontend</p>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10">
              <Server className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-xs text-white/60">Express Backend</p>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10">
              <Database className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-xs text-white/60">PostgreSQL + Airtable</p>
            </div>
            <div className="text-center p-3 bg-white/5 border border-white/10">
              <Shield className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <p className="text-xs text-white/60">JWT Authentication</p>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <CollapsibleSection title="Architecture Overview" icon={<GitBranch className="w-5 h-5" />} defaultOpen={true}>
          <div className="space-y-4">
            <p className="text-white/70">
              Cockpit uses a dual-database architecture with Airtable as the source of truth and PostgreSQL
              as a local cache for fast queries. Data syncs continuously from Airtable to PostgreSQL.
            </p>

            <div className="bg-black/30 p-4 border border-white/10 my-4">
              <h4 className="text-sm font-bold text-white mb-3">Data Flow</h4>
              <div className="text-sm text-white/60 font-mono">
                <p>Airtable (Source of Truth)</p>
                <p className="text-yellow-500 ml-4">|</p>
                <p className="text-yellow-500 ml-4">v  [SyncService - every 1 second]</p>
                <p className="ml-4">PostgreSQL (Local Cache)</p>
                <p className="text-yellow-500 ml-8">|</p>
                <p className="text-yellow-500 ml-8">v  [Express API]</p>
                <p className="ml-8">Next.js Frontend</p>
              </div>
            </div>

            <h4 className="text-sm font-bold text-white mt-6 mb-2">Key Design Decisions</h4>
            <ul className="list-disc list-inside text-white/60 space-y-1 text-sm">
              <li>Airtable is the canonical data source - all writes go through Airtable</li>
              <li>PostgreSQL provides fast read access and complex query capabilities</li>
              <li>Two database pools: main (read/write) and read-only (admin console)</li>
              <li>In-memory caching layer reduces API calls to Airtable</li>
              <li>Magic link authentication (passwordless) via email</li>
            </ul>
          </div>
        </CollapsibleSection>

        {/* Project Structure */}
        <CollapsibleSection title="Project Structure" icon={<FileCode className="w-5 h-5" />}>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-white mb-3">Root Directory</h4>
              <FileTree items={[
                { name: 'frontend/', description: 'Next.js frontend application' },
                { name: 'src/', description: 'Express.js backend source code' },
                { name: 'scripts/', description: 'Deployment and utility scripts' },
                { name: 'database/', description: 'Database schemas and SSL certificates' },
                { name: 'package.json', description: 'Backend dependencies and scripts' },
                { name: '.env.example', description: 'Environment variable template' },
              ]} />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-3">Backend Structure (src/)</h4>
              <FileTree items={[
                { name: 'index.ts', description: 'Express app entry point, middleware setup' },
                { name: 'routes/', description: 'API route handlers' },
                { name: '  auth.ts', description: 'Authentication endpoints', indent: 1 },
                { name: '  events.ts', description: 'Event CRUD operations', indent: 1 },
                { name: '  dashboard.ts', description: 'Dashboard data aggregation', indent: 1 },
                { name: '  admin.ts', description: 'Admin-only operations', indent: 1 },
                { name: '  adminConsole.ts', description: 'SQL query console for admins', indent: 1 },
                { name: '  signups.ts', description: 'Signup analytics (public)', indent: 1 },
                { name: '  health.ts', description: 'Health check endpoints', indent: 1 },
                { name: 'services/', description: 'Business logic layer' },
                { name: 'middleware/', description: 'Express middleware (auth, rate limiting, etc.)' },
                { name: 'security/', description: 'Security utilities (JWT, SQL sanitization)' },
                { name: 'types/', description: 'TypeScript type definitions' },
                { name: 'utils/', description: 'Helper functions and utilities' },
              ]} />
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-3">Frontend Structure (frontend/src/)</h4>
              <FileTree items={[
                { name: 'app/', description: 'Next.js App Router pages' },
                { name: '  page.tsx', description: 'Root redirect (to /dashboard or /login)', indent: 1 },
                { name: '  login/', description: 'Login page', indent: 1 },
                { name: '  dashboard/', description: 'Main dashboard view', indent: 1 },
                { name: '  events/[eventId]/', description: 'Individual event details', indent: 1 },
                { name: '  admin/', description: 'Admin pages', indent: 1 },
                { name: '  auth/verify/', description: 'Magic link verification', indent: 1 },
                { name: '  signups/', description: 'Public signup analytics globe', indent: 1 },
                { name: '  docs/', description: 'This documentation page', indent: 1 },
                { name: 'components/', description: 'Reusable React components' },
                { name: 'hooks/', description: 'Custom React hooks (useAuth, useDashboard, etc.)' },
                { name: 'lib/', description: 'Utility libraries (API client)' },
                { name: 'types/', description: 'Frontend TypeScript types' },
              ]} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Backend Services */}
        <CollapsibleSection title="Backend Services" icon={<Server className="w-5 h-5" />}>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-white">airtableService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Primary data source interface. Manages CRUD operations for events, attendees, venues, and admins.
                </p>
                <p className="text-xs text-white/40">Location: src/services/airtableService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-green-400" />
                  <h4 className="font-bold text-white">databaseService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  PostgreSQL connection management. Provides main pool for sync operations and read-only pool for admin console.
                </p>
                <p className="text-xs text-white/40">Location: src/services/databaseService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-yellow-400" />
                  <h4 className="font-bold text-white">syncService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Continuous synchronization from Airtable to PostgreSQL. Syncs venues, events, admins, and attendees every second.
                </p>
                <p className="text-xs text-white/40">Location: src/services/syncService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-red-400" />
                  <h4 className="font-bold text-white">authService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Magic link authentication. Generates tokens, sends emails via Loops, and verifies login attempts.
                </p>
                <p className="text-xs text-white/40">Location: src/services/authService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Layout className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-bold text-white">dashboardService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Aggregates data for the dashboard view. Calculates stats, formats event cards, handles admin vs. organizer views.
                </p>
                <p className="text-xs text-white/40">Location: src/services/dashboardService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  <h4 className="font-bold text-white">loopsService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Email service integration with Loops.so. Sends magic link authentication emails.
                </p>
                <p className="text-xs text-white/40">Location: src/services/loopsService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                  <h4 className="font-bold text-white">slackService / slackSyncJobService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Slack integration for notifications and channel synchronization.
                </p>
                <p className="text-xs text-white/40">Location: src/services/slackService.ts, src/services/slackSyncJobService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-orange-400" />
                  <h4 className="font-bold text-white">cacheService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  In-memory caching layer to reduce Airtable API calls. Caches events, organizer emails, and admin status.
                </p>
                <p className="text-xs text-white/40">Location: src/services/cacheService.ts</p>
              </div>

              <div className="bg-black/30 p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-white">claudeService</h4>
                </div>
                <p className="text-sm text-white/60 mb-2">
                  Integration with Anthropic Claude API for AI-powered features.
                </p>
                <p className="text-xs text-white/40">Location: src/services/claudeService.ts</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* API Endpoints */}
        <CollapsibleSection title="API Endpoints" icon={<Globe className="w-5 h-5" />}>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-bold text-white mb-2">Authentication (/api/auth)</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-green-400">POST</span> <span className="text-white/60">/request-login</span> - Request magic link email</p>
                <p><span className="text-green-400">POST</span> <span className="text-white/60">/verify-token</span> - Verify magic link and get JWT</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Dashboard (/api/dashboard)</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/</span> - Get dashboard data (events, stats)</p>
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/triage-statuses</span> - Get available triage statuses</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Events (/api/events)</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/</span> - List all events for user</p>
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/:eventId</span> - Get event details</p>
                <p><span className="text-yellow-400">PUT</span> <span className="text-white/60">/:eventId</span> - Update event</p>
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/:eventId/stats</span> - Get event statistics</p>
                <p><span className="text-yellow-400">PUT</span> <span className="text-white/60">/:eventId/attendees/:attendeeId</span> - Update attendee status</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Admin (/api/admin)</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/status</span> - Check if user is admin</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Admin Console (/api/admin-console)</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-green-400">POST</span> <span className="text-white/60">/query</span> - Execute read-only SQL query</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Signups (/api/signups) - Public</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/daily</span> - Daily signup counts</p>
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/top-events</span> - Top events by signups</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-2">Health (/api/health)</h4>
              <div className="text-sm space-y-1 font-mono">
                <p><span className="text-cyan-400">GET</span> <span className="text-white/60">/</span> - Basic health check</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Frontend Components */}
        <CollapsibleSection title="Frontend Components" icon={<Layout className="w-5 h-5" />}>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">Dashboard</h4>
                <p className="text-xs text-white/60">Main view showing events, stats, admin tools, and search functionality.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">EventCard</h4>
                <p className="text-xs text-white/60">Card display for individual events with status, location, and attendee count.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">AdminConsole</h4>
                <p className="text-xs text-white/60">SQL query interface for admins to run read-only database queries.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">AuthGuard</h4>
                <p className="text-xs text-white/60">HOC wrapper that protects routes requiring authentication.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">SignupsGlobe</h4>
                <p className="text-xs text-white/60">3D globe visualization showing event locations worldwide.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">StatsCard</h4>
                <p className="text-xs text-white/60">Display card for dashboard statistics (total events, attendees, etc.).</p>
              </div>
            </div>

            <h4 className="text-sm font-bold text-white mt-4 mb-2">Custom Hooks</h4>
            <div className="grid gap-2">
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">useAuth</h4>
                <p className="text-xs text-white/60">Authentication state, login/logout functions, JWT management.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">useDashboard</h4>
                <p className="text-xs text-white/60">Dashboard data fetching with polling and filtering support.</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">useTheme</h4>
                <p className="text-xs text-white/60">Dark/light theme toggle (currently dark-only).</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-white text-sm">useToast</h4>
                <p className="text-xs text-white/60">Toast notification system for user feedback.</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Security */}
        <CollapsibleSection title="Security" icon={<Shield className="w-5 h-5" />}>
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white mb-2">Authentication Flow</h4>
            <ol className="list-decimal list-inside text-white/60 space-y-1 text-sm">
              <li>User enters email on login page</li>
              <li>Backend verifies email exists in Airtable (organizer or admin)</li>
              <li>Magic link token generated and sent via Loops email service</li>
              <li>User clicks link, token verified, JWT issued</li>
              <li>JWT stored in localStorage, included in API requests</li>
              <li>Backend validates JWT on protected routes</li>
            </ol>

            <h4 className="text-sm font-bold text-white mt-6 mb-2">Security Middleware</h4>
            <ul className="list-disc list-inside text-white/60 space-y-1 text-sm">
              <li><strong>securityHeaders</strong> - Helmet-based HTTP security headers</li>
              <li><strong>rateLimiting</strong> - Request rate limiting per IP</li>
              <li><strong>inputValidation</strong> - Query parameter sanitization</li>
              <li><strong>sqlSanitizer</strong> - SQL injection prevention for admin console</li>
              <li><strong>auth middleware</strong> - JWT verification on protected routes</li>
              <li><strong>adminOnly middleware</strong> - Admin role verification</li>
            </ul>

            <h4 className="text-sm font-bold text-white mt-6 mb-2">Database Security</h4>
            <ul className="list-disc list-inside text-white/60 space-y-1 text-sm">
              <li>Separate read-only database user for admin console queries</li>
              <li>Parameterized queries to prevent SQL injection</li>
              <li>SSL/TLS encryption for database connections (production)</li>
              <li>Statement and query timeouts to prevent resource exhaustion</li>
            </ul>
          </div>
        </CollapsibleSection>

        {/* Configuration */}
        <CollapsibleSection title="Configuration" icon={<Cog className="w-5 h-5" />}>
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white mb-2">Environment Variables</h4>
            <CodeBlock title=".env">{`# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=your_base_id

# Anthropic Claude (AI features)
ANTHROPIC_API_KEY=your_api_key

# Authentication
JWT_SECRET=your_secure_secret_32_chars_min

# Email Service (Loops.so)
LOOPS_API_KEY=your_loops_key

# PostgreSQL Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=daydream_portal
POSTGRES_USER=daydream_user
POSTGRES_PASSWORD=your_password
POSTGRES_SSL=false

# Read-only DB User (Admin Console)
POSTGRES_READONLY_USER=readonly_user
POSTGRES_READONLY_PASSWORD=readonly_password

# Application
NODE_ENV=development
PORT=3001`}</CodeBlock>

            <h4 className="text-sm font-bold text-white mt-6 mb-2">Frontend Environment</h4>
            <CodeBlock title="frontend/.env.local">{`NEXT_PUBLIC_API_URL=http://localhost:3001/api`}</CodeBlock>
          </div>
        </CollapsibleSection>

        {/* Scripts & Deployment */}
        <CollapsibleSection title="Scripts & Deployment" icon={<Terminal className="w-5 h-5" />}>
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white mb-2">Available Scripts</h4>
            <div className="grid gap-2">
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">./setup.sh</p>
                <p className="text-white/50 text-xs mt-1">Initial project setup - installs deps, creates .env</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">./run-local.sh</p>
                <p className="text-white/50 text-xs mt-1">Start local development servers (backend + frontend)</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">npm run dev</p>
                <p className="text-white/50 text-xs mt-1">Start backend in development mode</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">npm run build</p>
                <p className="text-white/50 text-xs mt-1">Compile TypeScript to dist/</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">npm run migrate</p>
                <p className="text-white/50 text-xs mt-1">Run database migrations</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">npm test</p>
                <p className="text-white/50 text-xs mt-1">Run Jest test suite</p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10 font-mono text-sm">
                <p className="text-yellow-400">npm run security-audit</p>
                <p className="text-white/50 text-xs mt-1">Run security audit script</p>
              </div>
            </div>

            <h4 className="text-sm font-bold text-white mt-6 mb-2">Deployment Steps</h4>
            <ol className="list-decimal list-inside text-white/60 space-y-1 text-sm">
              <li>Set up PostgreSQL database with required tables</li>
              <li>Configure environment variables for production</li>
              <li>Run <code className="text-yellow-400">npm run pre-deploy</code> (migrate + build)</li>
              <li>Deploy backend to hosting platform (e.g., Railway, Render)</li>
              <li>Deploy frontend to Vercel with NEXT_PUBLIC_API_URL pointing to backend</li>
              <li>Configure SSL certificates if using custom domain</li>
            </ol>
          </div>
        </CollapsibleSection>

        {/* Database Schema */}
        <CollapsibleSection title="Database Schema" icon={<Database className="w-5 h-5" />}>
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white mb-2">Main Tables</h4>
            <div className="grid gap-3">
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-yellow-400 text-sm">events</h4>
                <p className="text-xs text-white/60 mt-1">
                  Hackathon events with organizer info, location, status, and metadata.
                  Key fields: airtable_id, event_name, email, triage_status, location, has_confirmed_venue
                </p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-yellow-400 text-sm">attendees</h4>
                <p className="text-xs text-white/60 mt-1">
                  Event attendees with contact info and check-in status.
                  Key fields: airtable_id, email, event_airtable_id, scanned_in, deleted_in_cockpit
                </p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-yellow-400 text-sm">venues</h4>
                <p className="text-xs text-white/60 mt-1">
                  Venue information linked to events.
                  Key fields: airtable_id, venue_name, event_name, address, contact info
                </p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-yellow-400 text-sm">admins</h4>
                <p className="text-xs text-white/60 mt-1">
                  Admin users with elevated permissions.
                  Key fields: airtable_id, email, user_status (admin/active/inactive)
                </p>
              </div>
              <div className="bg-black/30 p-3 border border-white/10">
                <h4 className="font-bold text-yellow-400 text-sm">sync_metadata</h4>
                <p className="text-xs text-white/60 mt-1">
                  Tracks Airtable sync status and errors for each table.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* User Roles */}
        <CollapsibleSection title="User Roles" icon={<Users className="w-5 h-5" />}>
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="bg-black/30 p-4 border border-white/10">
                <h4 className="font-bold text-cyan-400 text-sm">Organizer</h4>
                <p className="text-xs text-white/60 mt-2">
                  Regular hackathon organizers. Can only view their own events (matched by email).
                  Access to event details, attendee lists, and basic dashboard.
                </p>
              </div>
              <div className="bg-black/30 p-4 border border-yellow-500/30">
                <h4 className="font-bold text-yellow-400 text-sm">Admin</h4>
                <p className="text-xs text-white/60 mt-2">
                  Hack Club staff. Can view all events across all organizers.
                  Additional features: triage status filtering, search across all events, SQL console access.
                </p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-white/40 text-sm">
            Hack Club Cockpit Documentation
          </p>
          <p className="text-white/30 text-xs mt-2">
            Built with Next.js, Express, PostgreSQL, and Airtable
          </p>
        </div>
      </main>
    </div>
  );
}
