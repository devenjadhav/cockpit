interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  
  // Default TTL values in milliseconds
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly ORGANIZER_EMAILS_TTL = 15 * 60 * 1000; // 15 minutes (rarely changes)
  private static readonly EVENT_TTL = 2 * 60 * 1000; // 2 minutes (can change frequently)
  
  set<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || CacheService.DEFAULT_TTL
    };
    this.cache.set(key, entry);
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  // Get cache keys with specific patterns
  getEventsCacheKey(organizerEmail: string): string {
    return `events:organizer:${organizerEmail}`;
  }
  
  getEventCacheKey(eventId: string): string {
    return `event:${eventId}`;
  }
  
  getOrganizerEmailsCacheKey(): string {
    return 'organizer-emails';
  }
  
  // Cache with specific TTLs for different data types
  cacheOrganizerEmails(emails: string[]): void {
    this.set(this.getOrganizerEmailsCacheKey(), emails, CacheService.ORGANIZER_EMAILS_TTL);
  }
  
  cacheEventsByOrganizer(organizerEmail: string, events: any[]): void {
    this.set(this.getEventsCacheKey(organizerEmail), events, CacheService.EVENT_TTL);
  }
  
  cacheEvent(eventId: string, event: any): void {
    this.set(this.getEventCacheKey(eventId), event, CacheService.EVENT_TTL);
  }
  
  // Invalidate related caches when event is updated
  invalidateEventCaches(eventId: string, organizerEmail?: string): void {
    this.delete(this.getEventCacheKey(eventId));
    if (organizerEmail) {
      this.delete(this.getEventsCacheKey(organizerEmail));
    }
  }
  
  // Get cache stats for monitoring
  getStats(): { size: number; entries: Array<{ key: string; age: number; ttl: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      ttl: entry.ttl
    }));
    
    return {
      size: this.cache.size,
      entries
    };
  }
}

export const cacheService = new CacheService();
