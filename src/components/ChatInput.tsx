import React, { type RefObject, useEffect } from 'react';

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

  return (
    <div className="fixed bottom-24 left-0 right-0 p-4 z-50 pointer-events-auto max-w-3xl mx-auto">
      <div 
        className="input-container flex items-end gap-3 p-2 pl-4 rounded-2xl w-full shadow-2xl bg-[#161b2a] border border-white/10 backdrop-blur-2xl"
      >
        <textarea 
          ref={inputRef}
          rows={1}
          className="bg-transparent border-none flex-1 min-w-0 focus:ring-0 text-sm text-white placeholder-white/40 py-2 px-2 resize-none no-scrollbar" 
          placeholder={t('ask_placeholder') + ' (Test)'}
          autoComplete="off"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isLoadingAi}
        />
                        <button
          onClick={() => handleAskAi()}
          disabled={isLoadingAi || !question.trim()}
          className="w-10 h-10 mb-1 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
        >          <span className="material-symbols-outlined text-white text-[20px] fill-1">send</span>
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
