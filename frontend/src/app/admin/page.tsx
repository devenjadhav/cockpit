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

interface TabCounts {
  allStatus: number;
  approved: number;
  contactPoc: number;
  denied: number;
  eventCancelled: number;
  hold: number;
  mergeConfirmed: number;
  queuedForMerging: number;
}

export default function AdminPage() {
  const { token, user, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('approved');


  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    sortBy: 'date-desc',
  });


  const tabCounts: TabCounts = {
    allStatus: events.length,
    approved: events.filter(e => e.triageStatus?.toLowerCase() === 'approved').length,
    contactPoc: events.filter(e => e.triageStatus?.toLowerCase() === 'contact poc to organize' || e.triageStatus?.toLowerCase() === 'contact-poc-to-organize').length,
    denied: events.filter(e => e.triageStatus?.toLowerCase() === 'denied').length,
    eventCancelled: events.filter(e => e.triageStatus?.toLowerCase() === 'event cancelled' || e.triageStatus?.toLowerCase() === 'event-cancelled').length,
    hold: events.filter(e => e.triageStatus?.toLowerCase() === 'hold' || e.triageStatus?.toLowerCase() === 'on-hold' || e.triageStatus?.toLowerCase() === 'on hold').length,
    mergeConfirmed: events.filter(e => e.triageStatus?.toLowerCase() === 'merge confirmed' || e.triageStatus?.toLowerCase() === 'merge-confirmed').length,
    queuedForMerging: events.filter(e => e.triageStatus?.toLowerCase() === 'queued for merging' || e.triageStatus?.toLowerCase() === 'queued-for-merging').length,
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token) {
      router.push('/login');
      return;
    }

    checkAdminStatus();
  }, [token, authLoading, router]);

  useEffect(() => {
    if (isAdmin && token) {
      fetchAllEvents();
    }
  }, [isAdmin, token]);

  useEffect(() => {
    applyFilters();
  }, [events, searchQuery, filters, activeTab]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
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
      setIsAdmin(data.success);
      
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
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

  const applyFilters = () => {
    let filtered = events;

    // Apply active tab filter first
    if (activeTab !== 'allStatus') {
      filtered = filtered.filter(event => {
        const status = event.triageStatus?.toLowerCase();
        switch (activeTab) {
          case 'approved':
            return status === 'approved';
          case 'contactPoc':
            return status === 'contact poc to organize' || status === 'contact-poc-to-organize';
          case 'denied':
            return status === 'denied';
          case 'eventCancelled':
            return status === 'event cancelled' || status === 'event-cancelled';
          case 'hold':
            return status === 'hold' || status === 'on-hold' || status === 'on hold';
          case 'mergeConfirmed':
            return status === 'merge confirmed' || status === 'merge-confirmed';
          case 'queuedForMerging':
            return status === 'queued for merging' || status === 'queued-for-merging';
          default:
            return true;
        }
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(event =>
        event.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.pocFirstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.pocLastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.state.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }







    // Apply sort
    if (filters.sortBy === 'date-desc') {
      filtered.sort((a, b) => new Date(b.startDate || '').getTime() - new Date(a.startDate || '').getTime());
    } else if (filters.sortBy === 'date-asc') {
      filtered.sort((a, b) => new Date(a.startDate || '').getTime() - new Date(b.startDate || '').getTime());
    } else if (filters.sortBy === 'name') {
      filtered.sort((a, b) => a.eventName.localeCompare(b.eventName));
    } else if (filters.sortBy === 'attendees-desc') {
      filtered.sort((a, b) => (b.estimatedAttendeeCount || 0) - (a.estimatedAttendeeCount || 0));
    }

    setFilteredEvents(filtered);
  };





  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'contact poc to organize': 
      case 'contact-poc-to-organize': return 'text-orange-600 bg-orange-100';
      case 'denied': return 'text-red-600 bg-red-100';
      case 'event cancelled': 
      case 'event-cancelled': return 'text-gray-600 bg-gray-100';
      case 'hold': 
      case 'on-hold': 
      case 'on hold': return 'text-yellow-600 bg-yellow-100';
      case 'merge confirmed': 
      case 'merge-confirmed': return 'text-purple-600 bg-purple-100';
      case 'queued for merging': 
      case 'queued-for-merging': return 'text-indigo-600 bg-indigo-100';
      case 'pending': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const exportRecords = () => {
    const csvContent = [
      ['ID', 'Start Date', 'Event Name', 'POC Name', 'Email', 'Location', 'Event Format', 'Estimated Attendees', 'Triage Status', 'End Date'].join(','),
      ...filteredEvents.map(event => [
        event.id,
        formatDate(event.startDate),
        `"${event.eventName}"`,
        `"${event.pocFirstName} ${event.pocLastName}"`,
        event.email,
        `"${event.city}, ${event.state}, ${event.country}"`,
        event.eventFormat || 'N/A',
        event.estimatedAttendeeCount || 0,
        event.triageStatus || 'Unknown',
        formatDate(event.endDate)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hackathon-events-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting to login...</div>
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
        {/* HCB-style Header */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center space-x-4">
                <div className="w-8 h-6 flex items-center justify-center">
                  <img 
                    src="/rock.png" 
                    alt="Daydream Logo" 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <span className="text-lg font-medium">Cockpit Admin</span>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/admin/health')}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Health Dashboard
                </button>
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 py-2 overflow-x-auto">
              {[
                { key: 'allStatus', label: 'All Status', count: tabCounts.allStatus, color: 'blue' },
                { key: 'approved', label: 'Approved', count: tabCounts.approved, color: 'green' },
                { key: 'contactPoc', label: 'Contact PoC to organize', count: tabCounts.contactPoc, color: 'orange' },
                { key: 'denied', label: 'Denied', count: tabCounts.denied, color: 'red' },
                { key: 'eventCancelled', label: 'Event Cancelled', count: tabCounts.eventCancelled, color: 'gray' },
                { key: 'hold', label: 'Hold', count: tabCounts.hold, color: 'yellow' },
                { key: 'mergeConfirmed', label: 'Merge Confirmed', count: tabCounts.mergeConfirmed, color: 'purple' },
                { key: 'queuedForMerging', label: 'Queued for Merging', count: tabCounts.queuedForMerging, color: 'indigo' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tab.color === 'red' ? 'bg-red-100 text-red-800' :
                    tab.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                    tab.color === 'green' ? 'bg-green-100 text-green-800' :
                    tab.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    tab.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                    tab.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                    tab.color === 'indigo' ? 'bg-indigo-100 text-indigo-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Search Bar */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search Query"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
            />
          </div>





          {/* Action Buttons */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => applyFilters()}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Search
            </button>
            <button
              onClick={exportRecords}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Export {filteredEvents.length} records
            </button>
          </div>



          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Displaying events <strong>1 - {Math.min(100, filteredEvents.length)}</strong> of <strong>{filteredEvents.length}</strong> in total.{' '}
              <a href="#" className="text-blue-600 hover:underline">Create a new event</a>.{' '}
              <a href="#" className="text-blue-600 hover:underline">Import events from Airtable</a>.
            </p>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Event Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">POC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-44">Location</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Format</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Attendees</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.slice(0, 100).map((event, index) => (
                  <tr key={event.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-4 text-sm text-gray-900 w-16">
                      {event.id.slice(-4)}
                    </td>
                    <td className="px-4 py-4 w-48">
                      <div className="text-sm font-medium text-blue-600 hover:text-blue-900 cursor-pointer truncate">
                        {event.eventName}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 w-44">
                      <div className="truncate">{event.pocFirstName} {event.pocLastName}</div>
                      <div className="text-gray-500 text-xs truncate">{event.email}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900 w-44">
                      <div className="truncate">{event.city}, {event.state}</div>
                      <div className="text-gray-500 text-xs truncate">{event.country}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 w-24">
                      <div className="truncate">{event.eventFormat || 'N/A'}</div>
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-900 w-20 text-center">
                      {event.estimatedAttendeeCount || 'N/A'}
                    </td>
                    <td className="px-4 py-4 w-36">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium truncate ${getStatusColor(event.triageStatus)}`}>
                        {event.triageStatus || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-blue-600 w-28">
                      <button className="hover:text-blue-900 truncate">View Details</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hackathon events found matching your filters.</p>
            </div>
          )}

          {/* Pagination */}
          {filteredEvents.length > 100 && (
            <div className="mt-6 flex justify-between items-center">
              <div></div>
              <div className="flex space-x-2">
                <button className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Next ›</button>
                <button className="px-3 py-2 text-sm text-gray-500">Last »</button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
