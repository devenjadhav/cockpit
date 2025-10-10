import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, DashboardData } from '@/types/api';

class ApiClient {
  private client: AxiosInstance;
  private tokenProvider: (() => Promise<string | null>) | null = null;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include Clerk auth token
    this.client.interceptors.request.use(
      async (config) => {
        if (this.tokenProvider) {
          const token = await this.tokenProvider();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('API Error:', error);
        if (error.response?.status === 401) {
          window.location.href = '/sign-in';
        }
        return Promise.reject(error);
      }
    );
  }

  setTokenProvider(provider: () => Promise<string | null>): void {
    this.tokenProvider = provider;
  }

  // Dashboard endpoints
  async getDashboard(filters?: { triageStatus?: string }): Promise<ApiResponse<DashboardData>> {
    const params = new URLSearchParams();
    if (filters?.triageStatus) {
      params.append('triageStatus', filters.triageStatus);
    }
    
    const url = `/dashboard${params.toString() ? `?${params.toString()}` : ''}`;
    const response: AxiosResponse<ApiResponse<DashboardData>> = await this.client.get(url);
    return response.data;
  }

  async getTriageStatuses(): Promise<ApiResponse<string[]>> {
    const response: AxiosResponse<ApiResponse<string[]>> = await this.client.get('/dashboard/triage-statuses');
    return response.data;
  }

  async getAdminStatus(): Promise<ApiResponse<{ isAdmin: boolean; admin?: any }>> {
    const response: AxiosResponse<ApiResponse<{ isAdmin: boolean; admin?: any }>> = await this.client.get('/admin/status');
    return response.data;
  }

  // Event endpoints
  async getEvents(): Promise<ApiResponse<any[]>> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.client.get('/events');
    return response.data;
  }

  async getEvent(eventId: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.client.get(`/events/${eventId}`);
    return response.data;
  }

  async updateEvent(eventId: string, data: any): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.client.put(`/events/${eventId}`, data);
    return response.data;
  }

  async getEventStats(eventId: string): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.client.get(`/events/${eventId}/stats`);
    return response.data;
  }

  async updateAttendeeDeletedStatus(eventId: string, attendeeId: string, deleted_in_cockpit: boolean): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.client.put(`/events/${eventId}/attendees/${attendeeId}`, {
      deleted_in_cockpit
    });
    return response.data;
  }

  async updateAttendeeScannedInStatus(eventId: string, attendeeId: string, scanned_in: boolean): Promise<ApiResponse<any>> {
    const response: AxiosResponse<ApiResponse<any>> = await this.client.put(`/events/${eventId}/attendees/${attendeeId}`, {
      scanned_in
    });
    return response.data;
  }

  // Signup analytics endpoints (unauthenticated)
  async getDailySignups(): Promise<ApiResponse<{ date: string; signups: number }[]>> {
    const response: AxiosResponse<ApiResponse<{ date: string; signups: number }[]>> = await axios.get(`${this.client.defaults.baseURL}/signups/daily`);
    return response.data;
  }

  async getTopEvents(): Promise<ApiResponse<any[]>> {
    const response: AxiosResponse<ApiResponse<any[]>> = await axios.get(`${this.client.defaults.baseURL}/signups/top-events`);
    return response.data;
  }

  // Globe-specific endpoint - same as top events but optimized for globe display
  async getEventsWithLocation(): Promise<ApiResponse<any[]>> {
    const response: AxiosResponse<ApiResponse<any[]>> = await axios.get(`${this.client.defaults.baseURL}/signups/top-events`);
    return response.data;
  }
}

export const apiClient = new ApiClient();
