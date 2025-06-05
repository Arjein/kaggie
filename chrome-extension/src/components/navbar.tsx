import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDownIcon, 
  TrophyIcon, 
  StarIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { type Competition } from '../types/competition'
import { globalConfig } from '../config/globalConfig'
import { useToast } from './ToastProvider'
import { useApiKeys } from '../hooks/useApiKeys'

// 🎛️ FRAMER MOTION ANIMATION CONTROLS - Performance optimized values
const ANIMATION_CONFIG = {
  // Container expansion animation
  container: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
    transition: { 
      duration: 0.2, 
      ease: [0.16, 1, 0.3, 1]
    }
  },
  
  // Backdrop animation
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 0.5 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 }
  },
  
  // Content fade-in
  content: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.2, delay: 0.05 }
  },
  
  // Competition items drop-in
  item: {
    initial: { opacity: 0, y: -15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { 
      duration: 0.25, 
      ease: [0.25, 1.0, 0.5, 1.0]
    }
  },
  
  // Section stagger variants
  sectionStagger: {
    initial: {},
    animate: {
      transition: {
        delayChildren: 0.1,
        staggerChildren: 0.05
      }
    },
    exit: {}
  },
  
  // Item stagger variants
  itemStagger: {
    initial: {},
    animate: {
      transition: {
        delayChildren: 0.05,
        staggerChildren: 0.03
      }
    },
    exit: {}
  }
}

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
  
  // Get API keys status
  const { hasApiKeys, refresh: refreshApiKeys } = useApiKeys()

  const handleToggleSettings = () => {
    setIsSettingsOpen(!isSettingsOpen);
    
    // Load current API keys when opening settings
    if (!isSettingsOpen) {
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
      setCompetitions([
        //{ id: '1', title: 'House Prices - Advanced Regression', deadline: '2024-12-31', url: 'https://kaggle.com/c/house-prices' },
        //{ id: '2', title: 'Titanic - Machine Learning from Disaster', deadline: '2024-11-30', url: 'https://kaggle.com/c/titanic' },
        //{ id: '3', title: 'Digit Recognizer', url: 'https://kaggle.com/c/digit-recognizer' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getCompetitionStatus = (competition: Competition): 'active' | 'rolling' | 'past' => {
    // Check explicit status first
    if (competition.status === 'active') return 'active';
    if (competition.status === 'rolling') return 'rolling';
    if (competition.status === 'passed') return 'past';
    
    // Check deadline-based status
    if (!competition.deadline || competition.deadline === 'Indefinite') return 'rolling';
    
    const deadline = new Date(competition.deadline);
    const now = new Date();
    return deadline > now ? 'active' : 'past';
  };

  const renderCompetitionItem = (competition: Competition, isStarred: boolean = false, isSelected: boolean = false) => {
    const status = getCompetitionStatus(competition);
    
    // Determine gradient class based on status and starred state
    let gradientClass: string;
    
    if (isSelected) {
      // Special styling for selected competition - use primary blue
      gradientClass = "from-blue-600 to-blue-700";
    } else if (isStarred) {
      gradientClass = "from-yellow-500 to-yellow-600";
    } else {
      switch (status) {
        case 'active':
          gradientClass = "from-blue-500 to-blue-600";
          break;
        case 'rolling':
          gradientClass = "from-purple-500 to-purple-600";
          break;
        case 'past':
          gradientClass = "from-gray-500 to-gray-600";
          break;
        default:
          gradientClass = "from-blue-500 to-blue-600";
      }
    }

    return (
      <motion.div
        key={competition.id}
        variants={ANIMATION_CONFIG.item}
        className={`w-full p-4 rounded-xl border transition-all duration-300 group ${
          isSelected 
            ? 'border-blue-500/50 bg-blue-50/10 shadow-lg shadow-blue-500/20' 
            : 'border-subtle hover:shadow-md bg-overlay'
        }`}
        data-competition-item
        data-competition-id={competition.id}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleCompetitionSelect(competition)}
            className="flex items-center space-x-4 flex-1 min-w-0 text-left hover:bg-secondary/50 rounded-lg p-2 -m-2 transition-colors duration-200"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
              isSelected ? 'ring-2 ring-blue-400/30' : ''
            }`}>
              {isStarred ? (
                <StarIconSolid className="h-6 w-6 text-white" />
              ) : (
                <TrophyIcon className="h-6 w-6 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-base font-semibold truncate ${
                  isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-primary'
                }`}>
                  {competition.title}
                </p>
              </div>
              {competition.deadline && competition.deadline !== 'Indefinite' && (
                <p className="text-sm text-muted">
                  Deadline: {new Date(competition.deadline).toLocaleDateString()}
                </p>
              )}
              {competition.deadline === 'Indefinite' && (
                <p className="text-sm text-muted">
                  Rolling competition
                </p>
              )}
            </div>
          </button>
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={(e) => toggleStarCompetition(competition.id, e)}
              className={`p-2 hover:bg-overlay rounded-lg transition-all duration-300 ${
                favoriteTransition === competition.id ? 'animate-pulse scale-110' : ''
              }`}
              title={starredCompetitions.has(competition.id) ? "Remove from favorites" : "Add to favorites"}
            >
              {starredCompetitions.has(competition.id) ? (
                <StarIconSolid className="h-6 w-6 text-yellow-500" />
              ) : (
                <StarIcon className="h-6 w-6 text-muted hover:text-yellow-500" />
              )}
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <nav className="bg-secondary border-b border-subtle">
      <div className="px-2 sm:px-4 py-3">
        <div className="grid grid-cols-3 items-center gap-2 sm:gap-4">
          {/* Left: Logo & Title */}
          <div className="flex items-center space-x-2 justify-start">
            <img 
              src="/kaggie.png" 
              alt="Kaggie Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain"
            />
            <h1 className="text-sm sm:text-adaptive-lg font-bold text-primary hidden xs:block">Kaggie</h1>
          </div>

          {/* Center: Competition Selector */}
          <div className="flex justify-center">
            <div className="relative w-full max-w-xs sm:max-w-md">
              <button
                onClick={handleToggleDropdown}
                className="w-full flex items-center justify-between px-2 sm:px-3 py-2 bg-overlay hover:bg-secondary rounded-lg border border-subtle transition-colors duration-200"
                disabled={loading}
              >
                <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                  <TrophyIcon className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                  <span className="text-xs sm:text-adaptive-sm font-medium text-primary truncate">
                    {loading ? 'Loading...' : selectedCompetition ? selectedCompetition.title : 'Select Competition'}
                  </span>
                </div>
                <ChevronDownIcon className={`h-3 w-3 sm:h-4 sm:w-4 text-secondary transition-transform duration-200 flex-shrink-0 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Full-Screen Animated Dropdown with Framer Motion */}
              <AnimatePresence>
                {isOpen && !loading && (
                  <>
                    {/* Backdrop/Overlay */}
                    <motion.div 
                      className="fixed inset-0 bg-black z-40"
                      onClick={() => handleCompetitionSelect(selectedCompetition)}
                      {...ANIMATION_CONFIG.backdrop}
                    />
                    
                    {/* Animated Dropdown Container */}
                    <motion.div 
                      className="fixed z-50 bg-overlay border border-subtle shadow-2xl flex flex-col overflow-hidden"
                      style={{ 
                        left: 0,
                        top: 0,
                        width: '100vw',
                        height: '100vh'
                      }}
                      {...ANIMATION_CONFIG.container}
                    >
                      {/* Content */}
                      <motion.div 
                        className="flex flex-col h-full"
                        {...ANIMATION_CONFIG.content}
                      >
                        {/* Navbar spacer */}
                        <div className="h-16 bg-secondary border-b border-subtle"></div>
                        
                        {/* Header */}
                        <div className="flex-shrink-0 p-4 border-b border-subtle bg-secondary/50">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-primary flex items-center gap-3">
                              <TrophyIcon className="h-6 w-6 text-primary" />
                              Select Competition
                            </h3>
                            <button
                              onClick={() => handleCompetitionSelect(selectedCompetition)}
                              className="p-2 hover:bg-overlay rounded-lg transition-colors"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Competition List - Scrollable content */}
                        <div className="flex-1 overflow-y-auto">
                          {competitions.length === 0 ? (
                            <motion.div 
                              className="flex flex-col items-center justify-center h-full p-8 text-center text-secondary"
                              {...ANIMATION_CONFIG.content}
                            >
                              <TrophyIcon className="h-16 w-16 mx-auto mb-4 text-muted" />
                              <p className="text-xl">No competitions found</p>
                              <p className="text-sm text-muted mt-2">Check your backend connection</p>
                            </motion.div>
                          ) : (
                            <motion.div 
                              className="p-6"
                              variants={ANIMATION_CONFIG.sectionStagger}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                            >
                              {/* Selected Competition Section */}
                              {selectedCompetition && (
                                <motion.div 
                                  className="mb-8"
                                  variants={ANIMATION_CONFIG.item}
                                >
                                  <div className="flex items-center gap-2 mb-4">
                                    <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                    </div>
                                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                                      Currently Selected
                                    </h4>
                                  </div>
                                  <div className="space-y-3">
                                    {renderCompetitionItem(selectedCompetition, starredCompetitions.has(selectedCompetition.id), true)}
                                  </div>
                                </motion.div>
                              )}

                              {/* Favorites Section */}
                              {starredCompetitions.size > 0 && (
                                <motion.div 
                                  className="mb-8"
                                  variants={ANIMATION_CONFIG.item}
                                >
                                  <div className="flex items-center gap-2 mb-4">
                                    <StarIconSolid className="h-5 w-5 text-yellow-500" />
                                    <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                                      Favorites ({starredCompetitions.size})
                                    </h4>
                                  </div>
                                  <motion.div 
                                    className="space-y-3"
                                    variants={ANIMATION_CONFIG.itemStagger}
                                    initial="initial"
                                    animate="animate"
                                    exit="exit"
                                  >
                                    {competitions
                                      .filter(comp => starredCompetitions.has(comp.id) && comp.id !== selectedCompetition?.id)
                                      .map((competition) => (
                                        <div key={competition.id}>
                                          {renderCompetitionItem(competition, true)}
                                        </div>
                                      ))}
                                  </motion.div>
                                </motion.div>
                              )}

                              {/* Active Competitions Section */}
                              {(() => {
                                const activeCompetitions = competitions.filter(comp => {
                                  // Filter out selected and starred competitions
                                  if (starredCompetitions.has(comp.id) || comp.id === selectedCompetition?.id) return false;
                                  return getCompetitionStatus(comp) === 'active';
                                });
                                
                                return activeCompetitions.length > 0 && (
                                  <motion.div 
                                    className="mb-8"
                                    variants={ANIMATION_CONFIG.item}
                                  >
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                                        <TrophyIcon className="h-3 w-3 text-white" />
                                      </div>
                                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                                        Active Competitions ({activeCompetitions.length})
                                      </h4>
                                    </div>
                                    <motion.div 
                                      className="space-y-3"
                                      variants={ANIMATION_CONFIG.itemStagger}
                                      initial="initial"
                                      animate="animate"
                                      exit="exit"
                                    >
                                      {activeCompetitions.map((competition) => (
                                        <div key={competition.id}>
                                          {renderCompetitionItem(competition)}
                                        </div>
                                      ))}
                                    </motion.div>
                                  </motion.div>
                                );
                              })()}

                              {/* Rolling Competitions Section */}
                              {(() => {
                                const rollingCompetitions = competitions.filter(comp => {
                                  // Filter out selected and starred competitions
                                  if (starredCompetitions.has(comp.id) || comp.id === selectedCompetition?.id) return false;
                                  return getCompetitionStatus(comp) === 'rolling';
                                });
                                
                                return rollingCompetitions.length > 0 && (
                                  <motion.div 
                                    className="mb-8"
                                    variants={ANIMATION_CONFIG.item}
                                  >
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                                        <TrophyIcon className="h-3 w-3 text-white" />
                                      </div>
                                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                                        Rolling Competitions ({rollingCompetitions.length})
                                      </h4>
                                    </div>
                                    <motion.div 
                                      className="space-y-3"
                                      variants={ANIMATION_CONFIG.itemStagger}
                                      initial="initial"
                                      animate="animate"
                                      exit="exit"
                                    >
                                      {rollingCompetitions.map((competition) => (
                                        <div key={competition.id}>
                                          {renderCompetitionItem(competition)}
                                        </div>
                                      ))}
                                    </motion.div>
                                  </motion.div>
                                );
                              })()}

                              {/* Past Competitions Section */}
                              {(() => {
                                const pastCompetitions = competitions.filter(comp => {
                                  // Filter out selected and starred competitions
                                  if (starredCompetitions.has(comp.id) || comp.id === selectedCompetition?.id) return false;
                                  return getCompetitionStatus(comp) === 'past';
                                });
                                
                                return pastCompetitions.length > 0 && (
                                  <motion.div 
                                    className="mb-8"
                                    variants={ANIMATION_CONFIG.item}
                                  >
                                    <div className="flex items-center gap-2 mb-4">
                                      <div className="w-5 h-5 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center">
                                        <TrophyIcon className="h-3 w-3 text-white" />
                                      </div>
                                      <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">
                                        Past Competitions ({pastCompetitions.length})
                                      </h4>
                                    </div>
                                    <motion.div 
                                      className="space-y-3"
                                      variants={ANIMATION_CONFIG.itemStagger}
                                      initial="initial"
                                      animate="animate"
                                      exit="exit"
                                    >
                                      {pastCompetitions.map((competition) => (
                                        <div key={competition.id}>
                                          {renderCompetitionItem(competition)}
                                        </div>
                                      ))}
                                    </motion.div>
                                  </motion.div>
                                );
                              })()}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 justify-end">
            {/* Clear History Button - Only show when competition is selected */}
            {selectedCompetition && onClearHistory && (
              <button
                onClick={handleClearHistory}
                disabled={isClearing}
                className="flex items-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-adaptive-sm font-medium text-red-400 hover:text-red-300 bg-overlay hover:bg-secondary rounded-lg border border-red-500/30 hover:border-red-400/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Clear conversation history for ${selectedCompetition.title}`}
              >
                <TrashIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden md:inline">{isClearing ? 'Clearing...' : 'Clear'}</span>
              </button>
            )}

            {/* Settings Button */}
            <button
              onClick={handleToggleSettings}
              className="p-1.5 sm:p-2 hover:bg-overlay rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel (simplified for this example) */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={handleToggleSettings}
              {...ANIMATION_CONFIG.backdrop}
            />
            
            <motion.div 
              className="fixed inset-0 z-50 bg-overlay border border-subtle shadow-2xl overflow-hidden"
              {...ANIMATION_CONFIG.container}
            >
              <motion.div 
                className="flex flex-col h-full"
                {...ANIMATION_CONFIG.content}
              >
                <div className="flex-shrink-0 p-4 border-b border-subtle bg-secondary/50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary flex items-center gap-3">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </h3>
                    <button
                      onClick={handleToggleSettings}
                      className="p-2 hover:bg-overlay rounded-lg transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* API Keys Section */}
                  <div className="bg-secondary/30 rounded-lg p-6 border border-subtle">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-semibold text-primary flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2m-2-2a2 2 0 00-2 2m0 0a2 2 0 01-2 2m2-2a2 2 0 012-2M9 5a2 2 0 00-2 2m0 0a2 2 0 00-2 2m2-2a2 2 0 012-2m0 0a2 2 0 012 2m-6 0h6m-5 3h4" />
                        </svg>
                        API Keys
                      </h4>
                      <div className={`w-3 h-3 rounded-full ${hasApiKeys ? 'bg-green-500' : 'bg-red-500'}`} />
                    </div>
                    <p className="text-secondary mb-6 text-sm">
                      Configure your API keys for the assistant. OpenAI is required for chat functionality, 
                      while Tavily enables web search capabilities (optional).
                    </p>
                    
                    <div className="space-y-4">
                      {/* OpenAI API Key */}
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          OpenAI API Key <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showOpenAIKey ? 'text' : 'password'}
                            value={openaiApiKey}
                            onChange={(e) => setOpenaiApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-3 py-2 bg-overlay border border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-primary text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showOpenAIKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                              {!showOpenAIKey && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-secondary mt-1">
                          Required for all chat functionality. 
                          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1">Get your key</a>
                        </p>
                      </div>

                      {/* Tavily API Key */}
                      <div>
                        <label className="block text-sm font-medium text-primary mb-2">
                          Tavily API Key <span className="text-yellow-500">(Optional)</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showTavilyKey ? 'text' : 'password'}
                            value={tavilyApiKey}
                            onChange={(e) => setTavilyApiKey(e.target.value)}
                            placeholder="tvly-..."
                            className="w-full px-3 py-2 bg-overlay border border-subtle rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-primary text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTavilyKey(!showTavilyKey)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-secondary hover:text-primary"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showTavilyKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z"} />
                              {!showTavilyKey && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-secondary mt-1">
                          Enables web search capabilities. Leave empty to disable web search.
                          <a href="https://tavily.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 ml-1">Get your key</a>
                        </p>
                      </div>

                      {/* Save Button */}
                      <button
                        onClick={handleSaveApiKeys}
                        disabled={isSavingKeys || !openaiApiKey.trim()}
                        className="w-full p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
                      >
                        {isSavingKeys ? 'Saving...' : 'Save API Keys'}
                      </button>
                    </div>
                  </div>

                  {/* Kaggle Service Information */}
                  <div className="bg-secondary/30 rounded-lg p-6 border border-subtle">
                    <h4 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Kaggle Service Information
                    </h4>
                    <div className="space-y-4 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-secondary">Backend Status:</span>
                          <p className="text-primary font-medium">Connected</p>
                        </div>
                        <div>
                          <span className="text-secondary">Service Version:</span>
                          <p className="text-primary font-medium">v1.0.0</p>
                        </div>
                        <div>
                          <span className="text-secondary">Active Competition:</span>
                          <p className="text-primary font-medium">
                            {selectedCompetition?.title || 'None selected'}
                          </p>
                        </div>
                        <div>
                          <span className="text-secondary">Agent Model:</span>
                          <p className="text-primary font-medium">GPT-4o-mini</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-subtle">
                        <span className="text-secondary">Backend URL:</span>
                        <p className="text-primary font-medium text-xs bg-overlay px-2 py-1 rounded mt-1">
                          https://kaggie-api.onrender.com
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Privacy & Data Management */}
                  <div className="bg-secondary/30 rounded-lg p-6 border border-subtle">
                    <h4 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Privacy & Data Management
                    </h4>
                    <div className="space-y-4">
                      <p className="text-secondary text-sm">
                        Clear all stored conversation history, cached data, and reset the extension to its initial state.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          onClick={handleClearHistory}
                          disabled={isClearing}
                          className="flex-1 p-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                          {isClearing ? 'Clearing...' : 'Clear Current Conversation'}
                        </button>
                        <button
                          onClick={handleResetAll}
                          className="flex-1 p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                        >
                          Reset All Data
                        </button>
                      </div>
                      <p className="text-xs text-muted">
                        ⚠️ Reset All Data will permanently delete all conversations, settings, and API keys. This action cannot be undone.
                      </p>
                    </div>
                  </div>

                  {/* About Section */}
                  <div className="bg-secondary/30 rounded-lg p-6 border border-subtle">
                    <h4 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                      <img src="/kaggie.png" alt="Kaggie" className="w-5 h-5 rounded" />
                      About Kaggie
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-secondary">Extension Version:</span>
                          <p className="text-primary font-medium">1.0.0</p>
                        </div>
                        <div>
                          <span className="text-secondary">Build:</span>
                          <p className="text-primary font-medium">Production</p>
                        </div>
                      </div>
                      <p className="text-secondary">
                        Kaggie is your intelligent assistant for Kaggle competitions. Get insights, ask questions, 
                        and explore datasets with the power of AI.
                      </p>
                      <div className="flex gap-3 pt-2">
                        <a
                          href="https://github.com/arjein/kaggie"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          GitHub Repository
                        </a>
                        <span className="text-subtle">•</span>
                        <a
                          href="https://github.com/arjein/kaggie#readme"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          Documentation
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}
