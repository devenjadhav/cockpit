'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatBytes, formatUptime, formatPercentage } from '@/lib/utils';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: string;
  details?: string;
}

interface BackgroundJobStatus {
  name: string;
  status: HealthStatus;
  frequency: string;
  lastRun?: string;
  nextRun?: string;
  metrics?: {
    successRate: number;
    averageDuration: number;
    errorCount: number;
  };
}

interface ServerMetrics {
  uptime: number;
  memory: {
    total: number;
    used: number;
    free: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    loadAverage: number[];
    cpuCount: number;
  };
  database: HealthStatus;
  syncJobs: BackgroundJobStatus[];
}

interface SyncLog {
  table_name: string;
  last_sync_status: string;
  records_synced: number;
  errors_count: number;
  error_details?: string;
  created_at: string;
  last_sync_at: string;
}

export default function HealthDashboard() {
  const { user, token } = useAuth();
  const [healthData, setHealthData] = useState<ServerMetrics | null>(null);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [syncTrends, setSyncTrends] = useState<any[]>([]);

  const fetchHealthData = async () => {
    if (!token) return;

    try {
      setRefreshing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/health/status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch health data');
      }

      const result = await response.json();
      if (result.success) {
        setHealthData(result.data);
        
        // Update historical data for charts
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();
        setHistoricalData(prev => {
          const newData = [...prev, {
            time: timeLabel,
            memoryUsed: result.data.memory.heapUsed,
            memoryTotal: result.data.memory.heapTotal,
            systemMemoryUsed: result.data.memory.used,
            cpuLoad: result.data.cpu.loadAverage[0],
            timestamp: now.getTime()
          }];
          // Keep only last 20 data points
          return newData.slice(-20);
        });
      } else {
        throw new Error(result.error || 'Failed to fetch health data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchSyncLogs = async () => {
    if (!token) return;

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/health/sync-logs?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch sync logs');
      }

      const result = await response.json();
      if (result.success) {
        setSyncLogs(result.data);
        
        // Process sync logs for trend chart
        const trendData = result.data.slice(0, 10).reverse().map((log: SyncLog, index: number) => ({
          sync: `Sync ${index + 1}`,
          records: log.records_synced,
          errors: log.errors_count,
          success: log.last_sync_status === 'success' ? 1 : 0,
          time: new Date(log.created_at).toLocaleTimeString()
        }));
        setSyncTrends(trendData);
      }
    } catch (err) {
      console.error('Failed to fetch sync logs:', err);
    }
  };

  const triggerManualSync = async () => {
    if (!token) return;

    try {
      setRefreshing(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/health/sync/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      const result = await response.json();
      if (result.success) {
        alert('Manual sync triggered successfully');
        fetchHealthData();
        fetchSyncLogs();
      } else {
        alert(`Sync failed: ${result.error}`);
      }
    } catch (err) {
      alert('Failed to trigger manual sync');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      setLoading(true);
      Promise.all([fetchHealthData(), fetchSyncLogs()])
        .finally(() => setLoading(false));
    }
  }, [user, token]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (user && token) {
        fetchHealthData();
        fetchSyncLogs();
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [user, token]);

  if (!user) {
    return <div>Please log in to access the health dashboard.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading health dashboard...</div>
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'partial_failure': return 'text-yellow-600 bg-yellow-100';
      case 'failure': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Chart color schemes
  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6B7280'];
  const CHART_COLORS = {
    primary: '#3B82F6',
    secondary: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#6366F1'
  };

  // Generate memory usage pie chart data
  const getMemoryPieData = () => {
    if (!healthData) return [];
    return [
      { name: 'Used', value: healthData.memory.heapUsed, color: CHART_COLORS.primary },
      { name: 'Free', value: healthData.memory.heapTotal - healthData.memory.heapUsed, color: '#E5E7EB' }
    ];
  };

  // Generate CPU load data for gauge-like visualization
  const getCpuLoadData = () => {
    if (!healthData) return [];
    return healthData.cpu.loadAverage.map((load, index) => ({
      name: `${index + 1}m`,
      load: load.toFixed(2),
      value: Math.min(load * 100, 100) // Cap at 100% for visualization
    }));
  };

  // Generate database pool status data
  const getPoolStatusData = () => {
    if (!healthData?.database) return [];
    // Mock pool data since we don't have real pool info yet
    return [
      { name: 'Active', value: 5, color: CHART_COLORS.secondary },
      { name: 'Idle', value: 3, color: CHART_COLORS.info },
      { name: 'Available', value: 2, color: '#E5E7EB' }
    ];
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">System Health Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={fetchHealthData}
            disabled={refreshing}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={triggerManualSync}
            disabled={refreshing}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          >
            Trigger Sync
          </button>
        </div>
      </div>

      {healthData && (
        <div className="space-y-8">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Uptime</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatUptime(healthData.uptime)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Heap Memory</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatBytes(healthData.memory.heapUsed)}</p>
                  <p className="text-sm text-gray-500">of {formatBytes(healthData.memory.heapTotal)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-blue-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">CPU Load</h3>
                  <p className="text-2xl font-bold text-gray-900">{healthData.cpu.loadAverage[0].toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{healthData.cpu.cpuCount} cores</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <div className="w-6 h-6 bg-purple-500 rounded-full"></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Database</h3>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{healthData.database.status}</p>
                  <p className="text-sm text-gray-500">Connected</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  healthData.database.status === 'healthy' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <div className={`w-6 h-6 rounded-full ${
                    healthData.database.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-time Memory Usage Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Memory Usage Over Time</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis tickFormatter={(value) => formatBytes(value)} />
                    <Tooltip formatter={(value) => formatBytes(value as number)} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="memoryUsed"
                      stackId="1"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.6}
                      name="Heap Used"
                    />
                    <Area
                      type="monotone"
                      dataKey="systemMemoryUsed"
                      stackId="2"
                      stroke={CHART_COLORS.secondary}
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.4}
                      name="System Used"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Memory Usage Pie Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Current Memory Distribution</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getMemoryPieData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${formatBytes(value)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getMemoryPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatBytes(value as number)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Load Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">CPU Load Average</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getCpuLoadData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="load" fill={CHART_COLORS.warning} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Real-time CPU Load Line Chart */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">CPU Load Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cpuLoad"
                      stroke={CHART_COLORS.danger}
                      strokeWidth={2}
                      name="CPU Load"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sync Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync Performance Trend */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Sync Performance Trend</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={syncTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sync" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="records" fill={CHART_COLORS.secondary} name="Records Synced" />
                    <Bar dataKey="errors" fill={CHART_COLORS.danger} name="Errors" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Database Pool Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Database Connection Pool</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPoolStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getPoolStatusData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Background Jobs Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Background Jobs</h2>
            <div className="space-y-4">
              {healthData.syncJobs.map((job, index) => (
                <div key={index} className="border rounded p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-lg">{job.name}</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status.status)}`}>
                      {job.status.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Frequency:</span> {job.frequency}
                    </div>
                    {job.lastRun && (
                      <div>
                        <span className="font-medium">Last Run:</span> {new Date(job.lastRun).toLocaleString()}
                      </div>
                    )}
                    {job.metrics && (
                      <div>
                        <span className="font-medium">Success Rate:</span> {formatPercentage(job.metrics.successRate)}% | 
                        <span className="ml-2"><span className="font-medium">Errors:</span> {job.metrics.errorCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Sync Logs Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Sync Logs</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Table</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Records</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Errors</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-900">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {syncLogs.map((log, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{log.table_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSyncStatusColor(log.last_sync_status)}`}>
                          {log.last_sync_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.records_synced.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {log.errors_count > 0 ? (
                          <span className="text-red-600 font-medium">{log.errors_count}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
