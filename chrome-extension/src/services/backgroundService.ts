import { type Competition } from '../types/competition';

export class BackgroundService {
  private static listeners: Set<(competition: Competition | null) => void> = new Set();
  private static currentCompetition: Competition | null = null;
  private static isListening = false;
  private static lastChangeTimestamp = 0;

  // Subscribe to competition changes
  static subscribe(callback: (competition: Competition | null) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately call with current competition if available
    if (this.currentCompetition) {
      callback(this.currentCompetition);
    }

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  // Notify all subscribers of competition change
  private static notifyListeners(competition: Competition | null): void {
    this.currentCompetition = competition;
    this.listeners.forEach(callback => {
      try {
        callback(competition);
      } catch (error) {
        console.error('Error in competition change listener:', error);
      }
    });
  }

  // Start listening for competition changes
  static startListening(): void {
    if (this.isListening) return;
    this.isListening = true;

    // Check if we're in Chrome extension context
    if (typeof chrome === 'undefined' || !chrome.storage) {
      console.error('BackgroundService: Chrome extension context not available');
      return;
    }

    // Listen for storage changes (from service worker) - NOTIFICATIONS ONLY
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'local' && changes.detected_competition) {
        const detectedCompetition = changes.detected_competition.newValue;
        const timestamp = changes.detection_timestamp?.newValue || 0;
        
        // Only process if this is a new detection
        if (timestamp > this.lastChangeTimestamp) {
          this.lastChangeTimestamp = timestamp;
          
          console.log('BackgroundService: Competition detected (for notifications only):', detectedCompetition?.id || 'none');
          // Note: We don't call notifyListeners here to prevent auto-switching
          // The detection is only used for showing notifications via content script
        }
      }
      
      // Still listen for manual competition changes from dropdown
      if (namespace === 'local' && changes.current_competition) {
        const manualCompetition = changes.current_competition.newValue;
        const timestamp = changes.competition_change_timestamp?.newValue || 0;
        
        // Only process if this is a new manual change
        if (timestamp > this.lastChangeTimestamp) {
          this.lastChangeTimestamp = timestamp;
          
          if (this.hasCompetitionChanged(manualCompetition)) {
            console.log('BackgroundService: Manual competition change to:', manualCompetition?.id || 'none');
            this.notifyListeners(manualCompetition);
          }
        }
      }
    });

    // Listen for custom events from content script (fixed TypeScript types)
    window.addEventListener('kaggler-competition-detected', (event: Event) => {
      const customEvent = event as CustomEvent;
      const competition = customEvent.detail;
      console.log('BackgroundService: Competition detected from content script:', competition?.id);
      if (this.hasCompetitionChanged(competition)) {
        this.notifyListeners(competition);
      }
    });

    // Get initial competition from storage
    this.loadCurrentCompetition();

    // Notify service worker that side panel is ready
    this.notifyServiceWorkerReady();

    console.log('BackgroundService: Started listening for competition changes');
  }

  // Stop listening for competition changes
  static stopListening(): void {
    if (!this.isListening) return;
    this.isListening = false;
    console.log('BackgroundService: Stopped listening for competition changes');
  }

  // Notify service worker that side panel is ready
  private static async notifyServiceWorkerReady(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ type: 'SIDE_PANEL_READY' }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('BackgroundService: Runtime error during side panel ready:', chrome.runtime.lastError);
            return;
          }
          if (response?.competition) {
            console.log('BackgroundService: Received initial competition from service worker:', response.competition.id);
            if (this.hasCompetitionChanged(response.competition)) {
              this.notifyListeners(response.competition);
            }
          }
        });
      } else {
        console.log('BackgroundService: Not in extension context, skipping side panel ready notification');
      }
    } catch (error) {
      console.error('Error notifying service worker readiness:', error);
    }
  }

  // Load current competition from storage
  private static async loadCurrentCompetition(): Promise<void> {
    try {
      if (chrome.storage) {
        chrome.storage.local.get(['current_competition', 'competition_change_timestamp'], (result) => {
          const competition = result.current_competition;
          const timestamp = result.competition_change_timestamp || 0;
          
          this.lastChangeTimestamp = timestamp;
          
          if (this.hasCompetitionChanged(competition)) {
            this.notifyListeners(competition);
          }
        });
      }
    } catch (error) {
      console.error('Error loading current competition:', error);
    }
  }

  // Check if competition has actually changed
  private static hasCompetitionChanged(newCompetition: Competition | null): boolean {
    const currentId = this.currentCompetition?.id || null;
    const newId = newCompetition?.id || null;
    return currentId !== newId;
  }

  // Get current competition without triggering detection
  static getCurrentCompetition(): Competition | null {
    return this.currentCompetition;
  }

  // Manual competition change (notify service worker)
  static async setManualCompetition(competition: Competition | null): Promise<void> {
    try {
      // Check if we're in an extension context (side panel or content script)
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
          type: 'MANUAL_COMPETITION_CHANGE',
          competition: competition
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn('BackgroundService: Runtime error during manual competition change:', chrome.runtime.lastError);
          } else {
            console.log('BackgroundService: Manual competition change acknowledged:', response);
          }
        });
      } else {
        console.log('BackgroundService: Not in extension context, skipping chrome.runtime.sendMessage');
      }
      this.notifyListeners(competition);
    } catch (error) {
      console.error('Error setting manual competition:', error);
      // In development or if chrome APIs fail, still notify listeners
      this.notifyListeners(competition);
    }
  }

  // Request current competition from service worker
  static async detectCurrentCompetition(): Promise<Competition | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        return new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { type: 'GET_CURRENT_COMPETITION' },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn('BackgroundService: Runtime error during competition detection:', chrome.runtime.lastError);
                resolve(null);
                return;
              }
              resolve(response?.competition || null);
            }
          );
        });
      } else {
        console.log('BackgroundService: Not in extension context, cannot get current competition');
        return null;
      }
    } catch (error) {
      console.error('Error detecting current competition:', error);
    }
    return null;
  }
}