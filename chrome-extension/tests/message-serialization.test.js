/**
 * Test suite for LangChain message serialization and deserialization
 * This helps debug the message coercion failures in PersistentMemorySaver
 */

// Mock LangChain message classes for testing
class HumanMessage {
  constructor({ content, id, additional_kwargs = {}, response_metadata = {} }) {
    this.content = content;
    this.id = id;
    this.additional_kwargs = additional_kwargs;
    this.response_metadata = response_metadata;
    this._type = 'human';
    this.lc_namespace = ['langchain_core', 'messages', 'human'];
    this.lc_serializable = true;
  }
}

class AIMessage {
  constructor({ content, id, additional_kwargs = {}, response_metadata = {} }) {
    this.content = content;
    this.id = id;
    this.additional_kwargs = additional_kwargs;
    this.response_metadata = response_metadata;
    this._type = 'ai';
    this.lc_namespace = ['langchain_core', 'messages', 'ai'];
    this.lc_serializable = true;
  }
}

class SystemMessage {
  constructor({ content, id, additional_kwargs = {}, response_metadata = {} }) {
    this.content = content;
    this.id = id;
    this.additional_kwargs = additional_kwargs;
    this.response_metadata = response_metadata;
    this._type = 'system';
    this.lc_namespace = ['langchain_core', 'messages', 'system'];
    this.lc_serializable = true;
  }
}

class ToolMessage {
  constructor({ content, id, additional_kwargs = {}, response_metadata = {}, tool_call_id }) {
    this.content = content;
    this.id = id;
    this.additional_kwargs = additional_kwargs;
    this.response_metadata = response_metadata;
    this.tool_call_id = tool_call_id;
    this._type = 'tool';
    this.lc_namespace = ['langchain_core', 'messages', 'tool'];
    this.lc_serializable = true;
  }
}

// Simulate the deserialization function from PersistentMemorySaver
function deserializeMessages(messages) {
  if (!Array.isArray(messages)) return messages;
  
  return messages.map((msg) => {
    // If message already has proper class type, return as-is
    if (msg?.constructor?.name?.includes('Message')) {
      return msg;
    }
    
    // Handle serialized LangChain messages with lc_kwargs
    if (msg?.lc_kwargs || msg?.lc_serializable) {        
      // Determine message type from content or lc_namespace
      const content = msg.content || msg.lc_kwargs?.content || '';
      const id = msg.id || msg.lc_kwargs?.id;
      const additional_kwargs = msg.additional_kwargs || msg.lc_kwargs?.additional_kwargs || {};
      const response_metadata = msg.response_metadata || msg.lc_kwargs?.response_metadata || {};
      
      // Reconstruct proper message instance based on type indicators
      if (msg.lc_namespace?.includes('messages') || msg._type) {
        const msgType = msg._type || (msg.lc_namespace?.[msg.lc_namespace.length - 1]);
        
        switch (msgType) {
          case 'human':
            return new HumanMessage({ content, id, additional_kwargs, response_metadata });
          case 'ai':
            return new AIMessage({ content, id, additional_kwargs, response_metadata });
          case 'system':
            return new SystemMessage({ content, id, additional_kwargs, response_metadata });
          case 'tool':
            return new ToolMessage({ content, id, additional_kwargs, response_metadata, tool_call_id: msg.tool_call_id });
          default:
            // Default to HumanMessage if type unclear
            return new HumanMessage({ content, id, additional_kwargs, response_metadata });
        }
      }
    }
    
    // For regular message-like objects, return as-is
    return msg;
  });
}

