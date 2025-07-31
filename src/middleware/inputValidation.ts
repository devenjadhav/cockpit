/**
 * Comprehensive Input Validation Middleware
 * Sanitizes and validates all user inputs to prevent injection attacks
 */

import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

// Input sanitization helpers
export class InputSanitizer {
  /**
   * Sanitize string input by removing/escaping dangerous characters
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/data:/gi, '') // Remove data: URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: URLs
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .substring(0, 10000); // Limit length to prevent DoS
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): { isValid: boolean; email: string; errors: string[] } {
    const errors: string[] = [];
    
    if (!email || typeof email !== 'string') {
      return { isValid: false, email: '', errors: ['Email is required'] };
    }

    const sanitized = email.trim().toLowerCase();
    
    // Basic format validation
    if (!validator.isEmail(sanitized)) {
      errors.push('Invalid email format');
    }
    
    // Length validation
    if (sanitized.length > 254) {
      errors.push('Email address too long');
    }
    
    // Check for suspicious patterns
    if (/[<>]/.test(sanitized)) {
      errors.push('Email contains invalid characters');
    }
    
    return {
      isValid: errors.length === 0,
      email: sanitized,
      errors
    };
  }

  /**
   * Sanitize SQL-like inputs with extra scrutiny
   */
  static sanitizeSqlInput(input: string): { isValid: boolean; sanitized: string; violations: string[] } {
    const violations: string[] = [];
    
    if (!input || typeof input !== 'string') {
      return { isValid: false, sanitized: '', violations: ['Input is required'] };
    }

    let sanitized = input.trim();
    
    // Check for SQL injection patterns
    const sqlPatterns = [
      /'/g, // Single quotes (will be replaced with safe equivalents)
      /;[\s]*(?:drop|delete|insert|update|create|alter)/gi,
      /union[\s]+select/gi,
      /exec[\s]*\(/gi,
      /script[\s]*>/gi,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(sanitized)) {
        violations.push(`Potential SQL injection pattern detected: ${pattern.source}`);
      }
    }
    
    // Sanitize the input
    sanitized = sanitized
      .replace(/'/g, "''") // Escape single quotes
      .replace(/\\/g, '\\\\') // Escape backslashes
      .replace(/\x00/g, '') // Remove null bytes
      .substring(0, 1000); // Limit length
    
    return {
      isValid: violations.length === 0,
      sanitized,
      violations
    };
  }

  /**
   * Validate and sanitize JSON inputs
   */
  static sanitizeJson(input: any): { isValid: boolean; sanitized: any; errors: string[] } {
    const errors: string[] = [];
    
    try {
      // If input is a string, try to parse it
      let parsed = typeof input === 'string' ? JSON.parse(input) : input;
      
      // Recursively sanitize object properties
      const sanitizeObject = (obj: any, depth = 0): any => {
        if (depth > 10) {
          errors.push('Object nesting too deep');
          return {};
        }
        
        if (Array.isArray(obj)) {
          return obj.slice(0, 1000).map(item => sanitizeObject(item, depth + 1));
        }
        
        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          let propertyCount = 0;
          
          for (const [key, value] of Object.entries(obj)) {
            if (propertyCount++ > 100) {
              errors.push('Too many object properties');
              break;
            }
            
            const sanitizedKey = this.sanitizeString(key);
            if (sanitizedKey) {
              sanitized[sanitizedKey] = sanitizeObject(value, depth + 1);
            }
          }
          
          return sanitized;
        }
        
        if (typeof obj === 'string') {
          return this.sanitizeString(obj);
        }
        
        return obj;
      };
      
      const sanitized = sanitizeObject(parsed);
      
      return {
        isValid: errors.length === 0,
        sanitized,
        errors
      };
      
    } catch (error) {
      return {
        isValid: false,
        sanitized: null,
        errors: ['Invalid JSON format']
      };
    }
  }
}

/**
 * Request validation middleware for authentication endpoints
 */
export const validateAuthRequest = (req: Request, res: Response, next: NextFunction) => {
  const { email, token } = req.body;
  
  if (email) {
    const emailValidation = InputSanitizer.sanitizeEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email address',
        errors: emailValidation.errors
      });
    }
    req.body.email = emailValidation.email;
  }
  
  if (token) {
    const sanitized = InputSanitizer.sanitizeString(token);
    if (!sanitized || sanitized.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format'
      });
    }
    req.body.token = sanitized;
  }
  
  next();
};

/**
 * Request validation middleware for admin console
 */
export const validateAdminConsoleRequest = (req: Request, res: Response, next: NextFunction) => {
  const { query, conversationHistory } = req.body;
  
  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Query is required'
    });
  }
  
  // Validate and sanitize the query
  const queryValidation = InputSanitizer.sanitizeSqlInput(query);
  if (!queryValidation.isValid) {
    console.warn(`[Admin Console Security] Blocked potentially malicious query from ${req.ip}: ${queryValidation.violations.join(', ')}`);
    return res.status(400).json({
      success: false,
      message: 'Query contains potentially unsafe content',
      violations: queryValidation.violations
    });
  }
  
  req.body.query = queryValidation.sanitized;
  
  // Validate conversation history if provided
  if (conversationHistory) {
    const historyValidation = InputSanitizer.sanitizeJson(conversationHistory);
    if (!historyValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation history format',
        errors: historyValidation.errors
      });
    }
    
    // Additional validation for conversation history structure
    if (Array.isArray(historyValidation.sanitized)) {
      const validHistory = historyValidation.sanitized.filter((msg: any) => {
        return msg && 
               typeof msg === 'object' && 
               typeof msg.role === 'string' && 
               (msg.role === 'user' || msg.role === 'assistant') &&
               typeof msg.content === 'string' &&
               msg.content.length < 10000;
      }).slice(0, 20); // Limit to 20 messages
      
      req.body.conversationHistory = validHistory;
    } else {
      req.body.conversationHistory = [];
    }
  }
  
  next();
};

/**
 * General request body sanitization middleware
 */
export const sanitizeRequestBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    const sanitization = InputSanitizer.sanitizeJson(req.body);
    if (sanitization.isValid) {
      req.body = sanitization.sanitized;
    } else {
      console.warn(`[Input Validation] Request body sanitization failed from ${req.ip}: ${sanitization.errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid request format',
        errors: sanitization.errors
      });
    }
  }
  
  next();
};

/**
 * Query parameter sanitization middleware
 */
export const sanitizeQueryParams = (req: Request, res: Response, next: NextFunction) => {
  if (req.query && typeof req.query === 'object') {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        req.query[key] = InputSanitizer.sanitizeString(value);
      }
    }
  }
  
  next();
};

/**
 * File upload validation (for future use)
 */
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  // Implement file upload validation when needed
  // - Check file types
  // - Validate file sizes
  // - Scan for malware
  // - Validate file names
  next();
};
