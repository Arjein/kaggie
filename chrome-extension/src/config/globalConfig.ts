/**
 * Global Configuration Service for Kaggie Chrome Extension
 * 
 * This service provides centralized configuration management with Chrome storage integration.
 * It ensures that configuration values like backend URL are consistent across all components.
 */

export interface GlobalConfig {
  backendUrl: string;
  openaiApiKey?: string;
  model?: string;
  temperature?: number;
  tavilyApiKey?: string;
  currentThreadId: string;
  userEmail?: string; // Add user email to config
  lastSelectedCompetition?: { id: string; title: string; url: string } | null; // Store latest interacted competition
}

export interface ConfigChangeListener {
  (config: GlobalConfig): void;
}

class GlobalConfigService {
  private static instance: GlobalConfigService;
  private config: GlobalConfig;
  private listeners: Set<ConfigChangeListener> = new Set();
  private initialized = false;

  // Default configuration values
  private readonly defaultConfig: GlobalConfig = {
    backendUrl: 'https://kaggie-api.onrender.com', // Backend successfully deployed on Render.com
    model: 'gpt-4o-mini',
    temperature: 0.3,
    openaiApiKey: '', 
    tavilyApiKey: '',
    currentThreadId: 'default',
    lastSelectedCompetition: null
  };

  private constructor() {
    this.config = { ...this.defaultConfig };
  }

  public static getInstance(): GlobalConfigService {
    if (!GlobalConfigService.instance) {
      GlobalConfigService.instance = new GlobalConfigService();
    }
    return GlobalConfigService.instance;
  }

