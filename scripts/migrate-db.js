#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * This script ensures the database schema is up-to-date and matches
 * the expected structure for the Daydream Portal application.
 * 
 * It can be run safely multiple times (idempotent) and will:
 * - Create missing tables and columns
 * - Add missing constraints and indexes
 * - Update enum types if needed
 * - Clean up any data inconsistencies
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if not in production
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

class DatabaseMigrator {
  constructor() {
    this.client = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'daydream_portal',
      user: process.env.POSTGRES_USER || 'daydream_user',
      password: process.env.POSTGRES_PASSWORD,
      ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
    });
  }

  async connect() {
    try {
      await this.client.connect();
      console.log('✅ Connected to PostgreSQL database');
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }
  }

  async disconnect() {
    await this.client.end();
    console.log('✅ Disconnected from database');
  }

  async query(sql, params = []) {
    try {
      const result = await this.client.query(sql, params);
      return result;
    } catch (error) {
      console.error('❌ Database query failed:', error.message);
      console.error('Query:', sql);
      throw error;
    }
  }

  async runMigration() {
    console.log('🚀 Starting database migration...');

    try {
      // Step 1: Create extensions
      await this.createExtensions();
      
      // Step 2: Create enum types
      await this.createEnumTypes();
      
      // Step 3: Create or update tables
      await this.createTables();
      
      // Step 4: Add missing columns
      await this.addMissingColumns();
      
      // Step 5: Create or update indexes
      await this.createIndexes();
      
      // Step 6: Create or update constraints
      await this.createConstraints();
      
      // Step 7: Create triggers
      await this.createTriggers();
      
      // Step 8: Create users and permissions
      await this.createUsers();
      
      // Step 9: Initialize sync metadata
      await this.initializeSyncMetadata();
      
      // Step 10: Clean up data inconsistencies
      await this.cleanupData();

      console.log('✅ Database migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error.message);
      process.exit(1);
    }
  }

  async createExtensions() {
    console.log('📦 Creating extensions...');
    
    const extensions = [
      'uuid-ossp',
      'pg_stat_statements'
    ];

    for (const ext of extensions) {
      await this.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`);
      console.log(`   ✓ Extension ${ext} enabled`);
    }
  }

  async createEnumTypes() {
    console.log('📋 Creating enum types...');
    
    const enums = [
      {
        name: 'event_format_type',
        values: ['12-hours', '24-hours', '2-day']
      },
      {
        name: 'triage_status_type',
        values: ['approved', 'rejected', 'hold', 'ask', 'pending', 'denied', 'merge_confirmed']
      },
      {
        name: 'user_status_type',
        values: ['active', 'admin', 'inactive']
      }
    ];

    for (const enumDef of enums) {
      const valuesStr = enumDef.values.map(v => `'${v}'`).join(', ');
      await this.query(`DO $$ BEGIN
        CREATE TYPE ${enumDef.name} AS ENUM (${valuesStr});
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`);
      console.log(`   ✓ Enum type ${enumDef.name} created`);
    }
  }

  async createTables() {
    console.log('🗂️  Creating tables...');
    
    // Read the schema from the setup-db.sql file
    const schemaPath = path.join(__dirname, '..', 'setup-db.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Extract table creation statements
    const tableStatements = [
      // Events table
      `CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        airtable_id VARCHAR(255) UNIQUE NOT NULL,
        event_name VARCHAR(500) NOT NULL,
        poc_first_name VARCHAR(255),
        poc_last_name VARCHAR(255),
        poc_preferred_name VARCHAR(255),
        poc_slack_id VARCHAR(255),
        poc_dob DATE,
        poc_age INTEGER,
        email VARCHAR(500) NOT NULL,
        location VARCHAR(500),
        slug VARCHAR(255),
        street_address VARCHAR(500),
        street_address_2 VARCHAR(500),
        city VARCHAR(255),
        state VARCHAR(255),
        country VARCHAR(255),
        zipcode VARCHAR(20),
        event_format event_format_type,
        sub_organizers TEXT,
        estimated_attendee_count INTEGER,
        max_attendees INTEGER,
        project_url TEXT,
        project_description TEXT,
        lat DECIMAL(10, 8),
        long DECIMAL(11, 8),
        triage_status triage_status_type DEFAULT 'pending',
        start_date DATE,
        end_date DATE,
        registration_deadline DATE,
        notes TEXT,
        action_trigger_approval_email VARCHAR(500),
        action_trigger_rejection_email VARCHAR(500),
        action_trigger_hold_email VARCHAR(500),
        action_trigger_ask_email VARCHAR(500),
        has_confirmed_venue BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Admins table
      `CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        airtable_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(500) UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        user_status user_status_type DEFAULT 'inactive',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,

      // Attendees table
      `CREATE TABLE IF NOT EXISTS attendees (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        airtable_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(500) NOT NULL,
        preferred_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        dob DATE,
        phone VARCHAR(50),
        event_airtable_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (event_airtable_id) REFERENCES events(airtable_id) ON DELETE CASCADE
      )`,

      // Sync metadata table
      `CREATE TABLE IF NOT EXISTS sync_metadata (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_name VARCHAR(100) NOT NULL UNIQUE,
        last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_sync_status VARCHAR(50) DEFAULT 'success',
        records_synced INTEGER DEFAULT 0,
        errors_count INTEGER DEFAULT 0,
        error_details TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`
    ];

    for (const statement of tableStatements) {
      await this.query(statement);
    }
    
    console.log('   ✓ All tables created/verified');
  }

  async addMissingColumns() {
    console.log('📊 Adding missing columns...');
    
    // Check for max_attendees column in events table
    const result = await this.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'max_attendees'
    `);
    
    if (result.rows.length === 0) {
      await this.query('ALTER TABLE events ADD COLUMN max_attendees INTEGER');
      console.log('   ✓ Added max_attendees column to events table');
    }
  }

  async createConstraints() {
    console.log('🔗 Creating constraints...');
    
    // Ensure sync_metadata table has unique constraint on table_name
    try {
      await this.query('ALTER TABLE sync_metadata ADD CONSTRAINT sync_metadata_table_name_unique UNIQUE (table_name)');
      console.log('   ✓ Added unique constraint on sync_metadata.table_name');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('relation "sync_metadata_table_name_unique" already exists')) {
        console.log('   ✓ Unique constraint on sync_metadata.table_name already exists');
      } else {
        throw error;
      }
    }
  }

  async createIndexes() {
    console.log('📇 Creating indexes...');
    
    const indexes = [
      // Events indexes
      'CREATE INDEX IF NOT EXISTS idx_events_email ON events(email)',
      'CREATE INDEX IF NOT EXISTS idx_events_triage_status ON events(triage_status)',
      'CREATE INDEX IF NOT EXISTS idx_events_location ON events(location)',
      'CREATE INDEX IF NOT EXISTS idx_events_event_format ON events(event_format)',
      'CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date)',
      'CREATE INDEX IF NOT EXISTS idx_events_airtable_id ON events(airtable_id)',
      'CREATE INDEX IF NOT EXISTS idx_events_synced_at ON events(synced_at)',
      
      // Admins indexes
      'CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email)',
      'CREATE INDEX IF NOT EXISTS idx_admins_user_status ON admins(user_status)',
      'CREATE INDEX IF NOT EXISTS idx_admins_airtable_id ON admins(airtable_id)',
      
      // Attendees indexes
      'CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email)',
      'CREATE INDEX IF NOT EXISTS idx_attendees_event_airtable_id ON attendees(event_airtable_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendees_airtable_id ON attendees(airtable_id)',
      'CREATE INDEX IF NOT EXISTS idx_attendees_synced_at ON attendees(synced_at)',
      
      // Sync metadata indexes
      'CREATE INDEX IF NOT EXISTS idx_sync_metadata_table_name ON sync_metadata(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_sync_metadata_last_sync_at ON sync_metadata(last_sync_at)'
    ];

    for (const indexSql of indexes) {
      await this.query(indexSql);
    }
    
    console.log('   ✓ All indexes created/verified');
  }

  async createTriggers() {
    console.log('⚡ Creating triggers...');
    
    // Create updated_at trigger function
    await this.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for each table
    const triggers = [
      'DROP TRIGGER IF EXISTS update_events_updated_at ON events',
      'CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'DROP TRIGGER IF EXISTS update_admins_updated_at ON admins',
      'CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'DROP TRIGGER IF EXISTS update_attendees_updated_at ON attendees',
      'CREATE TRIGGER update_attendees_updated_at BEFORE UPDATE ON attendees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];

    for (const triggerSql of triggers) {
      await this.query(triggerSql);
    }
    
    console.log('   ✓ All triggers created/verified');
  }

  async createUsers() {
    console.log('👤 Creating users and permissions...');
    
    // Create read-only user for admin console queries
    await this.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT FROM pg_user WHERE usename = 'readonly_user') THEN
              CREATE USER readonly_user WITH PASSWORD 'readonly_secure_pass_change_me';
          END IF;
      END
      $$;
    `);

    // Grant permissions
    await this.query('GRANT CONNECT ON DATABASE ' + (process.env.POSTGRES_DB || 'daydream_portal') + ' TO readonly_user');
    await this.query('GRANT USAGE ON SCHEMA public TO readonly_user');
    await this.query('GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user');
    await this.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user');
    
    console.log('   ✓ Users and permissions configured');
  }

  async initializeSyncMetadata() {
    console.log('🔄 Initializing sync metadata...');
    
    // Insert initial sync metadata
    await this.query(`
      INSERT INTO sync_metadata (table_name, last_sync_status, records_synced) 
      VALUES 
          ('events', 'pending', 0),
          ('admins', 'pending', 0),
          ('attendees', 'pending', 0)
      ON CONFLICT (table_name) DO NOTHING
    `);
    
    console.log('   ✓ Sync metadata initialized');
  }

  async cleanupData() {
    console.log('🧹 Cleaning up data inconsistencies...');
    
    // Remove duplicate sync metadata entries (keep the latest one per table)
    const dupeCheck = await this.query(`
      SELECT table_name, COUNT(*) as count 
      FROM sync_metadata 
      GROUP BY table_name 
      HAVING COUNT(*) > 1
    `);
    
    if (dupeCheck.rows.length > 0) {
      console.log('   ⚠️  Found duplicate sync metadata entries, cleaning up...');
      
      await this.query(`
        DELETE FROM sync_metadata 
        WHERE id NOT IN (
            SELECT DISTINCT ON (table_name) id
            FROM sync_metadata 
            ORDER BY table_name, last_sync_at DESC
        )
      `);
      
      console.log('   ✓ Removed duplicate sync metadata entries');
    }
    
    console.log('   ✓ Data cleanup completed');
  }
}

// Main execution
async function main() {
  const migrator = new DatabaseMigrator();
  
  await migrator.connect();
  await migrator.runMigration();
  await migrator.disconnect();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { DatabaseMigrator };
