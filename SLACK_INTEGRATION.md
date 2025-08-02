# Slack Channel Member Sync Integration

This integration automatically syncs members between two Slack channels: `#daydream` and `#daydream-bulletin`.

## Features

- **Automatic Sync**: Runs every 15 minutes to ensure members in both channels are synchronized
- **Health Monitoring**: Tracks sync status, success rates, and errors
- **Admin Dashboard**: View sync metrics and logs through the health dashboard
- **Manual Trigger**: Force manual sync through API endpoints
- **Graceful Degradation**: Works even when Slack is not configured

## Setup

### 1. Slack App Configuration

1. Create a Slack App at https://api.slack.com/apps
2. Add the following OAuth scopes under "OAuth & Permissions":
   - `channels:read` - View basic information about public channels
   - `groups:read` - View basic information about private channels  
   - `channels:write` - Manage public channels
   - `groups:write` - Manage private channels
   - `users:read` - View people in the workspace

3. Install the app to your workspace
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

### 2. Environment Configuration

Add the Slack bot token to your `.env` file:

```env
```

### 3. Channel Configuration

The integration is configured to sync these channels by default:
- `#daydream`
- `#daydream-bulletin`

To change the channels, edit the `channels` array in [`src/services/slackService.ts`](src/services/slackService.ts):

```typescript
private channels = ['daydream', 'daydream-bulletin']; // Without # prefix
```

## How It Works

1. **Channel Discovery**: Finds the channel IDs for the configured channel names
2. **Member Collection**: Gets all members from both channels
3. **Sync Process**: Adds any missing members to ensure both channels have the same members
4. **Logging**: Records sync results, metrics, and any errors
5. **Health Monitoring**: Tracks success rates and performance

## API Endpoints

### Health & Monitoring

- `GET /api/health/slack-sync` - Get detailed Slack sync status and metrics
- `POST /api/health/slack-sync/trigger` - Manually trigger a sync
- `GET /api/health/status` - Overall system health (includes Slack sync status)
- `GET /api/health/sync-jobs` - Background job status (includes Slack sync)

### Example Response

```json
{
  "success": true,
  "data": {
    "status": {
      "status": "healthy",
      "lastSync": "2025-01-02T10:30:00.000Z",
      "details": "Slack service is healthy"
    },
    "metrics": {
      "successRate": 100,
      "averageDuration": 2500,
      "errorCount": 0,
      "totalMembersAdded": 5
    },
    "logs": [...],
    "isJobRunning": false,
    "frequency": "15 minutes",
    "nextRun": "2025-01-02T10:45:00.000Z"
  }
}
```

## Database Schema

The integration uses a dedicated table to track sync metadata:

```sql
CREATE TABLE slack_sync_metadata (
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
```

## Error Handling

- **API Rate Limits**: Includes delays between API calls to avoid rate limiting
- **Network Issues**: Retries and proper error logging
- **Missing Channels**: Validates that all configured channels exist
- **Permission Issues**: Handles cases where the bot lacks permissions
- **Member Addition Failures**: Continues sync even if some members can't be added

## Security Considerations

- **OAuth Token**: Store securely and rotate regularly
- **Permissions**: Use minimal required permissions
- **Logging**: Sensitive user information is not logged
- **Rate Limiting**: Built-in protection against API abuse

## Monitoring & Alerting

The health dashboard shows:
- Current sync status (healthy/degraded/unhealthy)
- Last sync time and next scheduled sync
- Success rate over the last 24 hours
- Average sync duration
- Error counts and details
- Recent sync logs

## Configuration Options

### Sync Frequency

To change the sync frequency, modify `SYNC_INTERVAL_MS` in [`src/services/slackSyncJobService.ts`](src/services/slackSyncJobService.ts):

```typescript
private readonly SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
```

### Startup Delay

The sync job starts with a 5-second delay after server startup to allow other services to initialize.

## Troubleshooting

### Common Issues

1. **"Slack service is not configured"**
   - Ensure `SLACK_BOT_TOKEN` is set in your environment
   - Verify the token is valid and starts with `xoxb-`

2. **"Could not find channels"**
   - Check that the channel names are correct (without # prefix)
   - Verify the bot has access to both channels
   - Ensure channels exist and are not archived

3. **"Permission denied" errors**
   - Review the bot's OAuth scopes
   - Check if the bot has been added to the channels
   - Verify workspace permissions

4. **High error rates**
   - Check API rate limits
   - Verify network connectivity
   - Review error details in the logs

### Debugging

1. Enable debug logging by checking the server console
2. Use the health endpoints to get detailed status
3. Check the database for sync history and errors
4. Test manual sync through the API

## Performance

- **Typical sync time**: 1-5 seconds for channels with <100 members
- **API calls**: ~3-5 calls per sync (depending on channel sizes)
- **Memory usage**: Minimal, processes members in batches
- **Database impact**: One insert per sync operation

## Development

### Testing Locally

1. Set up a test Slack workspace
2. Create test channels
3. Configure the bot token
4. Run the development server
5. Monitor logs and health endpoints

### Adding New Features

The service is designed to be extensible:
- Add new sync types by extending `SlackSyncMetadata`
- Modify channel logic in `SlackService`
- Add new health checks or metrics as needed
