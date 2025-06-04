import { useState, useEffect, useCallback } from 'react';

// Define the expected storage result type
interface StorageResult {
  openaiApiKey?: string;
  tavilyApiKey?: string;
}

export function useApiKeys() {
  const [hasApiKeys, setHasApiKeys] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkApiKeys = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Check if chrome and chrome.storage are available
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.sync) {
        console.error('useApiKeys: Chrome storage not available');
        setHasApiKeys(false);
        setIsLoading(false);
        return;
      }

      const result = await new Promise<StorageResult>((resolve, reject) => {
        try {
          chrome.storage.sync.get(['openaiApiKey', 'tavilyApiKey'], (result) => {
            // Check for Chrome runtime errors
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            resolve(result as StorageResult);
          });
        } catch (error) {
          reject(error);
        }
      });
      
      const hasKeys = !!(result.openaiApiKey && result.tavilyApiKey);
      console.log('useApiKeys: Chrome storage check result:', { 
        hasOpenAI: !!result.openaiApiKey, 
        hasTavily: !!result.tavilyApiKey,
        hasKeys 
      });
      setHasApiKeys(hasKeys);
    } catch (error) {
      console.error('Error checking API keys:', error);
      setHasApiKeys(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkApiKeys();
  }, [checkApiKeys]);

  const refresh = useCallback(() => {
    checkApiKeys();
  }, [checkApiKeys]);

  return { hasApiKeys, isLoading, refresh };
}