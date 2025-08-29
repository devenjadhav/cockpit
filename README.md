# cockpit.hackclub.dev

A hackathon organizer portal built with Express.js, Next.js, and PostgreSQL. This application helps manage hackathon events, track attendees, and provides organizers with a dashboard to monitor their events.

## Prerequisites

Before setting up the project locally, ensure you have the following installed:

- **Node.js 18.x or higher** - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker** - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- **Git** - [Install Git](https://git-scm.com/)

## External Service Requirements

You'll need accounts and API keys for the following services:

- **Airtable** - Primary data storage ([Sign up](https://airtable.com/))
- **Loops** - Email service for magic links ([Sign up](https://loops.so/))
- **Anthropic** - Claude API for admin console (optional) ([Get API key](https://console.anthropic.com/))

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd daydream-portal
```

### 2. Run Setup Script

The setup script will install dependencies and configure environment files:

```bash
./setup.sh
```

This script will:
- Check Node.js and npm installations
- Install backend dependencies
- Install frontend dependencies
- Create `.env` file from template with secure JWT secret
- Create `frontend/.env.local` file

### 3. Configure Environment Variables

Edit the `.env` file and add your API credentials:

```env
# Airtable Configuration
AIRTABLE_API_KEY=your_airtable_api_key_here
AIRTABLE_BASE_ID=your_airtable_base_id_here

# Loops Email Service
LOOPS_API_KEY=your_loops_api_key_here

# Anthropic Claude (optional, for admin console)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Database Configuration (auto-configured for local development)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=daydream_portal
POSTGRES_USER=daydream_user
POSTGRES_PASSWORD=your_secure_postgres_password_here
```

### Getting API Keys

#### Airtable Setup
1. Visit [Airtable API page](https://airtable.com/api)
2. Generate an API key (starts with `key...`)
3. Create a base or use existing one
4. Copy the Base ID from API docs (starts with `app...`)

#### Loops Setup
1. Go to [Loops API Settings](https://app.loops.so/settings/api-keys)
2. Create a new API key
3. Set up the magic link email template with ID: `cmdou0ehu03zj450ilibd1rzx`

### 4. Set Up Airtable Base

Create a table named **"daydream-events"** with the following fields:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| event_name | Single line text | Yes | Event name |
| poc_first_name | Single line text | Yes | Organizer first name |
| poc_last_name | Single line text | Yes | Organizer last name |
| location | Single line text | Yes | Event location |
| email | Email | Yes | Organizer email (used for auth) |
| city | Single line text | Yes | Event city |
| country | Single line text | Yes | Event country |
| event_format | Single line text | No | Format (e.g., "24-hours") |
| estimated_attendee_count | Number | No | Expected attendees |
| triage_status | Single line text | Yes | Status (e.g., "Approved") |
| project_url | URL | No | Organizer's project URL |
| project_description | Long text | No | Project description |
| slug | Single line text | No | URL slug |
| lat | Number | No | Latitude |
| long | Number | No | Longitude |

Optionally, create an **"Attendees"** table for tracking event attendees:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| Event ID | Single line text | Yes | Links to Events table |
| First Name | Single line text | Yes | Attendee first name |
| Last Name | Single line text | Yes | Attendee last name |
| Email | Email | Yes | Attendee email |
| Registration Date | Date | Yes | When they registered |
| Status | Single select | Yes | registered, checked-in, no-show, cancelled |

## Development

### Starting the Development Environment

Use the run script to start both backend and frontend servers:

```bash
./run-local.sh
```

This will:
- Start PostgreSQL database using Docker
- Build both backend and frontend
- Start backend server on port 3001
- Start frontend server on port 3000
- Show logs from both servers

### Manual Server Management

If you prefer to run servers separately:

#### Backend Only
```bash
npm run dev          # Development server (port 3001)
npm run build        # Build TypeScript
npm run start        # Production server
```

#### Frontend Only
```bash
cd frontend
npm run dev          # Development server (port 3000)
npm run build        # Build for production
npm run start        # Production server
npm run lint         # ESLint
```

#### Database Management
```bash
./scripts/start-postgres.sh    # Start PostgreSQL with Docker
npm run migrate                # Run database migrations
```

### Testing

```bash
npm test                       # Run all tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report
npm run test:security          # Security tests
npm run security-audit         # Security audit
```

### Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Admin Console**: http://localhost:3000/admin/health
- **Health Dashboard**: http://localhost:3001/api/health

## Project Structure

```
daydream-portal/
├── src/                    # Backend source code
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── frontend/              # Next.js frontend
│   └── src/
│       ├── app/           # Next.js app router pages
│       ├── components/    # React components
│       ├── hooks/         # Custom React hooks
│       └── lib/           # Frontend utilities
├── database/              # Database schema and migrations
├── scripts/               # Development and deployment scripts
└── logs/                  # Server logs
```

## Key Features

### Authentication System
- Passwordless authentication using magic links
- JWT-based session management
- Email verification through Loops service

### Data Management
- Primary storage in Airtable
- PostgreSQL cache with 30-second sync intervals
- Automatic data synchronization and backup

### Admin Console
- Natural language SQL queries powered by Claude
- Real-time system health monitoring
- Performance metrics and analytics

### Security Features
- Rate limiting on authentication endpoints
- Input sanitization and validation
- Read-only database user for queries
- SSL-enabled database connections
- Comprehensive security audit tools

## Troubleshooting

### Common Issues

**"Email not found" during login**
- Ensure your email exists in the Airtable Events table
- Check that the email field matches exactly

**Backend server won't start**
- Verify `.env` file has all required variables
- Check if port 3001 is available
- Run `npm install` to ensure dependencies are installed

**Frontend build errors**
- Run `npm run lint` to check for code issues
- Ensure `frontend/.env.local` exists with correct API URL
- Try deleting `frontend/.next` and rebuilding

**Database connection issues**
- Run `./scripts/start-postgres.sh` to start PostgreSQL
- Check Docker is running and accessible
- Verify database credentials in `.env` file

**Airtable sync failures**
- Confirm API key starts with "key"
- Verify Base ID starts with "app"
- Check table name is exactly "daydream-events"

### Debugging

Monitor server logs:
```bash
tail -f logs/backend.log     # Backend logs
tail -f logs/frontend.log    # Frontend logs
```

Check API health:
```bash
curl http://localhost:3001/api/health
```

### Getting Help

1. Check existing documentation in the repository
2. Review error logs in the `logs/` directory
3. Verify all environment variables are properly configured
4. Test individual API endpoints using curl or a REST client

## Contributing

When contributing to this project:

1. Follow existing TypeScript and React conventions
2. Use absolute imports with `@/` aliases
3. Maintain strict TypeScript typing
4. Add tests for new functionality
5. Run security audits before committing
6. Follow the established error handling patterns

## Production Deployment

For production deployment instructions, see `PRODUCTION.md`.

## License

MIT License - see LICENSE file for details.
