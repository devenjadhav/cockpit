'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { apiClient } from '@/lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Dynamically import globe component to avoid SSR issues with Three.js/WebGL
const SignupsGlobe = dynamic(() => import('@/components/SignupsGlobe'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-gradient-to-b from-purple-900 to-black rounded-lg w-full" style={{ height: '800px', minHeight: '600px' }}>
      <div className="text-white">Loading globe...</div>
    </div>
  )
});

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
  lat: number;
  lng: number;
  city: string;
  country: string;
  eventFormat?: string;
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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Enhanced Starfield Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(0.5px 0.5px at 15px 25px, #ffffff, transparent),
            radial-gradient(0.8px 0.8px at 45px 75px, #ffffff, transparent),
            radial-gradient(0.3px 0.3px at 85px 35px, #ffffff, transparent),
            radial-gradient(0.6px 0.6px at 125px 85px, #ffffff, transparent),
            radial-gradient(0.4px 0.4px at 165px 25px, #ffffff, transparent),
            radial-gradient(0.7px 0.7px at 195px 95px, #ffffff, transparent),
            radial-gradient(0.5px 0.5px at 225px 15px, #ffffff, transparent),
            radial-gradient(0.3px 0.3px at 295px 55px, #ffffff, transparent),
            radial-gradient(0.8px 0.8px at 325px 125px, #ffffff, transparent),
            radial-gradient(0.4px 0.4px at 385px 25px, #ffffff, transparent),
            radial-gradient(0.6px 0.6px at 425px 65px, #ffffff, transparent),
            radial-gradient(0.5px 0.5px at 485px 105px, #ffffff, transparent),
            radial-gradient(0.7px 0.7px at 525px 35px, #ffffff, transparent),
            radial-gradient(0.3px 0.3px at 585px 85px, #ffffff, transparent),
            radial-gradient(0.5px 0.5px at 625px 45px, #ffffff, transparent),
            radial-gradient(0.4px 0.4px at 685px 95px, #ffffff, transparent),
            radial-gradient(0.8px 0.8px at 725px 25px, #ffffff, transparent),
            radial-gradient(0.6px 0.6px at 785px 75px, #ffffff, transparent),
            radial-gradient(0.3px 0.3px at 825px 115px, #ffffff, transparent),
            radial-gradient(0.5px 0.5px at 885px 35px, #ffffff, transparent),
            radial-gradient(1px 1px at 50px 140px, #a855f7, transparent),
            radial-gradient(0.8px 0.8px at 350px 160px, #8b5cf6, transparent),
            radial-gradient(0.6px 0.6px at 650px 120px, #c084fc, transparent)
          `,
          backgroundSize: '200px 150px, 250px 180px, 220px 140px, 280px 170px, 240px 160px, 260px 190px, 300px 200px, 230px 155px, 270px 185px, 250px 145px, 290px 210px, 235px 165px, 265px 175px, 310px 195px, 245px 155px, 285px 180px, 255px 170px, 295px 190px, 275px 160px, 320px 220px, 400px 300px, 450px 350px, 500px 400px',
          backgroundPosition: '0 0, 80px 40px, 160px 15px, 240px 65px, 40px 100px, 120px 30px, 200px 70px, 280px 5px, 60px 130px, 140px 55px, 220px 105px, 100px 25px, 180px 80px, 260px 50px, 130px 115px, 210px 15px, 50px 90px, 290px 125px, 110px 65px, 190px 40px, 70px 180px, 320px 220px, 550px 280px'
        }}>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Daydream Global</h1>
          </div>
          <button
            onClick={fetchSignupData}
            className="text-white/60 hover:text-white text-sm transition-colors duration-200"
          >
            Refresh Data
          </button>
        </div>

        {/* Minimalistic Progress Bar */}
        {(() => {
          const totalSignups = allEvents.reduce((sum, event) => sum + event.signupCount, 0);
          const totalTargetSignups = allEvents.reduce((sum, event) => sum + (event.estimatedAttendees * 2), 0);
          const progressPercentage = totalTargetSignups > 0 ? (totalSignups / totalTargetSignups) * 100 : 0;
          
          return (
            <div className="mb-8 max-w-md">
              <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-white/80">{totalSignups.toLocaleString()} signups</span>
                <span className="text-white/60">{progressPercentage.toFixed(1)}%</span>
                <span className="text-white/80">{totalTargetSignups.toLocaleString()} target</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-2 backdrop-blur-sm border border-white/5">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${
                    progressPercentage >= 100 ? 'bg-gradient-to-r from-red-400 to-pink-400' : 
                    progressPercentage >= 80 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 
                    'bg-gradient-to-r from-green-400 to-emerald-400'
                  }`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          );
        })()}

        {/* Main Content Layout */}
        <div className="flex gap-8 mb-8">
          {/* Left Stats Panel */}
          <div className="flex-[2]">
            {/* Key Metrics */}
            <div className="space-y-8 mb-8">
              {/* Primary Metric - Active Events */}
              <div>
                <div className="text-white/80 text-base mb-3">Active Events</div>
                <div className="text-white text-6xl font-bold">{allEvents.length}</div>
              </div>
              
              {/* Secondary Metrics */}
              <div className="space-y-5">
                <div>
                  <div className="text-white/60 text-sm mb-2">Countries</div>
                  <div className="text-white text-3xl font-bold">{new Set(allEvents.map(e => e.country)).size}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-2">Current Signups</div>
                  <div className="text-white text-3xl font-bold">{allEvents.reduce((sum, event) => sum + event.signupCount, 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-white/60 text-sm mb-2">Total Signup Goal</div>
                  <div className="text-white text-3xl font-bold">{allEvents.reduce((sum, event) => sum + (event.estimatedAttendees * 2), 0).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Globe Legend */}
            <div>
              <div className="text-white/60 text-sm mb-2">Map Legend (based on signup rate)</div>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-3 bg-red-400 rounded-sm"></div>
                  <span className="text-white text-sm">Very Low (&lt;5%)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-3 bg-orange-400 rounded-sm"></div>
                  <span className="text-white text-sm">Low (5-10%)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-3 bg-yellow-400 rounded-sm"></div>
                  <span className="text-white text-sm">Medium (10-20%)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-3 bg-green-500 rounded-sm"></div>
                  <span className="text-white text-sm">High (20%+)</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Globe */}
          <div className="flex-1">
            <SignupsGlobe events={allEvents} className="w-full" />
          </div>
        </div>



            <div className="space-y-8">
            {/* Daily Signups Chart */}
            <div className="bg-black/80 p-6 backdrop-blur-sm border border-white/10">
            <h2 className="text-xl font-semibold mb-4 text-white">Daily Signups (Last 90 Days)</h2>
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
            <div className="mt-4 text-sm text-gray-300">
              Total signups in last 90 days: {dailyData.reduce((sum, day) => sum + day.signups, 0).toLocaleString()}
            </div>
          </div>

          {/* All Events Table */}
          <div className="bg-black/80 p-6 backdrop-blur-sm border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">All Events by Signups ({filteredEvents.length})</h2>
              <div className="w-64">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-purple-500/30 bg-black/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                />
              </div>
            </div>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-black/70 border-b border-white/10">
                  <th className="px-4 py-3 text-left font-medium text-white">Rank</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Event Name</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Current Signups</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Target Signups</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Estimated Capacity</th>
                  <th className="px-4 py-3 text-left font-medium text-white">Venue Status</th>
                  <th className="px-4 py-3 text-left font-medium text-white">
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
                    <tr key={event.eventId} className="border-t border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 font-bold text-lg text-white">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-purple-300">{event.eventName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                          {event.signupCount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {event.estimatedAttendees > 0 
                          ? (event.estimatedAttendees * 2).toLocaleString()
                          : 'N/A'
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {event.estimatedAttendees?.toLocaleString() || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {event.hasConfirmedVenue ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                            Venue Confirmed
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            Not Confirmed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {event.estimatedAttendees > 0 ? (
                          <div className="flex items-center">
                            <div className={`text-sm font-medium ${
                              fillRate >= 100 ? 'text-red-400' : 
                              fillRate >= 80 ? 'text-yellow-400' : 
                              'text-green-400'
                            }`}>
                              {fillRate.toFixed(1)}%
                            </div>
                            <div className="ml-2 w-20 bg-white/10 rounded-full h-2 backdrop-blur-sm border border-white/5">
                              <div 
                                className={`h-2 rounded-full transition-all duration-500 ${
                                  fillRate >= 100 ? 'bg-gradient-to-r from-red-400 to-pink-400' : 
                                  fillRate >= 80 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 
                                  'bg-gradient-to-r from-green-400 to-emerald-400'
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
              <div className="text-center py-8 text-gray-300">
                {searchQuery ? 'No events match your search' : 'No events found'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
