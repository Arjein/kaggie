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
      className="flex flex-col items-center justify-end h-full text-center pb-1 max-w-4xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {/* Header */}

      
      <motion.h3 
        className="text-adaptive-lg font-medium text-primary mb-12"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Ready to help with your competition
      </motion.h3>

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
