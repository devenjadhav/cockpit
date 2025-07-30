import React, { useState } from 'react';
import { LogOut, RefreshCw, Users, Calendar, Globe, TrendingUp, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { useTriageStatuses } from '@/hooks/useTriageStatuses';
import { EventCard } from './EventCard';
import { StatsCard } from './StatsCard';
import { EventMap } from './EventMap';

export function Dashboard() {
  const { user, logout } = useAuth();
  const [selectedTriageStatus, setSelectedTriageStatus] = useState<string>('');
  const { data, loading, error, refresh } = useDashboard({ 
    triageStatus: selectedTriageStatus || undefined 
  });
  const { statuses: triageStatuses, loading: statusesLoading } = useTriageStatuses();

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
              <h1 className="text-2xl font-bold text-gray-900">Event Dashboard</h1>
              <p className="text-sm text-gray-600">{data.organizerEmail || user?.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Triage Status Filter */}
              <div className="flex items-center space-x-2">
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
        {/* Map Section */}
        {data.events && data.events.length > 0 && (
          <div className="mb-8">
            <EventMap events={data.events} />
          </div>
        )}

        {/* Events Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-gray-900">Your Events</h2>
              {selectedTriageStatus && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Filtered: {selectedTriageStatus}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {data.events ? `${data.events.length} event${data.events.length !== 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              Updates every 30 seconds
            </span>
          </div>

          {(!data.events || data.events.length === 0) ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600">Create your first event to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.events.map((event) => (
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
