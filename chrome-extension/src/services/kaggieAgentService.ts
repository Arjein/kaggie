// Integration service for Enhanced Kaggie agent in Chrome extension
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { KaggieAgent } from '../kaggie-graph-agent/graph/main_agent_graph';
import { globalConfig, type GlobalConfig } from '../config/globalConfig';
import { storageService } from './storageService';
import type { Message } from '../types/message';


// Define interfaces for better typing
interface AgentResponse {
  messages?: Array<AIMessage | HumanMessage | {
    content?: string;
    constructor?: { name: string };
    role?: string;
    type?: string;
  }>;
  [key: string]: unknown;
}

// Define types for message handling
interface MessageLike {
  content?: string | Array<{ text?: string; content?: string }>;
  constructor?: { name: string };
  role?: string;
  type?: string;
  id?: string;
}

// Competition type for sendMessage
export type Competition = { id: string };

/**
 * Helper function to robustly detect if a message is an AI message
 * Handles both proper LangChain instances and minified production builds
 */
function isAIMessage(message: unknown): boolean {
  if (!message) return false;
  
  // First try instanceof check (works in development)
  if (message instanceof AIMessage) {
    return true;
  }
  
  // Fallback checks for production builds where constructor names get minified
  const msg = message as MessageLike;
  
  // Check for role property
  if (msg.role === 'assistant' || msg.role === 'ai') {
    return true;
  }
  
  // Check for type property
  if (msg.type === 'ai' || msg.type === 'assistant') {
    return true;
  }
  
  // Check for minified constructor names that might indicate AI messages
  const constructorName = msg?.constructor?.name;
  if (constructorName === 'We' || constructorName === 'AIMessage') {
    return true;
  }
  
  // Check if it's not a HumanMessage (process of elimination)
  if (!(message instanceof HumanMessage) && 
      msg.role !== 'user' && 
      msg.type !== 'human' &&
      constructorName !== 'HumanMessage') {
    // If it has content and we can't identify it as human, assume it's AI
    return !!msg.content;
  }
  
  return false;
}

/**
 * Helper function to safely extract string content from a message
 */
function extractMessageContent(message: unknown): string {
  if (!message) return '';
  
  const msg = message as MessageLike;
  if (!msg.content) return '';
  
  // If content is already a string, return it
  if (typeof msg.content === 'string') {
    return msg.content;
  }
  
  // If content is an array, try to extract text
  if (Array.isArray(msg.content)) {
    return msg.content
      .map((item: { text?: string; content?: string }) => {
        if (typeof item === 'string') return item;
        if (item?.text) return item.text;
        if (item?.content) return item.content;
        return '';
      })
      .join('');
  }
  
  // Fallback: try to convert to string
  return String(msg.content);
}

export class KaggieAgentService {
  private agent: KaggieAgent | null = null;
  private isInitialized = false;

  private constructor() {}
  private static instance: KaggieAgentService;
  public static getInstance(): KaggieAgentService {
    if (!KaggieAgentService.instance) {
      KaggieAgentService.instance = new KaggieAgentService();
    }
    return KaggieAgentService.instance;
  }

  /**
   * Generate thread ID based on user email and competition ID
   */
  private generateThreadId(competitionId?: string): string {
    const config = globalConfig.getConfig();
    const email = config.userEmail || 'anonymous';
    const compId = competitionId || 'general';
    const threadId = `thread_${email}_${compId}`;
    
    console.log('KaggieAgentService: Generated thread ID:', threadId);
    return threadId;
  }

  /**
   * Update thread ID in global config when competition changes
   */
  private async updateThreadId(competitionId?: string): Promise<string> {
    const newThreadId = this.generateThreadId(competitionId);
    await globalConfig.updateConfig({ currentThreadId: newThreadId });
    console.log('KaggieAgentService: Updated thread ID in global config:', newThreadId);
    return newThreadId;
  }

