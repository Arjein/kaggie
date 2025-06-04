// Integration test for the complete Kaggie Chrome extension
import { KaggieAgentService } from '../services/kaggieAgentService';
import { type Competition } from '../types/competition';
import { globalConfig } from '../config/globalConfig';

declare global {
  interface Window {
    KaggieIntegrationTest: typeof IntegrationTest;
  }
}

export class IntegrationTest {
  private agentService: KaggieAgentService;

  constructor() {
    this.agentService = KaggieAgentService.getInstance();
  }

  async runCompleteTest(): Promise<boolean> {
    console.log('🚀 Starting Kaggie Extension Integration Test');

    try {
      // Test 1: Chrome storage check
      console.log('📋 Testing Chrome storage...');
      const storageTest = await this.testChromeStorage();
      if (!storageTest) {
        console.error('❌ Chrome storage test failed');
        return false;
      }
      console.log('✅ Chrome storage working');

      // Test 2: Backend connectivity
      console.log('🌐 Testing backend connectivity...');
      const backendTest = await this.testBackendConnectivity();
      if (!backendTest) {
        console.error('❌ Backend connectivity test failed');
        return false;
      }
      console.log('✅ Backend connectivity working');

      // Test 3: Agent initialization (with test keys)
      console.log('🤖 Testing agent initialization...');
      const agentTest = await this.testAgentInitialization();
      if (!agentTest) {
        console.error('❌ Agent initialization test failed');
        return false;
      }
      console.log('✅ Agent initialization working');

      console.log('🎉 All integration tests passed!');
      return true;

    } catch (error) {
      console.error('❌ Integration test failed:', error);
      return false;
    }
  }

  private async testChromeStorage(): Promise<boolean> {
    try {
      const testData = { test: 'value', timestamp: Date.now() };
      
      // Test storage write
      await chrome.storage.local.set(testData);
      
      // Test storage read
      const result = await chrome.storage.local.get(Object.keys(testData));
      
      // Verify data
      const isValid = result.test === testData.test && 
                     typeof result.timestamp === 'number';
      
      // Cleanup
      await chrome.storage.local.remove(Object.keys(testData));
      
      return isValid;
    } catch (error) {
      console.error('Chrome storage test error:', error);
      return false;
    }
  }

  private async testBackendConnectivity(): Promise<boolean> {
    try {
      // Get backend URL from global configuration
      await globalConfig.initialize();
      const config = globalConfig.getConfig();
      const backendUrl = config.backendUrl;
      
      // Test backend health endpoint
      const response = await fetch(`${backendUrl}/health`);
      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch (error) {
      console.error('Backend connectivity test error:', error);
      return false;
    }
  }

  private async testAgentInitialization(): Promise<boolean> {
    try {
      // Test with mock API keys
      const testApiKeys = {
        openaiApiKey: 'test-openai-key',
        tavilyApiKey: 'test-tavily-key'
      };

      // Store test keys temporarily
      await chrome.storage.local.set({
        openai_api_key: testApiKeys.openaiApiKey,
        tavily_api_key: testApiKeys.tavilyApiKey
      });

      // Try to initialize agent service
      const isInitialized = await this.agentService.initialize();
      
      // Cleanup test keys
      await chrome.storage.local.remove(['openai_api_key', 'tavily_api_key']);

      // Should initialize but not be functional with test keys
      return isInitialized;
    } catch (error) {
      console.error('Agent initialization test error:', error);
      return false;
    }
  }

  async testWithRealApiKeys(): Promise<boolean> {
    console.log('🔑 Testing with real API keys...');

    try {
      // Check if real API keys are available
      const hasKeys = await this.agentService.isReady();
      if (!hasKeys) {
        console.log('ℹ️ No API keys configured, skipping real API test');
        return true; // Not a failure, just not configured
      }

      // Initialize with real keys
      const initialized = await this.agentService.initialize();
      if (!initialized) {
        console.error('❌ Failed to initialize with real API keys');
        return false;
      }

      // Test a simple query
      const testCompetition: Competition = {
        id: 'titanic',
        title: 'Titanic: Machine Learning from Disaster',
        url: 'https://www.kaggle.com/c/titanic'
      };

      const response = await this.agentService.processQuery(
        'What is this competition about?',
        testCompetition.id,
        'test-thread'
      );

      const isValidResponse = response && 
                            typeof response.answer === 'string' &&
                            response.answer.length > 0;

      if (isValidResponse) {
        console.log('✅ Agent query test successful');
        console.log('Response preview:', (response.answer as string).substring(0, 100) + '...');
      } else {
        console.error('❌ Invalid agent response');
      }

      return isValidResponse;
    } catch (error) {
      console.error('Real API key test error:', error);
      return false;
    }
  }
}

// Export for global access in extension console
if (typeof window !== 'undefined') {
  (window as Window).KaggieIntegrationTest = IntegrationTest;
}
