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

    // Get prompt and image
    const prompt = String(customPrompt === undefined ? chatStore.question : customPrompt || '').trim();
    const selectedImage = chatStore.selectedImage;

    if (!prompt && !selectedImage) {
      console.warn('Attempted to send an empty message without image.');
      return;
    }

    chatStore.setIsLoadingAi(true);
    uiStore.setActiveTab('chat');
    
    // 1. Setup Session
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      uiStore.setShowAuthModal(true);
      chatStore.setIsLoadingAi(false);
      return;
    }

    let imageUrl = '';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      // 2. Upload Image if exists
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // 3. Add User Message to UI
      chatStore.addMessage({
        id: Date.now(),
        text: prompt,
        sender: 'user',
        timestamp,
        imageUrl // R2 URL
      });
      chatStore.setQuestion('');
      chatStore.setSelectedImage(null);
      
      // 4. Add Placeholder for AI Message
      const aiMsgId = Date.now() + 1;
      chatStore.addMessage({
        id: aiMsgId,
        text: '',
        sender: 'ai',
        timestamp
      });

      inputRef.current?.focus();

      // 5. AI API Request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 

      const response = await fetch(`${BACKEND_URL}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, imageUrl }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`Server Error (${response.status})`);
      }

      // 6. Stream Processing
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { lines, remainingBuffer } = parseStreamChunk(buffer);
        buffer = remainingBuffer;

        for (const line of lines) {
          const content = parseSSEData(line);
          if (content) {
            chatStore.appendMessageContent(aiMsgId, content);
          }
        }
      }

    } catch (error: unknown) {
       let errorText = 'Connection error occurred.';
       if (error instanceof Error) {
         errorText = error.name === 'AbortError' 
           ? '[Error] 요청 시간이 초과되었습니다 (60초).' 
           : `[Error] ${error.message}`;
       }
       
       chatStore.setMessages(prev => prev.map(msg => 
         msg.sender === 'ai' && msg.text === '' ? { ...msg, text: errorText } : msg
       ));
    } finally {
      chatStore.setIsLoadingAi(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);

  return {
    messagesEndRef,
    inputRef,
    scrollToBottom,
    copyToClipboard,
    handleAskAi
  };
};
