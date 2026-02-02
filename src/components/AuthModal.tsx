import React from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../store/useUIStore';

const AuthModal: React.FC = () => {
  const { t } = useTranslation();
  const { showAuthModal, setShowAuthModal } = useUIStore();

  if (!showAuthModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#161b2a] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-red-500 text-3xl">lock_open</span>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">{t('auth_modal_title')}</h3>
          <p className="text-sm text-white/50 leading-relaxed">
            {t('auth_modal_message')}
          </p>
        </div>
        <button 
          onClick={() => setShowAuthModal(false)}
          className="w-full h-14 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
        >
          {t('auth_modal_button')}
        </button>
      </div>
    </div>
  );
};

export default AuthModal;
