import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isError?: boolean;
}

type TabId = 'chat' | 'activity' | 'settings' | 'harbor';

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
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "**Welcome to FoxAgent!** I'm your browser operating system.\n\nI can:\n- **Summarize** any web page\n- **Navigate** and **interact** with sites\n- **Research** across multiple tabs\n- Accept **voice commands**\n\nConfigure your AI provider in **Settings** to get started.",
      timestamp: Date.now(),
    },
  ],
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
          id: 'welcome',
          role: 'assistant',
          content: 'Chat cleared. How can I help you?',
          timestamp: Date.now(),
        },
      ],
    }),
}));