  /**
   * Initialize the new graph-based Kaggie agent with API keys from global configuration
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('KaggieAgentService: Starting enhanced agent initialization...');
      
      // Get configuration from global config service
      const config = await this.getConfigFromStorage();
      console.log('KaggieAgentService: Config loaded:', {
        hasOpenAI: !!config.openaiApiKey,
        hasTavily: !!config.tavilyApiKey,
        backendUrl: config.backendUrl,
        currentThreadId: config.currentThreadId
      });
      
      if (!config.openaiApiKey || !config.tavilyApiKey) {
        console.warn('KaggieAgentService: Missing required API keys in storage');
        this.isInitialized = false;
        return false;
      }

      // Instantiate the new graph-based agent
      console.log('KaggieAgentService: Creating new agent instance with updated keys...');
      this.agent = new KaggieAgent(config.openaiApiKey, config.backendUrl);
      this.isInitialized = true;
      
      console.log('KaggieAgentService: Enhanced agent initialization complete with new keys!');
      return true;
    } catch (error) {
      console.error('KaggieAgentService: Failed to initialize graph agent:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Process a query using the new graph-based Kaggie agent
   */
  async processQuery(query: string, competitionId?: string, threadId?: string): Promise<AgentResponse> {
    console.log('🚀 KaggieAgentService.processQuery: Starting with query:', query);
    console.log('🚀 KaggieAgentService.processQuery: Competition ID:', competitionId);
    
    if (!this.isInitialized || !this.agent) {
      console.log('🔧 KaggieAgentService.processQuery: Agent not initialized, initializing...');
      const initialized = await this.initialize();
      if (!initialized || !this.agent) {
        console.error('❌ KaggieAgentService.processQuery: Failed to initialize agent');
        throw new Error('Failed to initialize Kaggie agent. Please check your API keys.');
      }
      console.log('✅ KaggieAgentService.processQuery: Agent initialized successfully');
    }
    
    // Generate/update thread ID based on competition
    let effectiveThreadId: string;
    if (threadId) {
      // Use provided thread ID
      effectiveThreadId = threadId;
    } else {
      // Generate new thread ID and update global config
      effectiveThreadId = await this.updateThreadId(competitionId);
    }
    
    console.log('🧵 KaggieAgentService.processQuery: Using thread ID:', effectiveThreadId);
    
    // 🔧 Use minimal state that matches AgentStateAnnotation exactly
    const state = {
      competition_id: competitionId || null,
      competition_title: null,
      competition_description: null,
      competition_evaluation: null,
      retrieved_docs: null,
      messages: [new HumanMessage(query)], // CRITICAL: Only new message - reducer should append to existing from memory
      current_step: null,
      tool_usage_count: null,
      retrieval_evaluation: null,
      retry_count: null,
      conversation_summary: null,
      message_count: null,
      last_summarized_at: null,
    };
    
    console.log('📊 KaggieAgentService.processQuery: Initial state (minimal):', {
      competition_id: state.competition_id,
      new_message: query,
      thread_id: effectiveThreadId
    });
    
    // Call the graph agent's invoke method with thread_id for memory
    console.log('🧠 KaggieAgentService.processQuery: Calling agent.invoke with config:', { 
      configurable: { thread_id: effectiveThreadId } 
    });
    
    // 🔄 RESTORE: Try to restore saved state before invoking the agent
    if (competitionId) {
      try {
        const memorySaver = this.agent.getMemorySaver();
        const graph = this.agent.getGraph();
        const config = { configurable: { thread_id: effectiveThreadId } };
        
        console.log('🔄 KaggieAgentService.processQuery: Attempting to restore saved state for competition:', competitionId);
        const restored = await memorySaver.restoreStateForThread(competitionId, effectiveThreadId, graph, config);
        
        if (restored) {
          console.log('✅ KaggieAgentService.processQuery: Successfully restored saved state for competition:', competitionId);
        } else {
          console.log('🆕 KaggieAgentService.processQuery: No previous state found, starting fresh for competition:', competitionId);
        }
      } catch (error) {
        console.warn('⚠️ KaggieAgentService.processQuery: Failed to restore state, continuing with fresh state:', error);
      }
    }
    
    const result = await this.agent.invoke(
      state, 
      { configurable: { thread_id: effectiveThreadId } }
    );
    
    // 💾 Save final agent state to competition-based persistent storage using StateSnapshot
    if (competitionId) {
      try {
        const memorySaver = this.agent.getMemorySaver();
        const graph = this.agent.getGraph();
        const config = { configurable: { thread_id: effectiveThreadId } };
        
        console.log('💾 KaggieAgentService.processQuery: Getting final state snapshot for competition:', competitionId);
        const finalStateSnapshot = await graph.getState(config);
        
        if (finalStateSnapshot) {
          await memorySaver.saveStateSnapshot(competitionId, effectiveThreadId, finalStateSnapshot);
          console.log('✅ KaggieAgentService.processQuery: Successfully saved state snapshot for competition:', competitionId);
          
          // 💬 SAVE CONVERSATIONS IMMEDIATELY - Same timing as snapshots
          // Extract messages from the final state and save to conversations
          const stateMessages = finalStateSnapshot.values?.messages || [];
          if (stateMessages.length > 0) {
            try {
              // Convert agent state messages to our conversation format
              const conversationMessages = this.convertAgentMessagesToConversation(stateMessages);
              
              // Save immediately to conversations storage (same as snapshot timing)
              await storageService.updateMessages(
                effectiveThreadId,
                conversationMessages,
                competitionId,
                this.getUserEmail()
              );
              
              console.log(`💬 KaggieAgentService.processQuery: Successfully saved ${conversationMessages.length} conversation messages for thread ${effectiveThreadId}`);
            } catch (conversationError) {
              console.error('❌ KaggieAgentService.processQuery: Failed to save conversation messages:', conversationError);
            }
          }
        } else {
          console.warn('⚠️ KaggieAgentService.processQuery: No final state snapshot to save');
        }
      } catch (error) {
        console.error('❌ KaggieAgentService.processQuery: Failed to save state snapshot:', error);
        // Don't throw - this shouldn't break the response flow
      }
    }
    
    console.log("🧠 Agent state saved for thread:", effectiveThreadId);
    console.log("AGENT STATE: ", result)
    
    return result;
  }

