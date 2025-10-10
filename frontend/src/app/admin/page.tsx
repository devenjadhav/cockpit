'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { AuthGuard } from '@/components/AuthGuard';
import { useRouter } from 'next/navigation';
import { Search, X, Zap, Type } from 'lucide-react';

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
  attendeeCount?: number;
  maxAttendees?: number;
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
  const { isAdmin, loading: adminLoading } = useAdmin();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('approved');


  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [fuzzySearchEnabled, setFuzzySearchEnabled] = useState(false);
  const [filters, setFilters] = useState({
    sortBy: 'name',
    eventFormat: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100);


  const tabCounts: TabCounts = {
    allStatus: events.length,
    approved: events.filter(e => (e?.triageStatus?.toLowerCase() || '') === 'approved').length,
    contactPoc: events.filter(e => {
      const status = e?.triageStatus?.toLowerCase() || '';
      return status === 'contact poc to organize' || status === 'contact-poc-to-organize';
    }).length,
    denied: events.filter(e => (e?.triageStatus?.toLowerCase() || '') === 'denied').length,
    eventCancelled: events.filter(e => {
      const status = e?.triageStatus?.toLowerCase() || '';
      return status === 'event cancelled' || status === 'event-cancelled';
    }).length,
    hold: events.filter(e => {
      const status = e?.triageStatus?.toLowerCase() || '';
      return status === 'hold' || status === 'on-hold' || status === 'on hold';
    }).length,
    mergeConfirmed: events.filter(e => {
      const status = e?.triageStatus?.toLowerCase() || '';
      return status === 'merge confirmed' || status === 'merge-confirmed';
    }).length,
    queuedForMerging: events.filter(e => {
      const status = e?.triageStatus?.toLowerCase() || '';
      return status === 'queued for merging' || status === 'queued-for-merging';
    }).length,
  };

  useEffect(() => {
    if (authLoading || adminLoading) {
      return;
    }

    if (!user) {
      router.push('/sign-in');
      return;
    }

    if (!isAdmin) {
      setError('Access denied. You need the org:hq_admin role to access this page.');
      setLoading(false);
      return;
    }

    fetchAllEvents();
  }, [user, authLoading, adminLoading, isAdmin, router]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
  }, [searchQuery, filters, activeTab, fuzzySearchEnabled]);



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

  // Advanced fuzzy search implementation with proper relevance scoring
  const normalizeString = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  };

  const calculateRelevanceScore = (text: string, query: string, fieldWeight: number = 1): number => {
    if (!text || !query) return 0;
    
    const normalizedText = normalizeString(text);
    const normalizedQuery = normalizeString(query);
    
    if (!normalizedText || !normalizedQuery) return 0;
    
    let score = 0;
    
    // 1. Exact match (highest priority)
    if (normalizedText === normalizedQuery) {
      score += 100 * fieldWeight;
    }
    
    // 2. Starts with query
    else if (normalizedText.startsWith(normalizedQuery)) {
      score += 80 * fieldWeight;
    }
    
    // 3. Contains exact query as substring
    else if (normalizedText.includes(normalizedQuery)) {
      score += 60 * fieldWeight;
    }
    
    // 4. Word-level matching
    const textWords = normalizedText.split(' ').filter(word => word.length > 0);
    const queryWords = normalizedQuery.split(' ').filter(word => word.length > 0);
    
    let wordMatches = 0;
    let partialWordMatches = 0;
    
    for (const queryWord of queryWords) {
      let bestWordScore = 0;
      
      for (const textWord of textWords) {
        if (textWord === queryWord) {
          bestWordScore = Math.max(bestWordScore, 40);
        } else if (textWord.startsWith(queryWord) || queryWord.startsWith(textWord)) {
          bestWordScore = Math.max(bestWordScore, 30);
        } else if (textWord.includes(queryWord) || queryWord.includes(textWord)) {
          bestWordScore = Math.max(bestWordScore, 20);
        } else {
          // Character-level similarity for typos
          const similarity = calculateLevenshteinSimilarity(queryWord, textWord);
          if (similarity > 0.7) {
            bestWordScore = Math.max(bestWordScore, similarity * 15);
          }
        }
      }
      
      if (bestWordScore >= 30) wordMatches++;
      else if (bestWordScore >= 15) partialWordMatches++;
      
      score += bestWordScore * fieldWeight;
    }
    
    // Boost score for multiple word matches
    if (wordMatches > 1) {
      score += (wordMatches - 1) * 10 * fieldWeight;
    }
    
    // 5. Query coverage bonus (how much of the query was matched)
    const queryCoverage = (wordMatches + partialWordMatches * 0.5) / queryWords.length;
    score += queryCoverage * 20 * fieldWeight;
    
    return score;
  };

  const calculateLevenshteinSimilarity = (str1: string, str2: string): number => {
    if (str1.length === 0) return str2.length === 0 ? 1 : 0;
    if (str2.length === 0) return 0;
    
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    const maxLength = Math.max(str1.length, str2.length);
    return 1 - matrix[str2.length][str1.length] / maxLength;
  };

  const getSearchableFields = (event: Event): Array<{text: string, weight: number}> => {
    const fields = [
      // High priority fields (weight 3)
      { text: event.eventName || '', weight: 3 },
      { text: event.email || '', weight: 3 },
      
      // Medium priority fields (weight 2)
      { text: event.location || '', weight: 2 },
      { text: event.city || '', weight: 2 },
      { text: event.triageStatus || '', weight: 2 },
      { text: event.eventFormat || '', weight: 2 },
      
      // POC (Point of Contact) fields (weight 1.5)
      { text: event.pocFirstName || '', weight: 1.5 },
      { text: event.pocLastName || '', weight: 1.5 },
      
      // Lower priority fields (weight 1)
      { text: event.state || '', weight: 1 },
      { text: event.country || '', weight: 1 },
      
      // Composite fields for better matching (weight 2)
      { text: `${event.pocFirstName || ''} ${event.pocLastName || ''}`.trim(), weight: 2 },
      { text: `${event.city || ''} ${event.state || ''}`.trim(), weight: 1.5 },
    ];
    
    return fields.filter(field => field.text.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const toggleFuzzySearch = () => {
    setFuzzySearchEnabled(!fuzzySearchEnabled);
  };

  // Simple search - only searches event names
  const simpleSearchEvents = useMemo(() => {
    if (!events) {
      return [];
    }
    
    if (!searchQuery.trim()) {
      return events;
    }

    const query = normalizeString(searchQuery.trim());
    
    return events.filter(event => {
      if (!event || !event.eventName) return false;
      const eventName = normalizeString(event.eventName);
      return eventName.includes(query);
    }).sort((a, b) => {
      // Sort by event name alphabetically
      const nameA = (a?.eventName || '').toLowerCase();
      const nameB = (b?.eventName || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [events, searchQuery]);

  // Enhanced filter and sort events with sophisticated relevance scoring (FUZZY SEARCH)
  const fuzzySearchEvents = useMemo(() => {
    if (!events) {
      return [];
    }
    
    if (!searchQuery.trim()) {
      return events;
    }

    const query = searchQuery.trim();
    const eventsWithScores = events.filter(event => event && event.eventName).map(event => {
      const searchableFields = getSearchableFields(event);
      
      let totalScore = 0;
      let maxFieldScore = 0;
      
      for (const field of searchableFields) {
        const fieldScore = calculateRelevanceScore(field.text, query, field.weight);
        totalScore += fieldScore;
        maxFieldScore = Math.max(maxFieldScore, fieldScore);
      }
      
      // Final score combines total relevance with best field match
      const finalScore = (totalScore * 0.7) + (maxFieldScore * 0.3);
      
      return { 
        event, 
        score: finalScore
      };
    });

    // Filter events with meaningful scores and sort by relevance
    return eventsWithScores
      .filter(item => item.score > 5)
      .sort((a, b) => {
        // Primary sort: score (descending)
        if (Math.abs(b.score - a.score) > 1) {
          return b.score - a.score;
        }
        
        // Secondary sort: event name alphabetically for similar scores
        const nameA = (a?.event?.eventName || '').toLowerCase();
        const nameB = (b?.event?.eventName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .map(item => item.event);
  }, [events, searchQuery]);

  // Apply tab and other filters to search results
  const filteredAndSearchedEvents = useMemo(() => {
    const searchResults = fuzzySearchEnabled ? fuzzySearchEvents : simpleSearchEvents;
    let filtered = searchResults;

    // Apply active tab filter
    if (activeTab !== 'allStatus') {
      filtered = filtered.filter(event => {
        const status = event.triageStatus?.toLowerCase() || '';
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

    // Apply event format filter
    if (filters.eventFormat) {
      filtered = filtered.filter(event => event.eventFormat === filters.eventFormat);
    }

    // Apply sort
    if (filters.sortBy === 'name') {
      filtered.sort((a, b) => (a?.eventName || '').localeCompare(b?.eventName || ''));
    } else if (filters.sortBy === 'attendees-desc') {
      filtered.sort((a, b) => (b?.estimatedAttendeeCount || 0) - (a?.estimatedAttendeeCount || 0));
    } else if (filters.sortBy === 'attendees-asc') {
      filtered.sort((a, b) => (a?.estimatedAttendeeCount || 0) - (b?.estimatedAttendeeCount || 0));
    } else if (filters.sortBy === 'signups-desc') {
      filtered.sort((a, b) => (b?.attendeeCount || 0) - (a?.attendeeCount || 0));
    } else if (filters.sortBy === 'signups-asc') {
      filtered.sort((a, b) => (a?.attendeeCount || 0) - (b?.attendeeCount || 0));
    }

    return filtered;
  }, [fuzzySearchEnabled, fuzzySearchEvents, simpleSearchEvents, activeTab, filters]);

  // Pagination helpers
  const totalPages = Math.ceil(filteredAndSearchedEvents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvents = filteredAndSearchedEvents.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const goToNextPage = () => goToPage(currentPage + 1);
  const goToPrevPage = () => goToPage(currentPage - 1);





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
      ...filteredAndSearchedEvents.map(event => [
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
          {/* Search Bar and Filters */}
          <div className="mb-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-32 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={
                  fuzzySearchEnabled
                    ? "Fuzzy search across all event fields: name, location, organizer, status, format, etc..."
                    : "Simple search by event name only..."
                }
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
                <button
                  onClick={toggleFuzzySearch}
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                    fuzzySearchEnabled
                      ? 'bg-blue-200 text-blue-800 hover:bg-blue-300'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  title={fuzzySearchEnabled ? 'Switch to Simple Search' : 'Switch to Fuzzy Search'}
                >
                  {fuzzySearchEnabled ? (
                    <>
                      <Zap className="w-3 h-3 mr-1" />
                      Fuzzy
                    </>
                  ) : (
                    <>
                      <Type className="w-3 h-3 mr-1" />
                      Simple
                    </>
                  )}
                </button>
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {searchQuery && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <p className="text-gray-600">
                  {fuzzySearchEnabled 
                    ? "Searching across all event fields with intelligent relevance ranking"
                    : "Searching event names only (simple text matching)"
                  }
                </p>
                <p className="text-gray-500">
                  {filteredAndSearchedEvents.length} result{filteredAndSearchedEvents.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
            
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  id="sort-select"
                  value={filters.sortBy}
                  onChange={(e) => setFilters({...filters, sortBy: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="name">Event Name (A-Z)</option>
                  <option value="signups-desc">Actual Signups (High to Low)</option>
                  <option value="signups-asc">Actual Signups (Low to High)</option>
                  <option value="attendees-desc">Estimated Capacity (High to Low)</option>
                  <option value="attendees-asc">Estimated Capacity (Low to High)</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label htmlFor="format-filter" className="text-sm font-medium text-gray-700">
                  Event Format:
                </label>
                <select
                  id="format-filter"
                  value={filters.eventFormat}
                  onChange={(e) => setFilters({...filters, eventFormat: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Formats</option>
                  <option value="12-hours">12 Hours</option>
                  <option value="24-hours">24 Hours</option>
                  <option value="2-day">2 Days</option>
                </select>
              </div>
            </div>
          </div>





          {/* Action Buttons */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={exportRecords}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Export {filteredAndSearchedEvents.length} records
            </button>
          </div>



          {/* Results Summary */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Displaying events <strong>{startIndex + 1} - {Math.min(endIndex, filteredAndSearchedEvents.length)}</strong> of <strong>{filteredAndSearchedEvents.length}</strong> in total.{' '}
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentEvents.map((event, index) => (
                  <tr key={event.id} className={index % 2 === 1 ? 'bg-gray-50' : ''}>
                    <td className="px-3 py-4 text-sm text-gray-900 w-16">
                      {event.id.slice(-4)}
                    </td>
                    <td className="px-4 py-4 w-48">
                      <div 
                        className="text-sm font-medium text-blue-600 hover:text-blue-900 cursor-pointer truncate"
                        onClick={() => router.push(`/events/${event.id}`)}
                      >
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
                      {event.maxAttendees 
                        ? `${event.attendeeCount || 0}/${event.maxAttendees}` 
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-4 w-36">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium truncate ${getStatusColor(event.triageStatus)}`}>
                        {event.triageStatus || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredAndSearchedEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchQuery ? `No events found matching "${searchQuery}".` : 'No hackathon events found matching your filters.'}
              </p>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="mt-2 inline-flex items-center px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Search
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  « First
                </button>
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ‹ Previous
                </button>
                
                {/* Page numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`px-3 py-2 text-sm border rounded ${
                          page === currentPage
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next ›
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last »
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
