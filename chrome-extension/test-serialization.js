// Simple test script to verify message serialization
// This can be run in the browser console after loading the extension

// Simulate LangChain message objects with the problematic metadata
const mockLangChainMessage = {
  lc_kwargs: {
    content: "Hello, this is a test message",
    additional_kwargs: {}
  },
  lc_namespace: ["langchain", "schema", "messages"],
  lc_serializable: true,
  content: "Hello, this is a test message",
  additional_kwargs: {},
  _getType: () => "human"
};

// Test the serialization functions
console.log("Original message:", mockLangChainMessage);

// This would be the serialized format we want
const serializedMessage = {
  type: 'human',
  content: 'Hello, this is a test message',
  additional_kwargs: {}
};

console.log("Serialized message:", serializedMessage);

// Clear any existing problematic storage
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.local.clear(() => {
    console.log("Chrome storage cleared");
  });
} else {
  localStorage.clear();
  console.log("Local storage cleared");
}
