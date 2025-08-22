export interface Venue {
  id: string; // Airtable record ID
  venueId: string;
  eventName: string;
  venueName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  venueContactName: string;
  venueContactEmail: string;
}

export interface VenueFields {
  venue_id: string;
  event_name: string;
  venue_name: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
  venue_contact_name: string;
  venue_contact_email: string;
  [key: string]: any; // Index signature for Airtable FieldSet
}
