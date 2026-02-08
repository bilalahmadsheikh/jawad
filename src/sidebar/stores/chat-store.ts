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
        "Hey there! 👋 I'm **Jawad** — your AI browser companion.\n\nHere's what I can do:\n\n🔍 **Summarize** — Digest any page instantly\n🖱️ **Navigate** — Click, fill, and interact\n📚 **Research** — Multi-tab deep dives\n🎙️ **Voice** — Hands-free commands\n\nHead to **Config** to connect your AI provider, then just ask away!",
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

