import { type Message } from '../types/message';
import { 
  serializeMessages, 
  deserializeMessage 
} from '../utils/messageSerializer';
import type { BaseMessage } from '@langchain/core/messages';

interface ConversationThread {
  threadId: string;
  competitionId: string | null;
  messages: Message[];
  lastUpdated: number;
  userEmail?: string;
}

class StorageService {
  private static instance: StorageService;
  private cache: Map<string, ConversationThread> = new Map();
  private initialized = false;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Initialize the storage service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.loadFromStorage();
      this.initialized = true;
      console.log('StorageService: Initialized successfully with', this.cache.size, 'threads');
    } catch (error) {
      console.error('StorageService: Failed to initialize:', error);
    }
  }

  /**
   * Load all conversations from Chrome storage into cache
   */
  private async loadFromStorage(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        // In test environment or when Chrome APIs are not available, just resolve
        console.log('StorageService: Chrome storage not available, using in-memory storage');
        resolve();
        return;
      }

      // Use chrome.storage.local instead of sync for larger data storage
      chrome.storage.local.get(['conversations'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('StorageService: Chrome storage error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        console.log('StorageService: Raw storage result:', result);
        
        const conversations: Record<string, ConversationThread> = result.conversations || {};
        
        // Clear cache and reload
        this.cache.clear();
        
        // Load into cache
        Object.entries(conversations).forEach(([threadId, thread]) => {
          // Ensure the thread has all required properties
          if (thread && thread.threadId && Array.isArray(thread.messages)) {
            this.cache.set(threadId, {
              threadId: thread.threadId,
              competitionId: thread.competitionId || null,
              messages: thread.messages || [],
              lastUpdated: thread.lastUpdated || Date.now(),
              userEmail: thread.userEmail
            });
          }
        });

        console.log(`StorageService: Loaded ${this.cache.size} conversations from storage`);
        resolve();
      });
    });
  }

  /**
   * Save all conversations to Chrome storage
   */
  private async saveToStorage(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const conversations: Record<string, ConversationThread> = {};
      this.cache.forEach((thread, threadId) => {
        conversations[threadId] = {
          threadId: thread.threadId,
          competitionId: thread.competitionId,
          messages: thread.messages,
          lastUpdated: thread.lastUpdated,
          userEmail: thread.userEmail
        };
      });

      if (typeof chrome === 'undefined' || !chrome.storage) {
        // In test environment, just log and resolve
        console.log('StorageService: Chrome storage not available, skipping save (test mode)');
        resolve();
        return;
      }

      console.log('StorageService: Saving conversations:', Object.keys(conversations));

      chrome.storage.local.set({ conversations }, () => {
        if (chrome.runtime.lastError) {
          console.error('StorageService: Save error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        console.log(`StorageService: Successfully saved ${Object.keys(conversations).length} conversations`);
        resolve();
      });
    });
  }

  /**
   * Get messages for a specific thread
   */
  public async getMessages(threadId: string): Promise<Message[]> {
    await this.initialize();
    
    const thread = this.cache.get(threadId);
    const messages = thread ? [...thread.messages] : [];
    
    console.log(`StorageService: Retrieved ${messages.length} messages for thread ${threadId}`);
    return messages;
  }

  /**
   * Add a message to a thread
   */
  public async addMessage(
    threadId: string, 
    message: Message, 
    competitionId: string | null = null,
    userEmail?: string
  ): Promise<void> {
    await this.initialize();

    let thread = this.cache.get(threadId);
    
    if (!thread) {
      thread = {
        threadId,
        competitionId,
        messages: [],
        lastUpdated: Date.now(),
        userEmail
      };
      this.cache.set(threadId, thread);
    }

    thread.messages.push(message);
    thread.lastUpdated = Date.now();

    // Save to storage immediately
    await this.saveToStorage();
    
    console.log(`StorageService: Added message to thread ${threadId}, total messages: ${thread.messages.length}`);
  }

  /**
   * Update messages for a thread (replace all)
   */
  public async updateMessages(
    threadId: string, 
    messages: Message[], 
    competitionId: string | null = null,
    userEmail?: string
  ): Promise<void> {
    await this.initialize();

    const thread: ConversationThread = {
      threadId,
      competitionId,
      messages: [...messages],
      lastUpdated: Date.now(),
      userEmail
    };

    this.cache.set(threadId, thread);
    
    // Save to storage immediately
    await this.saveToStorage();
    
    console.log(`StorageService: Updated thread ${threadId} with ${messages.length} messages`);
  }

  /**
   * Get all conversations for a specific competition
   */
  public async getConversationsByCompetition(competitionId: string): Promise<ConversationThread[]> {
    await this.initialize();

    const conversations: ConversationThread[] = [];
    this.cache.forEach((thread) => {
      if (thread.competitionId === competitionId) {
        conversations.push({ ...thread });
      }
    });

    return conversations.sort((a, b) => b.lastUpdated - a.lastUpdated);
  }

  /**
   * Clear all conversations (for debugging/reset)
   */
  public async clearAll(): Promise<void> {
    this.cache.clear();
    
    // Actually remove the storage keys instead of just saving empty objects
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage not available'));
        return;
      }

      chrome.storage.local.remove(['conversations'], () => {
        if (chrome.runtime.lastError) {
          console.error('StorageService: Clear error:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        console.log('StorageService: Successfully removed conversations from Chrome storage');
        resolve();
      });
    });
  }

  /**
   * Delete a specific thread
   */
  public async deleteThread(threadId: string): Promise<void> {
    this.cache.delete(threadId);
    await this.saveToStorage();
    console.log(`StorageService: Deleted thread ${threadId}`);
  }

  /**
   * Get storage statistics
   */
  public getStats(): { totalThreads: number; totalMessages: number } {
    let totalMessages = 0;
    this.cache.forEach((thread) => {
      totalMessages += thread.messages.length;
    });

    return {
      totalThreads: this.cache.size,
      totalMessages
    };
  }

  /**
   * Force reload from storage (useful after browser refresh)
   */
  public async forceReload(): Promise<void> {
    this.initialized = false;
    await this.initialize();
  }

  /**
   * Get messages for a thread in LangChain format for agent processing
   * This method deserializes stored messages back to proper LangChain format
   */
  public async getLangChainMessages(threadId: string): Promise<BaseMessage[]> {
    await this.initialize();
    
    const thread = this.cache.get(threadId);
    if (!thread) return [];
    
    const langchainMessages: BaseMessage[] = [];
    
    for (const message of thread.messages) {
      // Check if message has serialized LangChain data
      if ('_langchain_data' in message && message._langchain_data) {
        try {
          const deserializedMsg = deserializeMessage(message._langchain_data);
          langchainMessages.push(deserializedMsg);
        } catch (error) {
          console.warn('StorageService: Failed to deserialize message, skipping:', error);
          // Skip corrupted messages rather than break the entire flow
        }
      }
      // If no LangChain data, we can't reconstruct the original message with tool_calls
      // This would be messages from before the serialization fix
    }
    
    console.log(`StorageService: Retrieved ${langchainMessages.length} LangChain messages for thread ${threadId}`);
    return langchainMessages;
  }

  /**
   * Store LangChain messages with proper serialization
   * This method should be used when saving messages from agent responses
   */
  public async storeLangChainMessages(
    threadId: string, 
    messages: BaseMessage[], 
    competitionId: string | null = null,
    userEmail?: string
  ): Promise<void> {
    await this.initialize();

    // Convert LangChain messages to our Message format with serialization
    const conversationMessages: Message[] = messages
      .filter((msg) => {
        // Only include HumanMessage and AIMessage (not ToolMessage, SystemMessage, etc.)
        const msgType = msg.constructor?.name || '';
        return msgType === 'HumanMessage' || msgType === 'AIMessage';
      })
      .map((msg, index) => {
        const serializedMsg = serializeMessages([msg])[0];
        const msgType = msg.constructor?.name || '';
        
        const message: Message & { _langchain_data?: unknown } = {
          id: index + 1,
          type: msgType === 'HumanMessage' ? 'user' : 'system',
          text: typeof msg.content === 'string' ? msg.content : String(msg.content),
          time: new Date().toISOString(),
          _langchain_data: serializedMsg
        };
        
        return message;
      });

    // Update the thread
    await this.updateMessages(threadId, conversationMessages, competitionId, userEmail);
    
    console.log(`StorageService: Stored ${conversationMessages.length} LangChain messages for thread ${threadId}`);
  }
}

// Export singleton instance
export const storageService = StorageService.getInstance();