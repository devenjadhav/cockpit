import Airtable from 'airtable';
import { Event, EventFields, UpdateEventData } from '../types/event';
import { Admin, AdminFields } from '../types/admin';
import { Attendee, AttendeeFields } from '../types/attendee';
import { Venue, VenueFields } from '../types/venue';
import { cacheService } from './cacheService';

export class AirtableService {
  private base: Airtable.Base;
  private eventsTable: Airtable.Table<EventFields>;
  private adminsTable: Airtable.Table<AdminFields>;
  private attendeesTable: Airtable.Table<AttendeeFields>;
  private venuesTable: Airtable.Table<VenueFields>;

  constructor() {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in environment variables');
    }

    Airtable.configure({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    this.base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    this.eventsTable = this.base<EventFields>('events');
    this.adminsTable = this.base<AdminFields>('admins');
    this.attendeesTable = this.base<AttendeeFields>('attendees');
    this.venuesTable = this.base<VenueFields>('venues');
  }

  private mapEventRecord(record: Airtable.Record<EventFields>): Event {
    const fields = record.fields;
    return {
      id: record.id,
      name: fields.event_name, // Compatibility field
      eventName: fields.event_name,
      pocFirstName: fields.poc_first_name,
      pocLastName: fields.poc_last_name,
      location: fields.location,
      slug: fields.slug,
      streetAddress: fields.street_address,
      streetAddress2: fields.street_address_2,
      city: fields.city,
      state: fields.state,
      country: fields.country,
      zipcode: fields.zipcode,
      eventFormat: fields.event_format,
      subOrganizers: fields.sub_organizers,
      email: fields.email,
      pocPreferredName: fields.poc_preferred_name,
      pocSlackId: fields.poc_slack_id,
      pocDob: fields.poc_dob,
      pocAge: fields.poc_age,
      estimatedAttendeeCount: fields.estimated_attendee_count,
      maxAttendees: fields.estimated_attendee_count, // Compatibility field
      projectUrl: fields.project_url,
      projectDescription: fields.project_description,
      lat: fields.lat,
      long: fields.long,
      triageStatus: fields.triage_status,
      status: fields.triage_status, // Compatibility field
      startDate: fields.start_date,
      endDate: fields.end_date,
      registrationDeadline: fields.registration_deadline,
      notes: fields.notes,
      actionTriggerApprovalEmail: fields['action - trigger_approval_email'],
      actionTriggerRejectionEmail: fields['action - trigger_rejection_email'],
      actionTriggerHoldEmail: fields['action - trigger_hold_email'],
      actionTriggerAskEmail: fields['action - trigger_ask_email'],
      hasConfirmedVenue: fields.has_confirmed_venue,
    };
  }

  private mapAdminRecord(record: Airtable.Record<AdminFields>): Admin {
    const fields = record.fields;
    return {
      id: record.id,
      email: fields.email,
      firstName: fields.first_name,
      lastName: fields.last_name,
      userStatus: fields.user_status,
    };
  }

  async getEventsByOrganizer(organizerEmail: string): Promise<Event[]> {
    // Check cache first
    const cacheKey = cacheService.getEventsCacheKey(organizerEmail);
    const cachedEvents = cacheService.get<Event[]>(cacheKey);
    if (cachedEvents) {
      return cachedEvents;
    }

    try {
      const records = await this.eventsTable
        .select({
          filterByFormula: `{email} = "${organizerEmail}"`,
          sort: [{ field: 'event_name', direction: 'asc' }],
        })
        .all();

      const events = records.map(record => this.mapEventRecord(record));
      
      // Cache the results
      cacheService.cacheEventsByOrganizer(organizerEmail, events);
      
      return events;
    } catch (error) {
      throw new Error(`Failed to fetch events for organizer ${organizerEmail}: ${error}`);
    }
  }

  async getEventsByOrganizationSlug(organizationSlug: string): Promise<Event[]> {
    console.log(`[AirtableService] getEventsByOrganizationSlug called with organizationSlug: ${organizationSlug}`);
    
    // Check cache first
    const cacheKey = `events:org:${organizationSlug}`;
    const cachedEvents = cacheService.get<Event[]>(cacheKey);
    if (cachedEvents) {
      console.log(`[AirtableService] Returning ${cachedEvents.length} cached events for organization ${organizationSlug}`);
      return cachedEvents;
    }

    try {
      const filterFormula = `{slug} = "${organizationSlug}"`;
      console.log(`[AirtableService] Querying Airtable with formula: ${filterFormula}`);
      
      const records = await this.eventsTable
        .select({
          filterByFormula: filterFormula,
          sort: [{ field: 'event_name', direction: 'asc' }],
        })
        .all();

      console.log(`[AirtableService] Airtable returned ${records.length} records`);
      const events = records.map(record => this.mapEventRecord(record));
      
      // Log sample event slugs to debug
      if (events.length > 0) {
        console.log(`[AirtableService] Sample event slugs: ${events.slice(0, 3).map(e => e.slug).join(', ')}`);
      }
      
      // Cache the results
      cacheService.set(cacheKey, events, 5 * 60 * 1000); // 5 minutes
      
      return events;
    } catch (error) {
      console.error(`[AirtableService] Error fetching events for organization ${organizationSlug}:`, error);
      throw new Error(`Failed to fetch events for organization ${organizationSlug}: ${error}`);
    }
  }

  async getEventById(eventId: string): Promise<Event | null> {
    // Check cache first
    const cacheKey = cacheService.getEventCacheKey(eventId);
    const cachedEvent = cacheService.get<Event>(cacheKey);
    if (cachedEvent) {
      return cachedEvent;
    }

    try {
      const record = await this.eventsTable.find(eventId);
      const event = this.mapEventRecord(record);
      
      // Cache the result
      cacheService.cacheEvent(eventId, event);
      
      return event;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record not found')) {
        return null;
      }
      throw new Error(`Failed to fetch event ${eventId}: ${error}`);
    }
  }

