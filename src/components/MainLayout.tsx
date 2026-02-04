import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import HistoryTab from './HistoryTab';
import ProfileTab from './ProfileTab';
import Sidebar from './Sidebar';
import { useUIStore } from '../store/useUIStore';
import { useChatStore } from '../store/useChatStore';
import { useChat } from '../hooks/useChat';

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const { activeTab, setActiveTab } = useUIStore();
  const { messages, question, setQuestion, isLoadingAi } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const { messagesEndRef, inputRef, scrollToBottom, copyToClipboard, handleAskAi } = useChat();

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoadingAi, activeTab, scrollToBottom]);

  return (
    <div className="flex h-screen w-full bg-background-dark overflow-hidden">
      {/* Sidebar - PC always visible, Mobile hidden/toggle */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {activeTab === 'chat' ? (
          <>
            <ChatHeader 
                onMenuClick={() => setIsSidebarOpen(true)} // Pass menu click to header
            />

            <main className={`flex-1 relative overflow-y-auto px-4 pt-6 pb-32 scroll-smooth no-scrollbar`}>
              {messages.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 px-10 text-center -mt-20">
                    <span className="material-symbols-outlined text-6xl mb-4">chat_bubble</span>
                    <p className="text-lg font-medium">{t('help_label')}</p>
                  </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-6 pb-40">
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
        ) : (
          <ProfileTab />
        )}

        {/* Bottom Nav (Only for Mobile views of Other Tabs) */}
        <nav className="fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur-xl border-t border-white/5 px-8 pb-8 pt-4 z-30 lg:hidden">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <button onClick={() => setActiveTab('chat')} className={`flex flex-col items-center gap-1 ${activeTab === 'chat' ? 'text-primary' : 'text-white/40'}`}>
              <span className={`material-symbols-outlined ${activeTab === 'chat' ? 'fill-1' : ''}`}>chat_bubble</span>
              <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_chat')}</span>
            </button>
            <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-primary' : 'text-white/40'}`}>
              <span className={`material-symbols-outlined ${activeTab === 'history' ? 'fill-1' : ''}`}>history</span>
              <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_history')}</span>
            </button>
            <button onClick={() => setActiveTab('profile')} className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-primary' : 'text-white/40'}`}>
              <span className={`material-symbols-outlined ${activeTab === 'profile' ? 'fill-1' : ''}`}>person</span>
              <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_profile')}</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default MainLayout;
