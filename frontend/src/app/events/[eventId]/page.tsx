'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Users, Edit, Save, X, HelpCircle, FileText, Mail, Clock, Tag, Globe, Phone, Database, User, Copy, Check, Search, Filter, SortAsc, Download } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { AuthGuard } from '@/components/AuthGuard';
import { CountryFlag } from '@/components/ui/CountryFlag';
import { CapacityIndicator } from '@/components/ui/CapacityIndicator';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Attendee } from '@/types/api';

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
  // Admin-only fields
  organizerEmail?: string;
  registrationDeadline?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  tags?: string;
  website?: string;
  contactInfo?: string;
  // POC fields
  pocFirstName?: string;
  pocLastName?: string;
  pocPreferredName?: string;
  pocSlackId?: string;
  pocAge?: number;
  // Attendees data
  attendees?: Attendee[];
}

export default function EventManagePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params?.eventId as string;
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [adminEditing, setAdminEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adminSaving, setAdminSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Attendee management state
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [attendeeSortBy, setAttendeeSortBy] = useState<'name' | 'email' | 'age'>('name');
  const [attendeeSortOrder, setAttendeeSortOrder] = useState<'asc' | 'desc'>('asc');
  
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

  // Admin edit form state
  const [adminEditForm, setAdminEditForm] = useState({
    pocFirstName: '',
    pocLastName: '',
    pocPreferredName: '',
    pocSlackId: '',
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
      const response = await apiClient.getAdminStatus();

      if (response.success) {
        setIsAdmin(response.data.isAdmin);
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
        setAdminEditForm({
          pocFirstName: response.data.pocFirstName || '',
          pocLastName: response.data.pocLastName || '',
          pocPreferredName: response.data.pocPreferredName || '',
          pocSlackId: response.data.pocSlackId || '',
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

  const handleAdminSave = async () => {
    try {
      setAdminSaving(true);
      console.log('Sending admin update data:', adminEditForm);
      const response = await apiClient.updateEvent(eventId, adminEditForm);
      if (response.success) {
        setEvent(response.data);
        setAdminEditing(false);
        setError(''); // Clear any previous errors
      } else {
        console.error('Admin update failed:', response);
        setError(response.message || 'Failed to update admin information');
      }
    } catch (err: any) {
      console.error('Error updating admin information:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to update admin information';
      setError(errorMessage);
    } finally {
      setAdminSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const copyText = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadAttendeesCSV = () => {
    try {
      const attendees = filteredAndSortedAttendees();
      
      // CSV headers
      const headers = ['Name', 'Email', 'Phone', 'Age'];
      
      // CSV rows
      const rows = attendees.map(attendee => {
        const age = calculateAge(attendee.dob || '');
        return [
          `"${getAttendeeDisplayName(attendee)}"`,
          `"${attendee.email}"`,
          `"${attendee.phone || ''}"`,
          age ? age.toString() : ''
        ].join(',');
      });
      
      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows].join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${event?.name?.replace(/[^a-z0-9]/gi, '_') || 'event'}_attendees.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Show feedback
      setCopiedField('csv-downloaded');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to download CSV:', err);
    }
  };

  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1;
    }
    return age;
  };

  const getAttendeeDisplayName = (attendee: Attendee): string => {
    return attendee.preferredName || 
           (attendee.firstName && attendee.lastName) ? 
           `${attendee.firstName} ${attendee.lastName}` : 
           attendee.firstName || 
           attendee.lastName || 
           'Anonymous Attendee';
  };

  const filteredAndSortedAttendees = () => {
    if (!event?.attendees) return [];
    
    let filtered = event.attendees.filter(attendee => {
      const name = getAttendeeDisplayName(attendee).toLowerCase();
      const email = attendee.email.toLowerCase();
      const search = attendeeSearch.toLowerCase();
      
      return name.includes(search) || email.includes(search);
    });

    return filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (attendeeSortBy) {
        case 'name':
          aValue = getAttendeeDisplayName(a);
          bValue = getAttendeeDisplayName(b);
          break;
        case 'email':
          aValue = a.email;
          bValue = b.email;
          break;
        case 'age':
          aValue = calculateAge(a.dob || '') || 0;
          bValue = calculateAge(b.dob || '') || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (attendeeSortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {loading ? 'Loading event...' : 'Checking permissions...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Event not found</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Event
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
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
                  className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
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
          <div className="mb-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Event Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
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
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{event.name}</h1>
                  {editing && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Event name cannot be edited (computed field)</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Event ID: {event.id}</p>
                </div>
              </div>
              
              {event.eventFormat && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {event.eventFormat}
                </span>
              )}
            </div>

            {/* Event Description */}
            {event.description && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Event Description</h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{event.description}</p>
                </div>
              </div>
            )}

            {/* Event Tags */}
            {event.tags && (
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Tags</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {event.tags.split(',').map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Website and Contact Info */}
            {(event.website || event.contactInfo) && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Contact Information</h3>
                <div className="space-y-3">
                  {event.website && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Globe className="w-5 h-5 mr-3" />
                      <div>
                        <p className="font-medium">Website</p>
                        <a 
                          href={event.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                        >
                          {event.website}
                        </a>
                      </div>
                    </div>
                  )}
                  {event.contactInfo && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Phone className="w-5 h-5 mr-3" />
                      <div>
                        <p className="font-medium">Contact</p>
                        <p className="text-sm">{event.contactInfo}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Event Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Date Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Event Details</h3>
                
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Calendar className="w-5 h-5 mr-3" />
                  <div>
                    <p className="font-medium">Start Date</p>
                    <p className="text-sm">{formatDate(event.startDate)}</p>
                  </div>
                </div>

                <div className="text-gray-600 dark:text-gray-400">
                  <div className="flex items-center mb-2">
                    <MapPin className="w-5 h-5 mr-3" />
                    <p className="font-medium">Shipping Address</p>
                    <div className="relative group ml-2">
                      <HelpCircle className="w-4 h-4 text-gray-400 dark:text-gray-500 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        This is where we will ship you event swag, etc
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-100"></div>
                      </div>
                    </div>
                  </div>
                  {editing ? (
                    <div className="ml-8 space-y-2">
                      <input
                        type="text"
                        value={editForm.streetAddress}
                        onChange={(e) => setEditForm({...editForm, streetAddress: e.target.value})}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Street Address"
                      />
                      <input
                        type="text"
                        value={editForm.streetAddress2}
                        onChange={(e) => setEditForm({...editForm, streetAddress2: e.target.value})}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="Street Address 2 (Optional)"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({...editForm, city: e.target.value})}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="City"
                        />
                        <input
                          type="text"
                          value={editForm.state}
                          onChange={(e) => setEditForm({...editForm, state: e.target.value})}
                          className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="State/Province"
                        />
                      </div>
                      <input
                        type="text"
                        value={editForm.zipcode}
                        onChange={(e) => setEditForm({...editForm, zipcode: e.target.value})}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholder="ZIP/Postal Code"
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
                      {event.name && (
                        <p className="mt-2 text-gray-500 dark:text-gray-400 italic">Event name: {event.name}</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <Users className="w-5 h-5 mr-3" />
                  <div className="flex-1">
                    <p className="font-medium">Expected Attendees</p>
                    {editing ? (
                      <input
                        type="number"
                        value={editForm.estimatedAttendeeCount}
                        onChange={(e) => setEditForm({...editForm, estimatedAttendeeCount: parseInt(e.target.value) || 0})}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Status & Capacity</h3>
                
                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400 mb-2">Event Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.status === 'approved' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' :
                    event.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200' :
                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
                  </span>
                </div>

                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400 mb-2">Venue Status</p>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    event.hasConfirmedVenue ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}>
                    {event.hasConfirmedVenue ? 'Venue Confirmed' : 'Venue Not Confirmed'}
                  </span>
                </div>

                <div>
                  <p className="font-medium text-gray-600 dark:text-gray-400 mb-2">Registration Status</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
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

        {/* Admin-Only Information Section */}
        {isAdmin && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border-2 border-dashed border-yellow-400 dark:border-yellow-500">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 border-b border-yellow-200 dark:border-yellow-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Admin Information</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!adminEditing ? (
                    <button
                      onClick={() => setAdminEditing(true)}
                      className="inline-flex items-center px-3 py-1 border border-yellow-300 dark:border-yellow-600 text-xs font-medium rounded-md text-yellow-700 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Admin Info
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAdminSave}
                        disabled={adminSaving}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {adminSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setAdminEditing(false);
                          setAdminEditForm({
                            pocFirstName: event?.pocFirstName || '',
                            pocLastName: event?.pocLastName || '',
                            pocPreferredName: event?.pocPreferredName || '',
                            pocSlackId: event?.pocSlackId || '',
                            notes: event?.notes || '',
                          });
                        }}
                        className="inline-flex items-center px-3 py-1 border border-yellow-300 dark:border-yellow-600 text-xs font-medium rounded-md text-yellow-700 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900/40 hover:bg-yellow-200 dark:hover:bg-yellow-800/60"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Organizer Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Organizer Details</h4>
                  
                  {event.organizerEmail && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Mail className="w-4 h-4 mr-3" />
                      <div className="flex-1">
                        <p className="font-medium">Organizer Email</p>
                        <p className="text-sm font-mono">{event.organizerEmail}</p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(event.organizerEmail!, 'organizerEmail')}
                        className="ml-2 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Copy email to clipboard"
                      >
                        {copiedField === 'organizerEmail' ? (
                          <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                  
                  {event.registrationDeadline && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Clock className="w-4 h-4 mr-3" />
                      <div>
                        <p className="font-medium">Registration Deadline</p>
                        <p className="text-sm">{formatDate(event.registrationDeadline)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* System Information */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">System Metadata</h4>
                  
                  {event.createdAt && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-3" />
                      <div>
                        <p className="font-medium">Created At</p>
                        <p className="text-sm">{new Date(event.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {event.updatedAt && (
                    <div className="flex items-center text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4 mr-3" />
                      <div>
                        <p className="font-medium">Last Updated</p>
                        <p className="text-sm">{new Date(event.updatedAt).toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Point of Contact Information */}
              {(event.pocFirstName || event.pocLastName || event.pocPreferredName || event.pocSlackId) && (
                <div className="mt-6 pt-6 border-t border-yellow-200">
                  <h4 className="font-semibold text-gray-900 mb-4">Point of Contact (POC) Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      {(event.pocFirstName || event.pocLastName || adminEditing) && (
                        <div className="flex items-center text-gray-600">
                          <User className="w-4 h-4 mr-3" />
                          <div className="flex-1">
                            <p className="font-medium">Full Name</p>
                            {adminEditing ? (
                              <div className="grid grid-cols-2 gap-2 mt-1">
                                <input
                                  type="text"
                                  value={adminEditForm.pocFirstName}
                                  onChange={(e) => setAdminEditForm({...adminEditForm, pocFirstName: e.target.value})}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                                  placeholder="First Name"
                                />
                                <input
                                  type="text"
                                  value={adminEditForm.pocLastName}
                                  onChange={(e) => setAdminEditForm({...adminEditForm, pocLastName: e.target.value})}
                                  className="text-sm border border-gray-300 rounded px-2 py-1 w-full"
                                  placeholder="Last Name"
                                />
                              </div>
                            ) : (
                              <p className="text-sm">
                                {[String(event.pocFirstName || ''), String(event.pocLastName || '')].filter(Boolean).join(' ') || 'Not specified'}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {(event.pocPreferredName || adminEditing) && (
                        <div className="flex items-center text-gray-600">
                          <User className="w-4 h-4 mr-3" />
                          <div className="flex-1">
                            <p className="font-medium">Preferred Name</p>
                            {adminEditing ? (
                              <input
                                type="text"
                                value={adminEditForm.pocPreferredName}
                                onChange={(e) => setAdminEditForm({...adminEditForm, pocPreferredName: e.target.value})}
                                className="text-sm border border-gray-300 rounded px-2 py-1 w-full mt-1"
                                placeholder="Preferred Name"
                              />
                            ) : (
                              <p className="text-sm">{String(event.pocPreferredName) || 'Not specified'}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      {(event.pocSlackId || adminEditing) && (
                        <div className="flex items-center text-gray-600">
                          <Database className="w-4 h-4 mr-3" />
                          <div className="flex-1">
                            <p className="font-medium">Slack ID</p>
                            {adminEditing ? (
                              <input
                                type="text"
                                value={adminEditForm.pocSlackId}
                                onChange={(e) => setAdminEditForm({...adminEditForm, pocSlackId: e.target.value})}
                                className="text-sm border border-gray-300 rounded px-2 py-1 w-full mt-1 font-mono"
                                placeholder="Slack ID"
                              />
                            ) : (
                              <p className="text-sm font-mono">{String(event.pocSlackId) || 'Not specified'}</p>
                            )}
                          </div>
                          {!adminEditing && event.pocSlackId && (
                            <button
                              onClick={() => copyToClipboard(String(event.pocSlackId), 'pocSlackId')}
                              className="ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy Slack ID to clipboard"
                            >
                              {copiedField === 'pocSlackId' ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* Age is computed from DOB in Airtable, display only */}
                      {event.pocAge && (
                        <div className="flex items-center text-gray-600">
                          <User className="w-4 h-4 mr-3" />
                          <div className="flex-1">
                            <p className="font-medium">Age</p>
                            <p className="text-sm">
                              {(() => {
                                // Handle if pocAge is an object or primitive
                                const age = typeof event.pocAge === 'object' && event.pocAge !== null 
                                  ? (event.pocAge as any).specialValue || (event.pocAge as any).value || event.pocAge
                                  : event.pocAge;
                                return `${age || 'Unknown'} years old`;
                              })()}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-yellow-200">
                <p className="text-xs text-gray-500">
                  This information is only visible to administrators and contains sensitive organizer data and system metadata.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Admin Notes Section */}
        {isAdmin && (
          <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden border-2 border-dashed border-yellow-400">
            <div className="bg-yellow-50 px-4 py-2 border-b border-yellow-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-sm font-medium text-yellow-800">Admin Notes</span>
                </div>
                <div className="flex items-center space-x-2">
                  {!adminEditing ? (
                    <button
                      onClick={() => setAdminEditing(true)}
                      className="inline-flex items-center px-3 py-1 border border-yellow-300 text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit Notes
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAdminSave}
                        disabled={adminSaving}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3 mr-1" />
                        {adminSaving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setAdminEditing(false);
                          setAdminEditForm({
                            pocFirstName: event?.pocFirstName || '',
                            pocLastName: event?.pocLastName || '',
                            pocPreferredName: event?.pocPreferredName || '',
                            pocSlackId: event?.pocSlackId || '',
                            notes: event?.notes || '',
                          });
                        }}
                        className="inline-flex items-center px-3 py-1 border border-yellow-300 text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes
                </label>
                {adminEditing ? (
                  <RichTextEditor
                    value={adminEditForm.notes}
                    onChange={(value) => setAdminEditForm({...adminEditForm, notes: value})}
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
              {!adminEditing && (
                <p className="text-xs text-gray-500">
                  These notes are only visible to administrators and are used for internal tracking.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Attendees Section */}
        {event.attendees && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-blue-50 dark:bg-blue-900/20 px-6 py-4 border-b border-blue-200 dark:border-blue-800/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3" />
                  <div>
                    <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">Event Attendees</h2>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {filteredAndSortedAttendees().length} of {event.attendees.length} attendees
                      {attendeeSearch && ` matching "${attendeeSearch}"`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                <button
                onClick={downloadAttendeesCSV}
                className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-md text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40 hover:bg-green-200 dark:hover:bg-green-800/60 transition-colors"
                title="Download attendees as CSV"
                >
                {copiedField === 'csv-downloaded' ? (
                <Check className="w-3 h-3 mr-1" />
                ) : (
                <Download className="w-3 h-3 mr-1" />
                )}
                {copiedField === 'csv-downloaded' ? 'Downloaded!' : 'Download CSV'}
                </button>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
                {event.attendees.length} {event.attendees.length === 1 ? 'attendee' : 'attendees'}
                </span>
                </div>
              </div>
            </div>

            {event.attendees.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-6" />
                <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">No attendees registered yet</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Attendees will appear here once they register for the event. Share your event link to start getting registrations!
                </p>
              </div>
            ) : (
              <div className="p-6">
                {/* Search and Controls */}
                <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Search attendees by name or email..."
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <SortAsc className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <select
                        value={attendeeSortBy}
                        onChange={(e) => setAttendeeSortBy(e.target.value as 'name' | 'email' | 'age')}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
                      >
                        <option value="name">Sort by Name</option>
                        <option value="email">Sort by Email</option>
                        <option value="age">Sort by Age</option>
                      </select>
                    </div>
                    
                    <button
                      onClick={() => setAttendeeSortOrder(attendeeSortOrder === 'asc' ? 'desc' : 'asc')}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                      title={`Sort ${attendeeSortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                    >
                      <SortAsc className={`w-4 h-4 ${attendeeSortOrder === 'desc' ? 'transform rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Attendees Grid */}
                {filteredAndSortedAttendees().length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 text-lg">No attendees match your search</p>
                    <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                      Try adjusting your search terms
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    {filteredAndSortedAttendees().map((attendee) => {
                      const age = calculateAge(attendee.dob || '');
                      return (
                        <div
                           key={attendee.id}
                           className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200"
                        >
                           <div className="space-y-3">
                             <div>
                               <h4 
                                 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                             onClick={() => copyText(getAttendeeDisplayName(attendee), `${attendee.id}-name`)}
                           title="Click to copy name"
                         >
                           {getAttendeeDisplayName(attendee)}
                         {copiedField === `${attendee.id}-name` && (
                             <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                             )}
                               </h4>
                             <p 
                           className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                           onClick={() => copyText(attendee.email, `${attendee.id}-email`)}
                         title="Click to copy email"
                           >
                                 {attendee.email}
                                 {copiedField === `${attendee.id}-email` && (
                                   <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                             )}
                         </p>
                        </div>
                        
                        <div className="space-y-1">
                        {attendee.phone && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Phone className="w-3 h-3 mr-1.5" />
                        <span 
                        className="truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        onClick={() => copyText(attendee.phone!, `${attendee.id}-phone`)}
                          title="Click to copy phone"
                          >
                              {attendee.phone}
                              {copiedField === `${attendee.id}-phone` && (
                              <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                            )}
                          </span>
                          </div>
                        )}
                        {age && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3 mr-1.5" />
                          <span>{age} years old</span>
                          </div>
                          )}
                        </div>
                        </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Summary Stats */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{event.attendees.length}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Attendees</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {event.attendees.filter(a => a.phone).length}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">With Phone</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {event.attendees.filter(a => calculateAge(a.dob || '')).length}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">With Age Info</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {event.maxAttendees ? Math.round((event.attendees.length / event.maxAttendees) * 100) : '-'}%
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Capacity Filled</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
