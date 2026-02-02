import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '../store/useChatStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';
import type { UserItem } from '../types';

const AdminTab: React.FC = () => {
  const { t } = useTranslation();
  const { systemPrompt, setSystemPrompt } = useChatStore();
  const { showAlert } = useUIStore();
  const [users, setUsers] = useState<UserItem[]>([]);

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
    fetchSystemPrompt();
    fetchUsers();
  }, []);

  return (
    <>
      <header className="pt-14 pb-4 px-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-20">
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
              className="w-full h-12 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all"
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
                  <p className="font-bold text-white truncate">
                    {u.nickname} 
                    {u.is_admin ? (
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2 font-black tracking-tighter">ADMIN</span>
                    ) : (
                      <span className="text-[10px] bg-white/5 text-white/40 px-2 py-0.5 rounded-full ml-2 font-medium tracking-tighter">USER</span>
                    )}
                  </p>
                  <p className="text-xs text-white/40 truncate">{u.email || 'No email'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-white/20">{new Date(u.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
};

export default AdminTab;
