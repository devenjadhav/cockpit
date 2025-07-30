'use client';

import { EventCardData } from '@/types/api';
import { MapPin } from 'lucide-react';

interface EventMapProps {
  events: EventCardData[];
  className?: string;
}

export function EventMap({ events, className = '' }: EventMapProps) {
  // Filter events that have location data (either detailed address or general location)
  const eventsWithLocation = events.filter(event => {
    const hasDetailedAddress = event.streetAddress || event.city;
    const hasGeneralLocation = event.location && event.location.trim() !== '';
    return hasDetailedAddress || hasGeneralLocation;
  });

  if (eventsWithLocation.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="flex items-center mb-4">
          <MapPin className="w-5 h-5 text-gray-400 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Event Locations</h3>
        </div>
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No events with location data yet</p>
        </div>
      </div>
    );
  }

  // For simplicity, show the first event with location data
  const primaryEvent = eventsWithLocation[0];
  
  // Build full address for better mapping
  const getFullAddress = (event: EventCardData): string => {
    const parts = [];
    if (event.streetAddress) parts.push(event.streetAddress);
    if (event.streetAddress2) parts.push(event.streetAddress2);
    if (event.city) parts.push(event.city);
    if (event.state) parts.push(event.state);
    if (event.zipcode) parts.push(event.zipcode);
    if (event.country) parts.push(event.country);
    
    const fullAddress = parts.join(', ');
    // Fall back to general location if no detailed address
    return fullAddress || event.location || '';
  };
  
  const locationQuery = encodeURIComponent(getFullAddress(primaryEvent));

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MapPin className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Event Locations</h3>
          </div>
          {eventsWithLocation.length > 1 && (
            <span className="text-sm text-gray-500">
              {eventsWithLocation.length} events
            </span>
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Showing: {primaryEvent.name}
        </p>
      </div>

      <div className="relative h-64 md:h-80">
        <iframe
          src={`https://maps.google.com/maps?q=${locationQuery}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
          }}
          loading="lazy"
          title={`Map showing ${primaryEvent.name} location`}
          referrerPolicy="no-referrer-when-downgrade"
        />
        
        {/* Overlay with event info */}
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="font-medium text-gray-900 truncate">
                  {primaryEvent.name}
                </h4>
                <p className="text-sm text-gray-600 truncate mt-1">
                  {getFullAddress(primaryEvent)}
                </p>
              </div>
              <button
                onClick={() => {
                  const url = `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;
                  window.open(url, '_blank');
                }}
                className="ml-3 px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors flex-shrink-0"
              >
                Open Maps
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional events list */}
      {eventsWithLocation.length > 1 && (
        <div className="border-t border-gray-200">
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Other Events with Locations
            </h4>
            <div className="space-y-2">
              {eventsWithLocation.slice(1).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {event.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {getFullAddress(event)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const query = encodeURIComponent(getFullAddress(event));
                      const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
                      window.open(url, '_blank');
                    }}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
