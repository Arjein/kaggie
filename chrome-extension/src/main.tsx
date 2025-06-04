import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { globalConfig } from './config/globalConfig.ts'

// Initialize global configuration
async function initializeApp() {
  try {
    console.log('Main: Initializing global configuration...');
    await globalConfig.initialize();
    console.log('Main: Global configuration initialized successfully');
    
    // Initialize persistent memory saver
    console.log('Main: Initializing persistent memory saver...');
    const { persistentMemorySaver } = await import('./utils/persistentMemorySaver');
    await persistentMemorySaver.initialize();
    console.log('Main: Persistent memory saver initialized successfully');
  } catch (error) {
    console.error('Main: Failed to initialize app:', error);
  }

  // Render the app after configuration is loaded
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

// Start the app
initializeApp();
