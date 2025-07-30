import Airtable from 'airtable';
import { Event, EventFields, UpdateEventData } from '../types/event';

export class AirtableService {
  private base: Airtable.Base;
  private eventsTable: Airtable.Table<EventFields>;

  constructor() {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set in environment variables');
    }

    Airtable.configure({
      apiKey: process.env.AIRTABLE_API_KEY,
    });

    this.base = Airtable.base(process.env.AIRTABLE_BASE_ID);
    
    // For now, we'll use the CSV data which only has events
    // If you have an attendees table, change the name here
    this.eventsTable = this.base<EventFields>('events');
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



  async getEventsByOrganizer(organizerEmail: string): Promise<Event[]> {
    try {
      const records = await this.eventsTable
        .select({
          filterByFormula: `{email} = "${organizerEmail}"`,
          sort: [{ field: 'event_name', direction: 'asc' }],
        })
        .all();

      return records.map(record => this.mapEventRecord(record));
    } catch (error) {
      throw new Error(`Failed to fetch events for organizer ${organizerEmail}: ${error}`);
    }
  }

  async getEventById(eventId: string): Promise<Event | null> {
    try {
      const record = await this.eventsTable.find(eventId);
      return this.mapEventRecord(record);
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
      return this.mapEventRecord(record);
    } catch (error) {
      throw new Error(`Failed to update event ${eventId}: ${error}`);
    }
  }

  async getAllOrganizerEmails(): Promise<string[]> {
    try {
      console.log('Attempting to fetch emails from Airtable...');
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
      return emails;
    } catch (error) {
      console.error('Airtable error details:', error);
      throw new Error(`Failed to fetch organizer emails: ${error}`);
    }
  }


}

export const airtableService = new AirtableService();
