import { airtableService } from './airtableService';
import { DashboardData, DashboardStats, EventCardData } from '../types/dashboard';
import { Event } from '../types/event';

interface DashboardFilters {
  triageStatus?: string;
}

export class DashboardService {
  static async getDashboardData(organizerEmail: string, isAdmin: boolean = false, filters?: DashboardFilters): Promise<DashboardData> {
    let events: Event[];
    
    if (isAdmin) {
      // Get all events for admin users
      events = await airtableService.getAllEvents();
      console.log(`Found ${events.length} events for admin ${organizerEmail}`);
    } else {
      // Get only organizer's events for regular users
      events = await airtableService.getEventsByOrganizer(organizerEmail);
      console.log(`Found ${events.length} events for ${organizerEmail}:`, events.map(e => ({ name: e.eventName, format: e.eventFormat })));
    }
    
    // Apply filters if provided
    if (filters?.triageStatus) {
      console.log(`Filtering events by triageStatus: ${filters.triageStatus}`);
      events = events.filter(event => event.triageStatus === filters.triageStatus);
      console.log(`After filtering: ${events.length} events remaining`);
    }
    
    // Create event cards without attendee data, including POC fields for admins
    const eventCards = events.map(event => this.createEventCard(event, isAdmin));
    
    // Calculate overall stats
    const stats = this.calculateDashboardStats(events, eventCards);

    return {
      organizerEmail,
      stats,
      events: eventCards,
      recentActivity: [], // TODO: Implement activity tracking
    };
  }

  private static createEventCard(event: Event, isAdmin: boolean = false): EventCardData {
    const attendeeCount = 0; // No attendee tracking
    const estimatedCount = event.estimatedAttendeeCount || 0;
    const capacityPercentage = 0; // No capacity tracking without attendees
    
    const capacityStatus = this.getCapacityStatus(capacityPercentage);
    
    // For Daydream events, they're mostly one-time hackathons, so we'll consider them upcoming if approved
    const isUpcoming = event.triageStatus === 'Approved';
    const daysUntilEvent = 0; // Since these are planned events without specific dates yet
    
    // Use the country field directly from your data
    const countryCode = this.getCountryCode(event.country);

    console.log(`Event ${event.eventName} eventFormat:`, event.eventFormat);
    
    const eventCard: EventCardData = {
      id: event.id,
      name: event.eventName,
      startDate: new Date().toISOString(), // Placeholder
      endDate: new Date().toISOString(), // Placeholder
      location: event.location,
      country: event.country,
      countryCode,
      attendeeCount,
      maxAttendees: event.estimatedAttendeeCount,
      capacityPercentage,
      capacityStatus,
      status: DashboardService.mapTriageStatusToEventStatus(event.triageStatus), // 'draft', 'published', etc.
      isUpcoming,
      daysUntilEvent,
      eventFormat: event.eventFormat,
      hasConfirmedVenue: event.hasConfirmedVenue,
    };

    // Include POC fields for admin users
    if (isAdmin) {
      (eventCard as any).pocFirstName = event.pocFirstName;
      (eventCard as any).pocLastName = event.pocLastName;
      (eventCard as any).pocPreferredName = event.pocPreferredName;
      (eventCard as any).pocSlackId = event.pocSlackId;
      (eventCard as any).pocAge = event.pocAge;
      (eventCard as any).organizerEmail = event.email;
      (eventCard as any).description = event.description;
      (eventCard as any).tags = event.tags;
      (eventCard as any).website = event.website;
      (eventCard as any).contactInfo = event.contactInfo;
      (eventCard as any).streetAddress = event.streetAddress;
      (eventCard as any).streetAddress2 = event.streetAddress2;
      (eventCard as any).city = event.city;
      (eventCard as any).state = event.state;
      (eventCard as any).zipcode = event.zipcode;
      (eventCard as any).triageStatus = event.triageStatus;
    }

    return eventCard;
  }