  /**
   * Process a query using the Kaggie agent with streaming callbacks
   */
  async sendMessage(
    text: string,
    selectedCompetition: Competition | null,
    threadId: string, // Use the provided thread ID
    onStatusUpdate: (status: string) => void,
    onContentUpdate: (content: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      console.log('📨 KaggieAgentService.sendMessage: Starting with text:', text);
      console.log('📨 KaggieAgentService.sendMessage: Competition:', selectedCompetition);
      console.log('📨 KaggieAgentService.sendMessage: Using provided thread ID:', threadId);
      
      // Use the provided thread ID instead of generating a new one
      const competitionThreadId = threadId;
      
      onStatusUpdate('Processing query...');
      const response = await this.processQuery(
        text,
        selectedCompetition?.id,
        competitionThreadId, // Use the competition-based thread ID
      );
      
      console.log('📨 KaggieAgentService.sendMessage: Got response from processQuery:', response);
      
      onStatusUpdate('Generating response...');
      
      // Extract content from the last message in the messages array
      let content = '';
      
      console.log('📨 KaggieAgentService.sendMessage: Response structure:', {
        response_keys: Object.keys(response || {}),
        has_messages: !!response?.messages,
        messages_count: response?.messages?.length || 0,
        thread_id: competitionThreadId
      });
      
      if (response?.messages && response.messages.length > 0) {
        // Find the last AI message (skip user messages)
        for (let i = response.messages.length - 1; i >= 0; i--) {
          const message = response.messages[i];
          const messageContent = extractMessageContent(message);
          const contentPreview = typeof messageContent === 'string' && messageContent.length > 100 
            ? messageContent.substring(0, 100) + '...' 
            : messageContent;
          
          console.log('📨 KaggieAgentService.sendMessage: Checking message:', {
            index: i,
            type: message?.constructor?.name,
            content_preview: contentPreview,
            is_ai_message: isAIMessage(message),
            thread_id: competitionThreadId
          });
          
          // Use robust AI message detection
          if (isAIMessage(message)) {
            content = extractMessageContent(message);
            console.log('✅ KaggieAgentService.sendMessage: Found AI message content:', {
              content_length: content.length,
              content_preview: content.length > 200 ? content.substring(0, 200) + '...' : content,
              thread_id: competitionThreadId
            });
            break;
          }
        }
      }
      
      if (!content) {
        console.warn('⚠️ KaggieAgentService.sendMessage: No AI message content found!');
        onError('No response content received from agent');
        return;
      }
      
      let currentIndex = 0;
      const chunkSize = 10;
      const streamChunks = () => {
        if (currentIndex < content.length) {
          const chunk = content.slice(0, currentIndex + chunkSize);
          //console.log('📨 KaggieAgentService.sendMessage: Streaming chunk:', chunk.length, 'chars');
          onContentUpdate(chunk);
          currentIndex += chunkSize;
          setTimeout(streamChunks, 50);
        } else {
          console.log('✅ KaggieAgentService.sendMessage: Streaming complete for thread:', competitionThreadId);
          onComplete();
        }
      };
      streamChunks();
    } catch (error) {
      console.error('❌ KaggieAgentService.sendMessage: Error occurred:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError(errorMessage);
    }
  }


  /**
   * Check if the service is ready to process queries
   */
  async isReady(): Promise<boolean> {
    if (!this.isInitialized || !this.agent) {
      const initialized = await this.initialize();
      if (!initialized) {
        return false;
      }
    }
    
    // For now, just check if agent is instantiated
    return !!this.agent;
  }

  /**
   * Get configuration from global config service
   */
  private async getConfigFromStorage(): Promise<GlobalConfig> {
    // Ensure global config is initialized
    if (!globalConfig.isInitialized()) {
      console.log('KaggieAgentService: Global config not initialized, initializing...');
      await globalConfig.initialize();
    }

    const config = globalConfig.getConfig();
    console.log('KaggieAgentService: Using global configuration:', {
      hasOpenAI: !!config.openaiApiKey,
      backendUrl: config.backendUrl,
      model: config.model
    });
    return config
  }

  /**
   * Save API keys to storage using global config
   */
  async saveApiKeys(openaiApiKey: string, tavilyApiKey: string, backendUrl?: string): Promise<void> {
    console.log('KaggieAgentService: Saving API keys and triggering reinitialization...');
    
    const updates: Partial<GlobalConfig> = { openaiApiKey, tavilyApiKey };
    
    if (backendUrl) {
      updates.backendUrl = backendUrl;
    }

    await globalConfig.updateConfig(updates);
    
    // Force re-initialization with new keys
    this.isInitialized = false;
    this.agent = null;
    
    console.log('KaggieAgentService: API keys saved, agent marked for reinitialization');
  }

  /**
   * Test the connection with current API keys (legacy compatibility)
   */
  async testConnection(): Promise<boolean> {
    // Legacy compatibility - redirect to isReady()
    return this.isReady();
  }

  /**
   * Convert agent state messages to conversation format for storage
   */
  private convertAgentMessagesToConversation(agentMessages: MessageLike[]): Message[] {
    return agentMessages
      .filter((msg: MessageLike) => {
        // Only include HumanMessage and AIMessage (not ToolMessage, SystemMessage, etc.)
        const msgType = msg.constructor?.name || msg.type || '';
        return msgType === 'HumanMessage' || msgType === 'AIMessage';
      })
      .map((msg: MessageLike, index: number) => {
        const msgType = msg.constructor?.name || msg.type || '';
        return {
          id: index + 1, // Message interface expects number ID
          type: msgType === 'HumanMessage' ? 'user' : 'system', // Match Message interface types
          text: extractMessageContent(msg), // Use 'text' instead of 'content'
          time: new Date().toISOString() // Use ISO string format for time
        };
      });
  }

  /**
   * Get user email for conversation storage
   */
  private getUserEmail(): string {
    // For now, return a default. This could be enhanced to get actual user email
    return 'default@user.com';
  }
}

// Export singleton instance
export const kaggieAgentService = KaggieAgentService.getInstance();
