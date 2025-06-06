import { motion } from 'framer-motion';

interface PreparedMessage {
  id: string;
  text: string;
  category: string;
  icon: string;
}

interface PreparedMessagesProps {
  onSendMessage: (text: string) => void;
}

const PREPARED_MESSAGES: PreparedMessage[] = [
  {
    id: 'leaderboard-score',
    text: 'How can I achieve a high leaderboard score?',
    category: 'Strategy',
    icon: '🏆'
  },
  {
    id: 'advanced-techniques',
    text: 'What are the most advanced statistical techniques for this competition?',
    category: 'Techniques',
    icon: '📊'
  },
  {
    id: 'data-analysis',
    text: 'Help me analyze the dataset and find key patterns',
    category: 'Analysis',
    icon: '🔍'
  },
  {
    id: 'feature-engineering',
    text: 'What feature engineering techniques should I use?',
    category: 'Features',
    icon: '⚙️'
  },
  {
    id: 'model-selection',
    text: 'Which machine learning models work best for this type of problem?',
    category: 'Models',
    icon: '🤖'
  },
  {
    id: 'validation-strategy',
    text: 'What validation strategy should I use to avoid overfitting?',
    category: 'Validation',
    icon: '✅'
  }
];

export default function PreparedMessages({ onSendMessage }: PreparedMessagesProps) {
  const handleMessageClick = (message: PreparedMessage) => {
    onSendMessage(message.text);
  };

  return (
    <motion.div 
      className="flex flex-col items-center justify-center h-full text-center py-12 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header */}
      <motion.div 
        className="w-16 h-16 bg-bg-overlay rounded-full flex items-center justify-center mb-6"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
      >
        <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.681L3 21l2.681-5.094A8.959 8.959 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
        </svg>
      </motion.div>
      
      <motion.h3 
        className="text-adaptive-lg font-medium text-text-primary mb-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Ready to help with your competition
      </motion.h3>
      <motion.p 
        className="text-adaptive text-text-secondary/80 max-w-md mb-8"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        Get started quickly with these common questions, or ask anything about your Kaggle competition.
      </motion.p>

      {/* Prepared Messages Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-3xl px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        {PREPARED_MESSAGES.map((message, index) => (
          <motion.button
            key={message.id}
            onClick={() => handleMessageClick(message)}
            className="group relative p-4 bg-bg-secondary hover:bg-bg-overlay border border-border-subtle hover:border-primary/30 rounded-lg transition-all duration-200 text-left hover:shadow-md"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ 
              delay: 0.6 + (index * 0.1), 
              duration: 0.4, 
              ease: "easeOut" 
            }}
            whileHover={{ 
              scale: 1.02, 
              transition: { duration: 0.2 } 
            }}
            whileTap={{ 
              scale: 0.98, 
              transition: { duration: 0.1 } 
            }}
          >
            {/* Content */}
            <div className="flex items-start gap-3">
              <motion.span 
                className="text-xl flex-shrink-0 mt-0.5"
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ 
                  delay: 0.7 + (index * 0.1), 
                  duration: 0.3, 
                  ease: "easeOut" 
                }}
              >
                {message.icon}
              </motion.span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-primary/70 mb-1 uppercase tracking-wide">
                  {message.category}
                </div>
                <div className="text-sm text-text-primary group-hover:text-text-primary font-medium leading-snug">
                  {message.text}
                </div>
              </div>
            </div>
            
            {/* Hover effect indicator */}
            <div className="absolute inset-0 rounded-lg bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
          </motion.button>
        ))}
      </motion.div>

      {/* Hint text */}
      <motion.p 
        className="text-xs text-text-muted mt-6 max-w-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.4 }}
      >
        💡 Click any suggestion above to get started, or type your own question in the text area below
      </motion.p>
    </motion.div>
  );
}
