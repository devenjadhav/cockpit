'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users, Edit, Save, X, HelpCircle, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { CapacityIndicator } from '@/components/ui/CapacityIndicator';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

interface EventData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  streetAddress?: string;
  streetAddress2?: string;
  city?: string;
  state?: string;
  country: string;
  zipcode?: string;
  countryCode: string;
  attendeeCount: number;
  maxAttendees?: number;
  capacityPercentage: number;
  capacityStatus: 'low' | 'medium' | 'high' | 'full' | string;
  status: string;
  isUpcoming: boolean;
  daysUntilEvent: number;
  eventFormat?: string;
  // Additional fields for editing
  eventName?: string;
  estimatedAttendeeCount?: number;
  triageStatus?: string;
  hasConfirmedVenue?: boolean;
  notes?: string;
}

export default function EventManagePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    location: '',
    streetAddress: '',
    streetAddress2: '',
    city: '',
    state: '',
    zipcode: '',
    estimatedAttendeeCount: 0,
    notes: '',
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
      checkAdminStatus();
    }
  }, [eventId]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
      setIsAdmin(false);
    } finally {
      setAdminLoading(false);
    }
  };

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getEvent(eventId);
      if (response.success) {
        console.log('Event data received:', response.data);
        setEvent(response.data);
        setEditForm({
          location: response.data.location || '',
          streetAddress: response.data.streetAddress || '',
          streetAddress2: response.data.streetAddress2 || '',
          city: response.data.city || '',
          state: response.data.state || '',
          zipcode: response.data.zipcode || '',
          estimatedAttendeeCount: response.data.estimatedAttendeeCount || 0,
          notes: response.data.notes || '',
        });
      } else {
        setError('Failed to load event');
      }
    } catch (err) {
      setError('Failed to load event');
      console.error('Error fetching event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Sending update data:', editForm);
      const response = await apiClient.updateEvent(eventId, editForm);
      if (response.success) {
        setEvent(response.data);
        setEditing(false);
        setError(''); // Clear any previous errors
      } else {
        console.error('Update failed:', response);
        setError(response.message || 'Failed to update event');
      }
    } catch (err: any) {
      console.error('Error updating event:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update event';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Event not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditForm({
                    location: event.location || '',
                    streetAddress: event.streetAddress || '',
                      streetAddress2: event.streetAddress2 || '',
                    city: event.city || '',
                    state: event.state || '',
                    zipcode: event.zipcode || '',
                    estimatedAttendeeCount: event.estimatedAttendeeCount || 0,
                    notes: event.notes || '',
                  });
                  }}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Event Info Card */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            {/* Header with flag and name */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                <CountryFlag 
                  countryCode={event.countryCode} 
                  country={event.country}
                  size="lg"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                  {editing && (
                    <p className="text-xs text-gray-500 mt-1">Event name cannot be edited (computed field)</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">Event ID: {event.id}</p>
                </div>
              </div>
              
              {event.eventFormat && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {event.eventFormat}
                </span>
              )}
            </div>

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Date Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-5 h-5 mr-3" />
                  <div>
                    <p className="font-medium">Start Date</p>
                    <p className="text-sm">{formatDate(event.startDate)}</p>
                  </div>
                </div>

                <div className="text-gray-600">
                  <div className="flex items-center mb-2">
                    <MapPin className="w-5 h-5 mr-3" />
                    <p className="font-medium">Shipping Address</p>
                    <div className="relative group ml-2">
                      <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        This is where we will ship you event swag, etc
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  </div>
                  {editing ? (
                    <div className="ml-8 space-y-2">
                      <input
                        type="text"
                        value={editForm.streetAddress}
                        onChange={(e) => setEditForm({...editForm, streetAddress: e.target.value})}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="Street Address"
                      />
                      <input
                        type="text"
                        value={editForm.streetAddress2}
                        onChange={(e) => setEditForm({...editForm, streetAddress2: e.target.value})}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="Street Address 2 (Optional)"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                          className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          value={editForm.state}
                          onChange={(e) => setEditForm({...editForm, state: e.target.value})}
                          className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                          placeholder="State/Province"
                        />
                      </div>
                      <input
                        type="text"
                        value={editForm.zipcode}
                        onChange={(e) => setEditForm({...editForm, zipcode: e.target.value})}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-32"
                        placeholder="ZIP/Postal Code"
                      />
                      <input
                        type="text"
                        value={editForm.location}
                        onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                        placeholder="General Location/Venue Name"
                      />
                    </div>
                  ) : (
                    <div className="ml-8 text-sm space-y-1">
                      {event.streetAddress && <p>{event.streetAddress}</p>}
                      {event.streetAddress2 && <p>{event.streetAddress2}</p>}
                      <p>
                        {event.city && `${event.city}`}
                        {event.state && `, ${event.state}`}
                        {event.zipcode && ` ${event.zipcode}`}
                      </p>
                      {event.country && <p>{event.country}</p>}
                      {event.location && (
                        <p className="mt-2 text-gray-500 italic">Venue: {event.location}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center text-gray-600">
                  <Users className="w-5 h-5 mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">Expected Attendees</p>
                    {editing ? (
                      <input
                        type="number"
                        value={editForm.estimatedAttendeeCount}
                        onChange={(e) => setEditForm({...editForm, estimatedAttendeeCount: parseInt(e.target.value) || 0})}
                        className="text-sm border border-gray-300 rounded px-2 py-1 w-20"
                        min="0"
                      />
                    ) : (
                      <p className="text-sm">{event.maxAttendees || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Capacity */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Status & Capacity</h3>
                
                <div>
                  <p className="font-medium text-gray-600 mb-2">Event Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.status === 'approved' ? 'bg-green-100 text-green-800' :
                    event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                  </span>
                </div>

                <div>
                  <p className="font-medium text-gray-600 mb-2">Venue Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.hasConfirmedVenue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.hasConfirmedVenue ? 'Venue Confirmed' : 'Venue Not Confirmed'}
                  </span>
                </div>

                <div>
                  <p className="font-medium text-gray-600 mb-2">Registration Status</p>
                  <p className="text-sm text-gray-600 mb-2">
                    {event.attendeeCount} registered{event.maxAttendees ? ` of ${event.maxAttendees}` : ''}
                  </p>
                  <CapacityIndicator
                    current={event.attendeeCount}
                    maximum={event.maxAttendees}
                    status={event.capacityStatus as 'low' | 'medium' | 'high' | 'full'}
                    size="md"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Notes Section */}
        {isAdmin && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden border-2 border-dashed border-yellow-400">
            <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">Admin Notes</span>
                <span className="ml-2 text-xs text-yellow-600">(Admin Only)</span>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes
                </label>
                {editing ? (
                  <RichTextEditor
                    value={editForm.notes}
                    onChange={(value) => setEditForm({...editForm, notes: value})}
                    placeholder="Add internal notes about this event..."
                    className="focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                ) : (
                  <div className="min-h-[80px] p-3 bg-gray-50 border border-gray-200 rounded-md">
                    {event?.notes ? (
                      <MarkdownRenderer 
                        content={event.notes}
                        className="text-sm text-gray-700"
                      />
                    ) : (
                      <div className="text-sm text-gray-500 italic">
                        No notes added yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {!editing && (
                <p className="text-xs text-gray-500">
                  These notes are only visible to administrators and are used for internal tracking.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Additional Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            disabled
            className="p-4 bg-gray-50 rounded-lg shadow border border-gray-200 text-left relative opacity-60 cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-500">View Statistics</h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Event performance and metrics</p>
          </button>
          
          <button
            disabled
            className="p-4 bg-gray-50 rounded-lg shadow border border-gray-200 text-left relative opacity-60 cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-500">Send Updates</h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Notify attendees about changes</p>
          </button>
          
          <button
            disabled
            className="p-4 bg-gray-50 rounded-lg shadow border border-gray-200 text-left relative opacity-60 cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-500">Export Data</h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">Download event information</p>
          </button>
        </div>
      </div>
      </div>
    </AuthGuard>
  );
}
