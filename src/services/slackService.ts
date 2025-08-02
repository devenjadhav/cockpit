import { WebClient } from '@slack/web-api';
import { databaseService } from './databaseService';


interface SlackMember {
  id: string;
  name: string;
  realName?: string;
  email?: string;
  isBot: boolean;
  deleted: boolean;
}

interface SlackSyncResult {
  success: boolean;
  channelsProcessed: string[];
  membersAdded: number;
  errors: string[];
  duration: number;
}

interface SlackSyncMetadata {
  id?: number;
  sync_type: 'slack_channel_sync';
  channels_synced: string[];
  members_added: number;
  last_sync_at: Date;
  last_sync_status: 'success' | 'failure' | 'partial';
  errors_count: number;
  error_details?: string;
  duration_ms: number;
}

class SlackService {
  private client: WebClient | null = null;
  private channels = {
    'daydream': 'C094GLLH2RX',
    'daydream-bulletin': 'C095SBQFRTP'
  };
  private isConfigured = false;
  
  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      console.warn('SLACK_BOT_TOKEN not configured, Slack sync will be disabled');
      return;
    }
    
    try {
      this.client = new WebClient(token);
      this.isConfigured = true;
    } catch (error) {
      console.error('Failed to initialize Slack client:', error);
    }
  }

  async syncChannelMembers(): Promise<SlackSyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let totalMembersAdded = 0;
    const processedChannels: string[] = [];

    if (!this.isConfigured || !this.client) {
      return {
        success: false,
        channelsProcessed: [],
        membersAdded: 0,
        errors: ['Slack service is not configured'],
        duration: Date.now() - startTime
      };
    }

    try {
      console.log('Starting Slack channel member sync...');
      console.log('Using channel IDs:', this.channels);
      
      // Check bot permissions first
      const authTest = await this.client.auth.test();
      console.log(`🤖 Bot info: ${authTest.user} (${authTest.user_id}) on team ${authTest.team}`);

      // Get all unique members from both channels
      const allMembers = new Set<string>();
      
      for (const [channelName, channelId] of Object.entries(this.channels)) {
        try {
          const members = await this.getChannelMembers(channelId);
          console.log(`Found ${members.length} members in #${channelName}`);
          
          members.forEach(member => allMembers.add(member));
          processedChannels.push(channelName);
        } catch (error) {
          const errorMsg = `Failed to get members from #${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      console.log(`Total unique members across channels: ${allMembers.size}`);

      // Add missing members to each channel
      for (const [channelName, channelId] of Object.entries(this.channels)) {
        try {
          const currentMembers = await this.getChannelMembers(channelId);
          const currentMemberSet = new Set(currentMembers);
          
          const membersToAdd = Array.from(allMembers).filter(memberId => 
            !currentMemberSet.has(memberId)
          );

          if (membersToAdd.length > 0) {
            console.log(`Adding ${membersToAdd.length} members to #${channelName}`);
            
            for (const memberId of membersToAdd) {
              try {
                await this.addMemberToChannel(channelId, memberId);
                totalMembersAdded++;
                console.log(`✅ Successfully added member ${memberId} to #${channelName}`);
                
                // Add small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
              } catch (error: any) {
                // Only log as error if it's not an expected "not_in_channel" error
                if (error?.data?.error === 'not_in_channel' || error?.data?.error === 'user_is_bot' || error?.data?.error === 'cant_invite_self') {
                  console.log(`⚠️  Skipped adding ${memberId} to #${channelName}: ${error.data.error}`);
                } else {
                  const errorMsg = `Failed to add member ${memberId} to #${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                  console.error(`❌ ${errorMsg}`);
                  errors.push(errorMsg);
                }
              }
            }
          } else {
            console.log(`No new members to add to #${channelName}`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync members for #${channelName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      console.log(`Slack sync completed: ${totalMembersAdded} members added, ${errors.length} errors, ${duration}ms`);

      // Save sync metadata
      await this.saveSyncMetadata({
        sync_type: 'slack_channel_sync',
        channels_synced: processedChannels,
        members_added: totalMembersAdded,
        last_sync_at: new Date(),
        last_sync_status: success ? 'success' : errors.length < processedChannels.length ? 'partial' : 'failure',
        errors_count: errors.length,
        error_details: errors.length > 0 ? errors.join('; ') : undefined,
        duration_ms: duration
      });

      console.log(`Slack sync completed: ${totalMembersAdded} members added, ${errors.length} errors, ${duration}ms`);

      return {
        success,
        channelsProcessed: processedChannels,
        membersAdded: totalMembersAdded,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Slack channel sync failed:', errorMsg);

      await this.saveSyncMetadata({
        sync_type: 'slack_channel_sync',
        channels_synced: processedChannels,
        members_added: totalMembersAdded,
        last_sync_at: new Date(),
        last_sync_status: 'failure',
        errors_count: 1,
        error_details: errorMsg,
        duration_ms: duration
      });

      return {
        success: false,
        channelsProcessed: processedChannels,
        membersAdded: totalMembersAdded,
        errors: [errorMsg, ...errors],
        duration
      };
    }
  }



  private async getChannelMembers(channelId: string): Promise<string[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    try {
      const allMembers: string[] = [];
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore) {
        const result = await this.client.conversations.members({
          channel: channelId,
          limit: 1000, // Maximum allowed by Slack API
          cursor: cursor
        });

        if (result.members) {
          allMembers.push(...result.members);
        }

        cursor = result.response_metadata?.next_cursor;
        hasMore = !!cursor;

        // Add small delay to avoid rate limits
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      return allMembers;
    } catch (error) {
      console.error(`Error getting members for channel ${channelId}:`, error);
      throw error;
    }
  }

  private async addMemberToChannel(channelId: string, userId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    try {
      await this.client.conversations.invite({
        channel: channelId,
        users: userId
      });
    } catch (error: any) {
      // Handle specific Slack API errors
      if (error?.data?.error === 'already_in_channel') {
        // Member is already in channel, this is okay
        return;
      }
      
      if (error?.data?.error === 'user_is_bot') {
        // Skip bots
        return;
      }

      if (error?.data?.error === 'cant_invite_self') {
        // Skip self-invitation
        return;
      }

      throw error;
    }
  }

  private async saveSyncMetadata(metadata: SlackSyncMetadata): Promise<void> {
    try {
      const query = `
        INSERT INTO slack_sync_metadata (
          sync_type, channels_synced, members_added, last_sync_at, 
          last_sync_status, errors_count, error_details, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await databaseService.query(query, [
        metadata.sync_type,
        JSON.stringify(metadata.channels_synced),
        metadata.members_added,
        metadata.last_sync_at,
        metadata.last_sync_status,
        metadata.errors_count,
        metadata.error_details,
        metadata.duration_ms
      ]);
    } catch (error) {
      console.error('Error saving Slack sync metadata:', error);
      // Don't throw here as it would break the main sync flow
    }
  }

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastSync?: Date;
    details: string;
  }> {
    if (!this.isConfigured || !this.client) {
      return {
        status: 'unhealthy',
        details: 'Slack service is not configured'
      };
    }

    try {
      // Test Slack API connectivity
      const authTest = await this.client.auth.test();
      
      if (!authTest.ok) {
        return {
          status: 'unhealthy',
          details: 'Slack API authentication failed'
        };
      }

      // Get last sync status
      const query = `
        SELECT last_sync_at, last_sync_status, errors_count 
        FROM slack_sync_metadata 
        ORDER BY last_sync_at DESC 
        LIMIT 1
      `;

      const result = await databaseService.query(query);
      
      if (result.rows.length === 0) {
        return {
          status: 'degraded',
          details: 'No sync history found'
        };
      }

      const lastSync = result.rows[0];
      const lastSyncTime = new Date(lastSync.last_sync_at);
      const hoursSinceLastSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSync > 2) {
        return {
          status: 'degraded',
          lastSync: lastSyncTime,
          details: `Last sync was ${Math.round(hoursSinceLastSync)} hours ago`
        };
      }

      if (lastSync.last_sync_status === 'failure') {
        return {
          status: 'degraded',
          lastSync: lastSyncTime,
          details: 'Last sync failed'
        };
      }

      return {
        status: 'healthy',
        lastSync: lastSyncTime,
        details: 'Slack service is healthy'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getSyncMetrics(): Promise<{
    successRate: number;
    averageDuration: number;
    errorCount: number;
    totalMembersAdded: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN last_sync_status = 'success' THEN 1 END) as successful_syncs,
          COUNT(CASE WHEN errors_count > 0 THEN 1 END) as error_count,
          AVG(duration_ms) as avg_duration,
          SUM(members_added) as total_members_added
        FROM slack_sync_metadata 
        WHERE last_sync_at > NOW() - INTERVAL '24 hours'
      `;

      const result = await databaseService.query(query);
      const row = result.rows[0];

      const totalSyncs = parseInt(row.total_syncs) || 0;
      const successfulSyncs = parseInt(row.successful_syncs) || 0;

      return {
        successRate: totalSyncs > 0 ? (successfulSyncs / totalSyncs) * 100 : 100,
        averageDuration: parseFloat(row.avg_duration) || 0,
        errorCount: parseInt(row.error_count) || 0,
        totalMembersAdded: parseInt(row.total_members_added) || 0
      };
    } catch (error) {
      console.error('Error getting Slack sync metrics:', error);
      return {
        successRate: 0,
        averageDuration: 0,
        errorCount: 0,
        totalMembersAdded: 0
      };
    }
  }

  async getRecentSyncLogs(limit: number = 10): Promise<SlackSyncMetadata[]> {
    try {
      const query = `
        SELECT * FROM slack_sync_metadata 
        ORDER BY last_sync_at DESC 
        LIMIT $1
      `;

      const result = await databaseService.query(query, [limit]);
      return result.rows.map((row: any) => ({
        ...row,
        channels_synced: this.parseChannelsSynced(row.channels_synced)
      }));
    } catch (error) {
      console.error('Error getting Slack sync logs:', error);
      return [];
    }
  }

  private parseChannelsSynced(channels: any): string[] {
    if (!channels) return [];
    
    // If it's already an array, return it
    if (Array.isArray(channels)) return channels;
    
    // If it's a string, try to parse as JSON first
    if (typeof channels === 'string') {
      try {
        const parsed = JSON.parse(channels);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        // If JSON parsing fails, treat as comma-separated string
        return channels.split(',').map(channel => channel.trim()).filter(Boolean);
      }
    }
    
    return [];
  }
}

export const slackService = new SlackService();
