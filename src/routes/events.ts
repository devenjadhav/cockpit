import express from 'express';
import { airtableService } from '../services/airtableService';
import { loopsService } from '../services/loopsService';
import { DashboardService } from '../services/dashboardService';
import { databaseService } from '../services/databaseService';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import { ApiResponse, EventWithStats, PaginatedResponse } from '../types/api';
import { UpdateEventData } from '../types/event';
import { PaginationUtils } from '../utils/pagination';
import { EventUpdateEmailData } from '../types/loops';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/events - get all events for logged-in organizer
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    const events = await airtableService.getEventsByOrganizer(req.user.email);

    // Enhance events with basic stats (no attendee data)
    const eventsWithStats: EventWithStats[] = events.map(event => ({
      ...event,
      attendeeCount: 0, // No attendee tracking
      capacityPercentage: 0, // No capacity tracking
      isUpcoming: event.triageStatus === 'Approved',
    }));

    res.json({
      success: true,
      data: eventsWithStats,
    } as ApiResponse<EventWithStats[]>);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
    } as ApiResponse);
  }
});

// GET /api/events/:eventId - get single event with attendee count
router.get('/:eventId', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    const { eventId } = req.params;
    const event = await airtableService.getEventById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      } as ApiResponse);
    }

    // Check if user is an admin or the organizer
    const isAdmin = await airtableService.isAdmin(req.user.email);
    if (!isAdmin && event.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own events.',
      } as ApiResponse);
    }

    // Get attendees for this event
    const attendees = await databaseService.getAttendeesByEvent(event.id);
    
    // Return event with attendee data
    const eventWithStats: EventWithStats & { attendees?: any[] } = {
      ...event,
      attendeeCount: attendees.length,
      capacityPercentage: event.estimatedAttendeeCount ? (attendees.length / event.estimatedAttendeeCount) * 100 : 0,
      isUpcoming: event.triageStatus === 'Approved',
      attendees: attendees,
      // Include admin-only fields if user is admin
      ...(isAdmin && {
        organizerEmail: event.email,
        registrationDeadline: event.registrationDeadline,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        description: event.description,
        tags: event.tags,
        website: event.website,
        contactInfo: event.contactInfo,
        // POC (Point of Contact) fields
        pocFirstName: event.pocFirstName,
        pocLastName: event.pocLastName,
        pocPreferredName: event.pocPreferredName,
        pocSlackId: event.pocSlackId,
        pocAge: event.pocAge,
      })
    };

    res.json({
      success: true,
      data: eventWithStats,
    } as ApiResponse<EventWithStats>);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event',
    } as ApiResponse);
  }
});

// PUT /api/events/:eventId - update event (verify email matches)
router.put('/:eventId', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    const { eventId } = req.params;
    const updateData: UpdateEventData = req.body;
    
    console.log('Update event request:', { eventId, updateData });

    // First, verify the event exists and user owns it
    const existingEvent = await airtableService.getEventById(eventId);

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      } as ApiResponse);
    }

    // Check if user is an admin or the organizer
    const isAdmin = await airtableService.isAdmin(req.user.email);
    if (!isAdmin && existingEvent.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own events.',
      } as ApiResponse);
    }

    // Validate update data
    if (updateData.estimatedAttendeeCount !== undefined && updateData.estimatedAttendeeCount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Estimated attendee count cannot be negative',
      } as ApiResponse);
    }

    if (updateData.eventName && updateData.eventName.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Event name cannot be empty',
      } as ApiResponse);
    }

    // Update the event
    const updatedEvent = await airtableService.updateEvent(eventId, updateData);

    // Return updated event with basic stats
    const eventWithStats: EventWithStats = {
      ...updatedEvent,
      attendeeCount: 0, // No attendee tracking
      capacityPercentage: 0, // No capacity tracking
      isUpcoming: updatedEvent.triageStatus === 'Approved',
    };

    res.json({
      success: true,
      data: eventWithStats,
      message: 'Event updated successfully',
    } as ApiResponse<EventWithStats>);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event',
    } as ApiResponse);
  }
});

// GET /api/events/:eventId/attendees - paginated attendee list


// GET /api/events/:eventId/stats - detailed event statistics
router.get('/:eventId/stats', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    const { eventId } = req.params;
    
    // Verify event exists and user owns it
    const event = await airtableService.getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      } as ApiResponse);
    }

    // Check if user is an admin or the organizer
    const isAdmin = await airtableService.isAdmin(req.user.email);
    if (!isAdmin && event.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view statistics for your own events.',
      } as ApiResponse);
    }

    // Return basic event statistics (no attendee data)
    res.json({
      success: true,
      data: {
        eventId: event.id,
        eventName: event.eventName,
        totalAttendees: 0, // No attendee tracking
        attendeesByStatus: {
          registered: 0,
          checkedIn: 0,
          noShow: 0,
          cancelled: 0,
        },
      },
    } as ApiResponse);
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event statistics',
    } as ApiResponse);
  }
});



// POST /api/events/:eventId/notify - send update to attendees via Loops
router.post('/:eventId/notify', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      } as ApiResponse);
    }

    const { eventId } = req.params;
    const { updateType, updateDetails, eventDate, eventLocation } = req.body;
    
    // Validate required fields
    if (!updateType || !updateDetails) {
      return res.status(400).json({
        success: false,
        message: 'updateType and updateDetails are required',
      } as ApiResponse);
    }

    // Verify event exists and user owns it
    const event = await airtableService.getEventById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      } as ApiResponse);
    }

    // Check if user is an admin or the organizer
    const isAdmin = await airtableService.isAdmin(req.user.email);
    if (!isAdmin && event.email !== req.user.email) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only send updates for your own events.',
      } as ApiResponse);
    }

    // No attendees to notify since we don't track them
    res.json({
      success: true,
      data: {
        totalSent: 0,
        totalFailed: 0,
        totalAttendees: 0,
      },
      message: 'No attendees to notify (attendee tracking disabled)',
    } as ApiResponse);
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
    } as ApiResponse);
  }
});

export default router;
