// Message serialization utilities to handle LangChain message preservation
import { HumanMessage, AIMessage, ToolMessage, SystemMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';

/**
 * Serialize LangChain messages for storage while preserving type information
 */
export function serializeMessage(message: BaseMessage): any {
  const baseData = {
    content: message.content,
    id: message.id,
    additional_kwargs: message.additional_kwargs,
    response_metadata: message.response_metadata,
    
    // Preserve type information
    _type: message._getType(),
    _className: message.constructor.name,
    
    // Preserve LangChain metadata
    lc_namespace: (message as any).lc_namespace,
    lc_serializable: true
  };

  // Handle specific message types with special properties
  if (message instanceof AIMessage && 'tool_calls' in message && message.tool_calls) {
    (baseData as any).tool_calls = message.tool_calls;
  }

  if (message instanceof ToolMessage) {
    (baseData as any).tool_call_id = message.tool_call_id;
    (baseData as any).name = message.name;
  }

  return baseData;
}

/**
 * Deserialize stored message data back to proper LangChain messages
 */
export function deserializeMessage(data: any): BaseMessage {
  if (!data) {
    throw new Error('Cannot deserialize null/undefined message data');
  }

  // If it's already a proper LangChain message, return as-is
  if (data.constructor?.name?.includes('Message')) {
    return data;
  }

  const content = data.content || '';
  const id = data.id;
  const additional_kwargs = data.additional_kwargs || {};
  const response_metadata = data.response_metadata || {};

  // Determine message type from stored metadata
  const messageType = data._type || data._className || 
                     (data.lc_namespace?.[data.lc_namespace.length - 1]);

  switch (messageType) {
    case 'human':
    case 'HumanMessage':
      return new HumanMessage({ content, id, additional_kwargs, response_metadata });
    
    case 'ai':
    case 'AIMessage':
      const aiData: any = { content, id, additional_kwargs, response_metadata };
      if (data.tool_calls) {
        aiData.tool_calls = data.tool_calls;
      }
      return new AIMessage(aiData);
    
    case 'tool':
    case 'ToolMessage':
      return new ToolMessage({
        content,
        id,
        additional_kwargs,
        response_metadata,
        tool_call_id: data.tool_call_id,
        name: data.name
      });
    
    case 'system':
    case 'SystemMessage':
      return new SystemMessage({ content, id, additional_kwargs, response_metadata });
    
    default:
      console.warn('Unknown message type, defaulting to HumanMessage:', messageType);
      return new HumanMessage({ content, id, additional_kwargs, response_metadata });
  }
}

/**
 * Serialize an array of messages for storage
 */
export function serializeMessages(messages: BaseMessage[]): any[] {
  return messages.map(serializeMessage);
}

/**
 * Deserialize an array of stored message data back to LangChain messages
 */
export function deserializeMessages(data: any[]): BaseMessage[] {
  if (!Array.isArray(data)) return [];
  return data.map(deserializeMessage);
}

/**
 * Check if a message (serialized or not) is an AI message
 */
export function isAIMessage(message: any): boolean {
  if (!message) return false;
  
  // Check if it's a proper AIMessage instance
  if (message instanceof AIMessage) return true;
  
  // Check serialized message metadata
  if (message._type === 'ai' || message._className === 'AIMessage') return true;
  if (message.constructor?.name === 'AIMessage') return true;
  
  // Check LangChain namespace
  if (message.lc_namespace?.includes('ai') || message.lc_namespace?.includes('AIMessage')) return true;
  
  // Fallback checks
  if (message.role === 'assistant' || message.type === 'ai') return true;
  
  return false;
}

/**
 * Extract content from any message format
 */
export function extractMessageContent(message: any): string {
  if (!message) return '';
  
  const content = message.content;
  if (!content) return '';
  
  if (typeof content === 'string') return content;
  
  // Handle array content
  if (Array.isArray(content)) {
    return content
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item?.text) return item.text;
        if (item?.content) return item.content;
        return '';
      })
      .join('');
  }
  
  return String(content);
}
