import React, { type RefObject } from 'react';

interface ChatInputProps {
  question: string;
  setQuestion: (q: string) => void;
  isLoadingAi: boolean;
  handleAskAi: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
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
  return (
    <div className="fixed bottom-24 left-0 right-0 p-4 z-50 pointer-events-auto max-w-3xl mx-auto">
      <form 
        onSubmit={(e) => { e.preventDefault(); handleAskAi(); }}
        className="input-container flex items-center gap-3 p-2 pl-4 rounded-2xl w-full shadow-2xl bg-[#161b2a] border border-white/10 backdrop-blur-2xl"
      >
        <input 
          ref={inputRef}
          className="bg-transparent border-none flex-1 min-w-0 focus:ring-0 text-sm text-white placeholder-white/40 py-2 px-2" 
          placeholder={t('ask_placeholder')}
          type="text"
          autoComplete="off"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button 
          type="submit"
          disabled={isLoadingAi || !question.trim()}
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
        >
          <span className="material-symbols-outlined text-white text-[20px] fill-1">send</span>
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
