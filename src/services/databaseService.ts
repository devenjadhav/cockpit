import { Pool, PoolClient } from 'pg';
import fs from 'fs';
import path from 'path';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

class DatabaseService {
  private pool: Pool | null = null;
  private readOnlyPool: Pool | null = null;

  constructor() {
    this.initializePools();
  }

  private initializePools() {
    try {
      const sslConfig = this.getSSLConfig();
      
      // Main connection pool for sync operations
      const mainConfig: DatabaseConfig = {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'daydream_portal',
        user: process.env.POSTGRES_USER || 'daydream_user',
        password: process.env.POSTGRES_PASSWORD || '',
        ssl: sslConfig
      };

      this.pool = new Pool({
        ...mainConfig,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 30000,
        query_timeout: 30000,
        application_name: 'daydream_portal_sync'
      });

      // Read-only pool for admin console queries
      const readOnlyConfig: DatabaseConfig = {
        ...mainConfig,
        user: process.env.POSTGRES_READONLY_USER || 'readonly_user',
        password: process.env.POSTGRES_READONLY_PASSWORD || 'readonly_secure_pass_change_me'
      };

      this.readOnlyPool = new Pool({
        ...readOnlyConfig,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
        statement_timeout: 15000,
        query_timeout: 15000,
        application_name: 'daydream_portal_readonly'
      });

      this.setupEventHandlers();
      console.log('Database service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database service:', error);
    }
  }

  private getSSLConfig() {
    if (process.env.NODE_ENV === 'development' && process.env.POSTGRES_SSL === 'true') {
      const sslDir = path.join(__dirname, '../../database/ssl');
      
      return {
        rejectUnauthorized: false, // For self-signed certificates in development
        ca: fs.existsSync(path.join(sslDir, 'ca.crt')) 
          ? fs.readFileSync(path.join(sslDir, 'ca.crt')).toString()
          : undefined,
        cert: fs.existsSync(path.join(sslDir, 'server.crt'))
          ? fs.readFileSync(path.join(sslDir, 'server.crt')).toString()
          : undefined,
        key: fs.existsSync(path.join(sslDir, 'server.key'))
          ? fs.readFileSync(path.join(sslDir, 'server.key')).toString()
          : undefined
      };
    }
    return undefined;
  }

  private setupEventHandlers() {
    if (this.pool) {
      this.pool.on('error', (err) => {
        console.error('Unexpected database pool error:', err);
      });

      this.pool.on('connect', () => {
        // Connection established
      });
    }

    if (this.readOnlyPool) {
      this.readOnlyPool.on('error', (err) => {
        console.error('Unexpected read-only database pool error:', err);
      });
    }
  }

  async getClient(): Promise<PoolClient | null> {
    if (!this.pool) {
      console.error('Database pool not initialized');
      return null;
    }

    try {
      return await this.pool.connect();
    } catch (error) {
      console.error('Failed to get database client:', error);
      return null;
    }
  }

  async getReadOnlyClient(): Promise<PoolClient | null> {
    if (!this.readOnlyPool) {
      console.error('Read-only database pool not initialized');
      return null;
    }

    try {
      return await this.readOnlyPool.connect();
    } catch (error) {
      console.error('Failed to get read-only database client:', error);
      return null;
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    if (!client) {
      throw new Error('Failed to get database client');
    }

    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Query executed successfully
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async readOnlyQuery(text: string, params?: any[]): Promise<any> {
    const client = await this.getReadOnlyClient();
    if (!client) {
      throw new Error('Failed to get read-only database client');
    }

    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Read-only query executed successfully
      
      return result;
    } catch (error) {
      console.error('Read-only database query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1');
      return result.rows.length === 1;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        // Main database pool closed
      }
      if (this.readOnlyPool) {
        await this.readOnlyPool.end();
        // Read-only database pool closed
      }
    } catch (error) {
      console.error('Error closing database pools:', error);
    }
  }

  isInitialized(): boolean {
    return this.pool !== null && this.readOnlyPool !== null;
  }

  async getAttendeesByEvent(eventAirtableId: string) {
    const query = `
      SELECT 
        airtable_id as id,
        email,
        preferred_name as "preferredName",
        first_name as "firstName", 
        last_name as "lastName",
        dob,
        phone,
        deleted_in_cockpit as "deleted_in_cockpit",
        event_volunteer as "event_volunteer",
        shirt_size,
        additional_accommodations,
        dietary_restrictions,
        emergency_contact_1_phone,
        emergency_contact_1_name,
        checkin_completed,
        scanned_in,
        referral_information
      FROM attendees 
      WHERE event_airtable_id = $1
        AND (deleted_in_cockpit IS NULL OR deleted_in_cockpit = FALSE)
      ORDER BY email ASC
    `;
    
    const result = await this.query(query, [eventAirtableId]);
    
    // Convert to safe attendees by calculating age instead of exposing DOB
    return result.rows.map((row: any) => {
      const { dob, ...safeData } = row;
      
      // Calculate age if DOB exists
      let age = null;
      if (dob) {
        const birthDate = new Date(dob);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age = age - 1;
        }
      }
      
      return {
        ...safeData,
        age
      };
    });
  }

  async getVenueByEventAirtableId(eventAirtableId: string) {
    const query = `
      SELECT 
        airtable_id as id,
        venue_id as "venueId",
        event_name as "eventName",
        venue_name as "venueName",
        address_1 as "address1",
        address_2 as "address2",
        city,
        state,
        country,
        zip_code as "zipCode",
        venue_contact_name as "venueContactName",
        venue_contact_email as "venueContactEmail"
      FROM venues 
      WHERE event_name = $1
      LIMIT 1
    `;
    
    const result = await this.query(query, [eventAirtableId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async getVenueByEventName(eventName: string) {
    const query = `
      SELECT 
        airtable_id as id,
        venue_id as "venueId",
        event_name as "eventName",
        venue_name as "venueName",
        address_1 as "address1",
        address_2 as "address2",
        city,
        state,
        country,
        zip_code as "zipCode",
        venue_contact_name as "venueContactName",
        venue_contact_email as "venueContactEmail"
      FROM venues 
      WHERE event_name = $1
      LIMIT 1
    `;
    
    const result = await this.query(query, [eventName]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  getPoolInfo() {
    return {
      main: {
        totalCount: this.pool?.totalCount || 0,
        idleCount: this.pool?.idleCount || 0,
        waitingCount: this.pool?.waitingCount || 0
      },
      readOnly: {
        totalCount: this.readOnlyPool?.totalCount || 0,
        idleCount: this.readOnlyPool?.idleCount || 0,
        waitingCount: this.readOnlyPool?.waitingCount || 0
      }
    };
  }
}

export const databaseService = new DatabaseService();
