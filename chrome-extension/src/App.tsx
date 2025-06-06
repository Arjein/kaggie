import ChatArea from "./components/chatArea";
import TextArea from "./components/textArea";
import Navbar from "./components/navbar";
import { useChat } from "./hooks/useChat";
import { useApiKeys } from "./hooks/useApiKeys";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useEffect } from "react";



function App() {
    const { hasApiKeys, isLoading: apiKeysLoading, refresh: refreshApiKeys } = useApiKeys();
    const {
        messages,
        isWaitingForSystemResponse,
        selectedCompetition,
        setSelectedCompetition,
        handleSendMessage,
        canSendMessage,
        clearCurrentConversation,
    } = useChat();

    // Listen for Chrome storage changes to refresh API keys status
    useEffect(() => {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
                // Only refresh if OpenAI API key changes in sync storage
                if (namespace === 'sync' && (changes.openaiApiKey || changes.tavilyApiKey)) {
                    console.log('API keys changed in storage, refreshing...');
                    refreshApiKeys();
                }
            };

            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            };
        }
    }, [refreshApiKeys]);

    return (
      <ErrorBoundary>
        <ToastProvider>
          <ConfirmDialogProvider>
            <main className="min-h-screen bg-bg-primary flex flex-col h-screen overflow-x-visible overflow-y-hidden">
        {/* Navigation with integrated controls */}
        <Navbar 
          selectedCompetition={selectedCompetition}
          onCompetitionChange={setSelectedCompetition}
          onClearHistory={clearCurrentConversation}
        />

        {/* API Keys Warning (Minimalist) */}
        {!apiKeysLoading && !hasApiKeys && (
          <div className="bg-accent-warning/20 border-b border-accent-warning/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-adaptive-sm">
                <svg className="w-4 h-4 text-accent-warning" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-text-primary">API keys required - use the settings button in the navbar to configure</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col items-center w-full overflow-y-auto overflow-x-visible">              
          <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col overflow-y-auto overflow-x-visible">
            <div className="flex-1 flex flex-col min-h-0">
              <ChatArea 
                messages={messages} 
                onSendMessage={handleSendMessage} 
                selectedCompetition={selectedCompetition}
              />
            </div>
            <TextArea 
              onSendMessage={handleSendMessage} 
              isLoading={isWaitingForSystemResponse}
              canSendMessage={canSendMessage && hasApiKeys}
              selectedCompetition={selectedCompetition}
            /> 
          </div>
        </div>
        </main>
          </ConfirmDialogProvider>
        </ToastProvider>
      </ErrorBoundary>
    )
}

export default App