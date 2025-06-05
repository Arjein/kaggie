import ChatArea from "./components/chatArea";
import TextArea from "./components/textArea";
import Navbar from "./components/navbar";
import { useChat } from "./hooks/useChat";
import { useApiKeys } from "./hooks/useApiKeys";
import { ToastProvider } from "./components/ToastProvider";
import { ConfirmDialogProvider } from "./components/ConfirmDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";



function App() {
    const { hasApiKeys, isLoading: apiKeysLoading } = useApiKeys();
    const {
        messages,
        isWaitingForSystemResponse,
        selectedCompetition,
        setSelectedCompetition,
        handleSendMessage,
        canSendMessage,
        clearCurrentConversation,
    } = useChat();

    return (
      <ErrorBoundary>
        <ToastProvider>
          <ConfirmDialogProvider>
            <main className="min-h-screen bg-primary flex flex-col h-screen text-primary overflow-hidden">
        {/* Navigation with integrated controls */}
        <Navbar 
          selectedCompetition={selectedCompetition}
          onCompetitionChange={setSelectedCompetition}
          onClearHistory={clearCurrentConversation}
        />

        {/* API Keys Warning (Minimalist) */}
        {!apiKeysLoading && !hasApiKeys && (
          <div className="bg-yellow-600/20 border-b border-yellow-600/30 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-adaptive-sm">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-secondary">API keys required - use the settings button in the navbar to configure</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col items-center w-full overflow-hidden">              
          <div className="flex-1 w-full max-w-3xl mx-auto flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0">
              <ChatArea messages={messages} />
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