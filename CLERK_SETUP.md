# Clerk Authentication Setup Guide

This application now uses [Clerk](https://clerk.com/) for authentication instead of the previous magic link system.

## Quick Setup

### 1. Create a Clerk Account

1. Go to [https://clerk.com/](https://clerk.com/) and sign up
2. Create a new application
3. From the [API keys page](https://dashboard.clerk.com/last-active?path=api-keys), copy your:
   - Publishable Key
   - Secret Key

### 2. Configure Environment Variables

#### Frontend (.env.local in /frontend)

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

#### Backend (.env in root)

```bash
CLERK_SECRET_KEY=sk_test_...
```

### 3. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ..
npm install
```

### 4. Run the Application

```bash
# Using the local run script
./run-local.sh

# Or manually:
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Key Changes from Magic Link Authentication

### What Was Removed

- ❌ Magic link email system via Loops
- ❌ Custom JWT token generation and verification
- ❌ `/api/auth/request-login` and `/api/auth/verify-token` endpoints
- ❌ Token storage in localStorage
- ❌ Custom login/verify pages

### What Was Added

- ✅ Clerk authentication middleware
- ✅ Clerk token verification in backend
- ✅ Pre-built sign-in/sign-up UI components
- ✅ User management via Clerk Dashboard
- ✅ Secure session management
- ✅ `/sign-in` and `/sign-up` routes

## User Management

### Adding Users

Users can now sign up directly through the `/sign-up` page, or you can invite them through the Clerk Dashboard:

1. Go to your Clerk Dashboard
2. Navigate to Users → Invitations
3. Send email invitations

### Setting Admin Permissions

To make a user an admin:

1. Go to Clerk Dashboard → Users
2. Select the user
3. Navigate to "Public metadata"
4. Add the following JSON:

```json
{
  "isAdmin": true
}
```

## Authentication Flow

### Frontend

1. User visits the app
2. Clerk middleware checks authentication status
3. If not authenticated, redirects to `/sign-in`
4. After sign-in, redirects to `/dashboard`
5. All API calls include Clerk session token automatically

### Backend

1. Express middleware extracts Bearer token from Authorization header
2. Verifies token with Clerk SDK
3. Fetches user details from Clerk
4. Attaches user info (email, isAdmin, clerkId) to request object
5. Protected routes can access `req.user`

## Development vs Production

### Development

- Use test keys (`pk_test_...` and `sk_test_...`)
- Clerk provides a test environment with generous limits

### Production

- Switch to production keys from Clerk Dashboard
- Update environment variables in your deployment platform
- Configure custom domains if needed (optional)

## Troubleshooting

### "Invalid or expired token" errors

- Ensure `CLERK_SECRET_KEY` matches in both frontend and backend .env files
- Check that the key is from the same Clerk application

### Users can't access protected routes

- Verify the user exists in Clerk Dashboard
- Check browser console for authentication errors
- Ensure API client is properly initialized with token provider

### Admin features not showing

- Verify user has `isAdmin: true` in public metadata
- Check backend logs for token verification issues

## Migration from Old System

If you have existing users from the magic link system:

1. Export organizer emails from Airtable
2. Send Clerk invitations to all organizers
3. Users will create new accounts with Clerk
4. Old JWT tokens will no longer work

## Security Notes

- Never commit `.env` or `.env.local` files
- Rotate keys if accidentally exposed
- Use Clerk Dashboard to monitor suspicious activity
- Enable MFA for admin users (recommended)

## Support

- Clerk Documentation: [https://clerk.com/docs](https://clerk.com/docs)
- Clerk Support: Available in Clerk Dashboard
