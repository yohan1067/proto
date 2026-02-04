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

    const prompt = String(customPrompt === undefined ? chatStore.question : customPrompt || '').trim();
    const selectedImage = chatStore.selectedImage;

    if (!prompt && !selectedImage) return;

    chatStore.setIsLoadingAi(true);
    uiStore.setActiveTab('chat');
    
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token || !session?.user) {
      uiStore.setShowAuthModal(true);
      chatStore.setIsLoadingAi(false);
      return;
    }

    let imageUrl = '';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      // 1. Handle Image Upload
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

      // 2. Ensure Chat Room exists
      let roomId = chatStore.currentRoomId;
      if (!roomId) {
          const { data: newRoom, error: roomError } = await supabase
            .from('chat_rooms')
            .insert({
                title: prompt.slice(0, 30) || 'New Conversation',
                user_id: session.user.id
            })
            .select()
            .single();
          
          if (!roomError && newRoom) {
              roomId = newRoom.id;
              chatStore.setCurrentRoomId(roomId);
          } else {
              console.error("Failed to create chat room:", roomError);
          }
      }

      // 3. Add User Message
      chatStore.addMessage({
        id: Date.now(),
        text: prompt,
        sender: 'user',
        timestamp,
        imageUrl 
      });
      chatStore.setQuestion('');
      chatStore.setSelectedImage(null);
      
      const aiMsgId = Date.now() + 1;
      chatStore.addMessage({ id: aiMsgId, text: '', sender: 'ai', timestamp });
      inputRef.current?.focus();

      // 4. AI Request with roomId
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); 

      const response = await fetch(`${BACKEND_URL}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt, imageUrl, roomId }), // Send roomId
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!response.ok || !response.body) throw new Error(`Server Error (${response.status})`);

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
          if (content) chatStore.appendMessageContent(aiMsgId, content);
        }
      }

    } catch (error: unknown) {
       let errorText = error instanceof Error ? error.message : 'Connection error occurred.';
       chatStore.setMessages(prev => prev.map(msg => 
         msg.sender === 'ai' && msg.text === '' ? { ...msg, text: `[Error] ${errorText}` } : msg
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