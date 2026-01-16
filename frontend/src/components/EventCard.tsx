import React from 'react';
import { MapPin, Users, Settings, MapPin as Venue } from 'lucide-react';
import { EventCardData } from '@/types/api';
import { CountryFlag } from './ui/CountryFlag';
import { CapacityIndicator } from './ui/CapacityIndicator';
import { clsx } from 'clsx';

interface EventCardProps {
  event: EventCardData;
  onManage: (eventId: string) => void;
}

const statusConfig = {
  draft: {
    color: 'bg-white/10 text-white/70 border border-white/30',
    label: 'Draft',
  },
  published: {
    color: 'bg-green-500/20 text-green-400 border border-green-500/30',
    label: 'Published',
  },
  cancelled: {
    color: 'bg-red-500/20 text-red-400 border border-red-500/30',
    label: 'Cancelled',
  },
  completed: {
    color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    label: 'Completed',
  },
};

function formatDaysUntil(days: number): string {
  if (days < 0) return 'Past event';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

export function EventCard({ event, onManage }: EventCardProps) {
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
    hasConfirmedVenue: event?.hasConfirmedVenue,
  };
  
  const statusStyle = statusConfig[safeEvent.status as keyof typeof statusConfig] || statusConfig.draft;

  return (
    <div className="cockpit-card hover:border-white/40 transition-colors duration-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <CountryFlag
              countryCode={safeEvent.countryCode}
              country={safeEvent.country}
              size="lg"
            />
            <h3 className="text-lg font-bold text-white line-clamp-2">
              {safeEvent.name}
            </h3>
          </div>
          {safeEvent.eventFormat ? (
            <span className="px-2 py-1 text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              {safeEvent.eventFormat}
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-medium bg-white/10 text-white/50 border border-white/20">
              No Format
            </span>
          )}
        </div>

        {/* Event details */}
        <div className="space-y-2">
          {safeEvent.location && (
            <div className="flex items-center text-sm text-white/60">
              <MapPin className="w-4 h-4 mr-2 text-white/40" />
              <span className="line-clamp-1">{safeEvent.location}</span>
            </div>
          )}

          <div className="flex items-center text-sm text-white/60">
            <Users className="w-4 h-4 mr-2 text-white/40" />
            <span>{safeEvent.attendeeCount || 0} registered</span>
            {safeEvent.maxAttendees && (
              <span className="ml-1">of {safeEvent.maxAttendees}</span>
            )}
          </div>

          {/* Venue Status */}
          <div className="flex items-center text-sm">
            <Venue className="w-4 h-4 mr-2 text-white/40" />
            <span
              className={clsx(
                'px-2 py-1 text-xs font-medium',
                safeEvent.hasConfirmedVenue
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              )}
            >
              {safeEvent.hasConfirmedVenue ? 'Venue Confirmed' : 'Venue Pending'}
            </span>
          </div>

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
      <div className="px-6 py-4 bg-black/30 border-t border-white/10">
        <div className="flex items-center justify-end">
          <button
            onClick={() => onManage(safeEvent.id)}
            className="btn-primary inline-flex items-center text-sm"
          >
            <Settings className="w-4 h-4 mr-1" />
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
