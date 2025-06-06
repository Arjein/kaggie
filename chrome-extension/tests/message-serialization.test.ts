import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';

describe('Message Serialization/Deserialization', () => {
  it('should correctly serialize and deserialize messages without losing role information', () => {
    // Create test messages with different types
    const originalMessages = [
      new HumanMessage({ content: "What is the best approach for this competition?" }),
      new AIMessage({ 
        content: "I'll help you analyze this competition.",
        tool_calls: [
          {
            id: "call_123",
            name: "rag_tool",
            args: { query: "competition analysis", competition_id: "test123" }
          }
        ]
      }),
      new ToolMessage({
        content: "Here are some insights about the competition...",
        tool_call_id: "call_123",
        name: "rag_tool"
      }),
      new AIMessage({ content: "Based on the search results, I recommend..." })
    ];

    console.log('Original messages:');
    originalMessages.forEach((msg, i) => {
      console.log(`  ${i}: ${msg.constructor.name} - role: ${msg._getType?.()} - content: ${msg.content?.toString().substring(0, 50)}...`);
      if ('tool_calls' in msg && msg.tool_calls) {
        console.log(`     has tool_calls: ${msg.tool_calls.length}`);
      }
    });

    // Simulate Chrome extension storage serialization (JSON.stringify/parse)
    const serialized = JSON.stringify(originalMessages);
    console.log('\nSerialized length:', serialized.length);
    
    const deserialized = JSON.parse(serialized);
    console.log('\nDeserialized messages:');
    deserialized.forEach((msg: any, i: number) => {
      console.log(`  ${i}: constructor: ${msg.constructor?.name || 'Object'} - type: ${msg.type} - role: ${msg.role}`);
      console.log(`     content: ${msg.content?.toString().substring(0, 50)}...`);
      if (msg.tool_calls) {
        console.log(`     has tool_calls: ${msg.tool_calls.length}`);
      }
      if (msg.tool_call_id) {
        console.log(`     tool_call_id: ${msg.tool_call_id}`);
      }
    });

    // Test 1: Check that all messages are preserved
    expect(deserialized).toHaveLength(originalMessages.length);

    // Test 2: Check that tool_calls are preserved correctly
    const originalAIWithTools = originalMessages.find(msg => 
      msg instanceof AIMessage && 'tool_calls' in msg && msg.tool_calls?.length
    );
    const deserializedAIWithTools = deserialized.find((msg: any) => 
      msg.tool_calls && msg.tool_calls.length > 0
    );

    console.log('\nTool calls comparison:');
    console.log('Original AI message tool_calls:', originalAIWithTools && 'tool_calls' in originalAIWithTools ? originalAIWithTools.tool_calls : 'none');
    console.log('Deserialized AI message tool_calls:', deserializedAIWithTools?.tool_calls || 'none');

    expect(deserializedAIWithTools).toBeDefined();
    expect(deserializedAIWithTools.tool_calls).toHaveLength(1);
    expect(deserializedAIWithTools.tool_calls[0].name).toBe('rag_tool');

    // Test 3: Check that message types/roles are identifiable
    // This is the critical test - can we identify message types after deserialization?
    const humanMsg = deserialized[0];
    const aiMsg = deserialized[1];
    const toolMsg = deserialized[2];

    console.log('\nMessage type identification:');
    console.log('Human message identifiers:', {
      constructor_name: humanMsg.constructor?.name,
      type: humanMsg.type,
      role: humanMsg.role,
      lc_namespace: humanMsg.lc_namespace
    });
    
    console.log('AI message identifiers:', {
      constructor_name: aiMsg.constructor?.name,
      type: aiMsg.type,
      role: aiMsg.role,
      lc_namespace: aiMsg.lc_namespace,
      has_tool_calls: !!aiMsg.tool_calls
    });

    console.log('Tool message identifiers:', {
      constructor_name: toolMsg.constructor?.name,
      type: toolMsg.type,
      role: toolMsg.role,
      tool_call_id: toolMsg.tool_call_id,
      lc_namespace: toolMsg.lc_namespace
    });

    // Test 4: Simulate the isAIMessage function logic
    function testIsAIMessage(message: any): boolean {
      if (!message) return false;
      
      // Check for role property
      if (message.role === 'assistant' || message.role === 'ai') {
        return true;
      }
      
      // Check for type property
      if (message.type === 'ai' || message.type === 'assistant') {
        return true;
      }
      
      // Check for constructor name
      const constructorName = message?.constructor?.name;
      if (constructorName === 'We' || constructorName === 'AIMessage') {
        return true;
      }
      
      return false;
    }

    const aiMsgDetected = testIsAIMessage(aiMsg);
    const humanMsgDetected = testIsAIMessage(humanMsg);
    
    console.log('\nAI message detection results:');
    console.log('AI message detected as AI:', aiMsgDetected);
    console.log('Human message detected as AI:', humanMsgDetected);

    // These are the critical assertions
    expect(aiMsgDetected).toBe(true);
    expect(humanMsgDetected).toBe(false);

    // Test 5: Check if we can reconstruct proper LangChain messages
    function reconstructMessage(serializedMsg: any) {
      if (serializedMsg.type === 'human' || serializedMsg.constructor?.name === 'HumanMessage') {
        return new HumanMessage({ content: serializedMsg.content });
      } else if (serializedMsg.type === 'ai' || serializedMsg.constructor?.name === 'AIMessage') {
        const msgData: any = { content: serializedMsg.content };
        if (serializedMsg.tool_calls) {
          msgData.tool_calls = serializedMsg.tool_calls;
        }
        return new AIMessage(msgData);
      } else if (serializedMsg.type === 'tool' || serializedMsg.constructor?.name === 'ToolMessage') {
        return new ToolMessage({
          content: serializedMsg.content,
          tool_call_id: serializedMsg.tool_call_id,
          name: serializedMsg.name
        });
      }
      return null;
    }

    const reconstructed = deserialized.map(reconstructMessage).filter(Boolean);
    console.log('\nReconstructed messages:');
    reconstructed.forEach((msg, i) => {
      console.log(`  ${i}: ${msg?.constructor.name} - role: ${msg?._getType?.()} - content: ${msg?.content?.toString().substring(0, 50)}...`);
    });

    expect(reconstructed).toHaveLength(originalMessages.length);
    expect(reconstructed[0]).toBeInstanceOf(HumanMessage);
    expect(reconstructed[1]).toBeInstanceOf(AIMessage);
    expect(reconstructed[2]).toBeInstanceOf(ToolMessage);
  });
});
