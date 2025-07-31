/**
 * SQL Sanitizer for Admin Console
 * Provides comprehensive SQL injection protection beyond basic keyword filtering
 */

export interface SqlValidationResult {
  isValid: boolean;
  sanitizedQuery?: string;
  errors: string[];
  securityViolations: string[];
}

export class SqlSanitizer {
  // Forbidden keywords that should never appear in queries
  private static readonly FORBIDDEN_KEYWORDS = [
    // DML operations
    'insert', 'update', 'delete', 'drop', 'create', 'alter', 'grant', 'revoke',
    'truncate', 'merge', 'upsert', 'replace',
    
    // DDL operations
    'create', 'alter', 'drop', 'rename',
    
    // Security-related
    'exec', 'execute', 'sp_', 'xp_', 'master', 'sys', 'information_schema',
    'pg_', 'dblink', 'copy', 'load_file', 'into_outfile', 'into_dumpfile',
    
    // Function calls that could be dangerous
    'system', 'shell', 'cmd', 'eval', 'script',
    
    // File operations
    'file_', 'load_', 'import', 'export'
  ];

  // Keywords that require special attention
  private static readonly SUSPICIOUS_KEYWORDS = [
    'union', 'or', 'and', 'where', '1=1', '1 = 1', 'true', 'false',
    'sleep', 'delay', 'waitfor', 'benchmark', 'pg_sleep'
  ];

  // Dangerous characters and patterns
  private static readonly DANGEROUS_PATTERNS = [
    /;\s*--/gi,           // SQL comment injection
    /;\s*\/\*/gi,         // SQL comment block injection
    /\|\|/g,              // String concatenation that could bypass filters
    /%[0-9a-f]{2}/gi,     // URL encoded characters
    /\\\\/g,              // Escaped backslashes
    /\x00/g,              // Null bytes
    /\\\\x[0-9a-f]{2}/gi,  // Hex escape sequences
  ];

  // Only allow these specific table names
  private static readonly ALLOWED_TABLES = [
    'events', 'admins', 'sync_metadata'
  ];

  // Only allow these specific column patterns
  private static readonly ALLOWED_COLUMN_PATTERNS = [
    /^[a-zA-Z_][a-zA-Z0-9_]*$/,  // Standard column names
    /^[a-zA-Z_][a-zA-Z0-9_]*\.[a-zA-Z_][a-zA-Z0-9_]*$/, // table.column
    /^count\(\*?\)$/i,           // count() functions
    /^avg\([a-zA-Z_][a-zA-Z0-9_]*\)$/i,  // avg() functions
    /^sum\([a-zA-Z_][a-zA-Z0-9_]*\)$/i,  // sum() functions
    /^max\([a-zA-Z_][a-zA-Z0-9_]*\)$/i,  // max() functions
    /^min\([a-zA-Z_][a-zA-Z0-9_]*\)$/i,  // min() functions
  ];

  static validateAndSanitize(query: string): SqlValidationResult {
    const result: SqlValidationResult = {
      isValid: true,
      errors: [],
      securityViolations: []
    };

    if (!query || typeof query !== 'string') {
      result.isValid = false;
      result.errors.push('Query must be a non-empty string');
      return result;
    }

    const normalizedQuery = query.trim().toLowerCase();

    // 1. Basic structure validation
    if (!normalizedQuery.startsWith('select')) {
      result.isValid = false;
      result.securityViolations.push('Only SELECT statements are allowed');
      return result;
    }

    // 2. Check for forbidden keywords
    for (const keyword of this.FORBIDDEN_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(normalizedQuery)) {
        result.isValid = false;
        result.securityViolations.push(`Forbidden keyword detected: ${keyword}`);
      }
    }

    // 3. Check for dangerous patterns
    for (const pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(query)) {
        result.isValid = false;
        result.securityViolations.push(`Dangerous pattern detected: ${pattern.source}`);
      }
    }

    // 4. Validate table names
    const tableMatches = normalizedQuery.match(/from\s+([a-zA-Z_][a-zA-Z0-9_]*)/gi);
    if (tableMatches) {
      for (const match of tableMatches) {
        const tableName = match.replace(/from\s+/i, '').trim();
        if (!this.ALLOWED_TABLES.includes(tableName)) {
          result.isValid = false;
          result.securityViolations.push(`Unauthorized table access: ${tableName}`);
        }
      }
    }

    // 5. Check for suspicious patterns that might indicate injection attempts
    for (const keyword of this.SUSPICIOUS_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(normalizedQuery)) {
        // Log suspicious activity but don't block (some legitimate queries might use these)
        console.warn(`[SQL Security] Suspicious keyword detected in query: ${keyword}`);
      }
    }

    // 6. Validate query complexity (prevent DoS attacks)
    if (query.length > 1000) {
      result.isValid = false;
      result.errors.push('Query too long (max 1000 characters)');
    }

    // 7. Check for multiple statements (; separation)
    const statements = query.split(';').filter(s => s.trim());
    if (statements.length > 1) {
      result.isValid = false;
      result.securityViolations.push('Multiple statements not allowed');
    }

    // 8. Basic SQL injection pattern detection
    if (this.containsSqlInjectionPatterns(normalizedQuery)) {
      result.isValid = false;
      result.securityViolations.push('Potential SQL injection detected');
    }

    if (result.isValid) {
      // Return sanitized query (original case preserved)
      result.sanitizedQuery = query.trim();
    }

    return result;
  }

  private static containsSqlInjectionPatterns(query: string): boolean {
    const injectionPatterns = [
      /'\s*or\s*'.*?'\s*=\s*'/gi,     // '1' or '1'='1'
      /'\s*or\s*1\s*=\s*1/gi,        // ' or 1=1
      /'\s*union\s*select/gi,        // ' union select
      /'\s*and\s*1\s*=\s*0/gi,       // ' and 1=0
      /'\s*;\s*drop\s*table/gi,      // '; drop table
      /'\s*;\s*delete\s*from/gi,     // '; delete from
      /'\s*;\s*update\s*.+set/gi,    // '; update ... set
      /'\s*;\s*insert\s*into/gi,     // '; insert into
    ];

    return injectionPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Additional security check specifically for AI-generated queries
   */
  static validateAiGeneratedQuery(query: string, originalPrompt: string): SqlValidationResult {
    const basicResult = this.validateAndSanitize(query);
    
    if (!basicResult.isValid) {
      return basicResult;
    }

    // Additional checks for AI-generated content
    const aiResult = { ...basicResult };

    // Check if the query seems reasonable for the prompt
    if (this.isQuerySuspiciousForPrompt(query, originalPrompt)) {
      aiResult.securityViolations.push('AI-generated query does not match user intent');
      aiResult.isValid = false;
    }

    return aiResult;
  }

  private static isQuerySuspiciousForPrompt(query: string, prompt: string): boolean {
    // This is a simplified check - in production you might want more sophisticated analysis
    const queryLower = query.toLowerCase();
    const promptLower = prompt.toLowerCase();

    // If prompt asks for simple count but query is complex, that's suspicious
    if (promptLower.includes('how many') && queryLower.includes('union')) {
      return true;
    }

    // If prompt asks about events but query touches admin tables without good reason
    if (promptLower.includes('event') && queryLower.includes('admin') && !promptLower.includes('admin')) {
      return true;
    }

    return false;
  }
}
