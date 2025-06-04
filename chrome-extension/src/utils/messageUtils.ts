import { type Message } from "../types/message";

export function getCurrentTime(): string {
  return new Date().toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function createUserMessage(id: number, text: string): Message {
  return {
    id,
    text,
    type: 'user',
    time: getCurrentTime(),
  };
}

export function createPlaceholderSystemMessage(id: number): Message {
  return {
    id,
    text: '',
    type: 'system',
    time: getCurrentTime(),
    status: 'Working...',
  };
}

export function updateMessageContent(messages: Message[], messageId: number, content: string): Message[] {
  return messages.map(msg => 
    msg.id === messageId 
      ? { ...msg, text: content, status: undefined }
      : msg
  );
}

export function updateMessageStatus(messages: Message[], messageId: number, status: string): Message[] {
  return messages.map(msg => 
    msg.id === messageId 
      ? { ...msg, status }
      : msg
  );
}

export function clearMessageStatus(messages: Message[], messageId: number): Message[] {
  return messages.map(msg => 
    msg.id === messageId 
      ? { ...msg, status: undefined }
      : msg
  );
}

export function setMessageError(messages: Message[], messageId: number, errorMessage: string): Message[] {
  return messages.map(msg => 
    msg.id === messageId 
      ? { 
          ...msg, 
          text: errorMessage,
          status: undefined
        }
      : msg
  );
}
