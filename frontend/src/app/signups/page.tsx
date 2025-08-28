'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

function CustomTooltip({ children, text }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help"
      >
        {children}
      </div>
      {showTooltip && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg w-64 z-50">
          {text}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-800"></div>
        </div>
      )}
    </div>
  );
}

interface DailySignupData {
  date: string;
  signups: number;
}

interface TopEventData {
  eventId: string;
  eventName: string;
  estimatedAttendees: number;
  signupCount: number;
  venueName: string;
  hasConfirmedVenue: boolean;
}

export default function SignupsPage() {
  const [dailyData, setDailyData] = useState<DailySignupData[]>([]);
  const [allEvents, setAllEvents] = useState<TopEventData[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<TopEventData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSignupData = async () => {
    try {
      const [dailyResult, topEventsResult] = await Promise.all([
        apiClient.getDailySignups(),
        apiClient.getTopEvents()
      ]);

      if (dailyResult.success && topEventsResult.success) {
        // Format daily data for chart (reverse to show chronologically)
        const formattedDailyData = dailyResult.data
          .reverse()
          .map((item: DailySignupData) => ({
            ...item,
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          }));

        setDailyData(formattedDailyData);
        setAllEvents(topEventsResult.data);
        setFilteredEvents(topEventsResult.data);
      } else {
        throw new Error('API returned error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignupData();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEvents(allEvents);
    } else {
      const filtered = allEvents.filter(event =>
        event.eventName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [searchQuery, allEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading signup analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daydream Signup Leaderboard</h1>
        </div>
        <button
          onClick={fetchSignupData}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-500">Total Events</h3>
            <p className="text-3xl font-bold text-blue-600">{allEvents.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-500">Total Signups</h3>
            <p className="text-3xl font-bold text-green-600">
              {allEvents.reduce((sum, event) => sum + event.signupCount, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-500">Total Target Signups</h3>
            <p className="text-3xl font-bold text-orange-600">
              {allEvents.reduce((sum, event) => sum + (event.estimatedAttendees * 2), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Overall Signup Progress</h2>
          <p className="text-sm text-gray-600 mt-1">
            Progress towards total target signups across all approved events
          </p>
        </div>
        {(() => {
          const totalSignups = allEvents.reduce((sum, event) => sum + event.signupCount, 0);
          const totalTargetSignups = allEvents.reduce((sum, event) => sum + (event.estimatedAttendees * 2), 0);
          const progressPercentage = totalTargetSignups > 0 ? (totalSignups / totalTargetSignups) * 100 : 0;
          
          return (
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-3xl font-bold text-green-600">
                  {totalSignups.toLocaleString()}
                </span>
                <span className="text-2xl font-bold text-gray-700">
                  {progressPercentage.toFixed(1)}%
                </span>
                <span className="text-3xl font-bold text-orange-600">
                  {totalTargetSignups.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-12">
                <div 
                  className={`h-12 rounded-full transition-all duration-500 flex items-center justify-center text-white font-bold text-lg ${
                    progressPercentage >= 100 ? 'bg-red-500' : 
                    progressPercentage >= 80 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                >
                  {progressPercentage >= 20 && `${progressPercentage.toFixed(1)}%`}
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="space-y-8">
        {/* Daily Signups Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Daily Signups (Last 90 Days)</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => `Date: ${value}`}
                  formatter={(value) => [`${value} signups`, 'Signups']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="signups"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                  name="Daily Signups"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Total signups in last 90 days: {dailyData.reduce((sum, day) => sum + day.signups, 0).toLocaleString()}
          </div>
        </div>

        {/* All Events Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">All Events by Signups ({filteredEvents.length})</h2>
            <div className="w-64">
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Event Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Current Signups</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Target Signups</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Estimated Capacity</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">Venue Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-900">
                    <CustomTooltip text="Percentage of target signups achieved (Current Signups / Target Signups). You must have twice the signups as your estimated capacity because we only expect 50% attendees to show up! For ex: if you are expecting 50 participants, you should have 100 signups">
                      Signup Rate
                    </CustomTooltip>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event, index) => {
                  const targetSignups = event.estimatedAttendees * 2;
                  const fillRate = event.estimatedAttendees > 0 
                    ? (event.signupCount / targetSignups) * 100 
                    : 0;
                  
                  return (
                    <tr key={event.eventId} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-lg">
                        {index + 1}
                        {index === 0 && <span className="ml-2 text-yellow-500">🏆</span>}
                        {index === 1 && <span className="ml-2 text-gray-400">🥈</span>}
                        {index === 2 && <span className="ml-2 text-orange-600">🥉</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{event.eventName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold text-blue-600">
                          {event.signupCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {event.estimatedAttendees > 0 
                          ? (event.estimatedAttendees * 2).toLocaleString()
                          : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {event.estimatedAttendees?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {event.hasConfirmedVenue ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Venue Confirmed
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                            Not Confirmed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {event.estimatedAttendees > 0 ? (
                          <div className="flex items-center">
                            <div className={`text-sm font-medium ${
                              fillRate >= 100 ? 'text-red-600' : 
                              fillRate >= 80 ? 'text-yellow-600' : 
                              'text-green-600'
                            }`}>
                              {fillRate.toFixed(1)}%
                            </div>
                            <div className="ml-2 w-20 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  fillRate >= 100 ? 'bg-red-500' : 
                                  fillRate >= 80 ? 'bg-yellow-500' : 
                                  'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(fillRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredEvents.length === 0 && (
          <div className="text-center py-8 text-gray-500">
          {searchQuery ? 'No events match your search' : 'No events found'}
          </div>
          )}
        </div>


      </div>
    </div>
  );
}
