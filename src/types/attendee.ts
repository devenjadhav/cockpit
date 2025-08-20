export interface Attendee {
  id: string;
  email: string;
  preferredName?: string;
  firstName?: string;
  lastName?: string;
  dob?: Date;
  phone?: string;
  event?: string; // Airtable ID of the linked event
}

export interface AttendeeFields {
  email: string;
  preferred_name?: string;
  first_name?: string;
  last_name?: string;
  dob?: string;
  phone?: string;
  event?: string[];
  [key: string]: any; // Index signature for Airtable FieldSet
}
