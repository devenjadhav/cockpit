import express from 'express';
import { databaseService } from '../services/databaseService';
import { ApiResponse } from '../types/api';

const router = express.Router();

// GET /api/signups/daily - get daily signup counts across all events
router.get('/daily', async (req, res) => {
  try {
    const query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::integer as signups
      FROM attendees 
      WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;
    
    const result = await databaseService.query(query);
    
    res.json({
      success: true,
      data: result.rows || [],
    } as ApiResponse<{ date: string; signups: number }[]>);
  } catch (error) {
    console.error('Get daily signups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily signup data',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
});

// GET /api/signups/top-events - get all events by signup count
router.get('/top-events', async (req, res) => {
  try {
    const eventsQuery = `
      SELECT 
        e.airtable_id as "eventId",
        e.event_name as "eventName",
        e.estimated_attendee_count as "estimatedAttendees",
        e.location,
        e.has_confirmed_venue as "hasConfirmedVenue",
        COUNT(a.airtable_id)::integer as "signupCount"
      FROM events e
      LEFT JOIN attendees a ON e.airtable_id = a.event_airtable_id 
      WHERE e.triage_status = 'approved'
      GROUP BY e.airtable_id, e.event_name, e.estimated_attendee_count, e.location, e.has_confirmed_venue
      ORDER BY "signupCount" DESC
    `;
    
    const eventsResult = await databaseService.query(eventsQuery);
    const events = eventsResult.rows || [];
    
    // Use the has_confirmed_venue field from the database directly
    const enrichedEvents = events.map((event: any) => ({
      ...event,
      venueName: event.location || 'TBD'
    }));
    
    res.json({
      success: true,
      data: enrichedEvents,
    } as ApiResponse<any[]>);
  } catch (error) {
    console.error('Get top events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top events data',
      error: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse);
  }
});

export default router;
