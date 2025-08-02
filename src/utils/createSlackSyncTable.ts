import { databaseService } from '../services/databaseService';

export async function createSlackSyncTable(): Promise<void> {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS slack_sync_metadata (
          id SERIAL PRIMARY KEY,
          sync_type VARCHAR(50) NOT NULL DEFAULT 'slack_channel_sync',
          channels_synced JSONB,
          members_added INTEGER DEFAULT 0,
          last_sync_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_sync_status VARCHAR(20) CHECK (last_sync_status IN ('success', 'failure', 'partial')),
          errors_count INTEGER DEFAULT 0,
          error_details TEXT,
          duration_ms INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    await databaseService.query(query);
    console.log('✅ slack_sync_metadata table created successfully');

    // Create indexes
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_slack_sync_metadata_last_sync_at ON slack_sync_metadata(last_sync_at);',
      'CREATE INDEX IF NOT EXISTS idx_slack_sync_metadata_sync_type ON slack_sync_metadata(sync_type);'
    ];

    for (const indexQuery of indexQueries) {
      await databaseService.query(indexQuery);
    }
    console.log('✅ slack_sync_metadata indexes created successfully');

  } catch (error) {
    console.error('Error creating slack_sync_metadata table:', error);
    throw error;
  }
}
