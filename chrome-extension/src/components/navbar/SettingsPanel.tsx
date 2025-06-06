import { motion, AnimatePresence } from 'framer-motion'
import { type Competition } from '../../types/competition'
import { ANIMATION_CONFIG } from './animations'
import { ApiKeyManager } from './ApiKeyManager'

interface SettingsPanelProps {
  isOpen: boolean
  selectedCompetition: Competition | null
  openaiApiKey: string
  tavilyApiKey: string
  showOpenAIKey: boolean
  showTavilyKey: boolean
  isSavingKeys: boolean
  isClearing: boolean
  hasApiKeys: boolean
  onClose: () => void
  onOpenaiApiKeyChange: (value: string) => void
  onTavilyApiKeyChange: (value: string) => void
  onToggleShowOpenAIKey: () => void
  onToggleShowTavilyKey: () => void
  onSaveApiKeys: () => Promise<void>
  onClearHistory: () => Promise<void>
  onResetAll: () => Promise<void>
}

export function SettingsPanel({
  isOpen,
  selectedCompetition,
  openaiApiKey,
  tavilyApiKey,
  showOpenAIKey,
  showTavilyKey,
  isSavingKeys,
  isClearing,
  hasApiKeys,
  onClose,
  onOpenaiApiKeyChange,
  onTavilyApiKeyChange,
  onToggleShowOpenAIKey,
  onToggleShowTavilyKey,
  onSaveApiKeys,
  onClearHistory,
  onResetAll
}: SettingsPanelProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={onClose}
            {...ANIMATION_CONFIG.backdrop}
          />
          
          <motion.div 
            className="fixed inset-0 z-50 bg-bg-overlay border border-border-subtle shadow-2xl overflow-hidden"
            {...ANIMATION_CONFIG.container}
          >
            <motion.div 
              className="flex flex-col h-full"
              {...ANIMATION_CONFIG.content}
            >
              <div className="flex-shrink-0 p-4 border-b border-border-subtle bg-bg-secondary">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-text-primary flex items-center gap-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </h3>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-bg-overlay rounded-lg transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* API Keys Section */}
                <ApiKeyManager
                  openaiApiKey={openaiApiKey}
                  tavilyApiKey={tavilyApiKey}
                  showOpenAIKey={showOpenAIKey}
                  showTavilyKey={showTavilyKey}
                  isSavingKeys={isSavingKeys}
                  onOpenaiApiKeyChange={onOpenaiApiKeyChange}
                  onTavilyApiKeyChange={onTavilyApiKeyChange}
                  onToggleShowOpenAIKey={onToggleShowOpenAIKey}
                  onToggleShowTavilyKey={onToggleShowTavilyKey}
                  onSaveApiKeys={onSaveApiKeys}
                  hasApiKeys={hasApiKeys}
                />

                {/* Kaggle Service Information */}
                <div className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
                  <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Kaggle Service Information
                  </h4>
                  <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-secondary">Backend Status:</span>
                        <p className="text-text-primary font-medium">Connected</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Service Version:</span>
                        <p className="text-text-primary font-medium">v1.0.0</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Active Competition:</span>
                        <p className="text-text-primary font-medium">
                          {selectedCompetition?.title || 'None selected'}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Agent Model:</span>
                        <p className="text-text-primary font-medium">GPT-4o-mini</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-border-subtle">
                      <span className="text-text-secondary">Backend URL:</span>
                      <p className="text-text-primary font-medium text-xs bg-bg-overlay px-2 py-1 rounded mt-1">
                        https://kaggie-api.onrender.com
                      </p>
                    </div>
                  </div>
                </div>

                {/* Privacy & Data Management */}
                <div className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
                  <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Privacy & Data Management
                  </h4>
                  <div className="space-y-4">
                    <p className="text-text-secondary text-sm">
                      Clear all stored conversation history, cached data, and reset the extension to its initial state.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={onClearHistory}
                        disabled={isClearing}
                        className="flex-1 p-3 bg-accent-warning hover:bg-accent-warning/80 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                      >
                        {isClearing ? 'Clearing...' : 'Clear Current Conversation'}
                      </button>
                      <button
                        onClick={onResetAll}
                        className="flex-1 p-3 bg-accent-error hover:bg-accent-error/80 text-white rounded-lg transition-colors font-medium"
                      >
                        Reset All Data
                      </button>
                    </div>
                    <p className="text-xs text-text-muted">
                      ⚠️ Reset All Data will permanently delete all conversations, settings, and API keys. This action cannot be undone.
                    </p>
                  </div>
                </div>

                {/* About Section */}
                <div className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
                  <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <img src="/kaggie.png" alt="Kaggie" className="w-5 h-5 rounded" />
                    About Kaggie
                  </h4>
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-text-secondary">Extension Version:</span>
                        <p className="text-text-primary font-medium">1.0.0</p>
                      </div>
                      <div>
                        <span className="text-text-secondary">Build:</span>
                        <p className="text-text-primary font-medium">Production</p>
                      </div>
                    </div>
                    <p className="text-text-secondary">
                      Kaggie is your intelligent assistant for Kaggle competitions. Get insights, ask questions, 
                      and explore datasets with the power of AI.
                    </p>
                    <div className="flex gap-3 pt-2">
                      <a
                        href="https://github.com/arjein/kaggie"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover text-xs"
                      >
                        GitHub Repository
                      </a>
                      <span className="text-text-muted">•</span>
                      <a
                        href="https://github.com/arjein/kaggie#readme"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary-hover text-xs"
                      >
                        Documentation
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
