import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BACKEND_URL = 'https://proto-backend.yohan1067.workers.dev';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface ChatHistoryItem {
  id: number;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

interface UserItem {
  id: string;
  nickname: string;
  email: string | null;
  is_admin: boolean;
  created_at: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [modalConfig, setModalConfig] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
    onConfirm?: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [nickname, setNickname] = useState<string | null>(null);
  const [question, setQuestion] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [isUpdatingNickname, setIsUpdatingNickname] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'profile' | 'admin'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [newNickname, setNewNickname] = useState<string>('');
  const [isEmailMode, setIsEmailMode] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info', onConfirm?: () => void) => {
    setModalConfig({ show: true, title, message, type, onConfirm });
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
    } catch (error: any) {
      showAlert('Login Failed', error.message || '로그인에 실패했습니다.', 'error');
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
    } catch (error: any) {
      showAlert('Signup Failed', error.message || '회원가입에 실패했습니다.', 'error');
      setIsLoggingIn(false);
    }
  };

  const triggerToast = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isLoadingAi, activeTab]);

  // Auth & Profile Listener
  useEffect(() => {
    console.log("App Version: 2026-02-01v2 (Supabase Native Auth)");
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
                 const newNickname = meta?.full_name || meta?.nickname || 'User';
                 
                 const { error: insertError } = await supabase
                   .from('users')
                   .insert({ 
                       id: userId, 
                       email: user.email,
                       nickname: newNickname,
                       is_admin: false 
                   });
                 
                 if (!insertError) {
                     setNickname(newNickname);
                     setIsAdmin(false);
                     localStorage.setItem('user_nickname', newNickname);
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

  const fetchChatHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_history')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) setHistory(data);
      if (error) console.error(error);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchSystemPrompt = async () => {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'system_prompt')
        .single();
        
      if (data) setSystemPrompt(data.value);
    } catch (error) {
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
      if (error) console.error(error);
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
      showAlert("Error", "Save failed", 'error');
    }
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
      showAlert(t('profile_settings'), "닉네임 수정 중 오류가 발생했습니다.", 'error');
    } finally {
      setIsUpdatingNickname(false);
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm("정말로 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
    try {
      // Supabase Auth deletion usually requires Admin API or Edge Function
      // For now, we will just delete the public profile data and sign out.
      // To fully delete Auth user, you need a backend function.
      if (!session?.user) return;
      
      // Delete data (Cascade should handle chat_history/login_history if configured, else delete manually)
      await supabase.from('users').delete().eq('id', session.user.id);
      
      // Sign out
      await handleLogout();
      showAlert("Success", "탈퇴 처리가 완료되었습니다.", 'success');
    } catch (error) {
      showAlert("Error", "탈퇴 처리 중 오류가 발생했습니다.", 'error');
    }
  };

  useEffect(() => {
    if (session && activeTab === 'history') fetchChatHistory();
    if (session && activeTab === 'admin') {
      fetchSystemPrompt();
      fetchUsers();
    }
    if (session && activeTab === 'profile') {
      setNewNickname(nickname || '');
    }
  }, [session, activeTab]);

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
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
    setMessages(prev => [...prev, userMsg]);
    setQuestion('');
    setIsLoadingAi(true);
    setActiveTab('chat');
    
    inputRef.current?.focus();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      // Use Supabase Session Token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

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
        const data = await response.json();
        const aiMsg: Message = {
          id: Date.now() + 1,
          text: data.answer || "No response text",
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errorText = await response.text();
        let errorMsg = `Server Error (${response.status})`;
        try {
            const errorJson = JSON.parse(errorText);
            errorMsg = errorJson.message || errorJson.error || errorMsg;
        } catch (e) {}

        const aiMsg: Message = {
          id: Date.now() + 1,
          text: `[Error] ${errorMsg}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      }
    } catch (error: any) {
       clearTimeout(timeoutId);
       let errorText = 'Connection error occurred.';
       if (error.name === 'AbortError') {
         errorText = '[Error] 요청 시간이 초과되었습니다 (60초).';
       }
       const aiMsg: Message = {
          id: Date.now() + 1,
          text: errorText,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoadingAi(false);
      inputRef.current?.focus();
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
    } catch (error) {
      console.error('Login error:', error);
      showAlert('Login Failed', '카카오 로그인에 실패했습니다.', 'error');
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggingIn(false);
    setIsInitialLoading(false);
    setNickname(null);
    setIsAdmin(false);
    setQuestion('');
    setMessages([]);
    setHistory([]);
    setActiveTab('chat');
    setIsEmailMode(false);
    setEmail('');
    setPassword('');
  };

  const handleAuthModalConfirm = () => {
    setShowAuthModal(false);
  };

  const filteredHistory = history.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              <div className="absolute inset-0 gradient-blur pointer-events-none"></div>
              
              <header className="flex items-center justify-between px-6 pt-14 pb-4 z-20 absolute top-0 left-0 right-0 bg-gradient-to-b from-background-dark/90 to-transparent backdrop-blur-[2px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(19,91,236,0.5)]">
                    <span className="material-symbols-outlined text-white text-sm fill-1">auto_awesome</span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight">AI Assistant</h1>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/60 hidden sm:block">{nickname}{t('welcome')}</span>
                  <button 
                    onClick={handleLogout}
                    className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all group"
                  >
                    <span className="material-symbols-outlined text-white/70 group-hover:text-red-400">logout</span>
                  </button>
                </div>
              </header>

              <main className={`flex-1 relative overflow-y-auto px-4 pt-24 pb-32 scroll-smooth no-scrollbar`}>
                {messages.length === 0 ? (
                   <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 px-10 text-center -mt-20">
                      <span className="material-symbols-outlined text-6xl mb-4">chat_bubble</span>
                      <p className="text-lg font-medium">{t('help_label')}</p>
                   </div>
                ) : (
                  <div className="space-y-6 pb-40">
                    {messages.map((msg) => (
                      <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[80%] ${msg.sender === 'user' ? 'ml-auto' : ''} animate-slide-in`}>
                        <div className={`${msg.sender === 'ai' ? 'glass-ai rounded-tl-none' : 'glass-user rounded-tr-none'} rounded-2xl p-4 text-[15px] leading-relaxed relative group break-words overflow-hidden w-full`}>
                          {msg.text}
                          {msg.sender === 'ai' && (
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(msg.text);
                                triggerToast();
                              }}
                              className="absolute -bottom-10 right-0 bg-white/10 border border-white/10 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-white/70 hover:text-white z-30"
                            >
                              <span className="material-symbols-outlined text-sm">content_copy</span>
                              {t('copy')}
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] text-white/30 mt-2 mx-1 uppercase tracking-widest">
                          {msg.sender === 'ai' ? t('ai_name') : t('you')} • {msg.timestamp}
                        </span>
                      </div>
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

              <div className="fixed bottom-24 left-0 right-0 p-4 z-50 pointer-events-auto max-w-3xl mx-auto">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAskAi(); }}
                  className="input-container flex items-center gap-3 p-2 pl-4 rounded-2xl w-full shadow-2xl bg-[#161b2a] border border-white/10 backdrop-blur-2xl"
                >
                  <input 
                    ref={inputRef}
                    className="bg-transparent border-none flex-1 min-w-0 focus:ring-0 text-sm text-white placeholder-white/40 py-2 px-2" 
                    placeholder={t('ask_placeholder')}
                    type="text"
                    autoComplete="off"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={isLoadingAi || !question.trim()}
                    className="w-10 h-10 flex-shrink-0 rounded-xl bg-primary text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-30"
                  >
                    <span className="material-symbols-outlined text-white text-[20px] fill-1">send</span>
                  </button>
                </form>
              </div>
            </>
          ) : activeTab === 'history' ? (
            <>
              <header className="pt-14 pb-4 px-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-20">
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

              <main className="flex-1 overflow-y-auto px-6 pb-32 space-y-4 no-scrollbar">
                {filteredHistory.length === 0 ? (
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
                            setMessages([
                              { id: 1, text: item.question, sender: 'user', timestamp: '' },
                              { id: 2, text: item.answer, sender: 'ai', timestamp: '' }
                            ]);
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
          ) : activeTab === 'profile' ? (
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
          ) : (
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
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden max-w-3xl mx-auto w-full shadow-2xl border-x border-white/5">
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

                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => setIsEmailMode(true)}
                    className="flex-1 flex items-center justify-center h-14 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                  >
                    <span className="material-symbols-outlined text-white/60">mail</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center h-14 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all">
                    <span className="material-symbols-outlined text-white/60">brand_awareness</span>
                  </button>
                </div>
              </>
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
      )}
    </div>
  );
}

export default App;
