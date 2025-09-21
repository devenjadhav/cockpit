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
  shirt_size?: string;
  additional_accommodations?: string;
  dietary_restrictions?: string;
  emergency_contact_1_phone?: string;
  emergency_contact_1_name?: string;
  checkin_completed?: boolean;
}

// Safe interface for client-side use - DOB is not exposed, only age
export interface SafeAttendee {
  id: string;
  email: string;
  preferredName?: string;
  firstName?: string;
  lastName?: string;
  age?: number; // Calculated age, not raw DOB
  phone?: string;
  event?: string; // Airtable ID of the linked event
  deleted_in_cockpit?: boolean; // Soft delete flag
  event_volunteer?: boolean; // Whether the attendee is a volunteer
  shirt_size?: string;
  additional_accommodations?: string;
  dietary_restrictions?: string;
  emergency_contact_1_phone?: string;
  emergency_contact_1_name?: string;
  checkin_completed?: boolean;
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
  shirt_size?: string;
  additional_accommodations?: string;
  dietary_restrictions?: string;
  emergency_contact_1_phone?: string;
  emergency_contact_1_name?: string;
  checkin_completed?: boolean;
  [key: string]: any; // Index signature for Airtable FieldSet
}
