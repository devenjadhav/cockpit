import React from 'react';
import { Calendar, MapPin, Users, Settings, Clock } from 'lucide-react';
import { EventCardData } from '@/types/api';
import { CountryFlag } from './ui/CountryFlag';
import { CapacityIndicator, CapacityBadge } from './ui/CapacityIndicator';
import { clsx } from 'clsx';

interface EventCardProps {
  event: EventCardData;
  onManage: (eventId: string) => void;
}

const statusConfig = {
  draft: {
    color: 'bg-gray-100 text-gray-800',
    label: 'Draft',
  },
  published: {
    color: 'bg-success-100 text-success-800',
    label: 'Published',
  },
  cancelled: {
    color: 'bg-danger-100 text-danger-800',
    label: 'Cancelled',
  },
  completed: {
    color: 'bg-primary-100 text-primary-800',
    label: 'Completed',
  },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDaysUntil(days: number): string {
  if (days < 0) return 'Past event';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

export function EventCard({ event, onManage }: EventCardProps) {
  console.log('EventCard received event:', event);
  console.log('EventCard eventFormat:', event?.eventFormat);
  
  // Ensure we have default values for all required fields
  const safeEvent = {
    id: event?.id || '',
    name: event?.name || 'Untitled Event',
    startDate: event?.startDate || '',
    endDate: event?.endDate || '',
    location: event?.location || '',
    country: event?.country || '',
    countryCode: event?.countryCode || '',
    attendeeCount: event?.attendeeCount || 0,
    maxAttendees: event?.maxAttendees || undefined,
    capacityPercentage: event?.capacityPercentage || 0,
    capacityStatus: event?.capacityStatus || 'low' as const,
    status: event?.status || 'draft' as const,
    isUpcoming: event?.isUpcoming || false,
    daysUntilEvent: event?.daysUntilEvent || 0,
    eventFormat: event?.eventFormat || '',
  };
  
  const statusStyle = statusConfig[safeEvent.status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CountryFlag 
              countryCode={safeEvent.countryCode} 
              country={safeEvent.country}
              size="lg"
            />
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {safeEvent.name}
            </h3>
          </div>
          {safeEvent.eventFormat ? (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {safeEvent.eventFormat}
            </span>
          ) : (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              No Format
            </span>
          )}
        </div>

        {/* Event details */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Calendar className="w-4 h-4 mr-2" />
            <span>{safeEvent.startDate ? formatDate(safeEvent.startDate) : 'Date TBD'}</span>
            {safeEvent.startDate && safeEvent.endDate && safeEvent.startDate !== safeEvent.endDate && (
              <span className="ml-1">- {formatDate(safeEvent.endDate)}</span>
            )}
          </div>

          {safeEvent.location && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="line-clamp-1">{safeEvent.location}</span>
            </div>
          )}

          <div className="flex items-center text-sm text-gray-600">
            <Users className="w-4 h-4 mr-2" />
            <span>{safeEvent.attendeeCount || 0} registered</span>
            {safeEvent.maxAttendees && (
              <span className="ml-1">of {safeEvent.maxAttendees}</span>
            )}
          </div>

          {safeEvent.isUpcoming && (
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2" />
              <span>{formatDaysUntil(safeEvent.daysUntilEvent || 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Capacity indicator */}
      <div className="px-6 pb-4">
        <CapacityIndicator
          current={safeEvent.attendeeCount}
          maximum={safeEvent.maxAttendees}
          status={safeEvent.capacityStatus}
          size="sm"
        />
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <CapacityBadge status={safeEvent.capacityStatus} />
          <button
            onClick={() => onManage(safeEvent.id)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 transition-colors"
          >
            <Settings className="w-4 h-4 mr-1" />
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
