import { useState } from 'react';

interface ConversationControlsProps {
  isWaiting?: boolean;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

export function ConversationControls({ 
  isWaiting = false, 
  onBookmark, 
  isBookmarked = false
}: ConversationControlsProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex items-center gap-2">
      {/* Conversation State Indicator */}
      <div className={`conversation-indicator ${isWaiting ? 'thinking' : ''}`}>
        <div className="flex items-center gap-2 text-adaptive-sm text-text-muted">
          {isWaiting ? (
            <>
              <span className="w-2 h-2 rounded-full bg-accent-warning animate-pulse" />
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-accent-success" />
              <span>Ready</span>
            </>
          )}
        </div>
      </div>

      {/* Bookmark Star */}
      {onBookmark && (
        <div className="relative">
          <button
            onClick={onBookmark}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={`bookmark-star p-1 rounded transition-all ${isBookmarked ? 'bookmarked' : ''}`}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark conversation'}
          >
            <svg 
              className="w-4 h-4" 
              fill={isBookmarked ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" 
              />
            </svg>
          </button>
          
          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-bg-modal text-text-primary text-xs px-2 py-1 rounded whitespace-nowrap z-60 border border-border-subtle">
              {isBookmarked ? 'Remove bookmark' : 'Bookmark conversation'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface BreadcrumbsProps {
  selectedCompetition?: {
    title: string;
    url: string;
  } | null;
  conversationLength?: number;
}

export function Breadcrumbs({ selectedCompetition, conversationLength = 0 }: BreadcrumbsProps) {
  if (!selectedCompetition) return null;

  return (
    <div className="flex items-center gap-2 text-adaptive-sm text-text-muted px-4 py-2 border-b border-border-subtle">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-truncate-adaptive font-medium">
        {selectedCompetition.title}
      </span>
      {conversationLength > 0 && (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span>{conversationLength} messages</span>
        </>
      )}
    </div>
  );
}
