import { describe, it, expect } from 'vitest';

// Import the real services that were causing issues
import { serializeMessage, deserializeMessage } from '../utils/messageSerializer';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

// Create real LangChain message objects (what was causing the 400 error)
const createRealAIMessageWithToolCall = () => new AIMessage({
  content: "I'll help you analyze this Kaggle competition data.",
  tool_calls: [
    {
      name: 'python_repl',
      args: {
        command: 'import pandas as pd\ndf = pd.read_csv("train.csv")\nprint(df.head())'
      },
      id: 'call_abc123def456',
      type: 'tool_call'
    }
  ]
});

const createRealHumanMessage = () => new HumanMessage({
  content: "Can you help me analyze this Kaggle competition dataset?"
});

describe('Production Scenario - Message Serialization Fix', () => {
  it('should handle real AI message with tool calls without 400 error', () => {
    const realAIMessage = createRealAIMessageWithToolCall();
    
    // This is what was causing the 400 error - JSON serialization breaks the message
    const brokenSerialized = JSON.stringify(realAIMessage);
    const brokenDeserialized = JSON.parse(brokenSerialized);
    
    // Verify the broken case (what was happening before)
    expect(brokenDeserialized.tool_calls).toBeUndefined(); // Lost during JSON serialization
    expect(brokenDeserialized.type).toBe('constructor'); // Wrong type
    expect(brokenDeserialized.id).toEqual(['langchain', 'core', 'messages', 'ai', 'AIMessage']);
    
    // Now test our fix
    const properSerialized = serializeMessage(realAIMessage);
    const properDeserialized = deserializeMessage(properSerialized);
    
    // Verify our fix preserves everything
    expect((properDeserialized as AIMessage).tool_calls).toBeDefined();
    expect((properDeserialized as AIMessage).tool_calls).toHaveLength(1);
    expect((properDeserialized as AIMessage).tool_calls![0].name).toBe('python_repl');
    expect((properDeserialized as AIMessage).tool_calls![0].id).toBe('call_abc123def456');
    expect(properDeserialized._getType()).toBe('ai'); // Correct type for LangChain
  });

  it('should properly handle conversation with mixed message types', () => {
    const conversation = [
      createRealHumanMessage(),
      createRealAIMessageWithToolCall()
    ];

    // Test the conversion process that was failing
    const serializedConversation = conversation.map(msg => serializeMessage(msg));
    const deserializedConversation = serializedConversation.map(msg => deserializeMessage(msg));

    expect(deserializedConversation).toHaveLength(2);
    
    // Human message
    expect(deserializedConversation[0]._getType()).toBe('human');
    expect(deserializedConversation[0].content).toBe("Can you help me analyze this Kaggle competition dataset?");
    
    // AI message with tool calls
    expect(deserializedConversation[1]._getType()).toBe('ai');
    expect((deserializedConversation[1] as AIMessage).tool_calls).toBeDefined();
    expect((deserializedConversation[1] as AIMessage).tool_calls).toHaveLength(1);
    expect(deserializedConversation[1].content).toBe("I'll help you analyze this Kaggle competition data.");
  });

  it('should not produce 400 error format in message detection', () => {
    const realAIMessage = createRealAIMessageWithToolCall();
    
    // Test serialization doesn't break message detection
    const serialized = serializeMessage(realAIMessage);
    const deserializedMessage = deserializeMessage(serialized);
    
    // This is the check that was causing the 400 error
    // The original code was doing: message.role === 'assistant'
    // But LangChain messages don't have a 'role' property, they have _getType()
    
    // Verify our message detection works correctly
    expect(deserializedMessage._getType()).toBe('ai');
    expect((deserializedMessage as AIMessage).tool_calls).toBeDefined();
    
    // Simulate the convertAgentMessagesToConversation logic
    const isAIMessage = deserializedMessage._getType() === 'ai';
    const hasToolCalls = (deserializedMessage as AIMessage).tool_calls && (deserializedMessage as AIMessage).tool_calls!.length > 0;
    
    expect(isAIMessage).toBe(true);
    expect(hasToolCalls).toBe(true);
    
    // This should NOT produce a message with role: 'assistant' and function_call
    // which was causing the 400 error
    const conversationFormat = {
      role: isAIMessage ? 'assistant' : 'user',
      content: deserializedMessage.content
    };
    
    // Tool calls should be handled separately, not as function_call on assistant message
    expect(conversationFormat.role).toBe('assistant');
    expect(conversationFormat).not.toHaveProperty('function_call');
  });
});
