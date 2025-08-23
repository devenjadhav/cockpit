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
  country?: string;
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

export interface CountryInfo {
  code: string;
  name: string;
  flag: string;
}
