import SystemMessageItem from "./systemMessageItem";
import UserMessageItem from "./userMessageItem";
import PreparedMessages from "./PreparedMessages";
import { motion, AnimatePresence } from 'framer-motion';
import { type Message } from "../types/message";
import { type Competition } from "../types/competition";
import { useEffect, useRef, useCallback, useMemo } from 'react';

interface ChatAreaProps {
  messages: Message[];
  onSendMessage?: (text: string) => void;
  selectedCompetition?: Competition | null;
}

export default function ChatArea({ messages, onSendMessage, selectedCompetition }: ChatAreaProps) {
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const lastMessageCountRef = useRef(0);
    const lastContentLengthRef = useRef(0);
    const scrollTimeoutRef = useRef<number | null>(null);
    const lastScrollTopRef = useRef(0);
    const userScrollDetectedRef = useRef(false);

    // Clean scroll to bottom - instant for streaming
    const scrollToBottom = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }, []);

    // Check if user is near bottom (ChatGPT-like threshold)
    const isNearBottom = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return false;
        
        const { scrollTop, scrollHeight, clientHeight } = container;
        return scrollHeight - scrollTop - clientHeight < 100;
    }, []);

    // Handle user scroll interaction with direction detection
    const handleScroll = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const currentScrollTop = container.scrollTop;
        const scrollDirection = currentScrollTop - lastScrollTopRef.current;
        
        // Clear existing timeout for debouncing
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }

        // If user scrolled up (negative direction) and we're auto-scrolling, stop it immediately
        if (scrollDirection < 0 && shouldAutoScrollRef.current) {
            shouldAutoScrollRef.current = false;
            userScrollDetectedRef.current = true;
        }
        // If user scrolled to near bottom, re-enable auto-scroll
        else if (isNearBottom()) {
            shouldAutoScrollRef.current = true;
            userScrollDetectedRef.current = false;
        }

        lastScrollTopRef.current = currentScrollTop;
        
        // Debounced final check for performance
        scrollTimeoutRef.current = window.setTimeout(() => {
            if (isNearBottom()) {
                shouldAutoScrollRef.current = true;
                userScrollDetectedRef.current = false;
            }
        }, 100);
    }, [isNearBottom]);

    // Track content length for streaming detection
    const currentContentLength = useMemo(() => {
        return messages.reduce((total, msg) => total + (msg.text?.length || 0), 0);
    }, [messages]);

    // Organic auto-scroll behavior with user scroll detection
    useEffect(() => {
        const messageCount = messages.length;
        const isNewMessage = messageCount > lastMessageCountRef.current;
        const isStreaming = currentContentLength > lastContentLengthRef.current && !isNewMessage;
        
        if (isNewMessage) {
            // New message: always scroll and enable auto-scroll, reset user interaction
            shouldAutoScrollRef.current = true;
            userScrollDetectedRef.current = false;
            scrollToBottom();
            
            // Reset scroll position tracking for new message
            const container = chatContainerRef.current;
            if (container) {
                lastScrollTopRef.current = container.scrollHeight;
            }
        } else if (isStreaming && shouldAutoScrollRef.current && !userScrollDetectedRef.current) {
            // Streaming: only auto-scroll if user hasn't scrolled up during this response
            scrollToBottom();
        }

        lastMessageCountRef.current = messageCount;
        lastContentLengthRef.current = currentContentLength;
    }, [messages, currentContentLength, scrollToBottom]);

    // Set up scroll listener with direction tracking
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        // Initialize scroll position tracking
        lastScrollTopRef.current = container.scrollTop;
        
        container.addEventListener('scroll', handleScroll, { passive: true });
        
        return () => {
            container.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [handleScroll]);

    return (
        <div 
            ref={chatContainerRef}
            className='flex-1 flex flex-col space-y-3 rounded-xl py-6 px-0 overflow-y-auto'
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--color-border-subtle) transparent'
            }}
        >
            <AnimatePresence mode="wait">
                {messages.length === 0 ? (
                    <motion.div
                        key="empty-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                    >
                        {onSendMessage && selectedCompetition ? (
                            <PreparedMessages onSendMessage={onSendMessage} />
                        ) : (
                            <motion.div 
                                className="flex flex-col items-center justify-center h-full text-center py-12"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                            >
                            
                                <motion.p 
                                    className="text-adaptive text-text-secondary/80 max-w-md"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                >
                                    {selectedCompetition 
                                        ? 'Ask me anything about your Kaggle competition - from data analysis to model building strategies.'
                                        : ''
                                    }
                                </motion.p>
                            </motion.div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="messages-state"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="contents"
                    >
                        {messages.map((message, index) => (
                            <motion.div
                                key={message.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ 
                                    delay: index * 0.05, 
                                    duration: 0.3,
                                    ease: "easeOut"
                                }}
                            >
                                {message.type === 'user' ? (
                                    <UserMessageItem message={message} />
                                ) : (
                                    <SystemMessageItem message={message} />
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}