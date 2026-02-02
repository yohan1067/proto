import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { supabase } from '../lib/supabase';

const LoginScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isLoggingIn, setIsLoggingIn } = useAuthStore();
  const { showAlert } = useUIStore();
  
  const [isEmailMode, setIsEmailMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
  };

  const handleEmailLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      showAlert('Error', '이메일과 비밀번호를 입력해주세요.', 'error');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '로그인에 실패했습니다.';
      showAlert('Login Failed', errMsg, 'error');
      setIsLoggingIn(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      showAlert('Error', '이메일과 비밀번호를 입력해주세요.', 'error');
      return;
    }
    if (password.length < 6) {
      showAlert('Error', '비밀번호는 6자 이상이어야 합니다.', 'error');
      return;
    }
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: email.split('@')[0],
            nickname: email.split('@')[0]
          }
        }
      });
      if (error) throw error;
      showAlert('Success', '가입 인증 메일을 보냈습니다. 이메일을 확인해주세요.', 'success');
      setIsLoggingIn(false);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : '회원가입에 실패했습니다.';
      showAlert('Signup Failed', errMsg, 'error');
      setIsLoggingIn(false);
    }
  };

  const handleKakaoLogin = async () => {
    setIsLoggingIn(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: 'https://proto-9ff.pages.dev',
          queryParams: {
            scope: 'profile_nickname openid'
          }
        }
      });
      if (error) throw error;
    } catch (error: unknown) {
      console.error('Login error:', error);
      showAlert('Login Failed', '카카오 로그인에 실패했습니다.', 'error');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="relative flex-1 flex flex-col justify-between overflow-hidden max-w-3xl mx-auto w-full shadow-2xl border-x border-white/5">
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={toggleLanguage}
          className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-wider text-white"
        >
          {i18n.language.startsWith('ko') ? 'English' : '한국어'}
        </button>
      </div>

      <div className="flex items-center bg-transparent p-4 justify-end z-10 mt-4">
      </div>

      <div className="relative flex-1 flex flex-col items-center justify-center px-4">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] ai-orb-glow opacity-60 animate-pulse-slow"></div>
        
        <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full ai-orb-core shadow-[0_0_60px_rgba(19,91,236,0.5)] flex items-center justify-center">
          <div className="w-32 h-32 rounded-full border border-white/10 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full border border-white/20"></div>
          </div>
          <div className="absolute top-4 left-10 w-2 h-2 bg-white/40 rounded-full blur-[1px]"></div>
          <div className="absolute bottom-10 right-8 w-3 h-3 bg-white/20 rounded-full blur-[2px]"></div>
        </div>

        <div className="mt-12 text-center z-10">
          <h1 className="text-white tracking-tight text-4xl sm:text-5xl font-bold leading-tight px-4 pb-3 whitespace-pre-line">
            {t('hero_title')}
          </h1>
          <h2 className="text-white/50 text-base font-normal leading-relaxed px-8 max-w-md mx-auto">
            {t('hero_subtitle')}
          </h2>
        </div>
      </div>

      <div className="pb-12 px-6 flex flex-col gap-4 z-10 max-w-md mx-auto w-full">
        {isEmailMode ? (
          <form 
            onSubmit={handleEmailLogin}
            className="space-y-4 animate-in slide-in-from-bottom-4 fade-in"
          >
            <div className="space-y-3">
              <input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/30"
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-white/30"
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                type="submit"
                disabled={isLoggingIn}
                className="flex-1 rounded-2xl h-14 bg-primary text-white font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoggingIn ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : "Login"}
              </button>
              <button 
                type="button"
                onClick={handleEmailSignUp}
                disabled={isLoggingIn}
                className="flex-1 rounded-2xl h-14 bg-white/10 text-white font-bold border border-white/10 active:scale-95 transition-all disabled:opacity-50"
              >
                Sign Up
              </button>
            </div>
            <button 
              type="button"
              onClick={() => setIsEmailMode(false)}
              className="w-full text-xs text-white/40 hover:text-white transition-colors py-2"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
                            <button 
                              onClick={handleKakaoLogin}
                              disabled={isLoggingIn}
                              className="flex min-w-full items-center justify-center rounded-2xl h-16 px-5 bg-kakao-yellow text-black gap-3 font-bold text-lg shadow-lg active:scale-95 transition-all duration-100 disabled:opacity-70"
                            >
                              {isLoggingIn ? (
                                <>
                                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                  <span className="truncate">{t('logging_in')}</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined fill-1">chat_bubble</span>
                                  <span className="truncate">{t('login_kakao')}</span>
                                </>
                              )}
                            </button>
            
                                            <div className="pt-2">
                                              <button 
                                                onClick={() => setIsEmailMode(true)}
                                                className="w-full flex items-center justify-center gap-2 h-16 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all text-white/60 font-semibold text-base shadow-sm"
                                              >
                                                <span className="material-symbols-outlined text-xl">mail</span>
                                                이메일로 계속하기
                                              </button>
                                            </div>                          </>
                        )}
        <div className="text-white/30 text-xs text-center font-normal leading-normal mt-4 px-8">
          {t('terms_prefix')}
          <button 
            onClick={() => showAlert(t('terms'), t('terms_content'), 'info')}
            className="underline underline-offset-2 hover:text-white/40"
          >
            {t('terms')}
          </button>
          {t('and')}
          <button 
            onClick={() => showAlert(t('privacy'), t('privacy_content'), 'info')}
            className="underline underline-offset-2 hover:text-white/40"
          >
            {t('privacy')}
          </button>.
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-background-dark to-transparent pointer-events-none"></div>
    </div>
  );
};

export default LoginScreen;
