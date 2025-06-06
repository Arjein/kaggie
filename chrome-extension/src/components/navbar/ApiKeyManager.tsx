import { 
  validateOpenAIApiKey, 
  validateTavilyApiKey, 
  getValidationClasses 
} from '../../utils/apiKeyValidation';

interface ApiKeyManagerProps {
  openaiApiKey: string
  tavilyApiKey: string
  showOpenAIKey: boolean
  showTavilyKey: boolean
  isSavingKeys: boolean
  onOpenaiApiKeyChange: (value: string) => void
  onTavilyApiKeyChange: (value: string) => void
  onToggleShowOpenAIKey: () => void
  onToggleShowTavilyKey: () => void
  onSaveApiKeys: () => Promise<void>
  hasApiKeys: boolean
}

export function ApiKeyManager({
  openaiApiKey,
  tavilyApiKey,
  showOpenAIKey,
  showTavilyKey,
  isSavingKeys,
  onOpenaiApiKeyChange,
  onTavilyApiKeyChange,
  onToggleShowOpenAIKey,
  onToggleShowTavilyKey,
  onSaveApiKeys,
  hasApiKeys
}: ApiKeyManagerProps) {
  // Compute validation states in real-time
  const openaiValidation = validateOpenAIApiKey(openaiApiKey);
  const tavilyValidation = validateTavilyApiKey(tavilyApiKey);

  return (
    <div className="bg-bg-secondary rounded-lg p-6 border border-border-subtle">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m2-2a2 2 0 012-2M9 5a2 2 0 00-2 2m0 0a2 2 0 00-2 2m2-2a2 2 0 012-2m0 0a2 2 0 012 2m-6 0h6m-5 3h4" />
          </svg>
          API Keys
        </h4>
        <div className={`w-3 h-3 rounded-full ${hasApiKeys ? 'bg-accent-success' : 'bg-accent-error'}`} />
      </div>
      <p className="text-text-secondary mb-6 text-sm">
        Configure your API keys for the assistant. OpenAI is required for chat functionality, 
        while Tavily enables web search capabilities (optional).
      </p>
      
      <div className="space-y-4">
        {/* OpenAI API Key */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            OpenAI API Key <span className="text-accent-error">*</span>
          </label>
          <div className="relative">
            <input
              type={showOpenAIKey ? 'text' : 'password'}
              value={openaiApiKey}
              onChange={(e) => onOpenaiApiKeyChange(e.target.value)}
              placeholder="sk-..."
              className={getValidationClasses(
                openaiValidation,
                "w-full px-3 py-2 bg-bg-overlay border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-primary text-sm pr-20"
              )}
            />
            <button
              type="button"
              onClick={onToggleShowOpenAIKey}
              className="absolute inset-y-0 right-10 pr-3 flex items-center text-text-secondary hover:text-text-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showOpenAIKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                {!showOpenAIKey && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
              </svg>
            </button>
            {/* Validation icon */}
            {openaiValidation.type !== 'empty' && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                {openaiValidation.type === 'valid' ? (
                  <svg className="w-4 h-4 text-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-accent-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-text-secondary mt-1">
              Required for all chat functionality. 
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover ml-1">Get your key</a>
            </p>
            {/* Validation message */}
            {openaiValidation.message && openaiValidation.type !== 'empty' && (
              <p className={`text-xs mt-1 ${
                openaiValidation.type === 'valid' ? 'text-accent-success' : 'text-accent-error'
              }`}>
                {openaiValidation.message}
              </p>
            )}
          </div>
        </div>

        {/* Tavily API Key */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Tavily API Key <span className="text-text-secondary">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type={showTavilyKey ? 'text' : 'password'}
              value={tavilyApiKey}
              onChange={(e) => onTavilyApiKeyChange(e.target.value)}
              placeholder="tvly-..."
              className={getValidationClasses(
                tavilyValidation,
                "w-full px-3 py-2 bg-bg-overlay border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-text-primary text-sm pr-20"
              )}
            />
            <button
              type="button"
              onClick={onToggleShowTavilyKey}
              className="absolute inset-y-0 right-10 pr-3 flex items-center text-text-secondary hover:text-text-primary"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showTavilyKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                {!showTavilyKey && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
              </svg>
            </button>
            {/* Validation icon */}
            {tavilyValidation.type !== 'empty' && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                {tavilyValidation.type === 'valid' ? (
                  <svg className="w-4 h-4 text-accent-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-accent-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-text-secondary mt-1">
              Enables web search capabilities. Leave empty to disable web search.
              <a href="https://tavily.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-hover ml-1">Get your key</a>
            </p>
            {/* Validation message */}
            {tavilyValidation.message && tavilyValidation.type !== 'empty' && (
              <p className={`text-xs mt-1 ${
                tavilyValidation.type === 'valid' ? 'text-accent-success' : 'text-accent-error'
              }`}>
                {tavilyValidation.message}
              </p>
            )}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={onSaveApiKeys}
          disabled={isSavingKeys || !openaiValidation.isValid || openaiValidation.type === 'empty' || (tavilyApiKey.trim().length > 0 && !tavilyValidation.isValid)}
          className="w-full p-3 bg-primary hover:bg-primary-hover disabled:bg-bg-overlay disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
        >
          {isSavingKeys ? 'Saving...' : 'Save API Keys'}
        </button>
      </div>
    </div>
  );
}
