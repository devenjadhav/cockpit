'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Globe from 'react-globe.gl';
import * as THREE from 'three';

interface EventData {
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
  eventFormat?: string; // '12-hours' or '24-hours'
}

interface DensityPoint {
  lat: number;
  lng: number;
  altitude: number;
  color: string;
  event: EventData;
}

interface SignupsGlobeProps {
  events: EventData[];
  className?: string;
  totalEvents?: number;
  totalSignups?: number;
  totalTargetSignups?: number;
}

export default function SignupsGlobe({ events, className = '', totalEvents, totalSignups, totalTargetSignups }: SignupsGlobeProps) {
  const globeRef = useRef<any>();
  const [hoveredEvent, setHoveredEvent] = useState<EventData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 800 });
  const [isClient, setIsClient] = useState(false);

  // Calculate signup rate for each event (matches leaderboard calculation)
  const getSignupRate = (event: EventData): number => {
    if (event.estimatedAttendees <= 0) return 0;
    const targetSignups = event.estimatedAttendees * 2;
    return (event.signupCount / targetSignups) * 100;
  };

  // Filter events with valid coordinates
  const validEvents = useMemo(() => {
    // Debug: Check what event format data we're receiving
    console.log('Event format data sample:', events.slice(0, 3).map(e => ({
      name: e.eventName,
      eventFormat: e.eventFormat,
      allFields: Object.keys(e)
    })));
    
    return events.filter(event => 
      event.lat && event.lng && 
      !isNaN(event.lat) && !isNaN(event.lng) &&
      Math.abs(event.lat) <= 90 && Math.abs(event.lng) <= 180
    );
  }, [events]);

  // Calculate max signup count for height scaling
  const maxSignupCount = useMemo(() => {
    return Math.max(...validEvents.map(event => event.signupCount), 1);
  }, [validEvents]);

  // Color palette for individual events based on signup rate
  const getEventColor = (signupRate: number): string => {
    // Updated thresholds: <5%, 5-10%, 10-20%, 20%+
    if (signupRate < 5) {
      return `rgb(248, 113, 113)`;  // Bright red (<5%) - poor performance
    } else if (signupRate < 10) {
      return `rgb(251, 146, 60)`;   // Bright orange (5-10%) - warning
    } else if (signupRate < 20) {
      return `rgb(250, 204, 21)`;   // Bright yellow (10-20%) - okay
    } else {
      return `rgb(22, 163, 74)`;    // Darker green (20%+) - excellent
    }
  };

  // Transform events into density points for cylinder visualization
  const densityPoints = useMemo(() => {
    return validEvents.map((event): DensityPoint => {
      const signupRate = getSignupRate(event);
      const signupRatio = event.signupCount / maxSignupCount;
      
      return {
        lat: event.lat,
        lng: event.lng,
        altitude: 0.005 + (signupRatio * 0.08), // Smaller, more localized height
        color: getEventColor(signupRate), // Color based on signup rate
        event
      };
    });
  }, [validEvents, maxSignupCount]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = document.getElementById('signups-globe-container');
      if (container) {
        const containerWidth = container.clientWidth;
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        
        setDimensions({
          width: containerWidth,
          height: isMobile 
            ? Math.max(Math.min(containerWidth * 0.8, 500), 300) // Mobile: shorter height, min 300px
            : Math.max(Math.min(containerWidth * 0.7, 800), 600) // Desktop: min 600px
        });
      }
    };

    setIsClient(true);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Setup enhanced visual effects
  useEffect(() => {
    if (globeRef.current && isClient) {
      const globe = globeRef.current;
      
      const isMobile = window.innerWidth < 1024;
      
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = isMobile ? 0.2 : 0.4; // Slower on mobile
      globe.controls().enableZoom = true;
      globe.controls().enablePan = true;
      globe.controls().enableDamping = true;
      globe.controls().dampingFactor = 0.05;
      globe.controls().minDistance = isMobile ? 150 : 200;
      globe.controls().maxDistance = isMobile ? 400 : 600;
      
      // Enable touch interactions
      globe.controls().touches = {
        ONE: 2, // TOUCH.ROTATE
        TWO: 1  // TOUCH.DOLLY_PAN
      };
      
      // Set initial view to show India
      setTimeout(() => {
        globe.pointOfView({ lat: 20.5937, lng: 78.9629, altitude: 1.65 }, 0);
      }, 100);

      // Enhanced scene effects
      const scene = globe.scene();
      scene.fog = new THREE.Fog(0x000814, 300, 1500);
      
      // Enhanced lighting
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
      directionalLight.position.set(1, 1, 0.5).normalize();
      scene.add(directionalLight);

      // Create animated star field
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1500;
      const starVertices = [];
      
      for (let i = 0; i < starCount; i++) {
        const radius = 800 + Math.random() * 400;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starVertices.push(x, y, z);
      }
      
      starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
      
      const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.5,
        transparent: true,
        opacity: 0.7
      });
      
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);
    }
  }, [isClient]);

  const handleEventHover = (point: DensityPoint | null) => {
    setHoveredEvent(point ? point.event : null);
    
    if (globeRef.current) {
      if (point) {
        // Pause rotation when hovering over an event
        globeRef.current.controls().autoRotate = false;
      } else {
        // Resume rotation when not hovering over any event
        globeRef.current.controls().autoRotate = true;
      }
    }
  };



  if (!isClient) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-b from-indigo-900 to-black rounded-lg ${className}`} style={{ height: 800, minHeight: '600px' }}>
        <div className="text-white">Loading globe...</div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-visible ${className}`} style={{ minHeight: '600px' }}>
      <div className="relative flex">
        {/* Signups Globe Container */}
        <div id="signups-globe-container" className="relative flex justify-center items-center p-4 flex-1">
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          showAtmosphere={true}
          atmosphereColor="#8b5cf6"
          atmosphereAltitude={0.2}
          
          // Individual event cylinders (density view)
          pointsData={densityPoints}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="altitude"
          pointColor="color"
          pointRadius={0.3} // Much smaller, localized cylinders
          pointResolution={12}
          pointsMerge={false} // Keep individual for better interaction
          enablePointerInteraction={true}
          onPointHover={handleEventHover}
          pointLabel={(d: DensityPoint) => {
            return `
              <div style="
                background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(50,0,100,0.9)); 
                color: white; 
                padding: 12px 16px; 
                border-radius: 8px; 
                font-size: 12px;
                max-width: 250px;
                word-wrap: break-word;
                border: 1px solid rgba(139,92,246,0.4);
                backdrop-filter: blur(10px);
              ">
                <div style="font-weight: bold; margin-bottom: 6px; color: #a78bfa; font-size: 14px;">${d.event.eventName}</div>
                <div style="margin-bottom: 4px; color: #cbd5e1; font-size: 11px;">
                  Event format: ${d.event.eventFormat || 'Unknown'}
                </div>
                <div style="color: #60a5fa; font-weight: bold; font-size: 12px; margin-bottom: 4px;">
                  Signups: ${d.event.signupCount.toLocaleString()} / ${(d.event.estimatedAttendees * 2).toLocaleString()}
                </div>
                <div style="color: ${d.event.hasConfirmedVenue ? '#34d399' : '#f87171'}; font-size: 11px;">
                  Venue Status: ${d.event.hasConfirmedVenue ? 'Confirmed' : 'Pending'}
                </div>
              </div>
            `;
          }}
        />





        </div>

        {/* iOS Liquid Glass Panel */}
        {(totalEvents !== undefined || totalSignups !== undefined || totalTargetSignups !== undefined) && (
          <div className="absolute top-8 right-8 w-80">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl border border-white/10 relative overflow-hidden">
              {/* Enhanced gradient overlay for glass effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent pointer-events-none rounded-3xl"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-purple-500/5 to-transparent pointer-events-none rounded-3xl"></div>
              
              <div className="relative z-10">
                <h3 className="text-white/90 font-medium text-lg mb-8 text-center tracking-wide">Event Metrics</h3>
                
                <div className="space-y-4">
                  {totalEvents !== undefined && (
                    <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
                      <div className="relative text-center">
                        <div className="text-3xl font-bold bg-gradient-to-r from-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                          {totalEvents.toLocaleString()}
                        </div>
                        <div className="text-sm text-white/80 font-medium">Total Events</div>
                      </div>
                    </div>
                  )}
                  
                  {totalSignups !== undefined && (
                    <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
                      <div className="relative text-center">
                        <div className="text-3xl font-bold bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent mb-2">
                          {totalSignups.toLocaleString()}
                        </div>
                        <div className="text-sm text-white/80 font-medium">Total Signups</div>
                      </div>
                    </div>
                  )}
                  
                  {totalTargetSignups !== undefined && (
                    <div className="bg-white/15 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-lg relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-2xl"></div>
                      <div className="relative text-center">
                        <div className="text-3xl font-bold bg-gradient-to-r from-orange-200 to-yellow-200 bg-clip-text text-transparent mb-2">
                          {totalTargetSignups.toLocaleString()}
                        </div>
                        <div className="text-sm text-white/80 font-medium">Total Target Signups</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