  async updateEvent(eventId: string, updateData: UpdateEventData): Promise<Event> {
    try {
      const updateFields: Partial<EventFields> = {};

      // Skip event_name as it's a computed field in Airtable
      // if (updateData.eventName !== undefined) updateFields.event_name = updateData.eventName;
      if (updateData.pocFirstName !== undefined) updateFields.poc_first_name = updateData.pocFirstName;
      if (updateData.pocLastName !== undefined) updateFields.poc_last_name = updateData.pocLastName;
      if (updateData.pocPreferredName !== undefined) updateFields.poc_preferred_name = updateData.pocPreferredName;
      if (updateData.pocSlackId !== undefined) updateFields.poc_slack_id = updateData.pocSlackId;
      // poc_age is computed from poc_dob, so we don't update it directly
      // if (updateData.pocAge !== undefined) updateFields.poc_age = updateData.pocAge;
      if (updateData.location !== undefined) updateFields.location = updateData.location;
      if (updateData.streetAddress !== undefined) updateFields.street_address = updateData.streetAddress;
      if (updateData.streetAddress2 !== undefined) updateFields.street_address_2 = updateData.streetAddress2;
      if (updateData.city !== undefined) updateFields.city = updateData.city;
      if (updateData.state !== undefined) updateFields.state = updateData.state;
      if (updateData.zipcode !== undefined) updateFields.zipcode = updateData.zipcode;
      if (updateData.country !== undefined) updateFields.country = updateData.country;
      if (updateData.eventFormat !== undefined) updateFields.event_format = updateData.eventFormat;
      if (updateData.estimatedAttendeeCount !== undefined) updateFields.estimated_attendee_count = updateData.estimatedAttendeeCount;
      if (updateData.projectUrl !== undefined) updateFields.project_url = updateData.projectUrl;
      if (updateData.projectDescription !== undefined) updateFields.project_description = updateData.projectDescription;
      if (updateData.triageStatus !== undefined) updateFields.triage_status = updateData.triageStatus;
      if (updateData.notes !== undefined) updateFields.notes = updateData.notes;

      const record = await this.eventsTable.update(eventId, updateFields);
      const updatedEvent = this.mapEventRecord(record);
      
      // Invalidate related caches since the event was updated
      cacheService.invalidateEventCaches(eventId, updatedEvent.email);
      
      return updatedEvent;
    } catch (error) {
      throw new Error(`Failed to update event ${eventId}: ${error}`);
    }
  }

