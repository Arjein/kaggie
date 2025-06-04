import { MemorySaver, type StateSnapshot } from "@langchain/langgraph/web";
import { type RunnableConfig } from "@langchain/core/runnables";

/**
 * Interface for storing state snapshots per competition
 */
interface CompetitionStateSnapshot {
  competitionId: string;
  threadId: string;
  snapshot: StateSnapshot;
  lastUpdated: number;
}

/**
 * Persistent Memory Saver that stores StateSnapshots per competition
 * Each competition gets its own snapshot that is updated when the agent state changes
 */
export class PersistentMemorySaver extends MemorySaver {
  private readonly storageKey = 'kaggler_competition_snapshots';
  private initialized = false;
  private competitionSnapshots: Map<string, CompetitionStateSnapshot> = new Map();

  constructor() {
    super();
  }

  /**
   * Initialize by loading saved snapshots from storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadFromStorage();
      this.initialized = true;
      console.log('PersistentMemorySaver: Initialized with', this.competitionSnapshots.size, 'competition snapshots');
    } catch (error) {
      console.error('PersistentMemorySaver: Failed to initialize:', error);
      this.initialized = true;
    }
  }

  /**
   * Restore saved state into LangGraph's memory for a specific thread
   */
  async restoreStateForThread(
    competitionId: string,
    threadId: string,
    graph: any,
    config: any
  ): Promise<boolean> {
    await this.initialize();
    
    const stored = this.competitionSnapshots.get(competitionId);
    if (!stored || !stored.snapshot) {
      console.log(`🔄 PersistentMemorySaver: No saved state found for competition: ${competitionId}`);
      return false;
    }
    
    try {
      console.log(`🔄 PersistentMemorySaver: Restoring state for competition: ${competitionId}, thread: ${threadId}`);
      
      // Use LangGraph's updateState to restore the saved state
      await graph.updateState(config, stored.snapshot.values);
      
      console.log(`✅ PersistentMemorySaver: Successfully restored state for competition: ${competitionId}`);
      return true;
    } catch (error) {
      console.error(`❌ PersistentMemorySaver: Failed to restore state for competition: ${competitionId}`, error);
      return false;
    }
  }

  /**
   * Get the current state snapshot for a specific competition
   */
  async getStateSnapshot(competitionId: string): Promise<StateSnapshot | null> {
    await this.initialize();
    
    const stored = this.competitionSnapshots.get(competitionId);
    if (!stored) {
      console.log(`PersistentMemorySaver: No snapshot found for competition ${competitionId}`);
      return null;
    }

    console.log(`PersistentMemorySaver: Retrieved snapshot for competition ${competitionId}`);
    return stored.snapshot;
  }

  /**
   * Save/update the state snapshot for a specific competition
   */
  async saveStateSnapshot(
    competitionId: string, 
    threadId: string, 
    snapshot: StateSnapshot
  ): Promise<void> {
    await this.initialize();

    const competitionSnapshot: CompetitionStateSnapshot = {
      competitionId,
      threadId,
      snapshot,
      lastUpdated: Date.now()
    };

    // Override any existing snapshot for this competition
    this.competitionSnapshots.set(competitionId, competitionSnapshot);
    
    // Persist to storage
    await this.saveToStorage();
    
    console.log(`PersistentMemorySaver: Saved snapshot for competition ${competitionId}, thread ${threadId}`);
  }

  /**
   * Get the latest state snapshot using LangGraph's getState method
   */
  async getLatestState(
    competitionId: string, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: any, 
    config: RunnableConfig
  ): Promise<StateSnapshot | null> {
    try {
      // First try to get state from the graph (most recent)
      const currentState = await graph.getState(config);
      
      if (currentState && currentState.values) {
        // Save this as the latest snapshot for the competition
        await this.saveStateSnapshot(competitionId, config.configurable?.thread_id, currentState);
        return currentState;
      }

      // Fallback to stored snapshot
      return await this.getStateSnapshot(competitionId);
    } catch (error) {
      console.error('PersistentMemorySaver: Failed to get latest state:', error);
      return await this.getStateSnapshot(competitionId);
    }
  }

