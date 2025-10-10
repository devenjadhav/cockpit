# Authentication Troubleshooting Guide

## Latest Fix (JsonWebTokenError: invalid algorithm)

**Problem**: `Admin auth error: JsonWebTokenError: invalid algorithm`

**Root Cause**: The old `adminAuth` middleware was trying to verify Clerk JWT tokens using the old `jsonwebtoken` library with `JWT_SECRET`. Clerk uses a different algorithm (RS256) than our old JWT tokens (HS256).

**Solution**: Replaced all `adminAuth` middleware with the combination of:
- `authenticateToken` - Verifies Clerk token and sets `req.user`
- `requireAdmin` - Checks if `req.user.isAdmin` is true

**Files Updated**:
- `src/middleware/adminAuth.ts` - Deprecated, now just checks if user already authenticated
- `src/routes/admin.ts` - Updated all routes
- `src/routes/adminConsole.ts` - Updated all routes
- `src/routes/health.ts` - Updated all routes
- `src/routes/security.ts` - Updated all routes

## Current Issues Fixed

### 1. Request Timeouts
**Problem**: All API requests were timing out after 30 seconds
**Cause**: Clerk's `verifyToken()` was hanging, likely due to network issues or invalid configuration
**Fix**: Added 5-second timeout wrapper around Clerk verification

### 2. CORS Errors  
**Problem**: Frontend couldn't connect to backend (wrong port)
**Fix**: 
- Updated `package.json` dev script to set `NODE_ENV=development`
- This enables localhost:3000 and localhost:3001 in CORS allowed origins

### 3. Missing Auth Token
**Problem**: 401 Unauthorized errors
**Likely Causes**:
- Clerk not properly configured in frontend
- User not signed in
- Token provider not initialized

## Steps to Resolve Your Current Issue

### 1. Verify Environment Variables

**Backend** (`/Users/deven/src/cockpit/.env`):
```bash
CLERK_SECRET_KEY=sk_test_... # Must start with sk_test_ or sk_live_
NODE_ENV=development
PORT=3001
```

**Frontend** (`/Users/deven/src/cockpit/frontend/.env`):
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # Must start with pk_test_ or pk_live_
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 2. Restart Both Servers

**Backend:**
```bash
cd /Users/deven/src/cockpit
npm run dev
```

**Frontend:**
```bash
cd /Users/deven/src/cockpit/frontend  
npm run dev
```

### 3. Check Backend Logs

When you try to log in, you should see:
```
[Auth] Verifying Clerk token...
[Auth] Token verified successfully
```

If you see:
- `CLERK_SECRET_KEY is not set!` → Check backend .env file
- `Clerk verification timeout` → Network issue or invalid Clerk config
- Nothing → Token not being sent from frontend

### 4. Verify User Has Admin Role in Clerk

**Option 1: Clerk Dashboard**
1. Go to https://dashboard.clerk.com
2. Select your application
3. Go to "Organizations"
4. Add your test user to an organization
5. Set their role to: `org:hq_admin`

**Option 2: Temporarily Add Fallback**
For testing, you can temporarily modify the auth middleware to grant admin access:

```typescript
// In src/middleware/auth.ts, line ~45
const orgMemberships = (user as any).organizationMemberships as OrganizationMembership[] | undefined;
const isAdmin = orgMemberships?.some(
  (membership: OrganizationMembership) => membership.role === 'org:hq_admin'
) || user.primaryEmailAddress?.emailAddress === 'your-email@hackclub.com'; // Temporary fallback
```

### 5. Test Auth Flow

1. Sign out completely from the app
2. Open browser DevTools → Network tab
3. Sign in again
4. Watch for:
   - Clerk sign-in requests (should succeed)
   - Dashboard API call with `Authorization: Bearer ...` header
   - Backend should log token verification

## Common Issues

### Issue: "Clerk verification timeout"
**Cause**: Clerk API not reachable or secret key invalid
**Fix**:
- Verify `CLERK_SECRET_KEY` matches your Clerk dashboard
- Check internet connection
- Try regenerating the secret key in Clerk dashboard

### Issue: No Authorization header in requests
**Cause**: User not properly signed in via Clerk
**Fix**:
- Check Clerk configuration in `frontend/.env`
- Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct
- Sign out and sign in again

### Issue: 401 even with valid token
**Cause**: Token verification succeeding but user not in organization
**Fix**:
- Add user to organization in Clerk dashboard
- Assign `org:hq_admin` role
- Or use temporary fallback (see above)

### Issue: Admin UI not showing
**Cause**: `useAdmin` hook not detecting role
**Debug**:
```typescript
// Add to Dashboard component temporarily
const { user } = useUser();
console.log('Clerk user:', user);
console.log('Org memberships:', user?.organizationMemberships);
```

## Next Steps

1. Restart both servers with the updated code
2. Check backend logs for Clerk configuration warnings
3. Try signing in and watch the backend logs
4. If timeout occurs, check Clerk secret key validity
5. If 401 occurs, verify user is in organization with correct role
