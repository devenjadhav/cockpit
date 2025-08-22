import React, { useState, useEffect, useMemo } from 'react';
import { LogOut, RefreshCw, Users, Calendar, Globe, TrendingUp, Filter, Search, X, Zap, Type } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useTriageStatuses } from '@/hooks/useTriageStatuses';
import { EventCard } from './EventCard';
import { StatsCard } from './StatsCard';
import { EventMap } from './EventMap';
import { AdminConsole } from './AdminConsole';
import { apiClient } from '@/lib/api';

export function Dashboard() {
  const { user, logout, token } = useAuth();
  const [selectedTriageStatus, setSelectedTriageStatus] = useState<string>('Approved');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fuzzySearchEnabled, setFuzzySearchEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminConsoleActive, setAdminConsoleActive] = useState(false);
  const [userProfile, setUserProfile] = useState<{firstName?: string; pocPreferredName?: string} | null>(null);
  const { data, loading, error, refresh } = useDashboard({ 
    filters: { triageStatus: selectedTriageStatus || undefined },
    enablePolling: !adminConsoleActive, // Disable polling when admin console is active
    pollingInterval: 300000 // 5 minutes - much less aggressive
  });
  const { statuses: triageStatuses, loading: statusesLoading } = useTriageStatuses();

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Check admin status and fetch user profile
  useEffect(() => {
    const checkAdminStatusAndProfile = async () => {
      try {
        const response = await apiClient.getAdminStatus();
        if (response.success) {
          setIsAdmin(response.data.isAdmin);
          if (response.data.isAdmin && response.data.admin) {
            setUserProfile({ firstName: response.data.admin.firstName });
          }
        }
      } catch (error) {
        console.error('Failed to check admin status:', error);
        setIsAdmin(false);
      } finally {
        setAdminLoading(false);
      }
    };

    checkAdminStatusAndProfile();
  }, []);

  // Set user profile from dashboard data for non-admin users
  useEffect(() => {
    if (!isAdmin && data?.userProfile && !userProfile) {
      setUserProfile({ pocPreferredName: data.userProfile.pocPreferredName });
    }
  }, [isAdmin, data?.userProfile, userProfile]);

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

  const getSearchableFields = (event: any): Array<{text: string, weight: number}> => {
    const fields = [
      // High priority fields (weight 3)
      { text: event.name || '', weight: 3 },
      { text: event.organizerEmail || event.email || '', weight: 3 },
      
      // Medium priority fields (weight 2)
      { text: event.location || '', weight: 2 },
      { text: event.city || '', weight: 2 },
      { text: event.triageStatus || '', weight: 2 },
      { text: event.eventFormat || '', weight: 2 },
      
      // Standard priority fields (weight 1.5)
      { text: event.description || '', weight: 1.5 },
      { text: event.tags || '', weight: 1.5 },
      
      // POC (Point of Contact) fields (weight 1.5)
      { text: event.pocFirstName || '', weight: 1.5 },
      { text: event.pocLastName || '', weight: 1.5 },
      { text: event.pocPreferredName || '', weight: 1.5 },
      { text: event.pocSlackId || '', weight: 1.5 },
      
      // Lower priority fields (weight 1)
      { text: event.state || '', weight: 1 },
      { text: event.country || '', weight: 1 },
      { text: event.contactInfo || '', weight: 1 },
      { text: event.streetAddress || '', weight: 1 },
      { text: event.streetAddress2 || '', weight: 1 },
      { text: event.zipcode || '', weight: 1 },
      { text: event.website || '', weight: 1 },
      
      // Composite fields for better matching (weight 2)
      { text: `${event.pocFirstName || ''} ${event.pocLastName || ''}`.trim(), weight: 2 },
      { text: `${event.pocPreferredName || ''} ${event.pocFirstName || ''}`.trim(), weight: 1.5 },
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
    if (!data?.events) {
      return [];
    }
    
    if (!searchQuery.trim()) {
      return data.events;
    }

    const query = normalizeString(searchQuery.trim());
    
    return data.events.filter(event => {
      const eventName = normalizeString(event.name || '');
      return eventName.includes(query);
    }).sort((a, b) => {
      // Sort by event name alphabetically
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [data?.events, searchQuery]);

  // Enhanced filter and sort events with sophisticated relevance scoring (FUZZY SEARCH)
  const fuzzySearchEvents = useMemo(() => {
    if (!data?.events) {
      return [];
    }
    
    if (!searchQuery.trim()) {
      return data.events;
    }

    const query = searchQuery.trim();
    const eventsWithScores = data.events.map(event => {
      const searchableFields = getSearchableFields(event);
      
      // Debug: Log searchable fields for events that might match
      if (query.toLowerCase() === 'deven') {
        console.log(`Event: ${event.name}`, {
          searchableFields: searchableFields.map(f => ({ text: f.text, weight: f.weight }))
        });
      }
      
      let totalScore = 0;
      let maxFieldScore = 0;
      
      for (const field of searchableFields) {
        const fieldScore = calculateRelevanceScore(field.text, query, field.weight);
        totalScore += fieldScore;
        maxFieldScore = Math.max(maxFieldScore, fieldScore);
        
        // Debug: Log individual field scores for "Deven" search
        if (query.toLowerCase() === 'deven' && fieldScore > 0) {
          console.log(`  Field "${field.text}" (weight ${field.weight}): score ${fieldScore.toFixed(2)}`);
        }
      }
      
      // Final score combines total relevance with best field match
      const finalScore = (totalScore * 0.7) + (maxFieldScore * 0.3);
      
      return { 
        event, 
        score: finalScore,
        debugInfo: {
          query,
          totalScore,
          maxFieldScore,
          finalScore,
          searchableFields: searchableFields.length
        }
      };
    });

    // Filter events with meaningful scores and sort by relevance
    const filtered = eventsWithScores
      .filter(item => item.score > 5) // Restored original threshold
      .sort((a, b) => {
        // Primary sort: score (descending)
        if (Math.abs(b.score - a.score) > 1) {
          return b.score - a.score;
        }
        
        // Secondary sort: event name alphabetically for similar scores
        const nameA = (a.event.name || '').toLowerCase();
        const nameB = (b.event.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      })
      .map(item => item.event);
    
    // Debug logging for development
    if (query && eventsWithScores.length > 0) {
      console.log('Fuzzy Search Results for:', query);
      
      // Show events with any score > 0
      const eventsWithAnyScore = eventsWithScores.filter(item => item.score > 0);
      console.log(`Events with score > 0: ${eventsWithAnyScore.length}`);
      
      if (eventsWithAnyScore.length > 0) {
        console.log('Top scoring events:', eventsWithAnyScore
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(item => ({
            name: item.event.name,
            score: item.score.toFixed(2),
            included: item.score > 5
          }))
        );
      }
      
      console.log(`Total events: ${eventsWithScores.length}, Filtered results: ${filtered.length}`);
    }
    
    return filtered;
  }, [data?.events, searchQuery]);

  // Choose which search results to use based on the mode
  const filteredEvents = fuzzySearchEnabled ? fuzzySearchEvents : simpleSearchEvents;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">No data available</h2>
          <p className="text-gray-600 mt-2">Dashboard data is loading or unavailable</p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {userProfile 
                  ? `${getTimeBasedGreeting()}, ${isAdmin ? userProfile.firstName : userProfile.pocPreferredName}` 
                  : 'Event Dashboard'
                }
              </h1>
              <p className="text-sm text-gray-600">{data.organizerEmail || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Triage Status Filter */}
              {isAdmin && (
                <div className="flex items-center space-x-2 border-2 border-dashed border-yellow-400 rounded px-2 py-1">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedTriageStatus}
                    onChange={(e) => setSelectedTriageStatus(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={statusesLoading}
                  >
                    <option value="">All Status</option>
                    {triageStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <button
                onClick={refresh}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={logout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Admin Tools */}
        {isAdmin && (
          <div className="mb-8 bg-white rounded-lg shadow-md overflow-hidden border-2 border-dashed border-yellow-400">
            <div className="p-6 space-y-6">
              {/* Event Search */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Event Search</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-32 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    placeholder={
                      fuzzySearchEnabled
                        ? "Fuzzy search across all event fields: name, location, organizer, status, format, tags, etc..."
                        : "Simple search by event name only..."
                    }
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-1">
                    <button
                      onClick={toggleFuzzySearch}
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded transition-colors ${
                        fuzzySearchEnabled
                          ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
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
                      {filteredEvents.length} result{filteredEvents.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Admin Console */}
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Database Console</h3>
                <AdminConsole 
                  authToken={token || ''} 
                  onActiveChange={setAdminConsoleActive}
                />
              </div>
            </div>
          </div>
        )}

        {/* Map Section - Temporarily disabled */}
        {/* {data.events && data.events.length > 0 && (
          <div className="mb-8">
            <EventMap events={data.events} />
          </div>
        )} */}

        {/* Events Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {searchQuery ? 'Search Results' : 'Your Events'}
              </h2>
              {selectedTriageStatus && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Filtered: {selectedTriageStatus}
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Search: "{searchQuery}"
                </span>
              )}
              <span className="text-sm text-gray-500">
                {searchQuery 
                  ? `${filteredEvents.length} result${filteredEvents.length !== 1 ? 's' : ''}` 
                  : data.events ? `${data.events.length} event${data.events.length !== 1 ? 's' : ''}` : ''
                }
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Updates every 5 minutes
            </span>
          </div>

          {(!filteredEvents || filteredEvents.length === 0) ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {searchQuery ? (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
                  <p className="text-gray-600 mb-4">
                    No events match your search for "{searchQuery}". Try different keywords or clear the search.
                  </p>
                  <button
                    onClick={clearSearch}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear Search
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
                  <p className="text-gray-600">Create your first event to get started.</p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onManage={(eventId) => {
                    // Navigate to event management page
                    window.location.href = `/events/${eventId}`;
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {(data.recentActivity && data.recentActivity.length > 0) && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {data.recentActivity.map((activity) => (
                  <li key={activity.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-sm text-gray-500">{activity.eventName}</p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
