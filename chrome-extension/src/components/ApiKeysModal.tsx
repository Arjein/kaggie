import { useState, useEffect } from 'react';
import { kaggieAgentService } from '../services/kaggieAgentService';
import { globalConfig } from '../config/globalConfig';

interface ApiKeysProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ApiKeysModal({ isOpen, onClose, onSave }: ApiKeysProps) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [tavilyApiKey, setTavilyApiKey] = useState('');
  const [backendUrl, setBackendUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load existing keys from global configuration
      const loadConfig = async () => {
        await globalConfig.initialize();
        const config = globalConfig.getConfig();
        
        setOpenaiApiKey(config.openaiApiKey || '') ;
        setTavilyApiKey(config.tavilyApiKey || ''); 
        setBackendUrl(config.backendUrl);
      };
      
      loadConfig();
    }
  }, [isOpen]);

  const handleSave = async () => {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4">Configure API Keys</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tavily API Key
            </label>
            <input
              type="password"
              value={tavilyApiKey}
              onChange={(e) => setTavilyApiKey(e.target.value)}
              placeholder="tvly-..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Backend URL
            </label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://kaggie-api.onrender.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">LangSmith Tracing (Optional)</h3>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!openaiApiKey || !tavilyApiKey}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
