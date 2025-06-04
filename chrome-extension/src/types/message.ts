export interface Message {
  id: number;
  text: string;
  type: 'user' | 'system';
  time: string;
  status?: string;
}