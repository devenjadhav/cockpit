export interface Attendee {
  id: string;
  email: string;
  preferredName?: string;
  firstName?: string;
  lastName?: string;
  dob?: Date;
  phone?: string;
  event?: string; // Airtable ID of the linked event
  deleted_in_cockpit?: boolean; // Soft delete flag
  event_volunteer?: boolean; // Whether the attendee is a volunteer
}

export interface AttendeeFields {
  email: string;
  preferred_name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone?: string;
  event?: string[];
  deleted_in_cockpit?: boolean; // Soft delete flag
  event_volunteer?: boolean; // Whether the attendee is a volunteer
  [key: string]: any; // Index signature for Airtable FieldSet
}
