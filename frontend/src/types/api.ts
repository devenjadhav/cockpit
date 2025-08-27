export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DashboardStats {
  totalEvents: number;
  totalAttendees: number;
  upcomingEvents: number;
  uniqueCountries: number;
  totalCapacity: number;
  avgCapacityUtilization: number;
}

export interface EventCardData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location?: string;
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  countryCode?: string;
  attendeeCount: number;
  maxAttendees?: number;
  capacityPercentage: number;
  capacityStatus: 'low' | 'medium' | 'high' | 'full';
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  isUpcoming: boolean;
  daysUntilEvent: number;
  eventFormat?: string;
  hasConfirmedVenue?: boolean;
}

export interface DashboardData {
  organizerEmail: string;
  stats: DashboardStats;
  events: EventCardData[];
  recentActivity: ActivityItem[];
  userProfile?: {
    pocPreferredName?: string;
  };
}

export interface ActivityItem {
  id: string;
  type: 'new_registration' | 'event_updated' | 'capacity_reached' | 'event_published';
  eventName: string;
  eventId: string;
  description: string;
  timestamp: string;
  attendeeName?: string;
}

export interface AuthUser {
  email: string;
}

export interface LoginRequest {
  email: string;
  type?: 'magic-link';
}

export interface VerifyTokenRequest {
  email: string;
  token: string;
}

export interface AuthResponse {
  success: boolean;
  jwt?: string;
  message: string;
}

export interface Attendee {
  id: string;
  email: string;
  preferredName?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  phone?: string;
  deleted_in_cockpit?: boolean; // Soft delete flag
}