  /**
   * Load competition snapshots from persistent storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      let data: string | null = null;

      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await new Promise<{ [key: string]: unknown }>((resolve, reject) => {
          chrome.storage.local.get([this.storageKey], (result) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(result);
            }
          });
        });
        data = result[this.storageKey] ? JSON.stringify(result[this.storageKey]) : null;
      } else {
        throw new Error('Chrome storage not available');
      }

      if (!data || data === 'null') {
        console.log('PersistentMemorySaver: No stored snapshots found');
        return;
      }

      const storedSnapshots = JSON.parse(data) as CompetitionStateSnapshot[];
      
      // Load into memory
      this.competitionSnapshots.clear();
      storedSnapshots.forEach(snapshot => {
        if (snapshot.competitionId && snapshot.snapshot) {
          this.competitionSnapshots.set(snapshot.competitionId, snapshot);
        }
      });

      console.log(`PersistentMemorySaver: Loaded ${this.competitionSnapshots.size} competition snapshots`);
    } catch (error) {
      console.error('PersistentMemorySaver: Failed to load from storage:', error);
    }
  }

  /**
   * Save competition snapshots to persistent storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const snapshotsArray = Array.from(this.competitionSnapshots.values());

      if (typeof chrome !== 'undefined' && chrome.storage) {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set({ [this.storageKey]: snapshotsArray }, () => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve();
            }
          });
        });
      } else {
        throw new Error('Chrome storage not available');
      }

      console.log(`PersistentMemorySaver: Saved ${snapshotsArray.length} competition snapshots to storage`);
    } catch (error) {
      console.error('PersistentMemorySaver: Failed to save to storage:', error);
    }
  }

  /**
   * Clear snapshot for a specific competition
   */
  async clearCompetition(competitionId: string): Promise<void> {
    await this.initialize();
    
    this.competitionSnapshots.delete(competitionId);
    await this.saveToStorage();
    
    console.log(`PersistentMemorySaver: Cleared snapshot for competition ${competitionId}`);
  }

  /**
   * Clear snapshots for a specific thread ID
   */
  async clearThread(threadId: string): Promise<void> {
    await this.initialize();
    
    console.log(`PersistentMemorySaver: Attempting to clear thread ${threadId}`);
    console.log(`PersistentMemorySaver: Current snapshots:`, this.listCompetitions().map(s => ({ competitionId: s.competitionId, threadId: s.threadId })));
    
    // Remove all snapshots that match the thread ID
    const toDelete: string[] = [];
    this.competitionSnapshots.forEach((snapshot, competitionId) => {
      console.log(`PersistentMemorySaver: Checking snapshot - competitionId: ${competitionId}, threadId: ${snapshot.threadId} vs target: ${threadId}`);
      if (snapshot.threadId === threadId) {
        toDelete.push(competitionId);
        console.log(`PersistentMemorySaver: Found match - will delete competition ${competitionId}`);
      }
    });
    
    toDelete.forEach(competitionId => {
      this.competitionSnapshots.delete(competitionId);
    });
    
    if (toDelete.length > 0) {
      await this.saveToStorage();
      console.log(`PersistentMemorySaver: Successfully cleared ${toDelete.length} snapshots for thread ${threadId}`);
    } else {
      console.log(`PersistentMemorySaver: No snapshots found for thread ${threadId} - this might be the issue!`);
      
      // Let's also try to clear by competition ID extracted from thread ID
      // Thread ID format: thread_email_competitionId
      const threadParts = threadId.split('_');
      if (threadParts.length >= 3) {
        const competitionId = threadParts.slice(2).join('_'); // Handle competition IDs with underscores
        console.log(`PersistentMemorySaver: Trying to clear by extracted competition ID: ${competitionId}`);
        
        if (this.competitionSnapshots.has(competitionId)) {
          this.competitionSnapshots.delete(competitionId);
          await this.saveToStorage();
          console.log(`PersistentMemorySaver: Successfully cleared snapshot for competition ${competitionId}`);
        } else {
          console.log(`PersistentMemorySaver: No snapshot found for competition ID ${competitionId} either`);
        }
      }
    }
  }

  /**
   * Clear all stored competition snapshots
   */
  async clearAll(): Promise<void> {
    this.competitionSnapshots.clear();
    
    // Clear from storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.remove([this.storageKey], () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      localStorage.removeItem(this.storageKey);
    }
    
    console.log('PersistentMemorySaver: Cleared all competition snapshots');
  }

  /**
   * Get storage statistics
   */
  getStats(): { totalCompetitions: number; competitionIds: string[] } {
    return {
      totalCompetitions: this.competitionSnapshots.size,
      competitionIds: Array.from(this.competitionSnapshots.keys())
    };
  }

  /**
   * List all stored competition snapshots
   */
  listCompetitions(): CompetitionStateSnapshot[] {
    return Array.from(this.competitionSnapshots.values())
      .sort((a, b) => b.lastUpdated - a.lastUpdated);
  }
}

// Export singleton instance
export const persistentMemorySaver = new PersistentMemorySaver();