  private static mapTriageStatusToEventStatus(triageStatus?: string): 'draft' | 'published' | 'cancelled' | 'completed' {
    if (!triageStatus) return 'draft';
    
    const status = triageStatus.toLowerCase();
    switch (status) {
      case 'approved':
      case 'live':
      case 'published':
        return 'published';
      case 'completed':
      case 'finished':
      case 'ended':
        return 'completed';
      case 'cancelled':
      case 'canceled':
      case 'rejected':
        return 'cancelled';
      case 'pending':
      case 'draft':
      case 'awaiting approval':
      default:
        return 'draft';
    }
  }

  private static calculateDashboardStats(events: Event[], eventCards: EventCardData[]): DashboardStats {
    const totalEvents = events.length;
    const totalAttendees = eventCards.reduce((sum, event) => sum + event.attendeeCount, 0);
    const upcomingEvents = eventCards.filter(event => event.isUpcoming).length;
    const totalCapacity = eventCards.reduce((sum, event) => sum + (event.maxAttendees || 0), 0);
    
    const uniqueCountries = new Set(
      eventCards
        .map(event => event.country)
        .filter(country => country)
    ).size;

    const avgCapacityUtilization = totalCapacity > 0 
      ? Math.round((totalAttendees / totalCapacity) * 100)
      : 0;

    return {
      totalEvents,
      totalAttendees,
      upcomingEvents,
      uniqueCountries,
      totalCapacity,
      avgCapacityUtilization,
    };
  }

  private static getCapacityStatus(percentage: number): 'low' | 'medium' | 'high' | 'full' {
    if (percentage >= 100) return 'full';
    if (percentage >= 80) return 'high';
    if (percentage >= 50) return 'medium';
    return 'low';
  }

  private static calculateDaysUntilEvent(startDate: string): number {
    const eventDate = new Date(startDate);
    const now = new Date();
    const timeDiff = eventDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  private static getCountryCode(country: string): string {
    // Map country names to country codes for flags
    const countryMappings: Record<string, string> = {
      'United States': 'US',
      'United Kingdom': 'GB',
      'Canada': 'CA',
      'Germany': 'DE',
      'France': 'FR',
      'Japan': 'JP',
      'Australia': 'AU',
      'India': 'IN',
      'Singapore': 'SG',
      'Netherlands': 'NL',
      'Sweden': 'SE',
      'Brazil': 'BR',
      'China': 'CN',
      'Poland': 'PL',
      'Spain': 'ES',
      'Italy': 'IT',
      'Switzerland': 'CH',
      'Belgium': 'BE',
      'Norway': 'NO',
      'Finland': 'FI',
      'Denmark': 'DK',
      'South Korea': 'KR',
      'Mexico': 'MX',
      'Pakistan': 'PK',
      'Bangladesh': 'BD',
      'Nepal': 'NP',
      'Egypt': 'EG',
      'Turkey': 'TR',
      'Morocco': 'MA',
      'Nigeria': 'NG',
      'South Africa': 'ZA',
      'Thailand': 'TH',
      'Vietnam': 'VN',
      'Malaysia': 'MY',
      'Philippines': 'PH',
      'Indonesia': 'ID',
      'New Zealand': 'NZ',
      'Chile': 'CL',
      'Argentina': 'AR',
      'Colombia': 'CO',
      'Peru': 'PE',
      'Venezuela': 'VE',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Romania': 'RO',
      'Bulgaria': 'BG',
      'Croatia': 'HR',
      'Serbia': 'RS',
      'Ukraine': 'UA',
      'Russia': 'RU',
      'Israel': 'IL',
      'United Arab Emirates': 'AE',
      'Saudi Arabia': 'SA',
      'Qatar': 'QA',
      'Kuwait': 'KW',
      'Jordan': 'JO',
      'Lebanon': 'LB',
      'Iran': 'IR',
      'Iraq': 'IQ',
      'Afghanistan': 'AF',
      'Sri Lanka': 'LK',
      'Myanmar': 'MM',
      'Cambodia': 'KH',
      'Laos': 'LA',
      'Mongolia': 'MN',
      'Taiwan': 'TW',
      'Hong Kong': 'HK',
      'Macau': 'MO',
    };

    return countryMappings[country] || 'XX'; // XX for unknown countries
  }
}
