export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'wait' | 'error';
    content: string;
    timestamp: number;
}
