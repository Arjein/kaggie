/**
 * Thread Mapping Service - Manages competition ID to thread ID mappings
 * Stores mappings in localStorage for easy retrieval and persistence
 */

interface ThreadMapping {
  [competitionId: string]: string; // competitionId -> threadId
}

class ThreadMappingService {
  private static instance: ThreadMappingService;
  private readonly STORAGE_KEY = 'kaggie_thread_mappings';
  private mappings: ThreadMapping = {};
  private initialized = false;

  private constructor() {}

  public static getInstance(): ThreadMappingService {
    if (!ThreadMappingService.instance) {
      ThreadMappingService.instance = new ThreadMappingService();
    }
    return ThreadMappingService.instance;
  }

  /**
   * Initialize the service by loading mappings from localStorage
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.mappings = JSON.parse(stored);
        console.log('ThreadMappingService: Loaded mappings:', this.mappings);
      } else {
        console.log('ThreadMappingService: No existing mappings found');
      }
    } catch (error) {
      console.error('ThreadMappingService: Error loading mappings:', error);
      this.mappings = {};
    }

    this.initialized = true;
  }

  /**
   * Save mappings to localStorage
   */
  private async saveToStorage(): Promise<void> {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.mappings));
      console.log('ThreadMappingService: Saved mappings to localStorage');
    } catch (error) {
      console.error('ThreadMappingService: Error saving mappings:', error);
    }
  }

  /**
   * Get thread ID for a competition
   */
  public getThreadId(competitionId: string): string | null {
    return this.mappings[competitionId] || null;
  }

  /**
   * Set thread ID for a competition
   */
  public async setThreadId(competitionId: string, threadId: string): Promise<void> {
    await this.initialize();
    
    this.mappings[competitionId] = threadId;
    await this.saveToStorage();
    
    console.log(`ThreadMappingService: Mapped competition ${competitionId} -> thread ${threadId}`);
  }

  /**
   * Generate a new thread ID with timestamp for a competition
   * This ensures each new conversation gets a unique thread ID
   */
  public async generateNewThreadId(competitionId: string, userEmail: string): Promise<string> {
    const timestamp = Date.now();
    const threadId = `thread_${userEmail}_${competitionId}_${timestamp}`;
    
    await this.setThreadId(competitionId, threadId);
    
    console.log(`ThreadMappingService: Generated new thread ID for competition ${competitionId}: ${threadId}`);
    return threadId;
  }

  /**
   * Clear thread mapping for a competition (when clearing conversations)
   */
  public async clearCompetitionMapping(competitionId: string): Promise<void> {
    await this.initialize();
    
    delete this.mappings[competitionId];
    await this.saveToStorage();
    
    console.log(`ThreadMappingService: Cleared mapping for competition ${competitionId}`);
  }

  /**
   * Get all mappings (for debugging)
   */
  public getAllMappings(): ThreadMapping {
    return { ...this.mappings };
  }

  /**
   * Clear all mappings (for debugging/reset)
   */
  public async clearAllMappings(): Promise<void> {
    this.mappings = {};
    await this.saveToStorage();
    console.log('ThreadMappingService: Cleared all mappings');
  }

  /**
   * Check if a competition has an existing thread
   */
  public hasThread(competitionId: string): boolean {
    return competitionId in this.mappings;
  }

  /**
   * Get statistics about mappings
   */
  public getStats(): { totalMappings: number; competitions: string[] } {
    return {
      totalMappings: Object.keys(this.mappings).length,
      competitions: Object.keys(this.mappings)
    };
  }
}

// Export singleton instance
export const threadMappingService = ThreadMappingService.getInstance();