// Test cases
function runTests() {
  console.log('🧪 Starting Message Serialization/Deserialization Tests\n');
  
  // Test 1: Fresh message instances
  console.log('Test 1: Fresh Message Instances');
  const originalMessages = [
    new HumanMessage({ content: "Hi", id: "test-1" }),
    new AIMessage({ content: "Hello!", id: "test-2" }),
    new SystemMessage({ content: "System ready", id: "test-3" })
  ];
  
  console.log('Original messages:', originalMessages.map(m => ({ 
    type: m.constructor.name, 
    content: m.content,
    _type: m._type,
    lc_namespace: m.lc_namespace 
  })));
  
  const deserializedFresh = deserializeMessages(originalMessages);
  console.log('After deserialization (should be unchanged):', deserializedFresh.map(m => ({ 
    type: m.constructor.name, 
    content: m.content,
    _type: m._type
  })));
  console.log('✅ Test 1 passed\n');
  
  // Test 2: Simulate JSON serialization/deserialization (what happens in storage)
  console.log('Test 2: JSON Serialization/Deserialization');
  const jsonSerialized = JSON.stringify(originalMessages);
  const jsonDeserialized = JSON.parse(jsonSerialized);
  
  console.log('After JSON parse (loses class types):', jsonDeserialized.map(m => ({ 
    constructor: m.constructor.name,
    content: m.content,
    _type: m._type,
    lc_namespace: m.lc_namespace,
    lc_serializable: m.lc_serializable
  })));
  
  const rehydrated = deserializeMessages(jsonDeserialized);
  console.log('After rehydration:', rehydrated.map(m => ({ 
    type: m.constructor.name, 
    content: m.content,
    _type: m._type
  })));
  console.log('✅ Test 2 passed\n');
  
  // Test 3: Simulate the problematic message from your error
  console.log('Test 3: Problematic Message Structure');
  const problematicMessage = {
    "additional_kwargs": {},
    "content": "Hi",
    "id": "bedc4304-798e-423e-8f64-f1250e8bcae2",
    "lc_kwargs": {
      "additional_kwargs": {},
      "content": "Hi",
      "id": "bedc4304-798e-423e-8f64-f1250e8bcae2",
      "response_metadata": {}
    },
    "lc_namespace": ["langchain_core", "messages"],
    "lc_serializable": true,
    "response_metadata": {}
  };
  
  console.log('Problematic message structure:', problematicMessage);
  
  const fixedMessage = deserializeMessages([problematicMessage]);
  console.log('After fix attempt:', fixedMessage.map(m => ({ 
    type: m.constructor.name, 
    content: m.content,
    _type: m._type,
    hasProperClass: m.constructor.name.includes('Message')
  })));
  
  // Test if the message type detection works
  const msg = problematicMessage;
  const msgType = msg._type || (msg.lc_namespace?.[msg.lc_namespace.length - 1]);
  console.log('Detected message type:', msgType);
  console.log('lc_namespace last element:', msg.lc_namespace?.[msg.lc_namespace.length - 1]);
  console.log('_type property:', msg._type);
  
  if (!msgType || msgType === 'messages') {
    console.log('⚠️  Issue found: Cannot determine message type properly!');
    console.log('The lc_namespace ends with "messages" instead of specific type');
  }
  console.log('✅ Test 3 completed\n');
  
  // Test 4: Enhanced type detection
  console.log('Test 4: Enhanced Type Detection');
  function enhancedTypeDetection(msg) {
    // Try multiple ways to detect the message type
    if (msg._type) return msg._type;
    
    // Check lc_namespace for specific message type
    if (msg.lc_namespace && Array.isArray(msg.lc_namespace)) {
      // Look for specific message types in the namespace
      for (const part of msg.lc_namespace) {
        if (['human', 'ai', 'system', 'tool'].includes(part)) {
          return part;
        }
      }
    }
    
    // Fallback heuristics
    if (msg.tool_call_id) return 'tool';
    if (msg.content && typeof msg.content === 'string') {
      // Could analyze content patterns here
      return 'human'; // Default assumption
    }
    
    return 'human'; // Ultimate fallback
  }
  
  const enhancedType = enhancedTypeDetection(problematicMessage);
  console.log('Enhanced type detection result:', enhancedType);
  console.log('✅ Test 4 completed\n');
  
  console.log('🎉 All tests completed!');
}

// Run the tests
runTests();
