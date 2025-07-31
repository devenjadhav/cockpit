import Airtable from 'airtable';
import { Event, EventFields, UpdateEventData } from '../types/event';
import { Admin, AdminFields } from '../types/admin';
import { cacheService } from './cacheService';

export class AirtableService {
  private base: Airtable.Base;
  private eventsTable: Airtable.Table<EventFields>;
  private adminsTable: Airtable.Table<AdminFields>;

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
  }

  private mapEventRecord(record: Airtable.Record<EventFields>): Event {
    const fields = record.fields;
    console.log(`Mapping event ${fields.event_name}, event_format field:`, fields.event_format);
    console.log(`Mapping event ${fields.event_name}, has_confirmed_venue field:`, fields.has_confirmed_venue);
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
      console.log(`Cache hit for events by organizer: ${organizerEmail}`);
      return cachedEvents;
    }

    try {
      console.log(`Cache miss for events by organizer: ${organizerEmail}, fetching from Airtable`);
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

  async getEventById(eventId: string): Promise<Event | null> {
    // Check cache first
    const cacheKey = cacheService.getEventCacheKey(eventId);
    const cachedEvent = cacheService.get<Event>(cacheKey);
    if (cachedEvent) {
      console.log(`Cache hit for event: ${eventId}`);
      return cachedEvent;
    }

    try {
      console.log(`Cache miss for event: ${eventId}, fetching from Airtable`);
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
      console.log('Cache hit for organizer emails');
      return cachedEmails;
    }

    try {
      console.log('Cache miss for organizer emails, fetching from Airtable...');
      const records = await this.eventsTable
        .select({
          fields: ['email'],
        })
        .all();

      console.log(`Found ${records.length} records`);
      const emails = records
        .map(record => record.fields.email)
        .filter((email, index, self) => email && self.indexOf(email) === index);

      console.log('Unique emails found:', emails);
      
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
      console.log('Cache hit for all events');
      return cachedEvents;
    }

    try {
      console.log('Cache miss for all events, fetching from Airtable');
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
      console.log(`Cache hit for admin check: ${email}`);
      return cachedResult;
    }

    try {
      console.log(`Cache miss for admin check: ${email}, checking Airtable`);
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

}

export const airtableService = new AirtableService();
