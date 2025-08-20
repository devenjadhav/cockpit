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
        console.log('New database client connected');
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
      
      console.log('Query executed', { 
        duration: `${duration}ms`, 
        rows: result.rowCount,
        command: result.command 
      });
      
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
      
      console.log('Read-only query executed', { 
        duration: `${duration}ms`, 
        rows: result.rowCount 
      });
      
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
        console.log('Main database pool closed');
      }
      if (this.readOnlyPool) {
        await this.readOnlyPool.end();
        console.log('Read-only database pool closed');
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
        phone
      FROM attendees 
      WHERE event_airtable_id = $1
      ORDER BY email ASC
    `;
    
    const result = await this.query(query, [eventAirtableId]);
    return result.rows;
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
