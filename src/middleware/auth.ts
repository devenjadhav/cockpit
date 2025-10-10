import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { AuthenticatedRequest } from '../types/auth';

// Validate Clerk configuration on startup
if (!process.env.CLERK_SECRET_KEY) {
  console.error('[Auth] CLERK_SECRET_KEY is not set! Authentication will fail.');
}

export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    console.log('[Auth] Verifying Clerk token...');
    
    // Add timeout to Clerk API call to prevent hanging
    const verifyWithTimeout = Promise.race([
      clerkClient.verifyToken(token),
      new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Clerk verification timeout')), 5000)
      )
    ]);
    
    const payload: any = await verifyWithTimeout;
    console.log('[Auth] Token verified successfully');
    
    if (!payload || !payload.sub) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const user = await clerkClient.users.getUser(payload.sub);
    
    if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'User not found',
      });
    }

    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
    const email = primaryEmail?.emailAddress || user.emailAddresses[0].emailAddress;

    // Get organization memberships for the user
    const memberships = await clerkClient.users.getOrganizationMembershipList({
      userId: user.id,
    });

    // Check if user has org:hq_admin role
    const isAdmin = memberships.some(
      (membership: any) => membership.role === 'org:hq_admin'
    ) || false;

    // Extract organization slug for all users (admin and non-admin)
    let organizationSlug: string | undefined = undefined;
    if (memberships.length > 0) {
      const firstMembership = memberships[0] as any;
      organizationSlug = firstMembership.organization.slug;
      console.log(`[Auth] User ${email} belongs to organization: ${organizationSlug}`);
    }

    req.user = {
      email,
      isAdmin,
      clerkId: user.id,
      organizationSlug,
    };

    next();
  } catch (error) {
    console.error('Clerk token verification error:', error);
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const payload = await clerkClient.verifyToken(token);
        
        if (payload && payload.sub) {
          const user = await clerkClient.users.getUser(payload.sub);
          
          if (user && user.emailAddresses && user.emailAddresses.length > 0) {
            const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId);
            const email = primaryEmail?.emailAddress || user.emailAddresses[0].emailAddress;
            
            // Get organization memberships for the user
            const memberships = await clerkClient.users.getOrganizationMembershipList({
              userId: user.id,
            });

            // Check if user has org:hq_admin role
            const isAdmin = memberships.some(
              (membership: any) => membership.role === 'org:hq_admin'
            ) || false;

            // Extract organization slug for non-admin users
            let organizationSlug: string | undefined = undefined;
            if (!isAdmin && memberships.length > 0) {
              const firstMembership = memberships[0] as any;
              organizationSlug = firstMembership.organization.slug;
            }
            
            req.user = {
              email,
              isAdmin,
              clerkId: user.id,
              organizationSlug,
            };
          }
        }
      } catch (error) {
        console.warn('Optional auth validation failed:', error);
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
};
