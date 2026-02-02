import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Message } from './types';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import ChatHeader from './components/ChatHeader';
import HistoryTab from './components/HistoryTab';
import ProfileTab from './components/ProfileTab';
import AdminTab from './components/AdminTab';
import LoginScreen from './components/LoginScreen';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { useChatStore } from './store/useChatStore';
import { supabase } from './lib/supabase';

const BACKEND_URL = 'https://proto-backend.yohan1067.workers.dev';

function App() {
  const { t, i18n } = useTranslation();
  const { 
    session, isAdmin, isInitialLoading,
    setSession, setIsAdmin, setNickname, setIsInitialLoading 
  } = useAuthStore();
  const { 
    activeTab, setActiveTab, showAuthModal, setShowAuthModal,
    showToast, setShowToast, modalConfig, setModalConfig
  } = useUIStore();
  const { 
    question, messages, isLoadingAi, 
    setQuestion, setMessages, setIsLoadingAi 
  } = useChatStore();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoadingAi, activeTab]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('nickname, is_admin')
        .eq('id', userId)
        .single();
      
      if (data) {
        setNickname(data.nickname);
        setIsAdmin(data.is_admin);
        localStorage.setItem('user_nickname', data.nickname);
      } else if (error) {
          if (error.code === 'PGRST116') {
             console.log("Profile missing, creating new profile...");
             const { data: { user } } = await supabase.auth.getUser();
             if (user) {
                 const meta = user.user_metadata;
                 const newNicknameStr = meta?.full_name || meta?.nickname || 'User';
                 
                 const { error: insertError } = await supabase
                   .from('users')
                   .insert({ 
                       id: userId, 
                       email: user.email,
                       nickname: newNicknameStr,
                       is_admin: false 
                   });
                 
                 if (!insertError) {
                     setNickname(newNicknameStr);
                     setIsAdmin(false);
                     localStorage.setItem('user_nickname', newNicknameStr);
                 } else {
                     console.error("Failed to create profile:", insertError);
                 }
             }
          } else {
             console.error("Profile fetch error:", error);
          }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setIsInitialLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setNickname(null);
        setIsAdmin(false);
        setIsInitialLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleAskAi = async (customPrompt?: string) => {
    const prompt = customPrompt || question;
    if (!prompt.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      text: prompt,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion('');
    setIsLoadingAi(true);
    setActiveTab('chat');
    
    inputRef.current?.focus();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      if (!token) {
          setShowAuthModal(true);
          return;
      }

      const response = await fetch(`${BACKEND_URL}/api/ai/ask`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: prompt }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const contentType = response.headers.get("content-type");

      if (response.ok && contentType && contentType.includes("application/json")) {
        const data = await response.json() as { answer?: string };
        const aiMsg: Message = {
          id: Date.now() + 1,
          text: data.answer || "No response text",
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errorText = await response.text();
        let errorMsg = `Server Error (${response.status})`;
        try {
            const errorJson = JSON.parse(errorText) as { message?: string, error?: string };
            errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch {
            // Ignore parse error
        }

        const aiMsg: Message = {
          id: Date.now() + 1,
          text: `[Error] ${errorMsg}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, aiMsg]);
      }
    } catch (error: unknown) {
       clearTimeout(timeoutId);
       let errorText = 'Connection error occurred.';
       if (error instanceof Error) {
         if (error.name === 'AbortError') {
           errorText = '[Error] 요청 시간이 초과되었습니다 (60초).';
         } else {
           errorText = `[Error] ${error.message}`;
         }
       }
       const aiMsg: Message = {
          id: Date.now() + 1,
          text: errorText,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoadingAi(false);
      inputRef.current?.focus();
    }
  };

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
  };

  const handleAuthModalConfirm = () => {
    setShowAuthModal(false);
  };

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

      {/* Auth Modal */}
      {showAuthModal && (
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
              onClick={handleAuthModalConfirm}
              className="w-full h-14 bg-primary text-white font-bold rounded-2xl hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
              {t('auth_modal_button')}
            </button>
          </div>
        </div>
      )}

      {/* Universal Alert Modal */}
      {modalConfig.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-[#161b2a] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 text-center space-y-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
              modalConfig.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
              modalConfig.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
              'bg-primary/10 border border-primary/20'
            }`}>
              <span className={`material-symbols-outlined text-3xl ${
                modalConfig.type === 'success' ? 'text-green-500' :
                modalConfig.type === 'error' ? 'text-red-500' :
                'text-primary'
              }`}>
                {modalConfig.type === 'success' ? 'check_circle' : 
                 modalConfig.type === 'error' ? 'error' : 'info'}
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">{modalConfig.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed break-words whitespace-pre-wrap">
                {modalConfig.message}
              </p>
            </div>
            <button 
              onClick={() => {
                setModalConfig({ ...modalConfig, show: false });
                if (modalConfig.onConfirm) modalConfig.onConfirm();
              }}
              className="w-full h-14 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={toggleLanguage}
          className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-wider"
        >
          {i18n.language.startsWith('ko') ? 'English' : '한국어'}
        </button>
      </div>

      {session ? (
        <div className="relative flex h-screen w-full flex-col bg-gradient-mesh overflow-hidden mx-auto max-w-3xl shadow-2xl border-x border-white/5">
          {activeTab === 'chat' ? (
            <>
              <ChatHeader />

              <main className={`flex-1 relative overflow-y-auto px-4 pt-4 pb-32 scroll-smooth no-scrollbar`}>
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
                        triggerToast={triggerToast} 
                      />
                    ))}
                    {isLoadingAi && (
                      <div className="flex flex-col items-start max-w-[85%] animate-pulse">
                        <div className="glass-ai rounded-2xl rounded-tl-none p-4 text-[15px]">
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        </div>
                      </div>
                    )}
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