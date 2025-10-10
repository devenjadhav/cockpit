'use client';

import { useUser } from '@clerk/nextjs';

export function useAdmin() {
  const { user, isLoaded } = useUser();

  // Check if user has org:hq_admin role
  const isAdmin = user?.organizationMemberships?.some(
    membership => membership.role === 'org:hq_admin'
  ) || false;

  return {
    isAdmin,
    loading: !isLoaded,
  };
}
