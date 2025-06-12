import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const aiService = {
  async sendChatMessage(message: string, userId: string, sessionId?: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        userId,
        sessionId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send chat message');
    }

    return data.message;
  },

  async generateSessionSummary(sessionId: string, userId: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('generate-session-summary', {
      body: {
        sessionId,
        userId,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to generate session summary');
    }

    return data.summary;
  },
};