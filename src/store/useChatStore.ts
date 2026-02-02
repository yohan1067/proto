import { create } from 'zustand';
import type { Message, ChatHistoryItem } from '../types';

interface ChatState {
  question: string;
  messages: Message[];
  history: ChatHistoryItem[];
  isLoadingAi: boolean;
  searchQuery: string;
  systemPrompt: string;
  setQuestion: (question: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  setHistory: (history: ChatHistoryItem[]) => void;
  setIsLoadingAi: (isLoading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSystemPrompt: (prompt: string) => void;
  resetChat: () => void;
  updateLastMessage: (content: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  question: '',
  messages: [],
  history: [],
  isLoadingAi: false,
  searchQuery: '',
  systemPrompt: '',
  setQuestion: (question) => set({ question }),
  setMessages: (messages) => set((state) => ({ 
    messages: typeof messages === 'function' ? messages(state.messages) : messages 
  })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setHistory: (history) => set({ history }),
  setIsLoadingAi: (isLoading) => set({ isLoadingAi: isLoading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  resetChat: () => set({ 
    question: '', 
    messages: [], 
    history: [], 
    isLoadingAi: false,
    searchQuery: '' 
  }),
  updateLastMessage: (content) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      const lastMsg = newMessages[newMessages.length - 1];
      newMessages[newMessages.length - 1] = { ...lastMsg, text: lastMsg.text + content };
    }
    return { messages: newMessages };
  }),
}));
