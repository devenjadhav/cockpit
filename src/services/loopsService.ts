import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  LoopsTransactionalRequest,
  LoopsApiResponse,
  LoopsError,
  MagicLinkEmailData,
  WelcomeEmailData,
  EventUpdateEmailData,
  CapacityAlertEmailData,
} from '../types/loops';

export class LoopsService {
  private apiKey: string;
  private baseUrl = 'https://app.loops.so/api/v1';

  constructor() {
    if (!process.env.LOOPS_API_KEY) {
      console.warn('LOOPS_API_KEY not set - email sending will be disabled');
      this.apiKey = '';
      return;
    }
    this.apiKey = process.env.LOOPS_API_KEY;
  }

  private async sendTransactionalEmail(data: LoopsTransactionalRequest): Promise<LoopsApiResponse> {
    try {
      const response: AxiosResponse<LoopsApiResponse> = await axios.post(
        `${this.baseUrl}/transactional`,
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      return {
        success: true,
        id: response.data.id,
      };
    } catch (error) {
      const loopsError = this.handleLoopsError(error);
      console.error('Loops email error:', loopsError);
      
      return {
        success: false,
        message: loopsError.message,
        error: loopsError.code,
      };
    }
  }

  private handleLoopsError(error: unknown): LoopsError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      
      return {
        message: axiosError.response?.data?.message || 
                axiosError.response?.data?.error || 
                axiosError.message || 
                'Failed to send email',
        code: axiosError.code,
        statusCode: axiosError.response?.status || 500,
      };
    }

    return {
      message: error instanceof Error ? error.message : 'Unknown error',
      statusCode: 500,
    };
  }

  async sendMagicLinkEmail(data: MagicLinkEmailData): Promise<LoopsApiResponse> {
    return this.sendTransactionalEmail({
      transactionalId: 'cmdou0ehu03zj450ilibd1rzx',
      email: data.email,
      dataVariables: {
        email: data.email,
        loginUrl: data.loginUrl,
        expirationMinutes: data.expirationMinutes,
      },
    });
  }

  // COMMENTED OUT - Not needed for basic login testing
  // Uncomment and configure these when you're ready to test other email features

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<LoopsApiResponse> {
    console.log('Welcome email disabled for testing - would send to:', data.email);
    return { success: true, message: 'Welcome email disabled for testing' };
    
    // return this.sendTransactionalEmail({
    //   transactionalId: 'welcome-organizer',
    //   email: data.email,
    //   dataVariables: {
    //     email: data.email,
    //     firstName: data.firstName || '',
    //     organizationName: data.organizationName || '',
    //   },
    // });
  }

  async sendEventUpdateEmail(data: EventUpdateEmailData): Promise<LoopsApiResponse> {
    console.log('Event update email disabled for testing - would send to:', data.email);
    return { success: true, message: 'Event update email disabled for testing' };
    
    // return this.sendTransactionalEmail({
    //   transactionalId: 'event-update',
    //   email: data.email,
    //   dataVariables: {
    //     email: data.email,
    //     eventName: data.eventName,
    //     updateType: data.updateType,
    //     updateDetails: data.updateDetails,
    //     eventDate: data.eventDate || '',
    //     eventLocation: data.eventLocation || '',
    //   },
    // });
  }

  async sendCapacityAlertEmail(data: CapacityAlertEmailData): Promise<LoopsApiResponse> {
    console.log('Capacity alert email disabled for testing - would send to:', data.email);
    return { success: true, message: 'Capacity alert email disabled for testing' };
    
    // return this.sendTransactionalEmail({
    //   transactionalId: 'capacity-alert',
    //   email: data.email,
    //   dataVariables: {
    //     email: data.email,
    //     eventName: data.eventName,
    //     currentAttendees: data.currentAttendees,
    //     maxCapacity: data.maxCapacity,
    //     percentageFull: data.percentageFull,
    //   },
    // });
  }

  async sendBulkEventNotification(
    attendeeEmails: string[],
    eventUpdateData: Omit<EventUpdateEmailData, 'email'>
  ): Promise<LoopsApiResponse[]> {
    console.log('Bulk notification disabled for testing - would send to:', attendeeEmails.length, 'attendees');
    
    // Return mock successful responses for each email
    return attendeeEmails.map(email => ({ 
      success: true, 
      message: `Bulk notification disabled for testing - would send to ${email}` 
    }));
    
    // const promises = attendeeEmails.map(email =>
    //   this.sendEventUpdateEmail({
    //     ...eventUpdateData,
    //     email,
    //   })
    // );
    // return Promise.all(promises);
  }
}

export const loopsService = new LoopsService();
