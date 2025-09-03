export type Role = 'user' | 'assistant' | 'system' | 'wait' | 'error';

export interface ChatMessage {
    role: Role;
    content: string;
    timestamp: number;
}
