import { useState, useEffect } from 'react';
import { kaggieAgentService } from '../services/kaggieAgentService';
import { globalConfig } from '../config/globalConfig';
import { 
  validateOpenAIApiKey, 
  validateTavilyApiKey, 
  getValidationClasses,
  type ApiKeyValidationResult 
} from '../utils/apiKeyValidation';

interface ApiKeysProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ApiKeysModal({ isOpen, onClose, onSave }: ApiKeysProps) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  
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
    if (isOpen) {
      // Load existing keys from global configuration
      const loadConfig = async () => {
        await globalConfig.initialize();
        const config = globalConfig.getConfig();
        
        setOpenaiApiKey(config.openaiApiKey || '');
        setTavilyApiKey(config.tavilyApiKey || ''); 
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
    }
  }, [isOpen]);

  // Handle OpenAI API key changes with real-time validation
  const handleOpenaiKeyChange = (value: string) => {
    setOpenaiApiKey(value);
    setOpenaiValidation(validateOpenAIApiKey(value));
  };

  // Handle Tavily API key changes with real-time validation
  const handleTavilyKeyChange = (value: string) => {
    setTavilyApiKey(value);
    setTavilyValidation(validateTavilyApiKey(value));
  };

  const handleSave = async () => {
    // Validate OpenAI API key before saving
    if (!openaiValidation.isValid || openaiValidation.type === 'empty') {
      return; // Don't save if invalid
    }

    // Validate Tavily API key if provided
    if (tavilyApiKey.trim() && !tavilyValidation.isValid) {
      return; // Don't save if invalid
    }

    try {
      // Save the API keys using the agent service
      await kaggieAgentService.saveApiKeys(openaiApiKey, tavilyApiKey, backendUrl);
      
      // Force agent reinitialization with new keys
      await kaggieAgentService.initialize();
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-bg-modal/75 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-lg p-6 w-full max-w-md mx-4 border border-border-subtle">
        <h2 className="text-xl font-bold mb-4 text-text-primary">Configure API Keys</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={openaiApiKey}
                onChange={(e) => handleOpenaiKeyChange(e.target.value)}
                placeholder="sk-..."
                className={getValidationClasses(
                  openaiValidation,
                  "w-full px-3 py-2 border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-bg-overlay text-text-primary placeholder-text-muted pr-8"
                )}
              />
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
            {/* Validation message */}
            {openaiValidation.message && openaiValidation.type !== 'empty' && (
              <p className={`text-xs mt-1 ${
                openaiValidation.type === 'valid' ? 'text-accent-success' : 'text-accent-error'
              }`}>
                {openaiValidation.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Tavily API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={tavilyApiKey}
                onChange={(e) => handleTavilyKeyChange(e.target.value)}
                placeholder="tvly-..."
                className={getValidationClasses(
                  tavilyValidation,
                  "w-full px-3 py-2 border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-bg-overlay text-text-primary placeholder-text-muted pr-8"
                )}
              />
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
            {/* Validation message */}
            {tavilyValidation.message && tavilyValidation.type !== 'empty' && (
              <p className={`text-xs mt-1 ${
                tavilyValidation.type === 'valid' ? 'text-accent-success' : 'text-accent-error'
              }`}>
                {tavilyValidation.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Backend URL
            </label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://kaggie-api.onrender.com"
              className="w-full px-3 py-2 border border-border-subtle rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-bg-overlay text-text-primary placeholder-text-muted"
            />
          </div>

          <div className="border-t border-border-subtle pt-4 mt-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">LangSmith Tracing (Optional)</h3>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-bg-overlay text-text-primary py-2 px-4 rounded-md hover:bg-bg-secondary border border-border-subtle"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!openaiValidation.isValid || openaiValidation.type === 'empty' || (tavilyApiKey.trim().length > 0 && !tavilyValidation.isValid)}
            className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-hover disabled:bg-primary/50 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
