import SystemMessageItem from "./systemMessageItem";
import UserMessageItem from "./userMessageItem";
import { type Message } from "../types/message";
import { useEffect, useRef, useCallback } from 'react';

interface ChatAreaProps {
  messages: Message[];
}

export default function ChatArea({ messages }: ChatAreaProps) {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const lastMessageCountRef = useRef(0);
    const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Smooth scroll to bottom function optimized like ChatGPT
    const scrollToBottom = useCallback((smooth = false) => {
        const container = chatContainerRef.current;
        if (!container) return;
        
        // Use smooth scrolling for better UX, but instant for streaming
        const scrollBehavior = smooth ? 'smooth' : 'auto';
        
        // Ensure we're actually scrolling to the very bottom
        requestAnimationFrame(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: scrollBehavior
            });
        });
    }, []);

    // Check if user is at bottom (more generous threshold like ChatGPT)
    const isAtBottom = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return false;
        
        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight < 100; // ChatGPT-like threshold
    }, []);

    // Handle scroll events with immediate response like ChatGPT
    const handleScroll = useCallback(() => {
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // Immediate check for better responsiveness
        const currentlyAtBottom = isAtBottom();
        
        // Update auto-scroll state immediately for better UX
        shouldAutoScrollRef.current = currentlyAtBottom;
        
        // Debounce for performance optimization
        scrollTimeoutRef.current = setTimeout(() => {
            shouldAutoScrollRef.current = isAtBottom();
        }, 50); // Faster response than before
    }, [isAtBottom]);

    // Auto-scroll logic optimized like ChatGPT
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const messageCount = messages.length;
        const lastMessage = messages[messages.length - 1];
        const isNewMessage = messageCount > lastMessageCountRef.current;
        
        // Always scroll to bottom for new messages (like when user sends message or AI starts responding)
        if (isNewMessage) {
            shouldAutoScrollRef.current = true;
            scrollToBottom(false);
        }
        // For streaming updates, only scroll if user is still at bottom
        else if (lastMessage && shouldAutoScrollRef.current) {
            // Use requestAnimationFrame for smooth streaming scroll
            requestAnimationFrame(() => {
                if (shouldAutoScrollRef.current) {
                    scrollToBottom(false);
                }
            });
        }

        lastMessageCountRef.current = messageCount;
    }, [messages, scrollToBottom]);

    // Set up scroll listener with optimized event handling
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        // Add scroll listener with passive flag for better performance
        container.addEventListener('scroll', handleScroll, { passive: true });
        
        // Initial check to set correct auto-scroll state
        shouldAutoScrollRef.current = isAtBottom();
        
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [handleScroll, isAtBottom]);

    return (
        <div 
            ref={chatContainerRef}
            className='flex-1 flex flex-col space-y-3 rounded-xl py-6 px-0 overflow-y-auto'
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--color-border-subtle) transparent'
            }}
        >
            {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-16 h-16 bg-overlay rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.681L3 21l2.681-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
                        </svg>
                    </div>
                    <h3 className="text-adaptive-lg font-medium text-primary mb-2">Ready to help with your competition</h3>
                    <p className="text-adaptive text-secondary max-w-md">
                        Ask me anything about your Kaggle competition - from data analysis to model building strategies.
                    </p>
                </div>
            ) : (
                messages.map((message) =>
                  message.type === 'user' ? (
                      <UserMessageItem key={message.id} message={message} />
                  ) : (
                      <SystemMessageItem key={message.id} message={message} />
                  )
                )
            )}
        </div>
    );
}