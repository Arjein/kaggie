import { useState, useEffect, useRef } from 'react'
import { 
  ChevronDownIcon, 
  TrophyIcon, 
  TrashIcon
} from '@heroicons/react/24/outline'
import { type Competition } from '../types/competition'
import { globalConfig } from '../config/globalConfig'
import { useToast } from './ToastProvider'
import { useApiKeys } from '../hooks/useApiKeys'
import { CompetitionDropdown } from './navbar/CompetitionDropdown'
import { SettingsPanel } from './navbar/SettingsPanel'

interface NavbarProps {
  selectedCompetition: Competition | null
  onCompetitionChange: (competition: Competition | null) => void
  onClearHistory?: () => Promise<boolean>
}

export default function Navbar({ 
  selectedCompetition, 
  onCompetitionChange, 
  onClearHistory
}: NavbarProps) {
  const { showToast } = useToast();
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isClearing, setIsClearing] = useState(false)
  const [starredCompetitions, setStarredCompetitions] = useState<Set<string>>(new Set())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [favoriteTransition, setFavoriteTransition] = useState<string | null>(null)
  const [openaiApiKey, setOpenaiApiKey] = useState('')
  const [tavilyApiKey, setTavilyApiKey] = useState('')
  const [showOpenAIKey, setShowOpenAIKey] = useState(false)
  const [showTavilyKey, setShowTavilyKey] = useState(false)
  const [isSavingKeys, setIsSavingKeys] = useState(false)
  
  // Ref for dropdown container to handle click outside
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Get API keys status
  const { hasApiKeys, refresh: refreshApiKeys } = useApiKeys()

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const handleToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    
    // Close dropdown when opening settings
    if (!isSettingsOpen) {
      setIsOpen(false);
      loadCurrentApiKeys();
    }
  };

  const loadCurrentApiKeys = async () => {
    try {
      await globalConfig.initialize();
      const config = globalConfig.getConfig();
      setOpenaiApiKey(config.openaiApiKey || '');
      setTavilyApiKey(config.tavilyApiKey || '');
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const handleSaveApiKeys = async () => {
    if (!openaiApiKey.trim()) {
      showToast('OpenAI API key is required', 'warning');
      return;
    }

    setIsSavingKeys(true);
    try {
      // Import the agent service 
      const { kaggieAgentService } = await import('../services/kaggieAgentService');
      
      // Use the agent service to save keys and trigger reinitialization
      await kaggieAgentService.saveApiKeys(
        openaiApiKey.trim(),
        tavilyApiKey.trim()
      );
      
      // Force agent reinitialization with new keys
      await kaggieAgentService.initialize();
      
      // Refresh the API keys hook state
      await refreshApiKeys();
      
      showToast('API keys saved successfully! Agent has been reinitialized.', 'success');
    } catch (error) {
      console.error('Error saving API keys:', error);
      showToast('Failed to save API keys. Please try again.', 'error');
    } finally {
      setIsSavingKeys(false);
    }
  };

  const handleResetAll = async () => {
    if (confirm('⚠️ Are you sure you want to reset ALL data? This will permanently delete all conversations, settings, and API keys. This action cannot be undone.')) {
      try {
        // Clear Chrome storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.clear();
          await chrome.storage.sync.clear();
        } else {
          throw new Error('Chrome storage not available');
        }
        
        // Reset global config
        await globalConfig.resetToDefaults();
        
        showToast('All data has been reset successfully. The extension will now reload.', 'success');
        window.location.reload();
      } catch (error) {
        console.error('Error resetting data:', error);
        showToast('Failed to reset data. Please try again.', 'error');
      }
    }
  };

  const handleToggleDropdown = () => {
    if (loading) return;
    setIsOpen(!isOpen);
    
    // Close settings when opening dropdown
    if (!isOpen) {
      setIsSettingsOpen(false);
    }
  };

  const handleCompetitionSelect = (competition: Competition | null) => {
    onCompetitionChange(competition);
    setIsOpen(false);
  };

  useEffect(() => {
    fetchCompetitions()
    loadStarredCompetitions()
  }, [])

  const loadStarredCompetitions = () => {
    try {
      const stored = localStorage.getItem('kaggie-starred-competitions')
      if (stored) {
        setStarredCompetitions(new Set(JSON.parse(stored)))
      }
    } catch (error) {
      console.error('Failed to load starred competitions:', error)
    }
  }

  const toggleStarCompetition = (competitionId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    // Get the current position of the item before any changes
    const element = event.currentTarget.closest('[data-competition-item]') as HTMLElement
    if (element) {
      // Add visual feedback immediately
      setFavoriteTransition(competitionId)
    }
    
    // Apply the star/unstar action with a small delay for visual feedback
    setTimeout(() => {
      setStarredCompetitions(prev => {
        const newSet = new Set(prev)
        if (newSet.has(competitionId)) {
          newSet.delete(competitionId)
        } else {
          newSet.add(competitionId)
        }
        
        // Save to localStorage
        try {
          localStorage.setItem('kaggie-starred-competitions', JSON.stringify(Array.from(newSet)))
        } catch (error) {
          console.error('Failed to save starred competitions:', error)
        }
        
        return newSet
      })
      
      // Clear transition state after reorganization
      setTimeout(() => {
        setFavoriteTransition(null)
      }, 400)
    }, 200)
  }

  const handleClearHistory = async () => {
    if (!selectedCompetition || !onClearHistory) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to clear all conversation history for "${selectedCompetition.title}"? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    setIsClearing(true);
    try {
      const success = await onClearHistory();
      if (success) {
        console.log('Navbar: Successfully cleared history');
      } else {
        console.error('Navbar: Failed to clear history');
        showToast('Failed to clear history. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Navbar: Error clearing history:', error);
      showToast('An error occurred while clearing history.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  const fetchCompetitions = async () => {
    try {
      await globalConfig.initialize();
      const config = globalConfig.getConfig();
      const backendUrl = config.backendUrl;
      
      const response = await fetch(`${backendUrl}/active-competitions`)
      const data = await response.json()
      
      console.log("Fetched Competition Data:", data)
      
      let competitionsArray: Competition[] = [];
      if (Array.isArray(data)) {
        competitionsArray = data;
      } else if (data && Array.isArray(data.competitions)) {
        competitionsArray = data.competitions;
      } else if (data && typeof data === 'object') {
        competitionsArray = data.competitions || data.data || [];
      }
      
      setCompetitions(competitionsArray);
      
    } catch (error) {
      console.error('Failed to fetch competitions:', error)
      // Fallback to dummy data for development
      setCompetitions([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <nav className="bg-bg-secondary border-b border-border-subtle overflow-visible">
      <div className="px-2 sm:px-4 py-3 overflow-visible">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Left: Logo & Title - Fixed width */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            <img 
              src="/kaggie.png" 
              alt="Kaggie Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain"
            />
            
          </div>

          {/* Center: Competition Selector - Takes remaining space */}
          <div className="flex-1 min-w-0">
            <div ref={dropdownRef} className="extension-dropdown-container relative w-full max-w-none">
              <button
                onClick={handleToggleDropdown}
                className="w-full flex items-center justify-between px-2 sm:px-3 py-4 bg-bg-overlay hover:bg-bg-secondary rounded-lg border border-border-subtle transition-colors duration-200"
                disabled={loading}
              >
                <div className="flex items-center justify-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                  <TrophyIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 text-text-secondary" />
                  <span className="text-xs sm:text-adaptive-sm font-medium text-text-primary truncate text-center">
                    {loading ? 'Loading...' : selectedCompetition ? selectedCompetition.title : 'Select Competition'}
                  </span>
                </div>
                <ChevronDownIcon className={`h-3 w-3 sm:h-4 sm:w-4 text-text-secondary transition-transform duration-200 flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Competition Dropdown */}
              <CompetitionDropdown
                isOpen={isOpen}
                loading={loading}
                competitions={competitions}
                selectedCompetition={selectedCompetition}
                starredCompetitions={starredCompetitions}
                favoriteTransition={favoriteTransition}
                onSelect={handleCompetitionSelect}
                onToggleStar={toggleStarCompetition}
              />
            </div>
          </div>

          {/* Right: Actions - Fixed width */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {/* Clear History Button - Only show when competition is selected */}
            {selectedCompetition && onClearHistory && (
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                className="flex items-center gap-1 px-3 sm:px-4 py-3 text-xs sm:text-adaptive-sm font-medium text-accent-error hover:text-accent-error/80 bg-bg-overlay hover:bg-bg-secondary rounded-lg border border-accent-error/30 hover:border-accent-error/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Clear conversation history for ${selectedCompetition.title}`}
              >
                <TrashIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden md:inline">{isClearing ? 'Clearing...' : 'Clear'}</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={handleToggleSettings}
              className="p-3 sm:p-4 hover:bg-bg-overlay rounded-lg transition-colors text-text-secondary hover:text-text-primary"
              title="Settings"
            >
              <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={isSettingsOpen}
        selectedCompetition={selectedCompetition}
        openaiApiKey={openaiApiKey}
        tavilyApiKey={tavilyApiKey}
        showOpenAIKey={showOpenAIKey}
        showTavilyKey={showTavilyKey}
        isSavingKeys={isSavingKeys}
        isClearing={isClearing}
        hasApiKeys={hasApiKeys}
        onClose={handleToggleSettings}
        onOpenaiApiKeyChange={setOpenaiApiKey}
        onTavilyApiKeyChange={setTavilyApiKey}
        onToggleShowOpenAIKey={() => setShowOpenAIKey(!showOpenAIKey)}
        onToggleShowTavilyKey={() => setShowTavilyKey(!showTavilyKey)}
        onSaveApiKeys={handleSaveApiKeys}
        onClearHistory={handleClearHistory}
        onResetAll={handleResetAll}
      />
    </nav>
  )
}