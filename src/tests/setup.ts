/**
 * Test Setup
 * Configure test environment and global settings
 */

import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.test') });

// Set test environment variables if not already set
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-that-is-long-enough-for-security-testing-purposes-123456789';
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-anthropic-key';
process.env.AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || 'test-airtable-key';

// Suppress console logs in tests unless debugging
if (!process.env.TEST_DEBUG) {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
}

// Global test timeout
jest.setTimeout(10000);

// Mock external services for testing
jest.mock('../services/airtableService', () => ({
  airtableService: {
    getAllOrganizerEmails: jest.fn().mockResolvedValue(['test@example.com']),
    isAdmin: jest.fn().mockResolvedValue(true),
    getAllEvents: jest.fn().mockResolvedValue([]),
  }
}));

jest.mock('../services/loopsService', () => ({
  loopsService: {
    sendMagicLinkEmail: jest.fn().mockResolvedValue({ success: true })
  }
}));

jest.mock('../services/databaseService', () => ({
  databaseService: {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    readOnlyQuery: jest.fn().mockResolvedValue({ rows: [] }),
    isInitialized: jest.fn().mockReturnValue(true)
  }
}));
