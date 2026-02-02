import { useRef } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

const BACKEND_URL = 'https://proto-backend.yohan1067.workers.dev';

export const useChat = () => {
  const { 
    setQuestion, setMessages, setIsLoadingAi, 
    appendMessageContent 
  } = useChatStore();
  
  const { setShowAuthModal, setShowToast, setActiveTab } = useUIStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
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

  const handleAskAi = async (customPrompt?: string) => {
    // We access state directly from the hook or store
    // Re-fetching question from store state might be needed if it's stale, 
    // but in event handlers usually it's fine or we pass it as arg.
    // Better to use the value from the store directly.
    const currentQuestion = useChatStore.getState().question; 
    const prompt = customPrompt || currentQuestion; 
    
    if (!prompt.trim()) return;

    // 1. Add User Message
    const userMsg: Message = {
      id: Date.now(),
      text: prompt,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsLoadingAi(true);
    // Switch to chat tab if not already
    setActiveTab('chat');
    
    // 2. Add Empty AI Message Placeholder
    const aiMsgId = Date.now() + 1;
    const aiMsg: Message = {
      id: aiMsgId,
      text: '', 
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, aiMsg]);

    inputRef.current?.focus();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      if (!token) {
          setShowAuthModal(true);
          setIsLoadingAi(false);
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
              appendMessageContent(aiMsgId, content);
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
       setMessages((prev) => prev.map(msg => 
         msg.id === aiMsgId ? { ...msg, text: errorText } : msg
       ));
    } finally {
      setIsLoadingAi(false);
      inputRef.current?.focus();
    }
  };

  return {
    messagesEndRef,
    inputRef,
    scrollToBottom,
    triggerToast,
    copyToClipboard,
    handleAskAi
  };
};
