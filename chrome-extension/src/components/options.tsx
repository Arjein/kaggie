import { useState, useEffect } from 'react';
import { globalConfig } from '../config/globalConfig';
import { useToast } from './ToastProvider';
import { useConfirmDialog } from './ConfirmDialog';
import { 
  validateOpenAIApiKey, 
  validateTavilyApiKey, 
  getValidationClasses,
  type ApiKeyValidationResult 
} from '../utils/apiKeyValidation';

export default function OptionsPage() {
  const { showToast } = useToast();
  const { showConfirm } = useConfirmDialog();
  const [openaiKey, setOpenaiKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // API key validation states
  const [openaiValidation, setOpenaiValidation] = useState<ApiKeyValidationResult>({
    isValid: false,
    type: 'empty'
  });
  const [tavilyValidation, setTavilyValidation] = useState<ApiKeyValidationResult>({
    isValid: true,
    type: 'empty'
  });

  useEffect(() => {
    // Load saved settings from global configuration
    const loadConfig = async () => {
      await globalConfig.initialize();
      const config = globalConfig.getConfig();
      
      setOpenaiKey(config.openaiApiKey || '');
      setTavilyKey(config.tavilyApiKey || ''); // Use hardcoded for now
      setBackendUrl(config.backendUrl);
      
      // Validate loaded keys
      if (config.openaiApiKey) {
        setOpenaiValidation(validateOpenAIApiKey(config.openaiApiKey));
      }
      if (config.tavilyApiKey) {
        setTavilyValidation(validateTavilyApiKey(config.tavilyApiKey));
      }
    };
    
    loadConfig();
  }, []);

  // Handle OpenAI API key changes with real-time validation
  const handleOpenaiKeyChange = (value: string) => {
    setOpenaiKey(value);
    setOpenaiValidation(validateOpenAIApiKey(value));
  };

  // Handle Tavily API key changes with real-time validation
  const handleTavilyKeyChange = (value: string) => {
    setTavilyKey(value);
    setTavilyValidation(validateTavilyApiKey(value));
  };

  const handleSave = async () => {
    // Validate OpenAI API key before saving
    if (!openaiValidation.isValid || openaiValidation.type === 'empty') {
      showToast('Please enter a valid OpenAI API key', 'warning');
      return;
    }

    // Validate Tavily API key if provided
    if (tavilyKey.trim() && !tavilyValidation.isValid) {
      showToast('Please enter a valid Tavily API key or leave it empty', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      // Import the agent service 
      const { kaggieAgentService } = await import('../services/kaggieAgentService');
      
      // Use the agent service to save keys and trigger reinitialization
      await kaggieAgentService.saveApiKeys(
        openaiKey.trim(),
        tavilyKey.trim(),
        backendUrl.trim()
      );
      
      // Force agent reinitialization with new keys
      await kaggieAgentService.initialize();
      
      setTimeout(() => {
        setIsLoading(false);
        showToast('Settings saved successfully! Agent has been reinitialized.', 'success');
      }, 800);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save settings. Please try again.';
      showToast(errorMessage, 'error');
    }
  };

  const clearHistory = async () => {
    const confirmed = await showConfirm({
      title: 'Clear Chat History',
      message: 'Are you sure you want to clear all chat history? This action cannot be undone.',
      confirmText: 'Clear History',
      cancelText: 'Cancel',
      variant: 'danger'
    });
    
    if (confirmed) {
      chrome.storage.local.clear(() => {
        showToast('History cleared!', 'success');
      });
    }
  };

  return (
    <div className="bg-bg-primary min-h-screen font-sans">
      {/* Header */}
      <div className="bg-bg-secondary shadow-sm border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary">Kaggie Settings</h1>
              <p className="text-sm text-text-muted">Configure your API keys</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* API Keys Card */}
        <div className="bg-bg-secondary rounded-xl shadow-sm border border-border-subtle overflow-hidden">
          <div className="px-6 py-4 border-b border-border-subtle bg-bg-overlay">
            <h2 className="text-base font-medium text-text-primary flex items-center">
              <svg className="w-4 h-4 text-primary mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m2-2a2 2 0 012-2M9 5a2 2 0 00-2 2m0 0a2 2 0 00-2 2m2-2a2 2 0 012-2m0 0a2 2 0 012 2m-6 0h6m-5 3h4" />
              </svg>
              API Configuration
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* OpenAI API Key */}
            <div>
              <label htmlFor="openaiKey" className="block text-sm font-medium text-text-primary mb-2">
                OpenAI API Key
                <span className="text-accent-error">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showOpenaiKey ? 'text' : 'password'}
                  id="openaiKey" 
                  value={openaiKey}
                  onChange={(e) => handleOpenaiKeyChange(e.target.value)}
                  placeholder="sk-proj-..." 
                  className={getValidationClasses(
                    openaiValidation,
                    "w-full px-4 py-3 border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 pr-10 bg-bg-overlay text-text-primary placeholder-text-muted"
                  )}
                />
                <button 
                  type="button" 
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                {/* Validation icon */}
                {openaiValidation.type !== 'empty' && (
                  <div className="absolute inset-y-0 right-10 flex items-center pr-2">
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
              <div className="mt-2">
                <p className="text-xs text-text-muted">
                  🔒 Required for all modes. 
                  <a href="https://platform.openai.com/api-keys" target="_blank" className="text-primary hover:text-primary-hover underline">Get your key</a>
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
              <label htmlFor="tavilyKey" className="block text-sm font-medium text-text-primary mb-2">
                Tavily API Key
                <span className="text-text-secondary">(Optional)</span>
              </label>
              <div className="relative">
                <input 
                  type={showTavilyKey ? 'text' : 'password'}
                  id="tavilyKey" 
                  value={tavilyKey}
                  onChange={(e) => handleTavilyKeyChange(e.target.value)}
                  placeholder="tvly-..." 
                  className={getValidationClasses(
                    tavilyValidation,
                    "w-full px-4 py-3 border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 pr-10 bg-bg-overlay text-text-primary placeholder-text-muted"
                  )}
                />
                <button 
                  type="button" 
                  onClick={() => setShowTavilyKey(!showTavilyKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
                {/* Validation icon */}
                {tavilyValidation.type !== 'empty' && (
                  <div className="absolute inset-y-0 right-10 flex items-center pr-2">
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
              <div className="mt-2">
                <p className="text-xs text-text-muted">
                  🔍 Enables web search capabilities. Leave empty to disable web search. 
                  <a href="https://tavily.com/" target="_blank" className="text-primary hover:text-primary-hover underline">Get your key</a>
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

            {/* Backend URL */}
            <div>
              <label htmlFor="backendUrl" className="block text-sm font-medium text-text-primary mb-2">
                Backend URL
                <span className="text-sm text-text-muted ml-1">(Optional)</span>
              </label>
              <input 
                type="url"
                id="backendUrl" 
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://kaggie-api.onrender.com" 
                className="w-full px-4 py-3 border border-border-subtle rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-colors duration-200 bg-bg-overlay text-text-primary placeholder-text-muted"
              />
              <p className="text-xs text-text-muted mt-2">
                🔗 URL for the Kaggie backend service (for RAG search and competition data)
              </p>
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              disabled={isLoading || !openaiValidation.isValid || openaiValidation.type === 'empty' || (tavilyKey.trim().length > 0 && !tavilyValidation.isValid)}
              className="w-full px-4 py-3 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex justify-center space-x-4 text-sm">
          <button 
            onClick={clearHistory}
            className="text-text-muted hover:text-accent-error transition-colors duration-200"
          >
            Clear History
          </button>
          <span className="text-text-muted">•</span>
          <span className="text-text-muted">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}