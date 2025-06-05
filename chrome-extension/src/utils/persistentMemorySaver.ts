import { MemorySaver, type StateSnapshot } from "@langchain/langgraph/web";
import { type RunnableConfig } from "@langchain/core/runnables";
import { 
  HumanMessage, 
  AIMessage, 
  SystemMessage, 
  ToolMessage 
} from "@langchain/core/messages";

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
 * This version works with LangGraph's built-in serialization without interference
 */
export class PersistentMemorySaver extends MemorySaver {
  private readonly storageKey = 'kaggie_competition_snapshots';
  private initialized = false;
  private competitionSnapshots: Map<string, CompetitionStateSnapshot> = new Map();

  constructor() {
    super();
  }

  /**
   * Helper function to properly deserialize messages from stored state
   * This fixes the LangChain message coercion error by recreating proper message instances
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private deserializeMessages(messages: any[]): any[] {
    if (!Array.isArray(messages)) return messages;
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return messages.map((msg: any) => {
      // If message already has proper class type, return as-is
      if (msg?.constructor?.name?.includes('Message')) {
        return msg;
      }
      
      // Handle serialized LangChain messages with lc_kwargs
      if (msg?.lc_kwargs || msg?.lc_serializable) {        
        // Determine message type from content or lc_namespace
        const content = msg.content || msg.lc_kwargs?.content || '';
        const id = msg.id || msg.lc_kwargs?.id;
        const additional_kwargs = msg.additional_kwargs || msg.lc_kwargs?.additional_kwargs || {};
        const response_metadata = msg.response_metadata || msg.lc_kwargs?.response_metadata || {};
        
        // Reconstruct proper message instance based on type indicators
        if (msg.lc_namespace?.includes('messages') || msg._type) {
          const msgType = msg._type || (msg.lc_namespace?.[msg.lc_namespace.length - 1]);
          
          switch (msgType) {
            case 'human':
              return new HumanMessage({ content, id, additional_kwargs, response_metadata });
            case 'ai':
              return new AIMessage({ content, id, additional_kwargs, response_metadata });
            case 'system':
              return new SystemMessage({ content, id, additional_kwargs, response_metadata });
            case 'tool':
              return new ToolMessage({ content, id, additional_kwargs, response_metadata, tool_call_id: msg.tool_call_id });
            default:
              // Default to HumanMessage if type unclear
              return new HumanMessage({ content, id, additional_kwargs, response_metadata });
          }
        }
      }
      
      // For regular message-like objects, return as-is
      return msg;
    });
  }

  /**
   * Helper to clean state values by deserializing messages
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private cleanStateValues(values: any): any {
    if (!values || typeof values !== 'object') return values;
    
    const cleaned = { ...values };
    
    // Handle messages array if present
    if (cleaned.messages && Array.isArray(cleaned.messages)) {
      cleaned.messages = this.deserializeMessages(cleaned.messages);
    }
    
    return cleaned;
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
      
      // If loading fails, start fresh
      console.log('PersistentMemorySaver: Starting with clean state');
      this.initialized = true;
    }
  }

  /**
   * Restore saved state into LangGraph's memory for a specific thread
   */
  async restoreStateForThread(
    competitionId: string,
    threadId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    graph: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      console.log("SNAPSHOT BEFORE UPDATE: ", stored.snapshot)
      
      // Clean and deserialize the state values to fix message coercion issues
      const cleanedValues = this.cleanStateValues(stored.snapshot.values);
      console.log("CLEANED VALUES AFTER DESERIALIZATION: ", cleanedValues);
      
      // Use LangGraph's updateState to restore the cleaned state
      await graph.updateState(config, cleanedValues);
      
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
      
      // Load into memory - LangGraph handles serialization internally
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
      // Convert to array for storage - LangGraph handles serialization
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
    
    // Remove all snapshots that match the thread ID
    const toDelete: string[] = [];
    this.competitionSnapshots.forEach((snapshot, competitionId) => {
      if (snapshot.threadId === threadId) {
        toDelete.push(competitionId);
      }
    });
    
    toDelete.forEach(competitionId => {
      this.competitionSnapshots.delete(competitionId);
    });
    
    if (toDelete.length > 0) {
      await this.saveToStorage();
      console.log(`PersistentMemorySaver: Successfully cleared ${toDelete.length} snapshots for thread ${threadId}`);
    } else {
      console.log(`PersistentMemorySaver: No snapshots found for thread ${threadId}`);
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
   * Force clear storage and reset - useful for fixing corrupted data
   */
  async forceReset(): Promise<void> {
    console.log('PersistentMemorySaver: Force resetting storage...');
    
    // Clear in-memory state
    this.competitionSnapshots.clear();
    this.initialized = false;
    
    // Clear Chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await new Promise<void>((resolve, reject) => {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    } else {
      localStorage.clear();
    }
    
    console.log('PersistentMemorySaver: Storage force reset complete');
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