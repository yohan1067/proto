import { create } from 'zustand';
import type { Message, ChatHistoryItem } from '../types';

interface ChatState {
  question: string;
  messages: Message[];
  history: ChatHistoryItem[];
  isLoadingAi: boolean;
  searchQuery: string;
  systemPrompt: string;
  selectedImage: File | null;
  setQuestion: (question: string) => void;
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  addMessage: (message: Message) => void;
  setHistory: (history: ChatHistoryItem[]) => void;
  setIsLoadingAi: (isLoading: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSystemPrompt: (prompt: string) => void;
  setSelectedImage: (image: File | null) => void;
  resetChat: () => void;
  appendMessageContent: (id: number, content: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  question: '',
  messages: [],
  history: [],
  isLoadingAi: false,
  searchQuery: '',
  systemPrompt: '',
  selectedImage: null,
  setQuestion: (question) => set({ question }),
  setMessages: (messages) => set((state) => ({ 
    messages: typeof messages === 'function' ? messages(state.messages) : messages 
  })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setHistory: (history) => set({ history }),
  setIsLoadingAi: (isLoading) => set({ isLoadingAi: isLoading }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setSelectedImage: (image) => set({ selectedImage: image }),
  resetChat: () => set({ 
    question: '', 
    messages: [], 
    history: [], 
    isLoadingAi: false,
    searchQuery: '',
    selectedImage: null
  }),
  appendMessageContent: (id, content) => set((state) => ({
    messages: state.messages.map((msg) => 
      msg.id === id ? { ...msg, text: msg.text + content } : msg
    )
  })),
}));