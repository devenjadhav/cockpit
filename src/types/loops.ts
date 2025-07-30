export interface LoopsTransactionalRequest {
  transactionalId: string;
  email: string;
  dataVariables?: Record<string, any>;
}

export interface LoopsApiResponse {
  success: boolean;
  id?: string;
  message?: string;
  error?: string;
}

export interface LoopsError {
  message: string;
  code?: string;
  statusCode: number;
}

export interface MagicLinkEmailData {
  email: string;
  loginUrl: string;
  expirationMinutes: number;
}

export interface WelcomeEmailData {
  email: string;
  firstName?: string;
  organizationName?: string;
}

export interface EventUpdateEmailData {
  email: string;
  eventName: string;
  updateType: 'schedule_change' | 'location_change' | 'cancellation' | 'general_update';
  updateDetails: string;
  eventDate?: string;
  eventLocation?: string;
}

export interface CapacityAlertEmailData {
  email: string;
  eventName: string;
  currentAttendees: number;
  maxCapacity: number;
  percentageFull: number;
}
