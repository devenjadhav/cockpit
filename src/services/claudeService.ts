import Anthropic from '@anthropic-ai/sdk';
import { databaseService } from './databaseService';
import { SqlSanitizer } from '../security/sqlSanitizer';

interface QueryResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

class ClaudeService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  private isInitialized(): boolean {
    return this.anthropic !== null;
  }

  async processQuery(userQuery: string, conversationHistory: Array<{role: 'user' | 'assistant'; content: string; timestamp: string}> = []): Promise<QueryResult> {
    if (!this.isInitialized()) {
      return {
        success: false,
        message: 'Claude service not configured. Please add ANTHROPIC_API_KEY to environment variables.',
        error: 'Missing API key'
      };
    }

    try {
      // Get schema information for context
      const schemaContext = this.getSchemaContext();

      const systemPrompt = `You are an expert database analyst for a hackathon event management system. Your role is to convert natural language queries into SQL queries for a PostgreSQL database containing event and admin data.

## DATABASE CONTEXT ##
This is a real hackathon management portal where organizers register their events. The data includes:
- Event details (name, location, dates, attendee counts)
- Organizer information (point of contact details)
- Event status tracking (triage_status: approved, rejected, pending, etc.)
- Geographic data (coordinates, addresses)
- Registration and venue confirmation status

## AVAILABLE TABLES ##

### EVENTS TABLE (Primary table with event information):
${schemaContext}

### ADMINS TABLE (Admin user information):
- id (UUID): Primary key
- airtable_id (VARCHAR): Original Airtable record ID  
- email (VARCHAR): Admin email address
- first_name, last_name (VARCHAR): Admin name
- user_status (ENUM): 'active', 'admin', 'inactive'
- created_at, updated_at, synced_at (TIMESTAMP): Timestamps

### SYNC_METADATA TABLE (System sync information):
- table_name (VARCHAR): Which table was synced
- last_sync_at (TIMESTAMP): When last sync occurred
- record_count (INTEGER): Number of records synced

## QUERY GUIDELINES ##
1. **SECURITY**: Only SELECT queries allowed - no INSERT/UPDATE/DELETE/DDL
2. **CONTEXT AWARENESS**: Consider conversation history for follow-up questions
3. **USER INTENT**: Understand what information would be most valuable
4. **DATA QUALITY**: Handle NULLs gracefully, filter out test/invalid data when appropriate
5. **PERFORMANCE**: Use appropriate indexes, limit large result sets
6. **FORMATTING**: Return results that display well in a console format

## COMMON QUERY PATTERNS ##
- **Event Analytics**: Count by status, location, format, time periods
- **Organizer Insights**: Events per organizer, contact information lookup
- **Geographic Analysis**: Events by city/state/country, coordinate-based queries
- **Temporal Analysis**: Events by date ranges, upcoming events, registration deadlines
- **Status Tracking**: Approved vs pending events, venue confirmation status

## EXAMPLE QUERIES ##
- "How many events are approved?" → "SELECT COUNT(*) as approved_events FROM events WHERE triage_status = 'approved';"
- "Show me California events" → "SELECT event_name, city, estimated_attendee_count FROM events WHERE state ILIKE '%california%' ORDER BY estimated_attendee_count DESC;"
- "Average attendee count by format" → "SELECT event_format, ROUND(AVG(estimated_attendee_count), 1) as avg_attendees, COUNT(*) as event_count FROM events WHERE estimated_attendee_count IS NOT NULL GROUP BY event_format;"
- "Events with confirmed venues" → "SELECT event_name, location, city, state FROM events WHERE has_confirmed_venue = true ORDER BY start_date;"

## CONVERSATION CONTEXT ##
When responding to follow-up questions, consider previous queries and results. For example:
- "Show me more details" → expand the previous query with additional columns
- "What about rejected ones?" → modify the previous WHERE clause
- "Group by location" → add GROUP BY to similar analysis

Return ONLY the SQL query, no explanations or markdown formatting.`;

      // Build conversation messages including history
      const messages: Array<{role: 'user' | 'assistant', content: string}> = [];
      
      // Add conversation history (last 10 exchanges for context)
      conversationHistory.slice(-10).forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });
      
      // Add current user query
      messages.push({ role: 'user', content: userQuery });

      const completion = await this.anthropic!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: messages,
      });

      const generatedCode = completion.content[0]?.type === 'text' 
        ? completion.content[0].text.trim()
        : null;
      
      if (!generatedCode) {
        return {
          success: false,
          message: 'Failed to generate SQL query',
          error: 'Empty response from Claude'
        };
      }

      // Claude response received

      // Clean the SQL query by removing markdown fences
      let cleanedSQL = generatedCode
        .replace(/^```sql\s*/i, '')   // Remove opening ```sql
        .replace(/^```\s*/i, '')      // Remove plain ```
        .replace(/\s*```$/i, '')      // Remove closing ```
        .trim();

      // SQL query cleaned

      // Enhanced security validation
      const validationResult = SqlSanitizer.validateAiGeneratedQuery(cleanedSQL, userQuery);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          message: 'Query failed security validation',
          error: `Security violations: ${validationResult.securityViolations.join(', ')}. Errors: ${validationResult.errors.join(', ')}`
        };
      }

      // Execute the validated SQL query
      const result = await this.executeSQL(validationResult.sanitizedQuery!);
      return result;

    } catch (error: any) {
      console.error('Claude service error:', error);
      return {
        success: false,
        message: 'Failed to process query',
        error: error.message
      };
    }
  }

  private async executeSQL(sqlQuery: string): Promise<QueryResult> {
    try {
      // Validate that it's a SELECT query for security
      const trimmedQuery = sqlQuery.trim().toLowerCase();
      if (!trimmedQuery.startsWith('select')) {
        return {
          success: false,
          message: 'Only SELECT queries are allowed for security reasons',
          error: 'Invalid query type'
        };
      }

      // Additional security checks
      const forbiddenKeywords = ['insert', 'update', 'delete', 'drop', 'create', 'alter', 'grant', 'revoke'];
      const hasForbiddenKeyword = forbiddenKeywords.some(keyword => 
        trimmedQuery.includes(keyword.toLowerCase())
      );

      if (hasForbiddenKeyword) {
        return {
          success: false,
          message: 'Query contains forbidden operations',
          error: 'Security violation'
        };
      }

      // Executing SQL query

      // Execute the query using read-only database connection (fallback to main connection if readonly fails)
      let result;
      try {
        result = await databaseService.readOnlyQuery(sqlQuery);
      } catch (readOnlyError: any) {
        // Read-only connection failed, using main connection
        result = await databaseService.query(sqlQuery);
      }
      
      // Format the result for display
      const formattedMessage = this.formatQueryResult(result);
      
      return {
        success: true,
        data: result.rows,
        message: formattedMessage
      };

    } catch (error: any) {
      console.error('SQL execution error:', error);
      return {
        success: false,
        message: 'Error executing SQL query',
        error: error.message
      };
    }
  }

  private formatQueryResult(result: any): string {
    if (!result.rows || result.rows.length === 0) {
      return 'No results found.';
    }

    const rows = result.rows;
    const columns = Object.keys(rows[0]);

    // For single value results (like COUNT, SUM, AVG), return with context
    if (columns.length === 1 && rows.length === 1) {
      const columnName = columns[0];
      const value = rows[0][columnName];
      
      // Add context based on column name
      if (columnName.includes('count') || columnName.includes('total')) {
        return `Total count: ${this.formatNumber(value)}`;
      } else if (columnName.includes('avg') || columnName.includes('average')) {
        return `Average: ${this.formatNumber(value)}`;
      } else if (columnName.includes('sum')) {
        return `Sum: ${this.formatNumber(value)}`;
      } else if (columnName.includes('max') || columnName.includes('maximum')) {
        return `Maximum: ${this.formatNumber(value)}`;
      } else if (columnName.includes('min') || columnName.includes('minimum')) {
        return `Minimum: ${this.formatNumber(value)}`;
      }
      
      return `Result: ${this.formatValue(value)}`;
    }

    // For multiple rows, format as bullet points
    let output = `Found ${this.formatNumber(rows.length)} result${rows.length === 1 ? '' : 's'}:\n\n`;
    
    // Add rows as bullet points (limit to first 20 for readability)
    const displayRows = rows.slice(0, 20);
    for (let i = 0; i < displayRows.length; i++) {
      const row = displayRows[i];
      output += `• `;
      
      // Format each field in the row
      const fieldValues = columns.map(col => {
        const humanName = this.humanizeColumnName(col);
        const value = this.formatValue(row[col], col);
        return `${humanName}: ${value}`;
      }).join(' | ');
      
      output += fieldValues + '\n';
    }

    if (rows.length > 20) {
      output += `\nShowing first 20 results (${rows.length - 20} more available)`;
    }

    return output;
  }

  private humanizeColumnName(columnName: string): string {
    // Convert snake_case and camelCase to human readable
    return columnName
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  private formatValue(value: any, columnName?: string): string {
    if (value === null || value === undefined) {
      return '—';
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (typeof value === 'number') {
      return this.formatNumber(value);
    }
    
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    
    // For strings, check for special formatting cases
    const str = String(value).trim();
    
    // Special formatting for triage_status = approved (case insensitive)
    if (columnName === 'triage_status' && str.toLowerCase() === 'approved') {
      return `[GREEN]${str}[/GREEN]`;
    }
    
    // Truncate if too long and clean up
    if (str.length > 50) {
      return str.substring(0, 47) + '...';
    }
    
    return str || '—';
  }

  private formatNumber(value: number): string {
    if (value === null || value === undefined || isNaN(value)) {
      return '—';
    }
    
    // Format large numbers with commas
    if (Math.abs(value) >= 1000) {
      return value.toLocaleString();
    }
    
    // For decimals, limit to 2 decimal places
    if (value % 1 !== 0) {
      return value.toFixed(2);
    }
    
    return value.toString();
  }

  private getSchemaContext(): string {
    return `
### Core Event Information:
- id (UUID): Primary key
- airtable_id (VARCHAR): Original Airtable record ID
- event_name (VARCHAR): Name of the hackathon event
- slug (VARCHAR): URL-friendly event identifier
- project_url (TEXT): Event website/registration URL
- project_description (TEXT): Detailed description of the event/theme

### Point of Contact (Organizer) Details:
- poc_first_name, poc_last_name (VARCHAR): Organizer's legal name
- poc_preferred_name (VARCHAR): Preferred name for communication
- poc_slack_id (VARCHAR): Slack handle for coordination
- poc_dob (DATE): Date of birth (for age verification)
- poc_age (INTEGER): Computed age from DOB
- email (VARCHAR): Primary contact email address

### Location & Geographic Data:
- location (VARCHAR): Venue name or general location description
- street_address, street_address_2 (VARCHAR): Full street address
- city, state, country (VARCHAR): Geographic hierarchy
- zipcode (VARCHAR): Postal/ZIP code
- lat, long (DECIMAL): GPS coordinates for mapping
- has_confirmed_venue (BOOLEAN): Whether venue booking is finalized

### Event Details & Timing:
- event_format (ENUM): Duration - '12-hours', '24-hours', or '2-day'
- start_date, end_date (DATE): Event start and end dates
- registration_deadline (DATE): When registration closes
- estimated_attendee_count (INTEGER): Expected number of participants

### Status & Management:
- triage_status (ENUM): Event approval status
  * 'approved' - Fully approved and active
  * 'rejected' - Not approved for this season
  * 'pending' - Awaiting review
  * 'hold' - Temporarily paused
  * 'ask' - Needs clarification/additional info
- sub_organizers (TEXT): Additional organizing team members
- notes (TEXT): Internal admin notes and comments

### System Fields:
- created_at, updated_at, synced_at (TIMESTAMP): Record lifecycle
- action_trigger_*_email (VARCHAR): Email automation triggers

### Data Quality Notes:
- Some events may have NULL values for optional fields
- Test events may exist - filter appropriately for real analysis
- Coordinates (lat/long) available for most events for geographic analysis
- Email domains can indicate organizational affiliation
    `;
  }
}

export const claudeService = new ClaudeService();
