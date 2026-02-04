import React, { type RefObject, useEffect, useRef } from 'react';
import { useChatStore } from '../store/useChatStore';

interface ChatInputProps {
  question: string;
  setQuestion: (q: string) => void;
  isLoadingAi: boolean;
  handleAskAi: () => void;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  t: (key: string) => string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  question, 
  setQuestion, 
  isLoadingAi, 
  handleAskAi, 
  inputRef, 
  t 
}) => {
  const { selectedImage, setSelectedImage } = useChatStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 내용에 따라 높이 자동 조절
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`;
    }
  }, [question, inputRef]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAi();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
    }
  };

  return (
    <div className="fixed bottom-24 left-0 right-0 p-4 z-50 pointer-events-auto max-w-3xl mx-auto">
      {/* Image Preview */}
      {selectedImage && (
        <div className="mb-2 ml-2 relative inline-block animate-in fade-in slide-in-from-bottom-2">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/40">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="preview" 
              className="w-full h-full object-cover" 
            />
          </div>
          <button 
            onClick={() => setSelectedImage(null)}
            className="absolute -top-2 -right-2 w-5 h-5 bg-white text-black rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-[14px] font-bold">close</span>
          </button>
        </div>
      )}

      <div 
        className="input-container flex items-end gap-2 p-2 pl-3 rounded-2xl w-full shadow-2xl bg-[#161b2a] border border-white/10 backdrop-blur-2xl"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoadingAi}
          className="w-10 h-10 mb-1 flex-shrink-0 rounded-xl bg-white/5 text-white/60 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-[22px]">image</span>
        </button>

        <textarea 
          ref={inputRef}
          rows={1}
          className="bg-transparent border-none flex-1 min-w-0 focus:ring-0 text-sm text-white placeholder-white/40 py-2 px-1 resize-none no-scrollbar" 
          placeholder={t('ask_placeholder')}
          autoComplete="off"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isLoadingAi}
        />
        
        <button
          onClick={() => handleAskAi()}
          disabled={isLoadingAi || (!question.trim() && !selectedImage)}
          className="w-10 h-10 mb-1 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30 shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined text-white text-[20px] fill-1">send</span>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;