  async getAllOrganizerEmails(): Promise<string[]> {
    // Check cache first
    const cacheKey = cacheService.getOrganizerEmailsCacheKey();
    const cachedEmails = cacheService.get<string[]>(cacheKey);
    if (cachedEmails) {
      return cachedEmails;
    }

    try {
      const records = await this.eventsTable
        .select({
          fields: ['email'],
        })
        .all();

      const emails = records
        .map(record => record.fields.email)
        .filter((email, index, self) => email && self.indexOf(email) === index);
      
      // Cache the results
      cacheService.cacheOrganizerEmails(emails);
      
      return emails;
    } catch (error) {
      console.error('Airtable error details:', error);
      throw new Error(`Failed to fetch organizer emails: ${error}`);
    }
  }

  async getAllEvents(): Promise<Event[]> {
    // Check cache first
    const cacheKey = 'all-events';
    const cachedEvents = cacheService.get<Event[]>(cacheKey);
    if (cachedEvents) {
      return cachedEvents;
    }

    try {
      const records = await this.eventsTable
        .select({
          sort: [{ field: 'event_name', direction: 'asc' }],

        })
        .all();
      const events = records.map(record => this.mapEventRecord(record));
      
      // Cache the results for 2 minutes
      cacheService.set(cacheKey, events, 2 * 60 * 1000);
      
      return events;
    } catch (error) {
      throw new Error(`Failed to fetch all events: ${error}`);
    }
  }

  async isAdmin(email: string): Promise<boolean> {
    // Check cache first
    const cacheKey = `admin-check:${email}`;
    const cachedResult = cacheService.get<boolean>(cacheKey);
    if (cachedResult !== null) {
      return cachedResult;
    }

    try {
      const records = await this.adminsTable
        .select({
          filterByFormula: `{email} = "${email}"`,
          maxRecords: 1
        })
        .all();

      const isAdmin = records.length > 0 && (records[0].fields.user_status === 'active' || records[0].fields.user_status === 'admin');
      
      // Cache the result for 10 minutes
      cacheService.set(cacheKey, isAdmin, 10 * 60 * 1000);
      
      return isAdmin;
    } catch (error) {
      console.error('Admin check error:', error);
      return false;
    }
  }

  async getAdminByEmail(email: string): Promise<Admin | null> {
    try {
      const records = await this.adminsTable
        .select({
          filterByFormula: `{email} = "${email}"`,
          maxRecords: 1
        })
        .all();

      if (records.length === 0) {
        return null;
      }

      return this.mapAdminRecord(records[0]);
    } catch (error) {
      throw new Error(`Failed to fetch admin ${email}: ${error}`);
    }
  }

  async getAllAdmins(): Promise<Admin[]> {
    try {
      const records = await this.adminsTable
        .select()
        .all();
      const admins = records.map(record => this.mapAdminRecord(record));
      
      return admins;
    } catch (error) {
      throw new Error(`Failed to fetch all admins: ${error}`);
    }
  }

  async checkEmailAccess(email: string): Promise<{ hasAccess: boolean; isAdmin: boolean; adminData?: Admin }> {
    try {
      const normalizedEmail = email.toLowerCase();
      
      // Check admin table first
      const adminRecord = await this.getAdminByEmail(normalizedEmail);
      if (adminRecord) {
        console.log(`[Email Access Check] Admin record found for ${normalizedEmail}:`, {
          id: adminRecord.id,
          email: adminRecord.email,
          userStatus: adminRecord.userStatus,
          firstName: adminRecord.firstName,
          lastName: adminRecord.lastName
        });
        const isAdmin = adminRecord.userStatus === 'admin';
        console.log(`[Email Access Check] isAdmin result: ${isAdmin} (userStatus: "${adminRecord.userStatus}")`);
        return {
          hasAccess: true,
          isAdmin,
          adminData: adminRecord
        };
      }

      // Check events table
      const eventRecords = await this.eventsTable
        .select({
          filterByFormula: `{email} = "${normalizedEmail}"`,
          maxRecords: 1
        })
        .all();

      const hasEventAccess = eventRecords.length > 0;

      return {
        hasAccess: hasEventAccess,
        isAdmin: false
      };
    } catch (error) {
      console.error('Email access check error:', error);
      return {
        hasAccess: false,
        isAdmin: false
      };
    }
  }

