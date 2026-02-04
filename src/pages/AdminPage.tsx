import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';
import type { UserItem, ChatHistoryItem } from '../types';

// Extend type to include joined user data
interface ChatLog extends ChatHistoryItem {
  users?: {
    nickname: string;
  };
}

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, session } = useAuthStore();
  const { systemPrompt, setSystemPrompt } = useChatStore();
  const { showAlert } = useUIStore();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [allLogs, setAllLogs] = useState<ChatLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!session) {
        navigate('/');
        return;
    }
    // Allow brief loading state before redirecting non-admins, or handle in component
    // Ideally useAuthInit should have finished.
  }, [session, navigate]);

  useEffect(() => {
    const fetchSystemPrompt = async () => {
        try {
          const { data } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'system_prompt')
            .single();
            
          if (data) setSystemPrompt(data.value);
        } catch (error: unknown) {
          console.error('Failed to fetch system prompt:', error);
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
        } catch (error: unknown) {
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
          
          if (data) setAllLogs(data as unknown as ChatLog[]);
          if (error) console.error("Logs fetch error:", error);
        } catch (error: unknown) {
          console.error('Failed to fetch logs:', error);
        }
    };

    const init = async () => {
      if (!isAdmin) return;
      setIsLoading(true);
      await Promise.all([fetchSystemPrompt(), fetchUsers(), fetchAllLogs()]);
      setIsLoading(false);
    };
    init();
  }, [setSystemPrompt, isAdmin]);

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
    } catch (error: unknown) {
      console.error("Save prompt error:", error);
      showAlert("Error", "Save failed", 'error');
    }
  };

  if (!isAdmin) {
      return (
        <div className="min-h-screen bg-background-dark text-white flex items-center justify-center">
            <p>Access Denied</p>
        </div>
      );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <p className="text-xs text-white/40 uppercase tracking-widest animate-pulse">Loading Admin Data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark text-white p-6 md:p-10 font-display">
      <header className="max-w-7xl mx-auto flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
             <button 
                onClick={() => navigate('/')} 
                className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
             >
                <span className="material-symbols-outlined text-white/70">arrow_back</span>
             </button>
             <h1 className="text-3xl font-bold tracking-tight">{t('admin_title')}</h1>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
            <section className="bg-card-dark border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">psychology</span>
                {t('admin_system_prompt')}
            </h2>
            <div className="space-y-4">
                <textarea
                className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white focus:ring-2 focus:ring-primary outline-none transition-all resize-none font-mono text-sm leading-relaxed"
                rows={10}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                />
                <button
                onClick={handleSavePrompt}
                className="w-full h-14 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                >
                {t('save_prompt')}
                </button>
            </div>
            </section>

            <section className="bg-card-dark border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl overflow-hidden">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">group</span>
                {t('admin_user_management')} ({users.length})
            </h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                {users.map(u => (
                <div key={u.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center gap-4 group hover:bg-white/10 transition-colors">
                    <div className="min-w-0 flex-1">
                    <p className="font-bold text-white truncate text-sm flex items-center gap-2">
                        {u.nickname} 
                        {u.is_admin ? (
                        <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-black tracking-tighter border border-primary/20">ADMIN</span>
                        ) : (
                        <span className="text-[9px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full font-medium tracking-tighter border border-white/5">USER</span>
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
        </div>

        {/* Right Column */}
        <div className="space-y-8">
            <section className="bg-card-dark border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl h-full">
            <h2 className="text-sm font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">history</span>
                전체 대화 로그 (최근 100건)
            </h2>
            <div className="space-y-4 max-h-[800px] overflow-y-auto no-scrollbar pr-2">
                {allLogs.length === 0 ? (
                <p className="text-xs text-white/20 italic text-center py-10">대화 기록이 없습니다.</p>
                ) : (
                allLogs.map((log) => (
                    <div key={log.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 overflow-hidden hover:bg-white/[0.07] transition-colors">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-[10px] font-bold">
                                {log.users?.nickname?.[0] || 'U'}
                            </div>
                            <span className="text-[11px] font-bold text-white/90">{log.users?.nickname || 'Unknown'}</span>
                        </div>
                        <span className="text-[9px] text-white/30 font-mono">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <div className="space-y-3 pt-1">
                        <div className="flex gap-3">
                            <div className="w-5 min-w-[20px] text-[10px] text-white/30 uppercase font-black text-right pt-0.5">Q</div>
                            <p className="text-xs text-white/80 leading-relaxed">{log.question}</p>
                        </div>
                        <div className="flex gap-3">
                            <div className="w-5 min-w-[20px] text-[10px] text-primary/50 uppercase font-black text-right pt-0.5">A</div>
                            <p className="text-xs text-white/60 leading-relaxed">{log.answer}</p>
                        </div>
                    </div>
                    </div>
                ))
                )}
            </div>
            </section>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
