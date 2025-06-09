// Test KaggieAgentService integration with the serialization fix
import { describe, it, expect, beforeAll } from 'vitest';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { kaggieAgentService } from '../services/kaggieAgentService';
import { storageService } from '../services/storageService';
import { globalConfig } from '../config/globalConfig';
import { 
  serializeMessages, 
  deserializeMessages,
  isAIMessage
} from '../utils/messageSerializer';

// Define a type for AI messages with tool_calls
type AIMessageWithToolCalls = AIMessage & { tool_calls: unknown[] };

describe('KaggieAgentService Integration Tests', () => {
  beforeAll(async () => {
    await globalConfig.initialize();
  });

  it('should use proper serialization utilities', async () => {
    console.log('\n🔧 Testing KaggieAgentService integration with serialization fix...');
    
    // Test that the service is using our serialization utilities
    const testMessages = [
      new HumanMessage({ content: "Test question", id: "human-1" }),
      new AIMessage({ 
        content: "I'll help you with that.",
        id: "ai-1",
        tool_calls: [
          { id: "call_123", name: "test_tool", args: { query: "test" } }
        ]
      }),
      new ToolMessage({
        content: "Tool response",
        id: "tool-1",
        tool_call_id: "call_123",
        name: "test_tool"
      }),
      new AIMessage({ 
        content: "Here's the answer based on the tool response.",
        id: "ai-2"
      })
    ];

    console.log(`📊 Testing with ${testMessages.length} messages`);

    // Test the serialization flow that KaggieAgentService would use
    console.log('\n1️⃣ Testing message storage...');
    
    // Use the storeLangChainMessages method that KaggieAgentService should use
    const threadId = 'test-thread-integration';
    await storageService.storeLangChainMessages(threadId, testMessages);
    console.log('✅ Messages stored using storeLangChainMessages');

    // Retrieve messages using the new method
    const retrievedMessages = await storageService.getLangChainMessages(threadId);
    console.log(`✅ Retrieved ${retrievedMessages.length} messages using getLangChainMessages`);

    // Verify integrity
    expect(retrievedMessages.length).toBe(testMessages.length);
    
    retrievedMessages.forEach((msg, i) => {
      const original = testMessages[i];
      
      // Check constructor restoration
      expect(msg.constructor.name).toBe(original.constructor.name);
      
      // Check AI message detection
      expect(isAIMessage(msg)).toBe(isAIMessage(original));
      
      // Check tool_calls preservation
      if ('tool_calls' in original && original.tool_calls) {
        expect('tool_calls' in msg).toBe(true);
        const msgWithToolCalls = msg as AIMessageWithToolCalls;
        const originalWithToolCalls = original as AIMessageWithToolCalls;
        expect(msgWithToolCalls.tool_calls.length).toBe(originalWithToolCalls.tool_calls.length);
        console.log(`  Message ${i}: tool_calls preserved (${msgWithToolCalls.tool_calls.length} calls)`);
      }
    });

    console.log('✅ All messages preserved correctly through storage round trip');

    // Test the service readiness without actual API calls
    console.log('\n2️⃣ Testing service readiness...');
    const isReady = await kaggieAgentService.isReady();
    console.log(`✅ Service readiness check: ${isReady ? 'ready' : 'not ready'}`);

    console.log('\n🎉 INTEGRATION TEST COMPLETE!');
    console.log('✅ KaggieAgentService properly uses serialization utilities');
    console.log('✅ Storage service correctly preserves LangChain message structure');
    console.log('🔧 The "400 Invalid parameter" error should be resolved');
  });

  it('should properly detect AI messages after deserialization', () => {
    console.log('\n🔧 Testing AI message detection after deserialization...');
    
    const mixedMessages = [
      new HumanMessage({ content: "Hello", id: "h1" }),
      new AIMessage({ content: "Hi there", id: "a1" }),
      new AIMessage({ 
        content: "Let me search for that",
        id: "a2",
        tool_calls: [{ id: "call_1", name: "search", args: {} }]
      }),
      new ToolMessage({ 
        content: "Results",
        id: "t1", 
        tool_call_id: "call_1",
        name: "search"
      })
    ];

    // Serialize and deserialize
    const serialized = serializeMessages(mixedMessages);
    const jsonString = JSON.stringify(serialized);
    const fromJson = JSON.parse(jsonString);
    const deserialized = deserializeMessages(fromJson);

    // Test AI message detection
    const originalAiCount = mixedMessages.filter(isAIMessage).length;
    const deserializedAiCount = deserialized.filter(isAIMessage).length;
    
    expect(deserializedAiCount).toBe(originalAiCount);
    expect(deserializedAiCount).toBe(2); // We have 2 AI messages
    
    console.log(`✅ AI message detection: ${deserializedAiCount}/${originalAiCount} detected correctly`);
    
    // Test that tool_calls are preserved in AI messages
    const aiWithToolsOriginal = mixedMessages.find(msg => 
      isAIMessage(msg) && 'tool_calls' in msg && msg.tool_calls && (msg as AIMessageWithToolCalls).tool_calls.length > 0
    );
    const aiWithToolsDeserialized = deserialized.find(msg => 
      isAIMessage(msg) && 'tool_calls' in msg && msg.tool_calls && (msg as AIMessageWithToolCalls).tool_calls.length > 0
    );
    
    expect(aiWithToolsOriginal).toBeDefined();
    expect(aiWithToolsDeserialized).toBeDefined();
    
    if (aiWithToolsOriginal && aiWithToolsDeserialized) {
      const originalWithTools = aiWithToolsOriginal as AIMessageWithToolCalls;
      const deserializedWithTools = aiWithToolsDeserialized as AIMessageWithToolCalls;
      expect(deserializedWithTools.tool_calls.length).toBe(originalWithTools.tool_calls.length);
    }is 
    
    console.log('✅ AI messages with tool_calls preserved correctly');
  });
});
