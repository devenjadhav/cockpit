# Clerk Role-Based Admin Authentication

## Overview
This document describes the implementation of Clerk role-based authentication for admin users using the `org:hq_admin` role.

## Changes Made

### Access Control Pages

Both the `/admin` and `/admin/health` pages now use Clerk role-based access control:

**Features:**
- Automatically redirect to `/sign-in` if user is not authenticated
- Show "Access Denied" message if user doesn't have `org:hq_admin` role
- Display loading state while checking authentication
- Only fetch data when user is verified as admin

**Updated Pages:**
- `frontend/src/app/admin/page.tsx` - Admin events page
- `frontend/src/app/admin/health/page.tsx` - Health dashboard page

### Backend Changes

#### 1. Updated Middleware (`src/middleware/auth.ts`)
- **Before**: Checked `user.publicMetadata?.isAdmin` flag
- **After**: Checks if user has `org:hq_admin` role in their organization memberships

```typescript
const orgMemberships = (user as any).organizationMemberships as OrganizationMembership[] | undefined;
const isAdmin = orgMemberships?.some(
  (membership: OrganizationMembership) => membership.role === 'org:hq_admin'
) || false;
```

#### 2. Affected Middleware Files
- `src/middleware/auth.ts` - Both `authenticateToken` and `optionalAuth` functions updated
- `src/middleware/adminOnly.ts` - No changes needed (uses `req.user.isAdmin` set by auth middleware)

### Frontend Changes

#### 1. Created Admin Hook (`frontend/src/hooks/useAdmin.tsx`)
New hook that checks if the current user has the `org:hq_admin` role:

```typescript
export function useAdmin() {
  const { user, isLoaded } = useUser();
  
  const isAdmin = user?.organizationMemberships?.some(
    membership => membership.role === 'org:hq_admin'
  ) || false;

  return { isAdmin, loading: !isLoaded };
}
```

#### 2. Updated Components
Replaced API-based admin checks with the new `useAdmin` hook:

- **`frontend/src/components/Dashboard.tsx`**
  - Removed: `checkAdminStatusAndProfile` function
  - Added: `useAdmin` hook
  - Simplified admin profile fetching logic

- **`frontend/src/app/admin/page.tsx`**
  - Removed: `checkAdminStatus` function and `isAdmin` state
  - Added: `useAdmin` hook
  - Combined loading states into single useEffect

- **`frontend/src/app/events/[eventId]/page.tsx`**
  - Removed: `checkAdminStatus` function and `isAdmin` state
  - Added: `useAdmin` hook

## How to Grant Admin Access

### Option 1: Using Clerk Dashboard
1. Go to your Clerk Dashboard
2. Navigate to Organizations
3. Select the organization
4. Add the user to the organization with role: `org:hq_admin`

### Option 2: Using Clerk API
```javascript
await clerkClient.organizations.updateOrganizationMembership({
  organizationId: 'org_xxx',
  userId: 'user_xxx',
  role: 'org:hq_admin'
});
```

## Benefits

1. **Centralized Role Management**: Admin roles are managed in Clerk, not in application metadata
2. **Organization-Based**: Supports multiple organizations with different admin sets
3. **Real-Time Updates**: Changes to roles in Clerk are immediately reflected
4. **Type Safety**: Frontend hook provides type-safe admin status
5. **Reduced API Calls**: Frontend checks admin status from Clerk session instead of API calls

## Migration Notes

### For Existing Admins
Existing admins using `publicMetadata.isAdmin` will need to be:
1. Added to an organization in Clerk
2. Assigned the `org:hq_admin` role

### Backend Compatibility
The backend changes are backward compatible - the `isAdmin` flag is still set on `req.user` and used by existing middleware like `requireAdmin`.

## Testing

Build commands passed successfully:
- Backend: `npm run build` ✓
- Frontend: `cd frontend && npm run build` ✓

## Files Modified

### Backend
- `src/middleware/auth.ts`

### Frontend
- `frontend/src/hooks/useAdmin.tsx` (new)
- `frontend/src/components/Dashboard.tsx`
- `frontend/src/app/admin/page.tsx`
- `frontend/src/app/admin/health/page.tsx`
- `frontend/src/app/events/[eventId]/page.tsx`

## Security Considerations

- Role checking happens on both frontend (UX) and backend (security)
- Backend middleware validates the Clerk token and checks roles server-side
- Frontend hook provides real-time UI updates based on role
- No sensitive operations rely solely on frontend checks
