import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';
import type { UserItem, ChatHistoryItem } from '../types';

const AdminTab: React.FC = () => {
  const { t } = useTranslation();
  const { systemPrompt, setSystemPrompt } = useChatStore();
  const { showAlert } = useUIStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [allLogs, setAllLogs] = useState<ChatHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchSystemPrompt = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'system_prompt')
        .single();
        
      if (data) setSystemPrompt(data.value);
    } catch (_error) {
      console.error('Failed to fetch system prompt:', _error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setUsers(data);
      if (error) console.error("Users fetch error:", error);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAllLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select(`
          *,
          users (
            nickname
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (data) setAllLogs(data as any); // Cast due to joined user data
      if (error) console.error("Logs fetch error:", error);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleSavePrompt = async () => {
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({ key: 'system_prompt', value: systemPrompt });
        
      if (!error) {
        showAlert(t('admin_title'), t('prompt_saved'), 'success');
      } else {
        throw error;
      }
    } catch (error) {
      console.error("Save prompt error:", error);
      showAlert("Error", "Save failed", 'error');
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await Promise.all([fetchSystemPrompt(), fetchUsers(), fetchAllLogs()]);
      setIsLoading(false);
    };
    init();
  }, []);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-xs text-white/40 uppercase tracking-widest animate-pulse">Loading Admin Data</p>
      </div>
    );
  }

  return (
    <>
      <header className="py-4 px-6 z-20 shrink-0 bg-background-dark/80 backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight">{t('admin_title')}</h1>
      </header>
      <main className="flex-1 p-6 space-y-10 pb-32 overflow-y-auto no-scrollbar">
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">{t('admin_system_prompt')}</h2>
          <div className="space-y-2">
            <textarea
              className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none"
              rows={6}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <button
              onClick={handleSavePrompt}
              className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              {t('save_prompt')}
            </button>
          </div>
        </section>

        <section className="space-y-4 max-w-full overflow-hidden">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">{t('admin_user_management')} ({users.length})</h2>
          <div className="space-y-3">
            {users.map(u => (
              <div key={u.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center gap-4 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate text-sm">
                    {u.nickname} 
                    {u.is_admin ? (
                      <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2 font-black tracking-tighter">ADMIN</span>
                    ) : (
                      <span className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full ml-2 font-medium tracking-tighter">USER</span>
                    )}
                  </p>
                  <p className="text-[11px] text-white/40 truncate">{u.email || 'No email'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[9px] text-white/20">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-bold text-primary uppercase tracking-widest">전체 대화 로그 (최근 100건)</h2>
          <div className="space-y-4">
            {allLogs.length === 0 ? (
              <p className="text-xs text-white/20 italic text-center py-4">대화 기록이 없습니다.</p>
            ) : (
              allLogs.map((log) => (
                <div key={log.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-[11px] font-bold text-primary">{(log as any).users?.nickname || 'Unknown'}</span>
                    <span className="text-[9px] text-white/20">{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <p className="text-[10px] text-white/30 uppercase font-black">Q</p>
                      <p className="text-xs text-white/80 line-clamp-2">{log.question}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-primary/50 uppercase font-black">A</p>
                      <p className="text-xs text-white/60 line-clamp-3">{log.answer}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </>
  );
};

export default AdminTab;
