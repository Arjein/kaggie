import { useState, useRef, useEffect, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';

interface TextAreaProps {
  onSendMessage?: (messageText: string) => void;
  isLoading?: boolean;
  canSendMessage?: boolean; // Add this prop
  selectedCompetition?: { title: string } | null; // Add this prop
}

export default function TextArea({ onSendMessage, isLoading, canSendMessage = true, selectedCompetition }: TextAreaProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const minHeight = 40; 
    const maxHeight = 160; 

    useEffect(() => {
        console.log('TextArea: canSendMessage =', canSendMessage, 'isLoading =', isLoading, 'selectedCompetition =', selectedCompetition?.title);
    }, [canSendMessage, isLoading, selectedCompetition]);


    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            console.log('TextArea DOM: disabled =', textarea.disabled, 'canSendMessage =', canSendMessage);
        }
    }, [canSendMessage, isLoading]);
    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto'; 
            const currentScrollHeight = textarea.scrollHeight;
            let newHeight = Math.max(minHeight, currentScrollHeight);
            newHeight = Math.min(newHeight, maxHeight);
            textarea.style.height = `${newHeight}px`;
            textarea.style.overflowY = currentScrollHeight > maxHeight ? 'auto' : 'hidden';
        }
    }, [input]);

    const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isLoading || !canSendMessage) return;
        const trimmedInput = input.trim();
        if (!trimmedInput) return;

        if (onSendMessage) {
            onSendMessage(trimmedInput);
        }
        
        setInput(""); 

        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = `${minHeight}px`;
            textarea.style.overflowY = 'hidden';
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            if (isLoading || !canSendMessage) return;
            const form = e.currentTarget.closest('form');
            if (form) {
                form.requestSubmit();
            }
        }
    };

    const getPlaceholder = () => {
        if (!canSendMessage) {
            return "Select a competition to start chatting...";
        }
        if (selectedCompetition) {
            return `Ask about ${selectedCompetition.title}...`;
        }
        return "Type your message...";
    };

    return (
        <form className="mt-auto p-4" onSubmit={handleSubmit}>
            <div className="flex flex-col border border-border-subtle rounded-xl bg-bg-overlay shadow-sm">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="p-3 text-adaptive text-text-primary bg-transparent min-h-[40px] max-h-[160px] border-none focus:outline-none focus:ring-0 resize-none rounded-xl w-full placeholder-text-muted"
                    placeholder={getPlaceholder()}
                    rows={1}
                    style={{ height: `${minHeight}px` }}
                    disabled={!canSendMessage}
                />
                <div className="flex justify-end items-center px-3 pb-2">
                    
                    <button
                        type="submit"
                        aria-label="Send message"
                        className="p-1 rounded-lg text-primary hover:bg-secondary/20 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        disabled={isLoading || !input.trim() || !canSendMessage}
                    >
                        {isLoading ? (
                            <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}