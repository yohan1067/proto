import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { supabase } from '../lib/supabase';

const ChatHeader: React.FC = () => {
  const { t } = useTranslation();
  const { nickname, resetAuth } = useAuthStore();
  const { resetChat } = useChatStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetAuth();
    resetChat();
  };

  return (
    <>
      <div className="absolute inset-0 gradient-blur pointer-events-none"></div>
      
      <header className="flex items-center justify-between px-6 py-4 z-20 shrink-0 bg-gradient-to-b from-background-dark/90 to-transparent backdrop-blur-[2px]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(19,91,236,0.5)]">
            <span className="material-symbols-outlined text-white text-sm fill-1">auto_awesome</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight">AI Assistant</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 hidden sm:block">{nickname}{t('welcome')}</span>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all group"
          >
            <span className="material-symbols-outlined text-white/70 group-hover:text-red-400">logout</span>
          </button>
        </div>
      </header>
    </>
  );
};

export default ChatHeader;
