import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, DashboardData, LoginRequest, VerifyTokenRequest, AuthResponse } from '@/types/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    console.log('API Client baseURL:', baseURL);
    
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  // Auth endpoints
  async requestLogin(data: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.client.post('/auth/request-login', data);
    return response.data;
  }

  async verifyToken(data: VerifyTokenRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.client.post('/auth/verify-token', data);
    if (response.data.success && response.data.jwt) {
      this.setToken(response.data.jwt);
    }
    return response.data;
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

  // Auth helpers
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    this.clearToken();
    window.location.href = '/login';
  }
}

export const apiClient = new ApiClient();
