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

describe('Message Serializer', () => {
  it('should preserve message types and tool_calls through serialization', () => {
    // Create test messages
    const humanMsg = new HumanMessage({ content: "Test query", id: "human-1" });
    const aiMsg = new AIMessage({ 
      content: "I'll help you.",
      id: "ai-1",
      tool_calls: [{ id: "call_123", name: "rag_tool", args: { query: "test" } }]
    });
    const toolMsg = new ToolMessage({
      content: "Tool result",
      id: "tool-1",
      tool_call_id: "call_123",
      name: "rag_tool"
    });

    const originalMessages = [humanMsg, aiMsg, toolMsg];

    console.log('=== ORIGINAL MESSAGES ===');
    originalMessages.forEach((msg, i) => {
      console.log(`${i}: ${msg.constructor.name} - _getType(): ${msg._getType()}`);
      if ('tool_calls' in msg && msg.tool_calls) {
        console.log(`   tool_calls: ${JSON.stringify(msg.tool_calls)}`);
      }
    });

    // Serialize messages
    const serialized = serializeMessages(originalMessages);
    
    console.log('\n=== SERIALIZED MESSAGES ===');
    serialized.forEach((msg, i) => {
      console.log(`${i}: _type: ${msg._type}, _className: ${msg._className}`);
      if (msg.tool_calls) {
        console.log(`   tool_calls preserved: ${JSON.stringify(msg.tool_calls)}`);
      }
    });

    // Simulate JSON storage round trip
    const jsonString = JSON.stringify(serialized);
    const fromJson = JSON.parse(jsonString);
    
    console.log('\n=== AFTER JSON ROUND TRIP ===');
    fromJson.forEach((msg: any, i: number) => {
      console.log(`${i}: _type: ${msg._type}, _className: ${msg._className}`);
      if (msg.tool_calls) {
        console.log(`   tool_calls still there: ${JSON.stringify(msg.tool_calls)}`);
      }
    });

    // Deserialize back to LangChain messages
    const deserialized = deserializeMessages(fromJson);
    
    console.log('\n=== DESERIALIZED MESSAGES ===');
    deserialized.forEach((msg, i) => {
      console.log(`${i}: ${msg.constructor.name} - _getType(): ${msg._getType()}`);
      if ('tool_calls' in msg && msg.tool_calls) {
        console.log(`   tool_calls restored: ${JSON.stringify(msg.tool_calls)}`);
      }
    });

    // Test assertions
    expect(deserialized).toHaveLength(3);
    expect(deserialized[0]).toBeInstanceOf(HumanMessage);
    expect(deserialized[1]).toBeInstanceOf(AIMessage);
    expect(deserialized[2]).toBeInstanceOf(ToolMessage);

    // Test AI message tool_calls preservation
    const deserializedAI = deserialized[1] as AIMessage;
    expect('tool_calls' in deserializedAI).toBe(true);
    expect(deserializedAI.tool_calls).toBeDefined();
    expect(deserializedAI.tool_calls?.length).toBe(1);
    expect(deserializedAI.tool_calls?.[0].name).toBe('rag_tool');

    // Test message detection
    expect(isAIMessage(deserializedAI)).toBe(true);
    expect(isAIMessage(deserialized[0])).toBe(false);

    // Test content extraction
    expect(extractMessageContent(deserializedAI)).toBe("I'll help you.");
    expect(extractMessageContent(deserialized[0])).toBe("Test query");

    console.log('\n✅ All message serialization tests passed!');
  });
});
