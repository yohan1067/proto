import { useRef, useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

const BACKEND_URL = 'https://proto-backend.yohan1067.workers.dev';

export const useChat = () => {
    // Removed top-level destructuring of setters

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
  
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
  
    const triggerToast = () => {
      useUIStore.getState().setShowToast(true); // Access directly from store
      setTimeout(() => useUIStore.getState().setShowToast(false), 2000); // Access directly from store
    };
  
    const copyToClipboard = (text: string) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          triggerToast();
        }).catch(() => {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    };
  
    const fallbackCopy = (text: string) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        triggerToast();
      } catch (e) {
        console.error('Copy failed', e);
      }
      document.body.removeChild(textArea);
    };
  
  const handleAskAi = useCallback(async (customPrompt?: string) => {
    // Get the question directly from the store's current state
    let prompt: string = String(customPrompt === undefined ? useChatStore.getState().question : customPrompt || '');
    
    if (!prompt.trim()) {
      console.warn('Attempted to send an empty or whitespace-only message.');
      return;
    }

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now(),
      text: prompt, // prompt is now guaranteed to be a string
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    useChatStore.getState().setMessages((prev) => [...prev, userMsg]); // Access directly from store
    useChatStore.getState().setQuestion(''); // Access directly from store
    useChatStore.getState().setIsLoadingAi(true); // Access directly from store
    // Switch to chat tab if not already
    useUIStore.getState().setActiveTab('chat'); // Access directly from store
    
    // 2. Add Empty AI Message Placeholder
    const aiMsgId = Date.now() + 1;
    const aiMsg: Message = {
      id: aiMsgId,
      text: '',
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    useChatStore.getState().setMessages((prev) => [...prev, aiMsg]); // Access directly from store

    inputRef.current?.focus();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      if (!token) {
          useUIStore.getState().setShowAuthModal(true); // Access directly from store
          useChatStore.getState().setIsLoadingAi(false); // Access directly from store
          return;
      }

      const response = await fetch(`${BACKEND_URL}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        throw new Error(`Server Error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith(':')) continue;
          
          const dataIndex = trimmedLine.indexOf('data: ');
          if (dataIndex === -1) continue;
          
          const dataStr = trimmedLine.slice(dataIndex + 6);
          if (dataStr === '[DONE]') continue;
          
          try {
            const json = JSON.parse(dataStr);
            const content = json.choices?.[0]?.delta?.content || "";
            if (content) {
              useChatStore.getState().appendMessageContent(aiMsgId, content); // Access directly from store
            }
          } catch (e) {
            console.warn("Stream parse error for line:", trimmedLine, e);
          }
        }
      }

    } catch (error: unknown) {
       clearTimeout(timeoutId);
       let errorText = 'Connection error occurred.';
       if (error instanceof Error) {
         if (error.name === 'AbortError') {
           errorText = '[Error] 요청 시간이 초과되었습니다 (60초).';
         } else {
           errorText = `[Error] ${error.message}`;
         }
       }
       useChatStore.getState().setMessages((prev) => prev.map(msg => // Access directly from store
         msg.id === aiMsgId ? { ...msg, text: errorText } : msg
       ));
    } finally {
      useChatStore.getState().setIsLoadingAi(false); // Access directly from store
      inputRef.current?.focus();
    }
  }, [inputRef]); // inputRef is stable

  return {
    messagesEndRef,
    inputRef,
    scrollToBottom,
    triggerToast,
    copyToClipboard,
    handleAskAi
  };
};
