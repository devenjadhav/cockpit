export interface Event {
  id: string;
  name: string;  // Added for compatibility
  eventName: string;
  pocFirstName: string;
  pocLastName: string;
  location: string;
  slug: string;
  streetAddress?: string;
  streetAddress2?: string;
  city: string;
  state?: string;
  country: string;
  zipcode?: string;
  eventFormat: string;
  subOrganizers?: string;
  email: string; // organizer email
  pocPreferredName?: string;
  pocSlackId?: string;
  pocDob?: string;
  pocAge?: number;
  estimatedAttendeeCount?: number;
  maxAttendees?: number;  // Added for compatibility
  projectUrl?: string;
  projectDescription?: string;
  lat?: number;
  long?: number;
  triageStatus: string;
  status: string;  // Added for compatibility
  startDate?: string;  // Added for compatibility
  endDate?: string;    // Added for compatibility
  registrationDeadline?: string;  // Added for compatibility
  notes?: string;
  actionTriggerApprovalEmail?: string;
  actionTriggerRejectionEmail?: string;
  actionTriggerHoldEmail?: string;
  actionTriggerAskEmail?: string;

  // Additional Airtable fields
  description?: string;
  tags?: string;
  website?: string;
  contactInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventFields {
  [key: string]: any;
  event_name: string;
  poc_first_name: string;
  poc_last_name: string;
  location: string;
  slug: string;
  street_address?: string;
  street_address_2?: string;
  city: string;
  state?: string;
  country: string;
  zipcode?: string;
  event_format: string;
  sub_organizers?: string;
  email: string;
  poc_preferred_name?: string;
  poc_slack_id?: string;
  poc_dob?: string;
  poc_age?: number;
  estimated_attendee_count?: number;
  project_url?: string;
  project_description?: string;
  lat?: number;
  long?: number;
  triage_status: string;
  start_date?: string;
  end_date?: string;
  registration_deadline?: string;
  notes?: string;
  'action - trigger_approval_email'?: string;
  'action - trigger_rejection_email'?: string;
  'action - trigger_hold_email'?: string;
  'action - trigger_ask_email'?: string;
  has_confirmed_venue?: boolean;
}

export interface UpdateEventData {
  eventName?: string;
  pocFirstName?: string;
  pocLastName?: string;
  pocPreferredName?: string;
  pocSlackId?: string;
  // pocAge is computed from pocDob, not directly editable
  location?: string;
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  eventFormat?: string;
  estimatedAttendeeCount?: number;
  projectUrl?: string;
  projectDescription?: string;
  triageStatus?: string;
  notes?: string;
}
