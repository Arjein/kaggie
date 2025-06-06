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

describe('Synthetic Message Validation', () => {
  it('should validate the serialization fix with realistic synthetic messages', async () => {
    console.log('\n🧪 Testing message serialization fix with synthetic messages...');

    // Create realistic messages that would have caused the "400 Invalid parameter" error
    const originalMessages = [
      new HumanMessage({ 
        content: "What is machine learning?", 
        id: "human-1" 
      }),
      new AIMessage({ 
        content: "I'll help you understand machine learning. Let me search for comprehensive information.",
        id: "ai-1",
        tool_calls: [
          { 
            id: "call_ml_search", 
            name: "rag_tool", 
            args: { query: "machine learning definition concepts applications" } 
          },
          { 
            id: "call_ml_examples", 
            name: "web_search_tool", 
            args: { query: "machine learning examples 2024" } 
          }
        ]
      }),
      new ToolMessage({
        content: JSON.stringify({
          results: [
            {
              title: "Introduction to Machine Learning",
              content: "Machine learning is a method of data analysis that automates analytical model building..."
            }
          ]
        }),
        id: "tool-1",
        tool_call_id: "call_ml_search",
        name: "rag_tool"
      }),
      new ToolMessage({
        content: JSON.stringify({
          results: [
            {
              title: "10 Real-World Machine Learning Examples", 
              content: "1. Netflix recommendations 2. Email spam filtering 3. Voice assistants..."
            }
          ]
        }),
        id: "tool-2", 
        tool_call_id: "call_ml_examples",
        name: "web_search_tool"
      }),
      new AIMessage({ 
        content: "Machine learning is a powerful subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed. Here are the key concepts:\n\n**What is Machine Learning?**\nMachine learning algorithms build mathematical models based on training data to make predictions or decisions. Instead of following pre-programmed instructions, these systems improve their performance through experience.\n\n**Real-World Applications:**\n- Netflix uses ML to recommend movies and shows\n- Email providers use it to filter spam\n- Voice assistants like Siri understand speech\n- Banks detect fraudulent transactions\n- Medical systems help diagnose diseases\n\nWould you like me to explain any specific aspect in more detail?",
        id: "ai-2"
      })
    ];

    console.log(`\n=== ORIGINAL MESSAGES (${originalMessages.length}) ===`);
    originalMessages.forEach((msg, i) => {
      const msgType = msg.constructor?.name || 'Unknown';
      const content = extractMessageContent(msg);
      const hasToolCalls = 'tool_calls' in msg && msg.tool_calls && msg.tool_calls.length > 0;
      
      console.log(`${i}: ${msgType} - "${content.substring(0, 50)}..."`);
      if (hasToolCalls) {
        console.log(`   🔧 tool_calls: ${msg.tool_calls.length} calls`);
        msg.tool_calls.forEach((call: any, ci: number) => {
          console.log(`      ${ci}: ${call.name} (id: ${call.id})`);
        });
      }
    });

    // Step 1: Serialize messages with our new utility
    console.log('\n=== STEP 1: SERIALIZING WITH NEW UTILITY ===');
    const serialized = serializeMessages(originalMessages);
    
    console.log('✅ Serialization complete');
    serialized.forEach((msg, i) => {
      console.log(`${i}: _type: ${msg._type}, _className: ${msg._className}`);
      if (msg.tool_calls) {
        console.log(`   🔧 tool_calls preserved: ${msg.tool_calls.length} calls`);
      }
    });

    // Step 2: Simulate the JSON storage round trip (this was causing the bug)
    console.log('\n=== STEP 2: JSON STORAGE ROUND TRIP (THE BUG SCENARIO) ===');
    const jsonString = JSON.stringify(serialized);
    const fromJson = JSON.parse(jsonString);
    
    console.log('✅ JSON round trip complete');
    
    // Check for the corruption that was causing the "400 Invalid parameter" error
    let corruptedMessages = 0;
    let preservedToolCalls = 0;
    
    fromJson.forEach((msg: any, i: number) => {
      // Check for type corruption (this was the root cause of the bug)
      if (msg.type === 'constructor' || !msg._type || !msg._className) {
        corruptedMessages++;
        console.log(`❌ CORRUPTED MESSAGE ${i}: type="${msg.type}", _type="${msg._type}", _className="${msg._className}"`);
      } else {
        console.log(`✅ MESSAGE ${i}: _type="${msg._type}", _className="${msg._className}"`);
      }
      
      // Check for tool_calls preservation
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        preservedToolCalls++;
        console.log(`   ✅ tool_calls survived JSON: ${msg.tool_calls.length} calls`);
      }
    });

    // This should now be 0 with our fix
    expect(corruptedMessages).toBe(0);
    console.log(`✅ No corruption detected (was causing "400 Invalid parameter" error)`);

    // Step 3: Deserialize back to LangChain messages
    console.log('\n=== STEP 3: DESERIALIZING WITH NEW UTILITY ===');
    const deserialized = deserializeMessages(fromJson);
    
    console.log('✅ Deserialization complete');
    deserialized.forEach((msg, i) => {
      const msgType = msg.constructor?.name;
      const content = extractMessageContent(msg);
      const hasToolCalls = 'tool_calls' in msg && msg.tool_calls && msg.tool_calls.length > 0;
      
      console.log(`${i}: ${msgType} - "${content.substring(0, 50)}..."`);
      if (hasToolCalls) {
        console.log(`   🔧 tool_calls restored: ${(msg as any).tool_calls.length} calls`);
      }
    });

    // Step 4: Comprehensive validation
    console.log('\n=== STEP 4: COMPREHENSIVE VALIDATION ===');
    
    // Check message count
    expect(deserialized.length).toBe(originalMessages.length);
    console.log(`✅ Message count preserved: ${deserialized.length}`);

    // Check AI message detection (this was broken before the fix)
    const originalAICount = originalMessages.filter(isAIMessage).length;
    const deserializedAICount = deserialized.filter(isAIMessage).length;
    expect(deserializedAICount).toBe(originalAICount);
    console.log(`✅ AI message detection: ${deserializedAICount}/${originalAICount}`);

    // Check tool_calls preservation (this was lost before the fix)
    let toolCallsPreserved = 0;
    let totalToolCallMessages = 0;
    
    deserialized.forEach((msg, i) => {
      if (isAIMessage(msg) && 'tool_calls' in msg && msg.tool_calls) {
        const originalMsg = originalMessages[i];
        if ('tool_calls' in originalMsg && originalMsg.tool_calls) {
          totalToolCallMessages++;
          if (msg.tool_calls.length === originalMsg.tool_calls.length) {
            toolCallsPreserved++;
            
            // Verify tool call details
            msg.tool_calls.forEach((call: any, ci: number) => {
              const originalCall = (originalMsg as any).tool_calls[ci];
              expect(call.id).toBe(originalCall.id);
              expect(call.name).toBe(originalCall.name);
              expect(JSON.stringify(call.args)).toBe(JSON.stringify(originalCall.args));
            });
          }
        }
      }
    });

    if (totalToolCallMessages > 0) {
      expect(toolCallsPreserved).toBe(totalToolCallMessages);
      console.log(`✅ Tool calls preserved: ${toolCallsPreserved}/${totalToolCallMessages}`);
    } else {
      console.log('ℹ️ No tool calls to verify');
    }

    // Check content extraction
    const contentExtracted = deserialized.every((msg, i) => {
      const content = extractMessageContent(msg);
      return content.length > 0;
    });
    
    expect(contentExtracted).toBe(true);
    console.log('✅ Content extraction works for all messages');

    // Verify message types are correct
    deserialized.forEach((msg, i) => {
      const original = originalMessages[i];
      expect(msg.constructor.name).toBe(original.constructor.name);
    });
    console.log('✅ Message types correctly preserved');

    console.log('\n🎉 ALL SERIALIZATION VALIDATION TESTS PASSED!');
    console.log('🔧 The "400 Invalid parameter: only messages with role \'assistant\' can have a function call" error should be FIXED');
    console.log('✨ Messages now properly maintain their LangChain structure through JSON serialization');
  });

  it('should demonstrate the bug that was fixed', async () => {
    console.log('\n🐛 Demonstrating the bug that was causing "400 Invalid parameter" error...');

    // Create an AI message with tool calls (this was problematic)
    const aiMessage = new AIMessage({
      content: "I'll search for information.",
      id: "ai-1",
      tool_calls: [{ 
        id: "call_123", 
        name: "search_tool", 
        args: { query: "test" } 
      }]
    });

    console.log('Original AI message:');
    console.log(`- Type: ${aiMessage.constructor.name}`);
    console.log(`- Has tool_calls: ${!!aiMessage.tool_calls}`);
    console.log(`- Tool calls count: ${aiMessage.tool_calls?.length || 0}`);

    // Simulate the old buggy behavior (raw JSON.stringify/parse)
    console.log('\n❌ OLD BUGGY APPROACH (raw JSON stringify/parse):');
    const rawJsonString = JSON.stringify(aiMessage);
    const rawParsed = JSON.parse(rawJsonString);

    console.log(`- Type after JSON: ${rawParsed.constructor?.name || 'Object'}`);
    console.log(`- type property: "${rawParsed.type}"`); // This becomes "constructor"!
    console.log(`- Has tool_calls: ${!!rawParsed.tool_calls}`); // This becomes false!
    console.log(`- Is plain Object: ${rawParsed.constructor === Object}`);

    // This is what was causing the "400 Invalid parameter" error:
    // - Messages became plain Objects instead of LangChain message instances
    // - The "type" property got corrupted to "constructor"
    // - tool_calls were lost
    // - AI message detection failed

    console.log('\n✅ NEW FIXED APPROACH (with serialization utilities):');
    const serialized = serializeMessage(aiMessage);
    const jsonString = JSON.stringify(serialized);
    const fromJson = JSON.parse(jsonString);
    const deserialized = deserializeMessage(fromJson);

    console.log(`- Type after fix: ${deserialized.constructor.name}`);
    console.log(`- Has tool_calls: ${!!(deserialized as any).tool_calls}`);
    console.log(`- Tool calls count: ${(deserialized as any).tool_calls?.length || 0}`);
    console.log(`- Is AIMessage: ${isAIMessage(deserialized)}`);

    // Verify the fix works
    expect(deserialized.constructor.name).toBe('AIMessage');
    expect(isAIMessage(deserialized)).toBe(true);
    expect((deserialized as any).tool_calls).toBeDefined();
    expect((deserialized as any).tool_calls?.length).toBe(1);

    console.log('\n🎯 BUG DEMONSTRATION COMPLETE - The fix works!');
  });
});