  private mapAttendeeRecord(record: Airtable.Record<AttendeeFields>): Attendee {
    const fields = record.fields;
    return {
      id: record.id,
      email: fields.email,
      preferredName: fields.preferred_name,
      firstName: fields.first_name,
      lastName: fields.last_name,
      dob: fields.dob ? new Date(fields.dob) : undefined,
      phone: fields.phone,
      event: Array.isArray(fields.event) && fields.event.length > 0 ? fields.event[0] : undefined,
      deleted_in_cockpit: fields.deleted_in_cockpit || false,
      event_volunteer: fields.event_volunteer || false,
      shirt_size: fields.shirt_size,
      additional_accommodations: fields.additional_accommodations,
      dietary_restrictions: fields.dietary_restrictions,
      emergency_contact_1_phone: fields.emergency_contact_1_phone,
      emergency_contact_1_name: fields.emergency_contact_1_name,
      checkin_completed: fields.checkin_completed || false,
      scanned_in: fields.scanned_in || false,
      referral_information: fields.referral_information
    };
  }

  private mapVenueRecord(record: Airtable.Record<VenueFields>): Venue {
    const fields = record.fields;
    return {
      id: record.id,
      venueId: fields.venue_id,
      eventName: fields.event_name,
      venueName: fields.venue_name,
      address1: fields.address_1,
      address2: fields.address_2,
      city: fields.city,
      state: fields.state,
      country: fields.country,
      zipCode: fields.zip_code,
      venueContactName: fields.venue_contact_name,
      venueContactEmail: fields.venue_contact_email,
    };
  }

  async getAllAttendees(): Promise<Attendee[]> {
    try {
      const records = await this.attendeesTable
        .select({
          sort: [{ field: 'email', direction: 'asc' }]
        })
        .all();

      return records.map(record => this.mapAttendeeRecord(record));
    } catch (error) {
      console.error('Error fetching attendees from Airtable:', error);
      throw error;
    }
  }

  async getAttendeesByEvent(eventAirtableId: string): Promise<Attendee[]> {
    try {
      const records = await this.attendeesTable
        .select({
          filterByFormula: `FIND("${eventAirtableId}", ARRAYJOIN({event})) > 0`,
          sort: [{ field: 'email', direction: 'asc' }]
        })
        .all();

      return records.map(record => this.mapAttendeeRecord(record));
    } catch (error) {
      console.error('Error fetching attendees for event from Airtable:', error);
      throw error;
    }
  }

  async getAllVenues(): Promise<Venue[]> {
    try {
      const records = await this.venuesTable
        .select({
          sort: [{ field: 'event_name', direction: 'asc' }]
        })
        .all();
      return records.map(record => this.mapVenueRecord(record));
    } catch (error) {
      console.error('Error fetching venues from Airtable:', error);
      throw error;
    }
  }

  async getVenueByEventName(eventName: string): Promise<Venue | null> {
    try {
      const records = await this.venuesTable
        .select({
          filterByFormula: `{event_name} = "${eventName}"`,
          maxRecords: 1
        })
        .all();

      if (records.length === 0) {
        return null;
      }

      return this.mapVenueRecord(records[0]);
    } catch (error) {
      console.error('Error fetching venue for event from Airtable:', error);
      throw error;
    }
  }

  async updateAttendeeDeletedStatus(attendeeId: string, deleted_in_cockpit: boolean): Promise<void> {
    try {
      await this.attendeesTable.update([
        {
          id: attendeeId,
          fields: {
            deleted_in_cockpit
          }
        }
      ]);
      
      console.log(`Updated attendee ${attendeeId} deleted_in_cockpit to ${deleted_in_cockpit}`);
    } catch (error) {
      console.error('Error updating attendee deleted status in Airtable:', error);
      throw error;
    }
  }

  async updateAttendeeScannedInStatus(attendeeId: string, scanned_in: boolean): Promise<void> {
    try {
      await this.attendeesTable.update([
        {
          id: attendeeId,
          fields: {
            scanned_in
          }
        }
      ]);
      
      console.log(`Updated attendee ${attendeeId} scanned_in to ${scanned_in}`);
    } catch (error) {
      console.error('Error updating attendee scanned_in status in Airtable:', error);
      throw error;
    }
  }

}

export const airtableService = new AirtableService();
