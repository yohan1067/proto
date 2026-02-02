import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';

const ProfileTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { session, nickname, setNickname, resetAuth } = useAuthStore();
  const { showAlert } = useUIStore();
  
  const [newNickname, setNewNickname] = useState<string>('');
  const [isUpdatingNickname, setIsUpdatingNickname] = useState<boolean>(false);

  useEffect(() => {
    setNewNickname(nickname || '');
  }, [nickname]);

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
  };

  const handleUpdateNickname = async () => {
    if (!newNickname.trim() || newNickname.trim().length < 2) {
      showAlert(t('profile_settings'), "닉네임은 2자 이상 입력해주세요.", 'error');
      return;
    }
    setIsUpdatingNickname(true);
    try {
      if (!session?.user) return;

      const { error } = await supabase
        .from('users')
        .update({ nickname: newNickname.trim(), updated_at: new Date().toISOString() })
        .eq('id', session.user.id);

      if (!error) {
        setNickname(newNickname.trim());
        localStorage.setItem('user_nickname', newNickname.trim());
        showAlert(t('profile_settings'), t('profile_save'), 'success');
      } else {
        throw error;
      }
    } catch (error) {
      console.error("Update nickname error:", error);
      showAlert(t('profile_settings'), "닉네임 수정 중 오류가 발생했습니다.", 'error');
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    resetAuth();
    // ChatStore reset logic needs to be called too, maybe via a global reset or effect in App
  };

  const handleWithdraw = async () => {
    if (!window.confirm("정말로 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    try {
      if (!session?.user) return;
      
      await supabase.from('users').delete().eq('id', session.user.id);
      
      await handleLogout();
      showAlert("Success", "탈퇴 처리가 완료되었습니다.", 'success');
    } catch (_error) {
      console.error("Withdraw error:", _error);
      showAlert("Error", "탈퇴 처리 중 오류가 발생했습니다.", 'error');
    }
  };

  return (
    <>
      <header className="pt-14 pb-4 px-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-20">
        <h1 className="text-2xl font-bold tracking-tight">{t('nav_profile')}</h1>
      </header>
      <main className="flex-1 p-6 space-y-8 pb-32 overflow-y-auto no-scrollbar">
        <section className="flex flex-col items-center py-4">
          <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(19,91,236,0.2)]">
            <span className="material-symbols-outlined text-primary text-5xl fill-1">person</span>
          </div>
          <h2 className="text-xl font-bold text-white">{nickname}</h2>
          <p className="text-xs text-white/30 uppercase tracking-widest mt-1">{t('profile_account_type')}</p>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em]">{t('profile_settings')}</h3>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-white/40 ml-1">{t('profile_nickname_label')}</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={newNickname}
                  onChange={(e) => setNewNickname(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                />
                <button 
                  onClick={handleUpdateNickname}
                  disabled={isUpdatingNickname}
                  className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUpdatingNickname ? "..." : t('profile_save')}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 flex justify-between items-center">
            <span className="text-xs text-white/40 ml-1">Language / 언어</span>
            <button 
              onClick={toggleLanguage}
              className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-wider text-white"
            >
              {i18n.language.startsWith('ko') ? 'English' : '한국어'}
            </button>
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <h3 className="text-xs font-bold text-red-500/60 uppercase tracking-[0.2em]">{t('profile_danger_zone')}</h3>
          <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
            <p className="text-xs text-red-500/40 mb-4 leading-relaxed">
              {t('profile_withdraw_warning')}
            </p>
            <button 
              onClick={handleWithdraw}
              className="w-full h-12 border border-red-500/30 text-red-500/60 hover:bg-red-500 hover:text-white rounded-xl transition-all text-xs font-bold uppercase"
            >
              {t('profile_withdraw_button')}
            </button>
          </div>
        </section>
      </main>
    </>
  );
};

export default ProfileTab;
