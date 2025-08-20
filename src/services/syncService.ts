import { airtableService } from './airtableService';
import { databaseService } from './databaseService';
import { Event, EventFields } from '../types/event';
import { Attendee } from '../types/attendee';

interface SyncResult {
  success: boolean;
  recordsSynced: number;
  errors: string[];
  duration: number;
}

interface SyncMetadata {
  table_name: string;
  last_sync_at: Date;
  last_sync_status: string;
  records_synced: number;
  errors_count: number;
  error_details?: string;
}

class SyncService {
  private syncIntervalId: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds
  private _isRunning = false;

  constructor() {
    // Start sync process when service is initialized
    this.startPeriodicSync();
  }

  startPeriodicSync(): void {
    if (this.syncIntervalId) {
      console.log('Sync service already running');
      return;
    }

    console.log(`Starting periodic sync every ${this.SYNC_INTERVAL_MS / 1000} seconds`);
    
    // Run initial sync
    this.performFullSync().catch(console.error);

    // Set up periodic sync
    this.syncIntervalId = setInterval(async () => {
      if (!this._isRunning) {
        await this.performFullSync().catch(console.error);
      }
    }, this.SYNC_INTERVAL_MS);
  }

  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Periodic sync stopped');
    }
  }

  async performFullSync(): Promise<SyncResult> {
    if (this._isRunning) {
      console.log('Sync already in progress, skipping...');
      return {
        success: false,
        recordsSynced: 0,
        errors: ['Sync already in progress'],
        duration: 0
      };
    }

    this._isRunning = true;
    const startTime = Date.now();
    let totalRecords = 0;
    const errors: string[] = [];

    try {
      console.log('Starting full sync from Airtable to PostgreSQL');

      // Check database connectivity
      if (!databaseService.isInitialized()) {
        throw new Error('Database service not initialized');
      }

      const healthCheck = await databaseService.healthCheck();
      if (!healthCheck) {
        throw new Error('Database health check failed');
      }

      // Sync events
      try {
        const eventsResult = await this.syncEvents();
        totalRecords += eventsResult.recordsSynced;
        errors.push(...eventsResult.errors);
      } catch (error) {
        const errorMsg = `Events sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Sync admins
      try {
        const adminsResult = await this.syncAdmins();
        totalRecords += adminsResult.recordsSynced;
        errors.push(...adminsResult.errors);
      } catch (error) {
        const errorMsg = `Admins sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      // Sync attendees
      try {
        const attendeesResult = await this.syncAttendees();
        totalRecords += attendeesResult.recordsSynced;
        errors.push(...attendeesResult.errors);
      } catch (error) {
        const errorMsg = `Attendees sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      console.log(`Sync completed: ${totalRecords} records, ${errors.length} errors, ${duration}ms`);

      return {
        success,
        recordsSynced: totalRecords,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Full sync failed:', errorMsg);
      
      return {
        success: false,
        recordsSynced: totalRecords,
        errors: [errorMsg, ...errors],
        duration
      };
    } finally {
      this._isRunning = false;
    }
  }

  private async syncEvents(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('Syncing events from Airtable...');
      
      // Get all events from Airtable
      const airtableEvents = await airtableService.getAllEvents();
      console.log(`Retrieved ${airtableEvents.length} events from Airtable`);

      // Process events in batches for better performance
      const batchSize = 50;
      for (let i = 0; i < airtableEvents.length; i += batchSize) {
        const batch = airtableEvents.slice(i, i + batchSize);
        
        try {
          await this.upsertEventsBatch(batch);
          syncedCount += batch.length;
        } catch (error) {
          const errorMsg = `Batch sync failed for events ${i}-${i + batch.length}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata('events', syncedCount, errors.length, errors.join('; '));

      return {
        success: errors.length === 0,
        recordsSynced: syncedCount,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Events sync failed:', errorMsg);
      
      await this.updateSyncMetadata('events', syncedCount, 1, errorMsg);
      
      return {
        success: false,
        recordsSynced: syncedCount,
        errors: [errorMsg, ...errors],
        duration: Date.now() - startTime
      };
    }
  }

  private async syncAdmins(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('Syncing admins from Airtable...');
      
      // Get all admin emails and then their details
      const adminEmails = await airtableService.getAllOrganizerEmails();
      console.log(`Retrieved ${adminEmails.length} potential admin emails from Airtable`);

      const admins = [];
      for (const email of adminEmails) {
        try {
          const admin = await airtableService.getAdminByEmail(email);
          if (admin) {
            admins.push(admin);
          }
        } catch (error) {
          // Skip non-admin emails silently
        }
      }

      console.log(`Found ${admins.length} actual admins`);

      // Process admins in batches
      const batchSize = 20;
      for (let i = 0; i < admins.length; i += batchSize) {
        const batch = admins.slice(i, i + batchSize);
        
        try {
          await this.upsertAdminsBatch(batch);
          syncedCount += batch.length;
        } catch (error) {
          const errorMsg = `Batch sync failed for admins ${i}-${i + batch.length}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata('admins', syncedCount, errors.length, errors.join('; '));

      return {
        success: errors.length === 0,
        recordsSynced: syncedCount,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Admins sync failed:', errorMsg);
      
      await this.updateSyncMetadata('admins', syncedCount, 1, errorMsg);
      
      return {
        success: false,
        recordsSynced: syncedCount,
        errors: [errorMsg, ...errors],
        duration: Date.now() - startTime
      };
    }
  }

  private async syncAttendees(): Promise<SyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let syncedCount = 0;

    try {
      console.log('Syncing attendees from Airtable...');
      
      // Get all attendees from Airtable
      const airtableAttendees = await airtableService.getAllAttendees();
      console.log(`Retrieved ${airtableAttendees.length} attendees from Airtable`);

      // Process attendees in batches
      const batchSize = 50;
      for (let i = 0; i < airtableAttendees.length; i += batchSize) {
        const batch = airtableAttendees.slice(i, i + batchSize);
        
        try {
          await this.upsertAttendeesBatch(batch);
          syncedCount += batch.length;
        } catch (error) {
          const errorMsg = `Batch sync failed for attendees ${i}-${i + batch.length}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update sync metadata
      await this.updateSyncMetadata('attendees', syncedCount, errors.length, errors.join('; '));

      return {
        success: errors.length === 0,
        recordsSynced: syncedCount,
        errors,
        duration: Date.now() - startTime
      };

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Attendees sync failed:', errorMsg);
      
      await this.updateSyncMetadata('attendees', syncedCount, 1, errorMsg);
      
      return {
        success: false,
        recordsSynced: syncedCount,
        errors: [errorMsg, ...errors],
        duration: Date.now() - startTime
      };
    }
  }

  private async upsertEventsBatch(events: Event[]): Promise<void> {
    const values = events.map(event => {
      // Map Airtable event to PostgreSQL format
      return [
        event.id, // airtable_id
        this.sanitizeString(event.eventName),
        this.sanitizeString(event.pocFirstName),
        this.sanitizeString(event.pocLastName),
        this.sanitizeString(event.pocPreferredName),
        this.sanitizeString(event.pocSlackId),
        event.pocDob || null,
        this.sanitizeString(event.email),
        this.sanitizeString(event.location),
        this.sanitizeString(event.slug),
        this.sanitizeString(event.streetAddress),
        this.sanitizeString(event.streetAddress2),
        this.sanitizeString(event.city),
        this.sanitizeString(event.state),
        this.sanitizeString(event.country),
        this.sanitizeString(event.zipcode),
        event.eventFormat || null,
        this.sanitizeString(event.subOrganizers),
        event.estimatedAttendeeCount || null,
        this.sanitizeString(event.projectUrl),
        this.sanitizeString(event.projectDescription),
        event.lat || null,
        event.long || null,
        this.normalizeTriageStatus(event.triageStatus),
        event.startDate || null,
        event.endDate || null,
        event.registrationDeadline || null,
        this.sanitizeString(event.notes),
        this.sanitizeString(event.actionTriggerApprovalEmail),
        this.sanitizeString(event.actionTriggerRejectionEmail),
        this.sanitizeString(event.actionTriggerHoldEmail),
        this.sanitizeString(event.actionTriggerAskEmail),
        event.hasConfirmedVenue || false
      ];
    });

    const placeholders = values.map((_, index) => {
      const offset = index * 33;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30}, $${offset + 31}, $${offset + 32}, $${offset + 33})`;
    }).join(', ');

    const query = `
      INSERT INTO events (
        airtable_id, event_name, poc_first_name, poc_last_name, poc_preferred_name,
        poc_slack_id, poc_dob, email, location, slug, street_address, street_address_2,
        city, state, country, zipcode, event_format, sub_organizers, estimated_attendee_count,
        project_url, project_description, lat, long, triage_status, start_date, end_date,
        registration_deadline, notes, action_trigger_approval_email, action_trigger_rejection_email,
        action_trigger_hold_email, action_trigger_ask_email, has_confirmed_venue
      ) VALUES ${placeholders}
      ON CONFLICT (airtable_id) DO UPDATE SET
        event_name = EXCLUDED.event_name,
        poc_first_name = EXCLUDED.poc_first_name,
        poc_last_name = EXCLUDED.poc_last_name,
        poc_preferred_name = EXCLUDED.poc_preferred_name,
        poc_slack_id = EXCLUDED.poc_slack_id,
        poc_dob = EXCLUDED.poc_dob,
        email = EXCLUDED.email,
        location = EXCLUDED.location,
        slug = EXCLUDED.slug,
        street_address = EXCLUDED.street_address,
        street_address_2 = EXCLUDED.street_address_2,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        zipcode = EXCLUDED.zipcode,
        event_format = EXCLUDED.event_format,
        sub_organizers = EXCLUDED.sub_organizers,
        estimated_attendee_count = EXCLUDED.estimated_attendee_count,
        project_url = EXCLUDED.project_url,
        project_description = EXCLUDED.project_description,
        lat = EXCLUDED.lat,
        long = EXCLUDED.long,
        triage_status = EXCLUDED.triage_status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        registration_deadline = EXCLUDED.registration_deadline,
        notes = EXCLUDED.notes,
        action_trigger_approval_email = EXCLUDED.action_trigger_approval_email,
        action_trigger_rejection_email = EXCLUDED.action_trigger_rejection_email,
        action_trigger_hold_email = EXCLUDED.action_trigger_hold_email,
        action_trigger_ask_email = EXCLUDED.action_trigger_ask_email,
        has_confirmed_venue = EXCLUDED.has_confirmed_venue,
        synced_at = NOW()
    `;

    await databaseService.query(query, values.flat());
  }

  private async upsertAdminsBatch(admins: any[]): Promise<void> {
    const values = admins.map(admin => [
      admin.id || admin.email, // Use email as fallback for airtable_id
      this.sanitizeString(admin.email),
      this.sanitizeString(admin.firstName),
      this.sanitizeString(admin.lastName),
      admin.userStatus || 'inactive'
    ]);

    const placeholders = values.map((_, index) => {
      const offset = index * 5;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`;
    }).join(', ');

    const query = `
      INSERT INTO admins (airtable_id, email, first_name, last_name, user_status)
      VALUES ${placeholders}
      ON CONFLICT (airtable_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        user_status = EXCLUDED.user_status,
        synced_at = NOW()
    `;

    await databaseService.query(query, values.flat());
  }

  private async upsertAttendeesBatch(attendees: Attendee[]): Promise<void> {
    const values = attendees.map(attendee => [
      attendee.id, // airtable_id
      this.sanitizeString(attendee.email),
      this.sanitizeString(attendee.preferredName),
      this.sanitizeString(attendee.firstName),
      this.sanitizeString(attendee.lastName),
      attendee.dob || null,
      this.sanitizeString(attendee.phone),
      this.sanitizeString(attendee.event)
    ]);

    const placeholders = values.map((_, index) => {
      const offset = index * 8;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`;
    }).join(', ');

    const query = `
      INSERT INTO attendees (airtable_id, email, preferred_name, first_name, last_name, dob, phone, event_airtable_id)
      VALUES ${placeholders}
      ON CONFLICT (airtable_id) DO UPDATE SET
        email = EXCLUDED.email,
        preferred_name = EXCLUDED.preferred_name,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        dob = EXCLUDED.dob,
        phone = EXCLUDED.phone,
        event_airtable_id = EXCLUDED.event_airtable_id,
        synced_at = NOW()
    `;

    await databaseService.query(query, values.flat());
  }

  private async updateSyncMetadata(tableName: string, recordsSynced: number, errorsCount: number, errorDetails?: string): Promise<void> {
    const query = `
      INSERT INTO sync_metadata (table_name, last_sync_status, records_synced, errors_count, error_details)
      VALUES ($1, $2, $3, $4, $5)
    `;

    const status = errorsCount === 0 ? 'success' : 'partial_failure';
    await databaseService.query(query, [tableName, status, recordsSynced, errorsCount, errorDetails || null]);
  }

  private sanitizeString(value: any): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    
    const str = String(value).trim();
    return str.length > 0 ? str : null;
  }

  private normalizeTriageStatus(status: string | null | undefined): string {
    if (!status) return 'pending';
    
    const normalized = status.toLowerCase().trim();
    
    // Map Airtable values to database enum values
    switch (normalized) {
      case 'approved':
        return 'approved';
      case 'denied':
      case 'rejected':
        return 'rejected';
      case 'hold':
        return 'hold';
      case 'ask':
        return 'ask';
      case 'merge confirmed':
      case 'merge_confirmed':
        return 'merge_confirmed';
      case 'pending':
      default:
        return 'pending';
    }
  }

  async getSyncStatus(): Promise<SyncMetadata[]> {
    const query = `
      SELECT DISTINCT ON (table_name) 
        table_name, last_sync_at, last_sync_status, records_synced, errors_count, error_details
      FROM sync_metadata 
      ORDER BY table_name, created_at DESC
    `;

    const result = await databaseService.query(query);
    return result.rows;
  }

  isRunning(): boolean {
    return this._isRunning;
  }
}

export const syncService = new SyncService();
