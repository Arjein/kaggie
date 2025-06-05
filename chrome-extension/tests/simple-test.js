console.log('🧪 Testing Message Serialization/Deserialization');

// Simulate the problematic message from the error
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

console.log('Problematic message structure:');
console.log(JSON.stringify(problematicMessage, null, 2));

// Test type detection
const msgType = problematicMessage._type || (problematicMessage.lc_namespace?.[problematicMessage.lc_namespace.length - 1]);
console.log('\nType detection:');
console.log('_type property:', problematicMessage._type);
console.log('lc_namespace:', problematicMessage.lc_namespace);
console.log('Last element of lc_namespace:', problematicMessage.lc_namespace?.[problematicMessage.lc_namespace.length - 1]);
console.log('Detected type:', msgType);

// The problem: lc_namespace ends with "messages" not the specific type!
console.log('\n🚨 ISSUE FOUND:');
console.log('The lc_namespace is ["langchain_core", "messages"] - it ends with "messages", not a specific type like "human"');
console.log('This means our type detection logic fails!');

console.log('\n✅ Test completed - we found the root cause!');
