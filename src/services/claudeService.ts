import Anthropic from '@anthropic-ai/sdk';
import { databaseService } from './databaseService';

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

  async processQuery(userQuery: string): Promise<QueryResult> {
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

      const systemPrompt = `You are an AI assistant that converts natural language queries into SQL queries for a PostgreSQL database containing event and admin data. 

Available database tables:
- events: Contains event information
- admins: Contains admin user information
- sync_metadata: Contains sync status information

Event table schema:
${schemaContext}

Admin table schema:
- id (UUID): Primary key
- airtable_id (VARCHAR): Original Airtable record ID  
- email (VARCHAR): Admin email address
- first_name (VARCHAR): Admin first name
- last_name (VARCHAR): Admin last name
- user_status (ENUM): 'active', 'admin', 'inactive'
- created_at, updated_at, synced_at (TIMESTAMP): Timestamps

IMPORTANT: 
1. Always return valid SQL SELECT queries only
2. Use PostgreSQL syntax and functions
3. Include appropriate WHERE clauses for filtering
4. Use aggregate functions (COUNT, AVG, SUM) for calculations
5. Return results that can be easily formatted for display
6. Never use INSERT, UPDATE, DELETE, or DDL statements
7. Use proper JOIN syntax when querying multiple tables
8. Handle NULL values appropriately

Example queries and responses:
- "How many events are there?" → "SELECT COUNT(*) as total_events FROM events;"
- "Events with more than 15 attendees" → "SELECT event_name, estimated_attendee_count FROM events WHERE estimated_attendee_count > 15 ORDER BY estimated_attendee_count DESC;"
- "Average attendee count" → "SELECT ROUND(AVG(estimated_attendee_count), 2) as avg_attendees FROM events WHERE estimated_attendee_count IS NOT NULL;"

Return ONLY the SQL query, no explanations or markdown formatting.`;

      const completion = await this.anthropic!.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userQuery }
        ],
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

      // Execute the generated SQL query
      const result = await this.executeSQL(generatedCode);
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

      console.log('Executing SQL query:', sqlQuery);

      // Execute the query using read-only database connection
      const result = await databaseService.readOnlyQuery(sqlQuery);
      
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

    // For single value results (like COUNT), return just the value
    if (columns.length === 1 && rows.length === 1) {
      const value = rows[0][columns[0]];
      return `Result: ${value}`;
    }

    // For multiple rows, format as a table
    let output = `Found ${rows.length} result(s):\n\n`;
    
    // Add column headers
    output += columns.join(' | ') + '\n';
    output += columns.map(() => '---').join(' | ') + '\n';
    
    // Add rows (limit to first 20 for readability)
    const displayRows = rows.slice(0, 20);
    for (const row of displayRows) {
      const values = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) return 'N/A';
        if (typeof value === 'number') return value.toString();
        if (typeof value === 'boolean') return value ? 'Yes' : 'No';
        return String(value).substring(0, 50); // Truncate long values
      });
      output += values.join(' | ') + '\n';
    }

    if (rows.length > 20) {
      output += `\n... and ${rows.length - 20} more results (showing first 20)`;
    }

    return output;
  }

  private getSchemaContext(): string {
    return `
- id (UUID): Primary key
- airtable_id (VARCHAR): Original Airtable record ID
- event_name (VARCHAR): Name of the event
- poc_first_name, poc_last_name (VARCHAR): Point of contact name
- poc_preferred_name (VARCHAR): Preferred name for POC
- poc_slack_id (VARCHAR): Slack ID for POC
- poc_dob (DATE): Date of birth for POC
- poc_age (INTEGER): Computed age from DOB
- email (VARCHAR): Organizer email
- location (VARCHAR): Event location
- slug (VARCHAR): URL slug for event
- street_address, street_address_2 (VARCHAR): Address details
- city, state, country (VARCHAR): Location details
- zipcode (VARCHAR): Postal code
- event_format (ENUM): '12-hours' or '24-hours'
- sub_organizers (TEXT): Additional organizers
- estimated_attendee_count (INTEGER): Expected number of attendees
- project_url (TEXT): Project website URL
- project_description (TEXT): Description of the project
- lat, long (DECIMAL): GPS coordinates
- triage_status (ENUM): 'approved', 'rejected', 'hold', 'ask', 'pending'
- start_date, end_date (DATE): Event dates
- registration_deadline (DATE): Deadline for registration
- notes (TEXT): Additional notes
- action_trigger_*_email (VARCHAR): Email trigger fields
- has_confirmed_venue (BOOLEAN): Whether venue is confirmed
- created_at, updated_at, synced_at (TIMESTAMP): Timestamps
    `;
  }
}

export const claudeService = new ClaudeService();
