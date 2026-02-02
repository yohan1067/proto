import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';
import HistorySkeleton from './HistorySkeleton';

const HistoryTab: React.FC = () => {
  const { t } = useTranslation();
  const { history, searchQuery, setSearchQuery, setMessages, setHistory } = useChatStore();
  const { setActiveTab } = useUIStore();
  const { session } = useAuthStore();
  const [isFetching, setIsFetching] = useState<boolean>(true);

  const fetchChatHistory = async () => {
    if (!session?.user) return;
    setIsFetching(true);
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setHistory(data);
      if (error) console.error("History fetch error:", error);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const filteredHistory = history.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <header className="py-4 px-6 z-20 shrink-0 bg-background-dark/80 backdrop-blur-md">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t('history_title')}</h1>
          <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-white/70">more_horiz</span>
          </button>
        </div>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-xl">search</span>
          <input 
            className="w-full bg-white/5 border-none rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-white/30 focus:ring-1 focus:ring-primary/50 transition-all" 
            placeholder={t('search_placeholder')}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pt-4 pb-32 space-y-4 no-scrollbar">
        {isFetching ? (
          <HistorySkeleton />
        ) : filteredHistory.length === 0 ? (
          <div className="pt-10 text-center text-white/30 text-sm italic">
            {t('no_history')}
          </div>
        ) : (
          <div className="pt-2">
            <p className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-4">{t('today')}</p>
            <div className="space-y-3">
              {filteredHistory.map((item) => (
                <div 
                  key={item.id} 
                  onClick={() => {
                    const loadedMessages: Message[] = [
                      { id: 1, text: item.question, sender: 'user', timestamp: '' },
                      { id: 2, text: item.answer, sender: 'ai', timestamp: '' }
                    ];
                    setMessages(loadedMessages);
                    setActiveTab('chat');
                  }}
                  className="chat-card-glow group bg-card-dark border border-white/5 rounded-2xl p-4 transition-all duration-300 active:scale-[0.98] cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-white/90 group-hover:text-primary transition-colors line-clamp-1">{item.question}</h3>
                    <span className="text-[10px] text-white/30 font-medium">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 line-clamp-2 leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <button 
        onClick={() => setActiveTab('chat')}
        className="fixed right-6 bottom-28 w-14 h-14 bg-primary rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center active:scale-90 transition-transform z-20 lg:right-[calc(50%-24rem+1.5rem)]"
      >
        <span className="material-symbols-outlined text-white text-3xl">add</span>
      </button>
    </>
  );
};

export default HistoryTab;