  /**
   * Initialize the configuration service
   * This should be called once when the extension starts
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('GlobalConfig: Already initialized');
      return;
    }

    console.log('GlobalConfig: Initializing configuration service...');

    try {
      await this.loadFromStorage();
      this.initialized = true;
      console.log('GlobalConfig: Initialization complete', this.config);
    } catch (error) {
      console.error('GlobalConfig: Failed to initialize:', error);
      // Use default config if loading fails
      this.config = { ...this.defaultConfig };
      this.initialized = true;
    }
  }

  /**
   * Load configuration from Chrome storage
   */
  private async loadFromStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if we're in Chrome extension context
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('GlobalConfig: Chrome storage not available, using default configuration (test mode)');
        resolve();
        return;
      }

      chrome.storage.sync.get([
        'backendUrl', 
        'openaiApiKey', 
        'model', 
        'enablePersistence', 
        'tavilyApiKey', 
        'lastSelectedCompetition',
        'userEmail'
      ], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        console.log('GlobalConfig: Loaded from storage:', result);

        // Update config with stored values, keeping defaults for missing values
        this.config = {
          backendUrl: result.backendUrl || this.defaultConfig.backendUrl,
          openaiApiKey: result.openaiApiKey || this.defaultConfig.openaiApiKey,
          model: result.model || this.defaultConfig.model,
          tavilyApiKey: result.tavilyApiKey || this.defaultConfig.tavilyApiKey,
          temperature: result.temperature !== undefined ? result.temperature : this.defaultConfig.temperature,
          currentThreadId: this.defaultConfig.currentThreadId,
          userEmail: result.userEmail || this.defaultConfig.userEmail,
          lastSelectedCompetition: result.lastSelectedCompetition || this.defaultConfig.lastSelectedCompetition
        };

        resolve();
      });
    });
  }

  /**
   * Save configuration to Chrome storage
   */
  private async saveToStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if we're in Chrome extension context
      if (typeof chrome === 'undefined' || !chrome.storage) {
        console.log('GlobalConfig: Chrome storage not available, skipping save (test mode)');
        resolve();
        return;
      }

      chrome.storage.sync.set(this.config, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }

        console.log('GlobalConfig: Saved to storage:', this.config);
        resolve();
      });
    });
  }

  /**
   * Get the current configuration
   */
  public getConfig(): GlobalConfig {
    if (!this.initialized) {
      console.warn('GlobalConfig: Configuration not initialized, using defaults');
      return { ...this.defaultConfig };
    }
    return { ...this.config };
  }

  /**
   * Get the backend URL
   */
  public getBackendUrl(): string {
    return this.config.backendUrl;
  }

  public getCurrentThreadId(): string {
    return this.config.currentThreadId;
  }

  public getTavilyApiKey(): string | undefined {
    return this.config.tavilyApiKey;
  }

  /**
   * Check if Tavily API key is valid
   */
  public isValidTavilyApiKey(): boolean {
    const key = this.config.tavilyApiKey;
    return !!(key && key.trim().length > 10 && key.startsWith('tvly-'));
  }

  /**
   * Get the OpenAI API key
   */
  public getOpenAIApiKey(): string | undefined {
    return this.config.openaiApiKey;
  }

  /**
   * Update configuration
   */
  public async updateConfig(updates: Partial<GlobalConfig>): Promise<void> {
    console.log('GlobalConfig: Updating configuration:', updates);

    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...updates };

    try {
      await this.saveToStorage();
      
      // Notify listeners of config changes
      this.notifyListeners();
      
      console.log('GlobalConfig: Configuration updated successfully');
    } catch (error) {
      // Rollback on error
      this.config = oldConfig;
      console.error('GlobalConfig: Failed to update configuration:', error);
      throw error;
    }
  }

  /**
   * Subscribe to configuration changes
   */
  public subscribe(listener: ConfigChangeListener): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of configuration changes
   */
  private notifyListeners(): void {
    const configCopy = { ...this.config };
    this.listeners.forEach(listener => {
      try {
        listener(configCopy);
      } catch (error) {
        console.error('GlobalConfig: Error in config change listener:', error);
      }
    });
  }

  /**
   * Reset configuration to defaults
   */
  public async resetToDefaults(): Promise<void> {
    console.log('GlobalConfig: Resetting to defaults');
    await this.updateConfig(this.defaultConfig);
  }

  /**
   * Check if configuration is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const globalConfig = GlobalConfigService.getInstance();

// Convenience functions for common operations
export const getBackendUrl = (): string => globalConfig.getBackendUrl();
export const getOpenAIApiKey = (): string | undefined => globalConfig.getOpenAIApiKey();
export const getTavilyApiKey = (): string | undefined => globalConfig.getTavilyApiKey();
export const isValidTavilyApiKey = (): boolean => globalConfig.isValidTavilyApiKey();
export const getCurrentThreadId = (): string | undefined => globalConfig.getCurrentThreadId();
export const setUserEmail = (email: string): Promise<void> => globalConfig.updateConfig({ userEmail: email });
export const getUserEmail = (): string | undefined => globalConfig.getConfig().userEmail;
export const generateCompetitionThreadId = (competitionId: string): string => {
  const config = globalConfig.getConfig();
  const email = config.userEmail || 'anonymous';
  return `thread_${email}_${competitionId}`;
};
export const updateCurrentThreadId = (currentThreadId: string): Promise<void> => globalConfig.updateConfig({ currentThreadId: currentThreadId });
export const updateBackendUrl = (url: string): Promise<void> => globalConfig.updateConfig({ backendUrl: url });
export const updateOpenAIApiKey = (key: string): Promise<void> => globalConfig.updateConfig({ openaiApiKey: key });

// New functions for managing last selected competition
export const getLastSelectedCompetition = (): { id: string; title: string; url: string } | null => {
  return globalConfig.getConfig().lastSelectedCompetition || null;
};
export const updateLastSelectedCompetition = (competition: { id: string; title: string; url: string } | null): Promise<void> => {
  console.log('GlobalConfig: Updating last selected competition to:', competition?.id || 'none');
  return globalConfig.updateConfig({ lastSelectedCompetition: competition });
};
