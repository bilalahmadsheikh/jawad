import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isError?: boolean;
}

type TabId = 'chat' | 'ghost' | 'activity' | 'settings' | 'harbor';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  activeTab: TabId;

  addMessage: (msg: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  setActiveTab: (tab: TabId) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isLoading: false,
  activeTab: 'chat',

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  setLoading: (isLoading) => set({ isLoading }),

  setActiveTab: (activeTab) => set({ activeTab }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: 'cleared',
          role: 'assistant',
          content: 'Chat cleared. How can I help you?',
          timestamp: Date.now(),
        },
      ],
    }),
}));
