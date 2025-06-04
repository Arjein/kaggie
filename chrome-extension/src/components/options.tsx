import { useState, useEffect } from 'react';
import { globalConfig } from '../config/globalConfig';

export default function OptionsPage() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [tavilyKey, setTavilyKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('');
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Load saved settings from global configuration
    const loadConfig = async () => {
      await globalConfig.initialize();
      const config = globalConfig.getConfig();
      
      setOpenaiKey(config.openaiApiKey || '');
      setTavilyKey(config.tavilyApiKey || ''); // Use hardcoded for now
      setBackendUrl(config.backendUrl);
    };
    
    loadConfig();
  }, []);

  const handleSave = async () => {
    if (!openaiKey.trim()) {
      alert('Please enter your OpenAI API key');
      return;
    }

    if (!tavilyKey.trim()) {
      alert('Tavily API key is required for the enhanced Kaggie agent');
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
        alert('Settings saved successfully! Agent has been reinitialized.');
      }, 800);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setIsLoading(false);
      alert('Failed to save settings. Please try again.');
    }
  };

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      chrome.storage.local.clear(() => {
        alert('History cleared!');
      });
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Kaggie Settings</h1>
              <p className="text-sm text-gray-500">Configure your API keys</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* API Keys Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-base font-medium text-gray-900 flex items-center">
              <svg className="w-4 h-4 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m2-2a2 2 0 012-2M9 5a2 2 0 00-2 2m0 0a2 2 0 00-2 2m2-2a2 2 0 012-2m0 0a2 2 0 012 2m-6 0h6m-5 3h4" />
              </svg>
              API Configuration
            </h2>
          </div>
          <div className="p-6 space-y-6">
            {/* OpenAI API Key */}
            <div>
              <label htmlFor="openaiKey" className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showOpenaiKey ? 'text' : 'password'}
                  id="openaiKey" 
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-proj-..." 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                🔒 Required for all modes. 
                <a href="https://platform.openai.com/api-keys" target="_blank" className="text-blue-600 hover:text-blue-700 underline">Get your key</a>
              </p>
            </div>

            {/* Tavily API Key */}
            <div>
              <label htmlFor="tavilyKey" className="block text-sm font-medium text-gray-700 mb-2">
                Tavily API Key
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type={showTavilyKey ? 'text' : 'password'}
                  id="tavilyKey" 
                  value={tavilyKey}
                  onChange={(e) => setTavilyKey(e.target.value)}
                  placeholder="tvly-..." 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200 pr-10"
                />
                <button 
                  type="button" 
                  onClick={() => setShowTavilyKey(!showTavilyKey)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                🔍 Used for web search. 
                <a href="https://tavily.com/" target="_blank" className="text-blue-600 hover:text-blue-700 underline">Get your key</a>
              </p>
            </div>

            {/* Backend URL */}
            <div>
              <label htmlFor="backendUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Backend URL
                <span className="text-sm text-gray-500 ml-1">(Optional)</span>
              </label>
              <input 
                type="url"
                id="backendUrl" 
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://kaggie-api.onrender.com" 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              />
              <p className="text-xs text-gray-500 mt-2">
                🔗 URL for the Kaggie backend service (for RAG search and competition data)
              </p>
            </div>

            {/* Save Button */}
            <button 
              onClick={handleSave}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center"
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
            className="text-gray-500 hover:text-red-600 transition-colors duration-200"
          >
            Clear History
          </button>
          <span className="text-gray-300">•</span>
          <span className="text-gray-400">v0.1.0</span>
        </div>
      </div>
    </div>
  );
}