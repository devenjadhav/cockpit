'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/AuthGuard';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  eventName: string;
  email: string;
  pocFirstName: string;
  pocLastName: string;
  location: string;
  city: string;
  state: string;
  country: string;
  eventFormat: string;
  estimatedAttendeeCount: number;
  triageStatus: string;
  startDate: string;
  endDate: string;
}

export default function AdminPage() {
  const { token, user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    // If not authenticated after loading is complete, redirect to login
    if (!token) {
      router.push('/login');
      return;
    }

    checkAdminStatus();
  }, [token, authLoading, router]);

  // Separate effect to fetch events only after admin status is confirmed
  useEffect(() => {
    if (isAdmin && token) {
      fetchAllEvents();
    }
  }, [isAdmin, token]);

  const checkAdminStatus = async () => {
    try {
      console.log('Checking admin status with token:', token ? 'present' : 'missing');
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Admin status response:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized - redirecting to login');
          setLoading(false);
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          setLoading(false);
          return;
        }
        throw new Error('Failed to check admin status');
      }

      const data = await response.json();
      console.log('Admin status data:', data);
      setIsAdmin(data.success);
      
      // If not admin, stop loading here
      if (!data.success) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Admin status check error:', err);
      setError('Failed to verify admin access');
      setLoading(false);
    }
  };

  const fetchAllEvents = async () => {
    try {
      console.log('Fetching admin events with token:', token ? 'present' : 'missing');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Admin events response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Admin events error response:', errorText);
        
        if (response.status === 403) {
          setError('Access denied. Admin privileges required.');
          return;
        }
        if (response.status === 401) {
          setError('Authentication failed. Please login again.');
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Admin events data received:', data.success, data.data?.length || 0, 'events');
      
      if (data.success) {
        setEvents(data.data || []);
      } else {
        setError(data.error || 'Failed to fetch events');
      }
    } catch (err) {
      console.error('Fetch events error:', err);
      setError(`Failed to load events: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // If not authenticated, redirect will happen in useEffect
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting to login...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading admin panel...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-gray-600">All Events Overview</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin/health')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Health Dashboard
              </button>
              <span className="text-sm text-gray-600">
                Welcome, {user?.email}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              All Events ({events.length})
            </h2>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {events.map((event) => (
                <li key={event.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {event.eventName}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.triageStatus)}`}>
                          {event.triageStatus || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Organizer:</span> {event.pocFirstName} {event.pocLastName}
                        </div>
                        <div>
                          <span className="font-medium">Email:</span> {event.email}
                        </div>
                        <div>
                          <span className="font-medium">Location:</span> {event.city}, {event.state} {event.country}
                        </div>
                        <div>
                          <span className="font-medium">Format:</span> {event.eventFormat || 'N/A'}
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Expected Attendees:</span> {event.estimatedAttendeeCount || 'N/A'}
                        </div>
                        <div>
                          <span className="font-medium">Start Date:</span> {formatDate(event.startDate)}
                        </div>
                        <div>
                          <span className="font-medium">End Date:</span> {formatDate(event.endDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {events.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No events found.</p>
            </div>
          )}
        </div>
      </main>
      </div>
    </AuthGuard>
  );
}
