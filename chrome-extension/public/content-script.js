// Enhanced content script with in-page notification (NO AUTO-SWITCHING):

console.log('Content Script: Loaded on', window.location.href);

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content Script: Received message', request);
  
  if (request.type === 'COMPETITION_AUTO_DETECTED') {
    console.log('Content Script: Competition auto-detected (for notifications only):', request.competition?.id);
    
    // Store in local storage for reference (but not for auto-switching)
    localStorage.setItem('kaggler_competition_detected', JSON.stringify({
      competition: request.competition,
      timestamp: Date.now(),
      notificationOnly: true
    }));
    
    // Dispatch custom event for potential listeners (but not for auto-switching)
    window.dispatchEvent(new CustomEvent('kaggler-competition-detected', {
      detail: { ...request.competition, notificationOnly: true }
    }));
    
    sendResponse({ received: true });
  }
  
  if (request.type === 'SHOW_COMPETITION_DETECTED') {
    console.log('Content Script: Showing competition detected notification');
    showCompetitionNotification(request.competition);
    sendResponse({ received: true });
  }
});

// Function to show in-page notification
function showCompetitionNotification(competition) {
  // Remove existing notification if present
  const existingNotification = document.getElementById('kaggler-competition-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'kaggler-competition-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #00D4AA, #20BEFF);
    color: white;
    padding: 16px 20px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 212, 170, 0.3);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    max-width: 320px;
    cursor: pointer;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 24px;">🚀</div>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Kaggler Ready!</div>
        <div style="opacity: 0.9; font-size: 13px;">Competition detected: ${competition.title}</div>
        <div style="opacity: 0.7; font-size: 12px; margin-top: 4px;">Click to start chatting →</div>
      </div>
    </div>
  `;
  
  // Add click handler to open side panel
  notification.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL_REQUEST' });
    notification.remove();
  });
  
  // Add to page
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Notify service worker when page is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    chrome.runtime.sendMessage({ type: 'PAGE_READY' }, (response) => {
      console.log('Content Script: Page ready response:', response);
    });
  });
} else {
  chrome.runtime.sendMessage({ type: 'PAGE_READY' }, (response) => {
    console.log('Content Script: Page ready response:', response);
  });
}