// Final validation test - demonstrates the complete serialization fix
import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { 
  serializeMessages, 
  deserializeMessages,
  isAIMessage,
  extractMessageContent
} from '../utils/messageSerializer';

describe('🎉 Final Serialization Fix Validation', () => {
  it('should completely resolve the "400 Invalid parameter" error', () => {
    console.log('\n🚀 FINAL TEST: Complete serialization fix validation');
    console.log('=' .repeat(60));
    
    // Create the exact scenario that caused the original "400 Invalid parameter" error
    const realWorldMessages = [
      new HumanMessage({ 
        content: "What are the key trends in machine learning for 2025?", 
        id: "human-msg-1" 
      }),
      new AIMessage({ 
        content: "I'll search for the latest machine learning trends for you. Let me gather comprehensive information from multiple sources.",
        id: "ai-msg-1",
        tool_calls: [
          { 
            id: "call_web_search_123", 
            name: "web_search_tool", 
            args: { 
              query: "machine learning trends 2025 artificial intelligence developments" 
            } 
          },
          { 
            id: "call_rag_search_456", 
            name: "rag_tool", 
            args: { 
              query: "AI trends ML developments 2025 neural networks transformer models" 
            } 
          }
        ]
      }),
      new ToolMessage({
        content: JSON.stringify({
          results: [
            {
              title: "Top 10 Machine Learning Trends for 2025",
              url: "https://example.com/ml-trends-2025",
              content: "1. Advanced Transformer Architectures 2. Multimodal AI Systems 3. Edge AI Computing..."
            },
            {
              title: "AI Predictions 2025: What's Next?", 
              url: "https://example.com/ai-predictions",
              content: "The year 2025 will see unprecedented growth in AI capabilities..."
            }
          ]
        }),
        id: "tool-msg-1",
        tool_call_id: "call_web_search_123",
        name: "web_search_tool"
      }),
      new ToolMessage({
        content: JSON.stringify({
          documents: [
            {
              content: "Recent advances in neural architecture search have led to more efficient model designs...",
              metadata: { source: "research_papers", relevance: 0.95 }
            },
            {
              content: "Federated learning and privacy-preserving ML techniques are becoming mainstream...",
              metadata: { source: "industry_reports", relevance: 0.92 }
            }
          ]
        }),
        id: "tool-msg-2", 
        tool_call_id: "call_rag_search_456",
        name: "rag_tool"
      }),
      new AIMessage({ 
        content: `Based on my comprehensive research, here are the key machine learning trends for 2025:

## 🚀 Major ML Trends for 2025

### 1. **Advanced Transformer Architectures**
- More efficient attention mechanisms
- Reduced computational requirements
- Better performance on long sequences

### 2. **Multimodal AI Systems**
- Integration of text, image, audio, and video processing
- Cross-modal understanding and generation
- Applications in robotics and autonomous systems

### 3. **Edge AI Computing** 
- Running ML models on mobile and IoT devices
- Reduced latency and improved privacy
- Optimized model architectures for resource-constrained environments

### 4. **Federated Learning & Privacy**
- Training models without centralizing data
- Differential privacy techniques
- Compliance with data protection regulations

### 5. **Neural Architecture Search (NAS)**
- Automated model design optimization
- Hardware-aware architecture optimization
- Discovery of novel model structures

These trends indicate a shift towards more efficient, privacy-conscious, and accessible AI systems. Would you like me to elaborate on any specific trend?`,
        id: "ai-msg-2"
      })
    ];

    console.log(`\n📊 Testing with ${realWorldMessages.length} realistic messages`);
    console.log('   - 1 Human message');
    console.log('   - 2 AI messages (1 with multiple tool_calls)');  
    console.log('   - 2 Tool messages');

    // STEP 1: Demonstrate the original bug
    console.log('\n❌ STEP 1: Demonstrating the original bug (naive JSON serialization)');
    
    const naiveJson = JSON.stringify(realWorldMessages);
    const naiveParsed = JSON.parse(naiveJson);
    
    let corruptedMessages = 0;
    let lostToolCalls = 0;
    
    naiveParsed.forEach((msg: any, i: number) => {
      if (msg.type === 'constructor') {
        corruptedMessages++;
        console.log(`   ⚠️  Message ${i}: type corrupted to "constructor"`);
      }
      
      const originalMsg = realWorldMessages[i];
      if ('tool_calls' in originalMsg && originalMsg.tool_calls && originalMsg.tool_calls.length > 0) {
        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          lostToolCalls++;
          console.log(`   💥 Message ${i}: LOST ${originalMsg.tool_calls.length} tool_calls!`);
        }
      }
    });
    
    console.log(`\n   💀 CORRUPTION SUMMARY:`);
    console.log(`      - ${corruptedMessages} messages with corrupted types`);
    console.log(`      - ${lostToolCalls} messages lost their tool_calls`);
    console.log(`      - This would cause: "400 Invalid parameter: only messages with role 'assistant' can have a function call"`);

    // STEP 2: Apply our serialization fix
    console.log('\n✅ STEP 2: Applying our serialization fix');
    
    const serialized = serializeMessages(realWorldMessages);
    console.log(`   🔧 Serialized ${serialized.length} messages with metadata preservation`);
    
    // Verify serialization preserves metadata
    serialized.forEach((msg, i) => {
      expect(msg._type).toBeDefined();
      expect(msg._className).toBeDefined();
      expect(msg._type).not.toBe('constructor');
      
      const originalMsg = realWorldMessages[i];
      if ('tool_calls' in originalMsg && originalMsg.tool_calls) {
        expect(msg.tool_calls).toBeDefined();
        expect(msg.tool_calls.length).toBe(originalMsg.tool_calls.length);
        console.log(`   ✅ Message ${i}: preserved ${msg.tool_calls.length} tool_calls`);
      }
    });

    // STEP 3: Simulate storage round trip
    console.log('\n🔄 STEP 3: Simulating storage round trip (JSON.stringify/parse)');
    
    const jsonString = JSON.stringify(serialized);
    const fromStorage = JSON.parse(jsonString);
    
    console.log('   ✅ Survived JSON round trip');
    
    // Verify no corruption
    fromStorage.forEach((msg: any, i: number) => {
      expect(msg.type).not.toBe('constructor');
      expect(msg._type).toBeDefined();
      expect(msg._className).toBeDefined();
    });

    // STEP 4: Deserialize back to LangChain messages  
    console.log('\n🔄 STEP 4: Deserializing back to LangChain messages');
    
    const restored = deserializeMessages(fromStorage);
    console.log(`   ✅ Restored ${restored.length} LangChain messages`);
    
    // STEP 5: Comprehensive validation
    console.log('\n🧪 STEP 5: Comprehensive validation');
    
    restored.forEach((msg, i) => {
      const original = realWorldMessages[i];
      
      // Verify constructor restoration
      expect(msg.constructor.name).toBe(original.constructor.name);
      console.log(`   ✅ Message ${i}: ${original.constructor.name} → ${msg.constructor.name}`);
      
      // Verify AI message detection
      expect(isAIMessage(msg)).toBe(isAIMessage(original));
      
      // Verify tool_calls restoration
      if (isAIMessage(original) && 'tool_calls' in original && original.tool_calls) {
        expect(isAIMessage(msg)).toBe(true);
        expect('tool_calls' in msg).toBe(true);
        
        const msgWithTools = msg as AIMessage & { tool_calls: any[] };
        const originalWithTools = original as AIMessage & { tool_calls: any[] };
        
        expect(msgWithTools.tool_calls.length).toBe(originalWithTools.tool_calls.length);
        console.log(`   🔧 Message ${i}: restored ${msgWithTools.tool_calls.length} tool_calls`);
        
        // Verify individual tool calls
        msgWithTools.tool_calls.forEach((toolCall, tcIndex) => {
          const originalToolCall = originalWithTools.tool_calls[tcIndex];
          expect(toolCall.id).toBe(originalToolCall.id);
          expect(toolCall.name).toBe(originalToolCall.name);
          console.log(`      - Tool call ${tcIndex}: ${toolCall.name} (${toolCall.id})`);
        });
      }
      
      // Verify content preservation
      const originalContent = extractMessageContent(original);
      const restoredContent = extractMessageContent(msg);
      expect(restoredContent).toBe(originalContent);
    });

    // FINAL VERIFICATION: Test that AI messages are properly identified
    console.log('\n🎯 STEP 6: Final verification of AI message detection');
    
    const originalAiCount = realWorldMessages.filter(isAIMessage).length;
    const restoredAiCount = restored.filter(isAIMessage).length;
    
    expect(restoredAiCount).toBe(originalAiCount);
    expect(restoredAiCount).toBe(2); // We have exactly 2 AI messages
    
    console.log(`   ✅ AI message detection: ${restoredAiCount}/${originalAiCount} correctly identified`);
    
    // Count tool_calls
    const originalToolCallCount = realWorldMessages
      .filter(msg => isAIMessage(msg) && 'tool_calls' in msg && msg.tool_calls)
      .reduce((sum, msg) => sum + (msg as any).tool_calls.length, 0);
      
    const restoredToolCallCount = restored
      .filter(msg => isAIMessage(msg) && 'tool_calls' in msg && (msg as any).tool_calls)
      .reduce((sum, msg) => sum + (msg as any).tool_calls.length, 0);
    
    expect(restoredToolCallCount).toBe(originalToolCallCount);
    expect(restoredToolCallCount).toBe(2); // We have exactly 2 tool calls
    
    console.log(`   🔧 Tool calls preserved: ${restoredToolCallCount}/${originalToolCallCount}`);

    console.log('\n' + '='.repeat(60));
    console.log('🎉 SERIALIZATION FIX VALIDATION COMPLETE!');
    console.log('✅ Messages maintain proper LangChain structure');
    console.log('✅ AI messages are correctly identified after serialization');
    console.log('✅ tool_calls are preserved throughout the entire process');
    console.log('✅ No "constructor" type corruption');
    console.log('✅ Content is preserved exactly');
    console.log('');
    console.log('🔧 RESULT: The "400 Invalid parameter" error should be completely resolved!');
    console.log('🚀 The KaggieAgent can now safely use tool_calls without serialization issues!');
    console.log('=' .repeat(60));
  });

  it('should handle edge cases correctly', () => {
    console.log('\n🧪 Testing edge cases...');
    
    // Test empty messages
    const emptyResult = deserializeMessages([]);
    expect(emptyResult).toEqual([]);
    console.log('✅ Empty array handled correctly');
    
    // Test single message
    const singleMessage = [new HumanMessage({ content: "Test", id: "test" })];
    const singleSerialized = serializeMessages(singleMessage);
    const singleDeserialized = deserializeMessages(singleSerialized);
    
    expect(singleDeserialized.length).toBe(1);
    expect(singleDeserialized[0].constructor.name).toBe('HumanMessage');
    console.log('✅ Single message handled correctly');
    
    // Test message without tool_calls
    const simpleAI = new AIMessage({ content: "Simple response", id: "simple" });
    const simpleSerialized = serializeMessages([simpleAI]);
    const simpleDeserialized = deserializeMessages(simpleSerialized);
    
    expect(isAIMessage(simpleDeserialized[0])).toBe(true);
    console.log('✅ AI message without tool_calls handled correctly');
    
    console.log('✅ All edge cases pass!');
  });
});
