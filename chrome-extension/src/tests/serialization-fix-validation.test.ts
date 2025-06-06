// Test to validate the serialization fix that resolves the "400 Invalid parameter" error
import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { 
  serializeMessage, 
  deserializeMessage, 
  serializeMessages, 
  deserializeMessages,
  isAIMessage,
  extractMessageContent
} from '../utils/messageSerializer';

describe('Serialization Fix Validation', () => {
  it('should fix the "400 Invalid parameter" error by preserving message structure', () => {
    console.log('\n🔧 Testing the fix for "400 Invalid parameter: only messages with role \'assistant\' can have a function call"');
    
    // Create realistic messages that would cause the original error
    const originalMessages = [
      new HumanMessage({ 
        content: "What are the latest machine learning trends?", 
        id: "human-1" 
      }),
      new AIMessage({ 
        content: "I'll search for the latest ML trends for you.",
        id: "ai-1",
        tool_calls: [
          { 
            id: "call_search_123", 
            name: "web_search_tool", 
            args: { query: "machine learning trends 2024 2025" } 
          },
          { 
            id: "call_rag_456", 
            name: "rag_tool", 
            args: { query: "latest AI developments" } 
          }
        ]
      }),
      new ToolMessage({
        content: JSON.stringify({
          results: [
            { title: "Top ML Trends 2025", content: "Transformer architectures continue to dominate..." }
          ]
        }),
        id: "tool-1",
        tool_call_id: "call_search_123",
        name: "web_search_tool"
      }),
      new ToolMessage({
        content: JSON.stringify({
          documents: [
            { content: "Recent advances in neural architecture search..." }
          ]
        }),
        id: "tool-2", 
        tool_call_id: "call_rag_456",
        name: "rag_tool"
      }),
      new AIMessage({ 
        content: "Based on my research, here are the key ML trends for 2025:\n\n1. **Transformer Evolution**: Continued improvements in efficiency\n2. **Multimodal AI**: Integration of text, image, and audio processing\n3. **Edge AI**: Running models on mobile and IoT devices\n4. **Automated ML**: Tools that make ML accessible to non-experts\n\nWould you like me to elaborate on any of these trends?",
        id: "ai-2"
      })
    ];

    console.log(`\n📊 Original messages: ${originalMessages.length} total`);
    
    // Show the structure that would cause the error with naive JSON serialization
    console.log('\n❌ DEMONSTRATING THE ORIGINAL BUG:');
    const naiveJsonSerialized = JSON.stringify(originalMessages);
    const naiveJsonDeserialized = JSON.parse(naiveJsonSerialized);
    
    let corruptedCount = 0;
    let lostToolCalls = 0;
    
    naiveJsonDeserialized.forEach((msg: any, i: number) => {
      // This is what caused the "400 Invalid parameter" error
      if (msg.type === 'constructor') {
        corruptedCount++;
        console.log(`  Message ${i}: type corrupted to "constructor" (was AIMessage)`);
      }
      
      // Check for lost tool_calls
      const originalMsg = originalMessages[i];
      if ('tool_calls' in originalMsg && originalMsg.tool_calls && originalMsg.tool_calls.length > 0) {
        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          lostToolCalls++;
          console.log(`  Message ${i}: lost ${originalMsg.tool_calls.length} tool_calls`);
        }
      }
    });
    
    console.log(`❌ Naive serialization would cause ${corruptedCount} corrupted messages and ${lostToolCalls} lost tool_calls`);
    console.log('   This is what caused the "400 Invalid parameter" error!');

    // Now test our fix
    console.log('\n✅ TESTING OUR SERIALIZATION FIX:');
    
    // Step 1: Serialize with our fix
    const properSerialized = serializeMessages(originalMessages);
    console.log(`✅ Step 1: Serialized ${properSerialized.length} messages with metadata preservation`);
    
    // Verify serialization preserves critical data
    properSerialized.forEach((msg, i) => {
      expect(msg._type).toBeDefined();
      expect(msg._className).toBeDefined();
      expect(msg._type).not.toBe('constructor');
      
      const originalMsg = originalMessages[i];
      if ('tool_calls' in originalMsg && originalMsg.tool_calls) {
        expect(msg.tool_calls).toBeDefined();
        expect(msg.tool_calls.length).toBe(originalMsg.tool_calls.length);
        console.log(`  Message ${i}: preserved ${msg.tool_calls.length} tool_calls`);
      }
    });

    // Step 2: Simulate storage (JSON round trip)
    const jsonString = JSON.stringify(properSerialized);
    const fromStorage = JSON.parse(jsonString);
    console.log('✅ Step 2: Survived JSON storage round trip');
    
    // Verify no corruption after JSON round trip
    fromStorage.forEach((msg: any, i: number) => {
      expect(msg.type).not.toBe('constructor');
      expect(msg._type).toBeDefined();
      expect(msg._className).toBeDefined();
      
      if (msg.tool_calls) {
        console.log(`  Message ${i}: tool_calls intact after JSON: ${msg.tool_calls.length} calls`);
      }
    });

    // Step 3: Deserialize back to LangChain messages
    const restored = deserializeMessages(fromStorage);
    console.log(`✅ Step 3: Deserialized back to ${restored.length} LangChain messages`);
    
    // Verify restoration
    restored.forEach((msg, i) => {
      const originalMsg = originalMessages[i];
      
      // Check constructor restoration
      expect(msg.constructor.name).toBe(originalMsg.constructor.name);
      console.log(`  Message ${i}: ${originalMsg.constructor.name} → ${msg.constructor.name} ✓`);
      
      // Check tool_calls restoration for AI messages
      if (isAIMessage(originalMsg) && 'tool_calls' in originalMsg && originalMsg.tool_calls) {
        expect(isAIMessage(msg)).toBe(true);
        expect('tool_calls' in msg).toBe(true);
        expect((msg as any).tool_calls.length).toBe(originalMsg.tool_calls.length);
        console.log(`  Message ${i}: restored ${(msg as any).tool_calls.length} tool_calls ✓`);
      }
      
      // Check content preservation
      const originalContent = extractMessageContent(originalMsg);
      const restoredContent = extractMessageContent(msg);
      expect(restoredContent).toBe(originalContent);
    });

    console.log('\n🎉 SERIALIZATION FIX VALIDATION COMPLETE!');
    console.log('✅ Messages maintain proper LangChain structure');
    console.log('✅ AI messages are correctly identified');
    console.log('✅ tool_calls are preserved throughout the process');
    console.log('✅ No "constructor" type corruption');
    console.log('🔧 This fix should resolve the "400 Invalid parameter" error');
  });

  it('should correctly identify AI messages with tool_calls', () => {
    const aiMessageWithTools = new AIMessage({
      content: "I'll help you with that.",
      id: "ai-1",
      tool_calls: [
        { id: "call_123", name: "search_tool", args: { query: "test" } }
      ]
    });

    const humanMessage = new HumanMessage({
      content: "Help me please",
      id: "human-1"
    });

    // Test original messages
    expect(isAIMessage(aiMessageWithTools)).toBe(true);
    expect(isAIMessage(humanMessage)).toBe(false);

    // Test after serialization round trip
    const serialized = serializeMessages([aiMessageWithTools, humanMessage]);
    const jsonString = JSON.stringify(serialized);
    const fromJson = JSON.parse(jsonString);
    const deserialized = deserializeMessages(fromJson);

    expect(isAIMessage(deserialized[0])).toBe(true);
    expect(isAIMessage(deserialized[1])).toBe(false);
    
    // Verify tool_calls survived
    expect('tool_calls' in deserialized[0]).toBe(true);
    expect((deserialized[0] as any).tool_calls.length).toBe(1);
    expect((deserialized[0] as any).tool_calls[0].name).toBe('search_tool');

    console.log('✅ AI message detection works correctly after serialization');
    console.log('✅ tool_calls are preserved and accessible');
  });
});
