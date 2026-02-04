import { useRef, useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';
import { copyToClipboard, parseStreamChunk, parseSSEData } from '../lib/utils';

const BACKEND_URL = 'https://proto-backend.yohan1067.workers.dev';

export const useChat = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleAskAi = useCallback(async (customPrompt?: string) => {
    const chatStore = useChatStore.getState();
    const uiStore = useUIStore.getState();

    // Get prompt
    const prompt = String(customPrompt === undefined ? chatStore.question : customPrompt || '').trim();
    if (!prompt) {
      console.warn('Attempted to send an empty message.');
      return;
    }

    // 1. Setup UI & Add User Message
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    chatStore.addMessage({
      id: Date.now(),
      text: prompt,
      sender: 'user',
      timestamp
    });
    chatStore.setQuestion('');
    chatStore.setIsLoadingAi(true);
    uiStore.setActiveTab('chat');
    
    // 2. Add Placeholder for AI Message
    const aiMsgId = Date.now() + 1;
    chatStore.addMessage({
      id: aiMsgId,
      text: '',
      sender: 'ai',
      timestamp
    });

    inputRef.current?.focus();

    // 3. API Request Setup
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        uiStore.setShowAuthModal(true);
        chatStore.setIsLoadingAi(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`Server Error (${response.status})`);
      }

      // 4. Stream Processing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Use utility to parse chunks
        const { lines, remainingBuffer } = parseStreamChunk(buffer);
        buffer = remainingBuffer;

        for (const line of lines) {
          const content = parseSSEData(line);
          if (content) {
            chatStore.appendMessageContent(aiMsgId, content);
            // Optional: minimal delay for typing effect feel
            // await new Promise(resolve => setTimeout(resolve, 10)); 
          }
        }
      }

    } catch (error: unknown) {
       clearTimeout(timeoutId);
       let errorText = 'Connection error occurred.';
       
       if (error instanceof Error) {
         errorText = error.name === 'AbortError' 
           ? '[Error] 요청 시간이 초과되었습니다 (60초).' 
           : `[Error] ${error.message}`;
       }
       
       // Update the AI message placeholder with error text
       chatStore.setMessages(prev => prev.map(msg => 
         msg.id === aiMsgId ? { ...msg, text: errorText } : msg
       ));
    } finally {
      chatStore.setIsLoadingAi(false);
      // Re-focus input after completion
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);

  return {
    messagesEndRef,
    inputRef,
    scrollToBottom,
    copyToClipboard, // Now imported from utils
    handleAskAi
  };
};