/**
 * Utility functions for real-time API key validation
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  type: 'valid' | 'invalid' | 'empty';
  message?: string;
}

/**
 * Valid OpenAI API key prefixes as of 2024
 */
const OPENAI_VALID_PREFIXES = [
  'sk-',           // Standard API keys
  'sk-proj-',      // Project-scoped API keys
  'sk-org-',       // Organization-scoped API keys
];

/**
 * Valid Tavily API key prefixes
 */
const TAVILY_VALID_PREFIXES = [
  'tvly-',         // Standard Tavily API keys
];

/**
 * Validate OpenAI API key format in real-time
 */
export function validateOpenAIApiKey(apiKey: string): ApiKeyValidationResult {
  // Empty key
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      isValid: false,
      type: 'empty',
      message: 'OpenAI API key is required'
    };
  }

  const trimmedKey = apiKey.trim();

  // Check if it starts with a valid prefix
  const hasValidPrefix = OPENAI_VALID_PREFIXES.some(prefix => 
    trimmedKey.startsWith(prefix)
  );

  if (!hasValidPrefix) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'OpenAI API key should start with "sk-", "sk-proj-", or "sk-org-"'
    };
  }

  // Check minimum length (OpenAI keys are typically 48+ characters)
  if (trimmedKey.length < 20) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'OpenAI API key appears to be too short'
    };
  }

  // Basic format validation - should contain only alphanumeric, hyphens, and underscores
  const validCharacters = /^[a-zA-Z0-9\-_]+$/.test(trimmedKey);
  if (!validCharacters) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'OpenAI API key contains invalid characters'
    };
  }

  return {
    isValid: true,
    type: 'valid',
    message: 'OpenAI API key format looks valid'
  };
}

/**
 * Validate Tavily API key format in real-time
 */
export function validateTavilyApiKey(apiKey: string): ApiKeyValidationResult {
  // Empty key is acceptable for Tavily (optional)
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      isValid: true,
      type: 'empty',
      message: 'Tavily API key is optional'
    };
  }

  const trimmedKey = apiKey.trim();

  // Check if it starts with a valid prefix
  const hasValidPrefix = TAVILY_VALID_PREFIXES.some(prefix => 
    trimmedKey.startsWith(prefix)
  );

  if (!hasValidPrefix) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'Tavily API key should start with "tvly-"'
    };
  }

  // Check minimum length
  if (trimmedKey.length < 10) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'Tavily API key appears to be too short'
    };
  }

  // Basic format validation
  const validCharacters = /^[a-zA-Z0-9\-_]+$/.test(trimmedKey);
  if (!validCharacters) {
    return {
      isValid: false,
      type: 'invalid',
      message: 'Tavily API key contains invalid characters'
    };
  }

  return {
    isValid: true,
    type: 'valid',
    message: 'Tavily API key format looks valid'
  };
}

/**
 * Get validation styling classes for input fields
 */
export function getValidationClasses(validation: ApiKeyValidationResult, baseClasses: string): string {
  if (validation.type === 'empty') {
    return baseClasses; // Default styling for empty
  }
  
  if (validation.type === 'invalid') {
    return `${baseClasses} border-accent-error focus:ring-accent-error focus:border-accent-error`;
  }
  
  if (validation.type === 'valid') {
    return `${baseClasses} border-accent-success focus:ring-accent-success focus:border-accent-success`;
  }
  
  return baseClasses;
}

/**
 * Check if an error message indicates an API key authentication issue
 */
export function isAuthenticationError(error: string): boolean {
  const authErrorIndicators = [
    '401',
    'incorrect api key',
    'invalid api key',
    'unauthorized',
    'authentication failed',
    'api key',
    'openai_api_key'
  ];
  
  const lowerError = error.toLowerCase();
  return authErrorIndicators.some(indicator => lowerError.includes(indicator));
}

/**
 * Convert API authentication errors to user-friendly messages
 */
export function formatAuthenticationError(error: string): string {
  if (isAuthenticationError(error)) {
    return 'Your OpenAI API key appears to be incorrect. Please check your API key in settings and ensure it\'s valid.';
  }
  
  return error;
}
