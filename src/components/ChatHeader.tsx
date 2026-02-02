import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';

const ChatHeader: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { nickname } = useAuthStore();

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
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
            onClick={toggleLanguage}
            className="h-10 px-3 rounded-full border border-white/20 overflow-hidden bg-white/10 flex items-center justify-center gap-1.5 hover:bg-white/20 transition-all group"
            aria-label="Change Language"
          >
            <span className="material-symbols-outlined text-white/70 group-hover:text-white text-lg">language</span>
            <span className="text-xs font-bold text-white/70 group-hover:text-white uppercase">
              {i18n.language.startsWith('ko') ? 'EN' : 'KR'}
            </span>
          </button>
        </div>
      </header>
    </>
  );
};

export default ChatHeader;
