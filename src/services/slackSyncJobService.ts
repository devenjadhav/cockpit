import { slackService } from './slackService';

class SlackSyncJobService {
  private syncIntervalId: NodeJS.Timeout | null = null;
  private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  private _isRunning = false;

  constructor() {
    // Start sync process when service is initialized
    this.startPeriodicSync();
  }

  startPeriodicSync(): void {
    if (this.syncIntervalId) {
      console.log('Slack sync job already running');
      return;
    }

    console.log(`Starting Slack channel member sync every ${this.SYNC_INTERVAL_MS / 1000 / 60} minutes`);
    
    // Run initial sync after a short delay
    setTimeout(() => {
      this.performSync().catch(console.error);
    }, 5000); // 5 second delay on startup

    // Set up periodic sync
    this.syncIntervalId = setInterval(async () => {
      if (!this._isRunning) {
        await this.performSync().catch(console.error);
      }
    }, this.SYNC_INTERVAL_MS);
  }

  stopPeriodicSync(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
      console.log('Slack sync job stopped');
    }
  }

  async performSync(): Promise<void> {
    if (this._isRunning) {
      console.log('Slack sync already in progress, skipping...');
      return;
    }

    this._isRunning = true;

    try {
      console.log('Starting Slack channel member sync...');
      const result = await slackService.syncChannelMembers();
      
      if (result.success) {
        console.log(`Slack sync completed successfully: ${result.membersAdded} members added across ${result.channelsProcessed.length} channels`);
      } else {
        console.warn(`Slack sync completed with errors: ${result.errors.length} errors, ${result.membersAdded} members added`);
      }
    } catch (error) {
      console.error('Slack sync job failed:', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this._isRunning = false;
    }
  }

  isRunning(): boolean {
    return this._isRunning;
  }

  getNextRunTime(): Date | null {
    if (!this.syncIntervalId) {
      return null;
    }

    // Calculate next run time based on interval
    const now = Date.now();
    const nextRun = now + this.SYNC_INTERVAL_MS;
    return new Date(nextRun);
  }

  getFrequency(): string {
    return '15 minutes';
  }
}

export const slackSyncJobService = new SlackSyncJobService();
