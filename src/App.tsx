// Deployment check: 2026-02-03
import { useEffect } from "react";
import { useTranslation } from 'react-i18next';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ChatHeader from './components/ChatHeader';
import HistoryTab from './components/HistoryTab';
import ProfileTab from './components/ProfileTab';
import AdminTab from './components/AdminTab';
import LoginScreen from './components/LoginScreen';
import AlertModal from './components/AlertModal';
import AuthModal from './components/AuthModal';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { useChatStore } from './store/useChatStore';
import { useAuthInit } from './hooks/useAuthInit';
import { useChat } from './hooks/useChat';

function App() {
  const { t } = useTranslation();
  
  // 1. Initialize Auth
  useAuthInit();

  // 2. Chat Logic Hook
  const { messagesEndRef, inputRef, scrollToBottom, copyToClipboard, handleAskAi } = useChat();

  // 3. Global State
  const { session, isAdmin, isInitialLoading } = useAuthStore();
  const { activeTab, setActiveTab, showToast } = useUIStore();
  const { question, setQuestion, messages, isLoadingAi } = useChatStore();

  // Auto-scroll on new messages or tab change
  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoadingAi, activeTab, scrollToBottom]);

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark text-white">
        <div className="relative w-32 h-32 rounded-full ai-orb-core animate-pulse-slow flex items-center justify-center shadow-[0_0_40px_rgba(19,91,236,0.3)]">
          <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
        </div>
        <p className="mt-8 text-white/40 text-sm tracking-widest uppercase animate-pulse">{t('loading_profile')}</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-background-dark text-white font-display">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-primary px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/20">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span className="text-sm font-bold">{t('copied')}</span>
          </div>
        </div>
      )}

      <AuthModal />
      <AlertModal />

      {session ? (
        <div className="relative flex h-screen w-full flex-col bg-gradient-mesh overflow-hidden mx-auto max-w-3xl shadow-2xl border-x border-white/5">
          {activeTab === 'chat' ? (
            <>
              <ChatHeader />

              <main className={`flex-1 relative overflow-y-auto px-4 pt-6 pb-32 scroll-smooth no-scrollbar`}>
                {messages.length === 0 ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 px-10 text-center -mt-20">
                      <span className="material-symbols-outlined text-6xl mb-4">chat_bubble</span>
                      <p className="text-lg font-medium">{t('help_label')}</p>
                   </div>
                ) : (
                  <div className="space-y-6 pb-40">
                    {messages.map((msg) => (
                      <ChatMessage 
                        key={msg.id} 
                        msg={msg} 
                        t={t} 
                        copyToClipboard={copyToClipboard} 
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </main>

              <ChatInput 
                question={question}
                setQuestion={setQuestion}
                isLoadingAi={isLoadingAi}
                handleAskAi={handleAskAi}
                inputRef={inputRef}
                t={t}
              />
            </>
          ) : activeTab === 'history' ? (
            <HistoryTab />
          ) : activeTab === 'profile' ? (
            <ProfileTab />
          ) : (
            <AdminTab />
          )}

          <nav className="fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur-xl border-t border-white/5 px-8 pb-8 pt-4 z-30 max-w-3xl mx-auto">
            <div className="flex justify-between items-center max-w-md mx-auto">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex flex-col items-center gap-1 group ${activeTab === 'chat' ? 'text-primary' : 'text-white/40'}`}
              >
                <span className={`material-symbols-outlined ${activeTab === 'chat' ? 'fill-1' : 'group-hover:text-white transition-colors'}`}>chat_bubble</span>
                <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_chat')}</span>
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex flex-col items-center gap-1 group ${activeTab === 'history' ? 'text-primary' : 'text-white/40'}`}
              >
                <div className="relative">
                  <span className={`material-symbols-outlined ${activeTab === 'history' ? 'fill-1' : 'group-hover:text-white transition-colors'}`}>history</span>
                  {activeTab === 'history' && <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-primary rounded-full"></div>}
                </div>
                <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_history')}</span>
              </button>
              <button 
                onClick={() => setActiveTab('profile')}
                className={`flex flex-col items-center gap-1 group ${activeTab === 'profile' ? 'text-primary' : 'text-white/40'}`}
              >
                <span className={`material-symbols-outlined ${activeTab === 'profile' ? 'fill-1' : 'group-hover:text-white transition-colors'}`}>person</span>
                <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_profile')}</span>
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`flex flex-col items-center gap-1 group ${activeTab === 'admin' ? 'text-primary' : 'text-white/40'}`}
                >
                  <span className={`material-symbols-outlined ${activeTab === 'admin' ? 'fill-1' : 'group-hover:text-white transition-colors'}`}>settings_suggest</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_admin')}</span>
                </button>
              )}
            </div>
          </nav>
        </div>
      ) : (
        <LoginScreen />
      )}
    </div>
  );
}

export default App;