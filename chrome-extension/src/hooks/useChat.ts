import { useState, useEffect, useCallback, useRef } from "react";
import { type Message } from "../types/message";
import { type Competition } from "../types/competition";
import { kagglerAgentService } from "../services/kagglerAgentService";
import { BackgroundService } from "../services/backgroundService";
import {
  createUserMessage,
  createPlaceholderSystemMessage,
  updateMessageContent,
  updateMessageStatus,
  clearMessageStatus,
  setMessageError
} from "../utils/messageUtils";
import { updateCurrentThreadId, getUserEmail, globalConfig, getLastSelectedCompetition, updateLastSelectedCompetition } from "../config/globalConfig";
import { storageService } from "../services/storageService";
import { threadMappingService } from "../services/threadMappingService";

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  // Remove unused state
  // const [nextId, setNextId] = useState(1);
  const [isWaitingForSystemResponse, setIsWaitingForSystemResponse] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  
  // Use refs to avoid stale closures and infinite loops
  const selectedCompetitionRef = useRef<Competition | null>(null);
  const currentThreadIdRef = useRef<string | null>(null);
  const messagesRef = useRef<Message[]>([]);
  
  // Debounce streaming saves to prevent excessive storage operations
  const streamingSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  
  // Update refs when state changes
  useEffect(() => {
    selectedCompetitionRef.current = selectedCompetition;
  }, [selectedCompetition]);
  
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Initialize storage service on mount
  // Initialize storage service on mount and load current thread
  useEffect(() => {
    const initStorageAndLoadThread = async () => {
      try {
        // First ensure global config is initialized
        await globalConfig.initialize();
        console.log('Chat: Global config initialized');
        
        // Initialize thread mapping service
        await threadMappingService.initialize();
        console.log('Chat: Thread mapping service initialized');
        
        // Then initialize storage service
        await storageService.initialize();
        console.log('Chat: Storage service initialized');
        
        // Try to restore the current thread from global config
        const config = globalConfig.getConfig();
        console.log('Chat: Current config:', {
          currentThreadId: config.currentThreadId,
          userEmail: config.userEmail,
          lastSelectedCompetition: config.lastSelectedCompetition
        });
        
        // Try to restore last selected competition first
        const lastCompetition = getLastSelectedCompetition();
        if (lastCompetition) {
          console.log('Chat: Found last selected competition:', lastCompetition.id);
          
          // Set the competition without triggering handleCompetitionChange yet
          setSelectedCompetition(lastCompetition);
          
          // Get or create thread for this competition
          const userEmail = getUserEmail() || 'anonymous';
          let threadId = threadMappingService.getThreadId(lastCompetition.id);
          
          if (!threadId) {
            // Generate new thread for this competition
            threadId = await threadMappingService.generateNewThreadId(lastCompetition.id, userEmail);
            console.log(`Chat: Generated new thread ID for last competition ${lastCompetition.id}: ${threadId}`);
          } else {
            console.log(`Chat: Using existing thread ID for last competition ${lastCompetition.id}: ${threadId}`);
          }
          
          // Update global config and local state
          await updateCurrentThreadId(threadId);
          setCurrentThreadId(threadId);
          
          // Load messages for this thread
          const savedMessages = await storageService.getMessages(threadId);
          if (savedMessages.length > 0) {
            setMessages(savedMessages);
            console.log(`Chat: Restored ${savedMessages.length} messages for last competition ${lastCompetition.id}`);
          }
        } else if (config.currentThreadId) {
          console.log('Chat: Found current thread ID in config:', config.currentThreadId);
          
          // Load messages for the current thread
          const savedMessages = await storageService.getMessages(config.currentThreadId);
          console.log(`Chat: Found ${savedMessages.length} saved messages for thread ${config.currentThreadId}`);
          
          if (savedMessages.length > 0) {
            setMessages(savedMessages);
            setCurrentThreadId(config.currentThreadId);
            
            // Extract competition ID from thread ID to find the competition
            // Pattern: thread_email_competitionId_timestamp OR thread_email_competitionId
            const threadParts = config.currentThreadId.split('_');
            if (threadParts.length >= 3) {
              // For timestamp-based threads: thread_email_competitionId_timestamp
              // For legacy threads: thread_email_competitionId
              let competitionId: string;
              if (threadParts.length >= 4 && !isNaN(Number(threadParts[threadParts.length - 1]))) {
                // Has timestamp, competition ID is everything except first 2 and last part
                competitionId = threadParts.slice(2, -1).join('_');
              } else {
                // No timestamp, competition ID is everything after first 2 parts
                competitionId = threadParts.slice(2).join('_');
              }
              
              console.log('Chat: Extracted competition ID from thread:', competitionId);
              setSelectedCompetition({ id: competitionId, title: `Competition ${competitionId}`, url: '' });
            }
            
            console.log(`Chat: Restored ${savedMessages.length} messages for thread ${config.currentThreadId}`);
          } else {
            console.log('Chat: No saved messages found for current thread');
          }
        } else {
          console.log('Chat: No current thread ID found in config');
        }
      } catch (error) {
        console.error('Chat: Failed to initialize and restore thread:', error);
      }
    };
    
    initStorageAndLoadThread();
  }, []); // Empty dependency array - only run once


  // Calculate next message ID based on current messages
  const getNextId = useCallback(() => {
    if (messages.length === 0) return 1;
    const maxId = Math.max(...messages.map(m => m.id));
    return maxId + 1;
  }, [messages]);

  // Handle competition change (both manual and automatic)
  const handleCompetitionChange = useCallback(async (competition: Competition | null) => {
    try {
      console.log('Chat: Competition changed to:', competition?.id || 'none');
      
      // Use refs to get current values without causing dependency issues
      const currentThread = currentThreadIdRef.current;
      const currentMessages = messagesRef.current;
      const prevCompetition = selectedCompetitionRef.current;
      
      // Avoid unnecessary changes
      if (prevCompetition?.id === competition?.id) {
        console.log('Chat: Same competition selected, skipping change');
        return;
      }
      
      // Save current messages before switching (if we have a current thread)
      if (currentThread && currentMessages.length > 0) {
        console.log(`Chat: Saving ${currentMessages.length} messages for thread ${currentThread}`);
        await storageService.updateMessages(
          currentThread, 
          currentMessages, 
          prevCompetition?.id || null,
          getUserEmail()
        );
      }

      setSelectedCompetition(competition);
      
      // Save the selected competition to global config for auto-restore
      await updateLastSelectedCompetition(competition);

      if (competition) {
        const userEmail = getUserEmail() || 'anonymous';
        
        // Check if we already have a thread ID mapped for this competition
        let threadId = threadMappingService.getThreadId(competition.id);
        
        if (!threadId) {
          // No existing thread for this competition, generate a new one
          threadId = await threadMappingService.generateNewThreadId(competition.id, userEmail);
          console.log(`Chat: Generated new thread ID for competition ${competition.id}: ${threadId}`);
        } else {
          console.log(`Chat: Using existing thread ID for competition ${competition.id}: ${threadId}`);
        }
        
        // Update global config with thread ID
        await updateCurrentThreadId(threadId);
        setCurrentThreadId(threadId);
        
        // Load saved messages for this thread
        console.log(`Chat: Loading messages for thread ${threadId}`);
        const savedMessages = await storageService.getMessages(threadId);
        
        setMessages(savedMessages);
        console.log(`Chat: Loaded ${savedMessages.length} messages for competition ${competition.id}`);
        
      } else {
        // No competition selected - clear everything
        setCurrentThreadId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Chat: Failed to change competition:', error);
      setCurrentThreadId(null);
      setMessages([]);
    }
  }, []); // Empty dependencies - use refs instead

  // Auto-save messages with better debouncing (fallback for user messages and edge cases)
  useEffect(() => {
    const saveMessages = async () => {
      const currentThread = currentThreadIdRef.current;
      const currentMessages = messagesRef.current;
      const competition = selectedCompetitionRef.current;
      
      if (currentThread && currentMessages.length > 0) {
        try {
          await storageService.updateMessages(
            currentThread,
            currentMessages,
            competition?.id || null,
            getUserEmail()
          );
          console.log(`Chat: Auto-saved ${currentMessages.length} messages for thread ${currentThread} (fallback)`);
        } catch (error) {
          console.error('Chat: Error auto-saving messages:', error);
        }
      }
    };

    // Only save if we have messages and not currently waiting for response or streaming
    // This serves as a fallback for user messages and other edge cases since agent responses are saved immediately
    if (messages.length > 0 && !isWaitingForSystemResponse && !isStreaming) {
      const timeoutId = setTimeout(saveMessages, 2000); // Keep debounce for fallback saves
      return () => clearTimeout(timeoutId);
    }
  }, [messages.length, isWaitingForSystemResponse, isStreaming]);

  // Subscribe to background service URL detection - DISABLED AUTO-SWITCHING
  useEffect(() => {
    let mounted = true;
    
    // Start the background service for URL tracking (notifications only)
    BackgroundService.startListening();

    // Subscribe to competition changes from URL detection
    const unsubscribe = BackgroundService.subscribe((detectedCompetition) => {
      if (!mounted) return;
      
      console.log('Chat: URL-detected competition (notification only):', detectedCompetition?.id || 'none');
      
      // DO NOT auto-switch competitions - URL detection is only for notifications
      // Users must manually select competitions via the dropdown
    });

    // Cleanup on unmount
    return () => {
      mounted = false;
      unsubscribe();
      BackgroundService.stopListening();
    };
  }, []);

  // Manual competition setter (for dropdown selection)
  const setSelectedCompetitionManually = useCallback(async (competition: Competition | null) => {
    console.log('Chat: Manual competition selection:', competition?.id || 'none');
    
    try {
      // Notify service worker of manual change
      await BackgroundService.setManualCompetition(competition);
      
      // Update local state
      await handleCompetitionChange(competition);
    } catch (error) {
      console.error('Chat: Error in manual competition selection:', error);
    }
  }, [handleCompetitionChange]);

  const handleSendMessage = useCallback(async (text: string) => {
    // Require a competition to be selected
    if (!currentThreadId || !selectedCompetition) {
      console.warn('No competition selected. Cannot send message.');
      return;
    }
    
    setIsWaitingForSystemResponse(true);
    setIsStreaming(false); // Ensure streaming state is clear when starting new message

    // Create and add user message immediately
    const userMessageId = getNextId();
    const newUserMessage = createUserMessage(userMessageId, text);
    
    // Add user message to state
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    
    // Create placeholder system message for streaming
    const systemMessageId = userMessageId + 1;
    const placeholderSystemMessage = createPlaceholderSystemMessage(systemMessageId);
    
    // Add placeholder system message
    setMessages(prevMessages => [...prevMessages, placeholderSystemMessage]);
    
    try {
      await kagglerAgentService.sendMessage(
        text,
        selectedCompetition,
        currentThreadId,
        // onStatusUpdate
        async (status: string) => {
          setMessages(prevMessages => 
            updateMessageStatus(prevMessages, systemMessageId, status)
          );
        },
        // onContentUpdate
        async (content: string) => {
          setIsStreaming(true); // Mark as streaming when content updates start
          setMessages(prevMessages => {
            const updatedMessages = updateMessageContent(prevMessages, systemMessageId, content);
            
            // Debounced save during streaming to prevent data loss on refresh
            const currentThread = currentThreadIdRef.current;
            const competition = selectedCompetitionRef.current;
            
            if (currentThread && updatedMessages.length > 0) {
              // Clear existing timeout and set new one (debounce)
              if (streamingSaveTimeoutRef.current) {
                clearTimeout(streamingSaveTimeoutRef.current);
              }
              
              streamingSaveTimeoutRef.current = setTimeout(async () => {
                try {
                  await storageService.updateMessages(
                    currentThread,
                    updatedMessages,
                    competition?.id || null,
                    getUserEmail()
                  );
                  console.log(`Chat: Saved ${updatedMessages.length} messages during streaming (debounced)`);
                } catch (error) {
                  console.error('Chat: Error saving conversation during streaming:', error);
                }
                streamingSaveTimeoutRef.current = null;
              }, 500); // 500ms debounce to avoid excessive saves
            }
            
            return updatedMessages;
          });
        },
        // onComplete
        async () => {
          setIsStreaming(false); // Clear streaming state when complete
          
          // Clear any pending streaming save to avoid duplicate saves
          if (streamingSaveTimeoutRef.current) {
            clearTimeout(streamingSaveTimeoutRef.current);
            streamingSaveTimeoutRef.current = null;
          }
          
          setMessages(prevMessages => {
            const updatedMessages = clearMessageStatus(prevMessages, systemMessageId);
            
            // Final save after agent response completes (in case incremental saves missed anything)
            const currentThread = currentThreadIdRef.current;
            const competition = selectedCompetitionRef.current;
            
            if (currentThread && updatedMessages.length > 0) {
              // Use setTimeout to ensure state update is processed first
              setTimeout(async () => {
                try {
                  await storageService.updateMessages(
                    currentThread,
                    updatedMessages,
                    competition?.id || null,
                    getUserEmail()
                  );
                  console.log(`Chat: Final save completed - ${updatedMessages.length} messages after agent response`);
                } catch (error) {
                  console.error('Chat: Error in final save after completion:', error);
                }
              }, 0);
            }
            
            return updatedMessages;
          });
          console.log('Chat: Message completed, final conversation save triggered');
        },
        // onError
        async (errorMessage: string) => {
          setIsStreaming(false); // Clear streaming state on error
          setMessages(prevMessages => 
            setMessageError(prevMessages, systemMessageId, errorMessage)
          );
        }
      );
    } catch (error) {
      console.error('Chat: Error sending message:', error);
    } finally {
      setIsWaitingForSystemResponse(false);
    }
  }, [currentThreadId, selectedCompetition, getNextId]);

  


  const getStorageStats = useCallback(() => {
    return storageService.getStats();
  }, []);

  

  //console.log(`Can send a Message: ${!!currentThreadId && !!selectedCompetition}`);
  
    // Add this temporary debugging function
  const debugStorage = useCallback(async () => {
    console.log('=== STORAGE DEBUG ===');
    
    // Check Chrome storage directly
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['conversations'], (result) => {
        console.log('Direct Chrome storage check:', result);
      });
    }
    
    // Check storage service
    const stats = storageService.getStats();
    console.log('Storage service stats:', stats);
    
    // Check thread mapping service
    const mappingStats = threadMappingService.getStats();
    const allMappings = threadMappingService.getAllMappings();
    console.log('Thread mapping stats:', mappingStats);
    console.log('Thread mappings:', allMappings);
    
    // Check global config
    const config = globalConfig.getConfig();
    console.log('Global config:', config);
    
    console.log('=== END STORAGE DEBUG ===');
  }, []);
  // Helper function to clear current conversation
  const clearCurrentConversation = useCallback(async () => {
    if (currentThreadId && selectedCompetition) {
      try {
        // Clear conversation from storage
        await storageService.deleteThread(currentThreadId);
        
        // Clear agent memory for this thread
        const { persistentMemorySaver } = await import('../utils/persistentMemorySaver');
        await persistentMemorySaver.clearThread(currentThreadId);
        
        // 🔑 GENERATE NEW THREAD ID WITH TIMESTAMP TO RESET LANGGRAPH MEMORY
        const userEmail = getUserEmail() || 'anonymous';
        const newThreadId = await threadMappingService.generateNewThreadId(selectedCompetition.id, userEmail);
        
        console.log(`Chat: Generated new thread ID to reset LangGraph memory: ${newThreadId}`);
        
        // Update global config with new thread ID
        await updateCurrentThreadId(newThreadId);
        setCurrentThreadId(newThreadId);
        
        // Clear UI messages
        setMessages([]);
        
        console.log(`Chat: Successfully cleared conversation and created new thread: ${newThreadId}`);
        console.log('Chat: LangGraph will now start with completely fresh memory for this new thread');
        
        return true;
      } catch (error) {
        console.error('Chat: Error clearing conversation:', error);
        return false;
      }
    }
    return false;
  }, [currentThreadId, selectedCompetition]);

  return {
    messages,
    isWaitingForSystemResponse,
    selectedCompetition,
    setSelectedCompetition: setSelectedCompetitionManually,
    handleSendMessage,
    currentThreadId,
    clearCurrentConversation, // Make sure this is exported
    getStorageStats,
    canSendMessage: !!currentThreadId && !!selectedCompetition,
    debugStorage, // Remove this after debugging
  };
    
}


