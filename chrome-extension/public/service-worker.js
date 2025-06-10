const KAGGLE_ORIGIN = "https://www.kaggle.com";

console.log('Service Worker: Script loaded and running');

// Function to detect competition from URL - WORKING REGEX
function detectCompetitionFromURL(url) {
  try {
    if (!url) return null;
    
    const competitionMatch = url.match(/kaggle\.com\/(?:c|competitions)\/([^/?\s]+)/);
    
    if (competitionMatch) {
      const competitionId = competitionMatch[1];
      
      console.log('Service Worker: Detected competition:', competitionId, 'from URL:', url);
      
      return {
        id: competitionId,
        title: competitionId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        url: url
      };
    }
    
    console.log('Service Worker: No competition detected in URL:', url);
  } catch (error) {
    console.error('Service Worker: Error detecting competition from URL:', error);
  }
  
  return null;
}

// Initialize side panel behavior - Enable on all tabs
chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => console.log('Service Worker: Side panel behavior set for all tabs'))
    .catch((error) => console.error('Service Worker: Side panel setup error:', error));

// Store current competition
let currentCompetition = null;

// Function to check if competition changed
function hasCompetitionChanged(newCompetition) {
  const currentId = currentCompetition?.id || null;
  const newId = newCompetition?.id || null;
  return currentId !== newId;
}

// Function to notify side panel of competition change
// Add/update these sections in your existing service-worker.js:

// In your notifyCompetitionChange function, add this section:
async function notifyCompetitionChange(competition, tabId) {
  if (!hasCompetitionChanged(competition)) {
    console.log('Service Worker: Competition unchanged, skipping notification');
    return;
  }

  const previousCompetition = currentCompetition;
  currentCompetition = competition;
  
  try {
    console.log('Service Worker: Competition changed from', previousCompetition?.id || 'none', 'to', competition?.id || 'none');
    
    // Store in storage for side panel to access (but not auto-switch)
    await chrome.storage.local.set({ 
      'detected_competition': competition,
      'detection_timestamp': Date.now()
    });
    
    console.log('Service Worker: Competition detection stored in storage (for notifications only)');
    
    // Show in-page notification when entering a competition page
    if (competition && !previousCompetition) {
      console.log('Service Worker: Showing notification for competition:', competition.id);
      
      try {
        // Send message to content script to show notification
        await chrome.tabs.sendMessage(tabId, {
          type: 'SHOW_COMPETITION_DETECTED',
          competition: competition
        });
        
        console.log('Service Worker: Notification message sent to content script');
        
      } catch (error) {
        console.log('Service Worker: Content script not ready for notification message:', error);
      }
    }
    
  } catch (error) {
    console.error('Service Worker: Error notifying competition change:', error);
  }
}

// Listen for tab updates (URL changes) - FOR COMPETITION DETECTION ONLY
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  // Only process when the page is loaded or the URL changes
  if (info.status !== 'complete' && !info.url) {
    return;
  }
  
  console.log('Service Worker: Tab updated', {
    tabId,
    url: tab.url,
    status: info.status,
    hasUrl: !!info.url,
    hasStatus: !!info.status
  });
  
  if (!tab.url) {
    console.log('Service Worker: No tab URL, skipping');
    return;
  }
  
  try {
    const url = new URL(tab.url);
    
    // Check for Kaggle competition detection (but don't restrict side panel)
    if (url.origin === KAGGLE_ORIGIN) {
      console.log('Service Worker: On Kaggle.com, checking for competition');
      
      // Check for competition for NOTIFICATIONS ONLY (not auto-switching)
      console.log('Service Worker: Checking for competition in URL (notifications only):', tab.url);
      const detectedCompetition = detectCompetitionFromURL(tab.url);
      
      if (detectedCompetition) {
        console.log('Service Worker: Found competition (for notifications):', detectedCompetition);
        await notifyCompetitionChange(detectedCompetition, tabId);
      } else {
        console.log('Service Worker: No competition found, clearing');
        await notifyCompetitionChange(null, tabId);
      }
      
    } else {
      console.log('Service Worker: Not on Kaggle.com, clearing competition context');
      
      // Clear competition for non-Kaggle pages but keep side panel enabled
      await notifyCompetitionChange(null, tabId);
    }
  } catch (error) {
    console.error('Service Worker: Error in tab update handler:', error);
  }
});

// Listen for tab activation (switching between tabs) - FOR COMPETITION DETECTION ONLY
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  console.log('Service Worker: Tab activated:', activeInfo.tabId);
  
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    console.log('Service Worker: Active tab URL:', tab.url);
    
    if (tab.url) {
      const url = new URL(tab.url);
      
      // Only detect competition on Kaggle, but don't restrict side panel
      if (url.origin === KAGGLE_ORIGIN) {
        const detectedCompetition = detectCompetitionFromURL(tab.url);
        await notifyCompetitionChange(detectedCompetition, activeInfo.tabId);
      } else {
        // Clear competition context for non-Kaggle pages
        await notifyCompetitionChange(null, activeInfo.tabId);
      }
    }
  } catch (error) {
    console.error('Service Worker: Error handling tab activation:', error);
  }
});

// Handle messages from side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service Worker: Received message:', request);
  
  if (request.type === 'GET_CURRENT_COMPETITION') {
    console.log('Service Worker: Responding with current competition:', currentCompetition?.id || 'none');
    sendResponse({ competition: currentCompetition });
    return true;
  }
  
  if (request.type === 'MANUAL_COMPETITION_CHANGE') {
    console.log('Service Worker: Manual competition change to:', request.competition?.id || 'none');
    currentCompetition = request.competition;
    chrome.storage.local.set({ 
      'current_competition': request.competition,
      'competition_change_timestamp': Date.now()
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'OPEN_SIDE_PANEL_REQUEST') {
    console.log('Service Worker: Side panel open requested from content script');
    
    // This should work because it's in response to user interaction
    chrome.sidePanel.open({ tabId: sender.tab.id })
      .then(() => {
        console.log('Service Worker: Side panel opened via content script request');
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Service Worker: Failed to open side panel via content script:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'SIDE_PANEL_READY') {
    console.log('Service Worker: Side panel ready, current competition:', currentCompetition?.id || 'none');
    sendResponse({ competition: currentCompetition });
    return true;
  }
  
  if (request.type === 'PAGE_READY') {
    console.log('Service Worker: Page ready message from content script');
    sendResponse({ received: true });
    return true;
  }
});

// Context menu and installation handlers
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Service Worker: Extension installed');
  
  // Check current tab on installation - FIXED VERSION
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Service Worker: Initial tab query result:', tabs);
    
    if (tabs && tabs.length > 0 && tabs[0].url) {
      console.log('Service Worker: Initial tab check:', tabs[0].url);
      const detectedCompetition = detectCompetitionFromURL(tabs[0].url);
      if (detectedCompetition) {
        console.log('Service Worker: Initial competition detected:', detectedCompetition);
        await notifyCompetitionChange(detectedCompetition, tabs[0].id);
      }
    } else {
      console.log('Service Worker: No active tab found during installation');
    }
  } catch (error) {
    console.error('Service Worker: Error during initial tab check:', error);
  }
});