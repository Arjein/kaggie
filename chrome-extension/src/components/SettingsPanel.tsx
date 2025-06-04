import { useState } from "react";
import { ApiKeysModal } from "./ApiKeysModal";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeysSave: () => Promise<void>;
  hasApiKeys: boolean;
}

export function SettingsPanel({ isOpen, onClose, onApiKeysSave, hasApiKeys }: SettingsPanelProps) {
  const [showApiKeysModal, setShowApiKeysModal] = useState(false);

  if (!isOpen) return null;

  const handleApiKeysClick = () => {
    setShowApiKeysModal(true);
  };

  const handleApiKeysSave = async () => {
    setShowApiKeysModal(false);
    await onApiKeysSave();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Settings Panel */}
      <div className="fixed top-0 right-0 h-full w-80 max-w-[90vw] settings-panel z-50 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-primary">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-overlay rounded-lg transition-colors"
            title="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* API Keys Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-adaptive font-medium text-primary">API Keys</h3>
            <div className={`w-2 h-2 rounded-full ${hasApiKeys ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
          <p className="text-adaptive-sm text-secondary mb-4">
            Configure your OpenAI and Tavily API keys for the assistant.
          </p>
          <button
            onClick={handleApiKeysClick}
            className="w-full p-3 bg-overlay hover:bg-secondary border border-subtle rounded-lg transition-colors text-adaptive"
          >
            {hasApiKeys ? 'Update API Keys' : 'Configure API Keys'}
          </button>
        </div>

        {/* Conversation Settings */}
        <div className="mb-6">
          <h3 className="text-adaptive font-medium text-primary mb-3">Conversation</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-adaptive-sm text-secondary">Auto-scroll to new messages</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-adaptive-sm text-secondary">Show typing indicators</span>
              <input type="checkbox" defaultChecked className="rounded" />
            </label>
          </div>
        </div>

        {/* Display Settings */}
        <div className="mb-6">
          <h3 className="text-adaptive font-medium text-primary mb-3">Display</h3>
          <div className="space-y-3">
            <label className="block">
              <span className="text-adaptive-sm text-secondary mb-2 block">Font Size</span>
              <select className="w-full p-2 bg-overlay border border-subtle rounded-lg text-adaptive-sm">
                <option value="small">Small</option>
                <option value="medium" selected>Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
        </div>

        {/* About Section */}
        <div className="border-t border-subtle pt-6 mt-6">
          <h3 className="text-adaptive font-medium text-primary mb-3">About</h3>
          <div className="text-adaptive-sm text-secondary space-y-2">
            <p>Kaggle Competition Assistant</p>
            <p>Version 1.0.0</p>
          </div>
        </div>
      </div>

      {/* API Keys Modal */}
      <ApiKeysModal
        isOpen={showApiKeysModal}
        onClose={() => setShowApiKeysModal(false)}
        onSave={handleApiKeysSave}
      />
    </>
  );
}
