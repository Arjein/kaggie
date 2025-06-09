// Test to isolate the storage service issue
import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

describe('Storage Service Isolation Tests', () => {
  it('should import storage service without hanging', async () => {
    console.log('\n🔧 Testing storage service import...');
    
    // Test that we can import the service without hanging
    const { storageService } = await import('../services/storageService');
    expect(storageService).toBeDefined();
    console.log('✅ Storage service imported successfully');
  });

  it('should call initialize without hanging', async () => {
    console.log('\n🔧 Testing storage service initialization...');
    
    const { storageService } = await import('../services/storageService');
    
    // Set a timeout to catch if this hangs
    const initPromise = storageService.initialize();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Initialize timed out')), 2000);
    });
    
    try {
      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ Storage service initialized without hanging');
    } catch (error) {
      console.log('❌ Storage service initialization issue:', error);
      throw error;
    }
  });

  it('should test serialization utilities directly', async () => {
    console.log('\n🔧 Testing serialization utilities in isolation...');
    
    // Import and test serialization utilities without storage service
    const { serializeMessages, deserializeMessages, isAIMessage } = await import('../utils/messageSerializer');
    
    const testMessage = new AIMessage({
      content: "Test message",
      id: "test-1",
      tool_calls: [{ id: "call_1", name: "test_tool", args: {} }]
    });
    
    console.log('Original message:', testMessage.constructor.name);
    
    const serialized = serializeMessages([testMessage]);
    console.log('✅ Serialization completed');
    
    const jsonString = JSON.stringify(serialized);
    const fromJson = JSON.parse(jsonString);
    console.log('✅ JSON round trip completed');
    
    const [deserialized] = deserializeMessages(fromJson);
    console.log('✅ Deserialization completed');
    
    expect(deserialized.constructor.name).toBe('AIMessage');
    expect(isAIMessage(deserialized)).toBe(true);
    
    console.log('✅ Serialization utilities work perfectly');
    console.log('🔧 This proves the core fix is working correctly');
  });
});
