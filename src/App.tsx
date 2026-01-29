import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

interface ChatHistoryItem {
  id: number;
  question: string;
  answer: string;
  createdAt: string;
}

interface UserItem {
  id: number;
  nickname: string;
  email: string | null;
  isAdmin: boolean;
  createdAt: string;
}

function App() {
  const { t, i18n } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [nickname, setNickname] = useState<string | null>(localStorage.getItem('user_nickname'));
  const [question, setQuestion] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ChatHistoryItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history' | 'admin'>('chat');
  const [searchQuery, setSearchQuery] = useState('');
  
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

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  };

  const fetchSystemPrompt = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/admin/prompt', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSystemPrompt(data.prompt);
      }
    } catch (error) {
      console.error('Failed to fetch system prompt:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleSavePrompt = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/admin/prompt', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: systemPrompt })
      });
      if (response.ok) {
        alert(t('prompt_saved'));
      }
    } catch (error) {
      alert('Save failed');
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm("정말로 탈퇴하시겠습니까? 모든 대화 기록이 삭제됩니다.")) return;
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/user/withdraw', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert("탈퇴 처리가 완료되었습니다.");
        handleLogout();
      }
    } catch (error) {
      alert("탈퇴 처리 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeTab === 'history') fetchChatHistory();
    if (isLoggedIn && activeTab === 'admin') {
      fetchSystemPrompt();
      fetchUsers();
    }
  }, [isLoggedIn, activeTab]);

  const toggleLanguage = () => {
    const nextLng = i18n.language.startsWith('ko') ? 'en' : 'ko';
    i18n.changeLanguage(nextLng);
  };

  const fetchUserProfile = async (token: string) => {
    const profileController = new AbortController();
    const profileTimeout = setTimeout(() => profileController.abort(), 20000);

    try {
      console.log("Fetching user profile...");
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/user/me', {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: profileController.signal
      });
      
      clearTimeout(profileTimeout);
      const contentType = response.headers.get("content-type");
      
      if (response.ok && contentType && contentType.includes("application/json")) {
        const userData = await response.json();
        console.log("User profile fetched:", userData);
        setNickname(userData.nickname);
        localStorage.setItem('user_nickname', userData.nickname);
        setIsAdmin(!!userData.isAdmin);
        setIsLoggedIn(true);
      } else {
        const errorText = await response.text();
        console.error("Profile fetch failed:", response.status, errorText);
        alert(`인증 실패 (Status: ${response.status}). 다시 로그인해주세요.`);
        handleLogout();
      }
    } catch (error: any) {
      console.error("Profile fetch exception:", error);
      handleLogout();
    } finally {
      setIsInitialLoading(false);
      setIsLoggingIn(false);
    }
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
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('https://proto-backend.yohan1067.workers.dev/api/ai/ask', {
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
          errorMsg = errorJson.error || errorMsg;
        } catch (e) {}
        
        const aiErrorMsg: Message = {
          id: Date.now() + 1,
          text: `[Error] ${errorMsg}`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiErrorMsg]);
      }
    } catch (error: any) {
       clearTimeout(timeoutId);
       let errorText = 'Connection error occurred.';
       if (error.name === 'AbortError') {
         errorText = '[Error] 요청 시간이 초과되었습니다 (30초).';
       }
       const aiErrorMsg: Message = {
          id: Date.now() + 1,
          text: errorText,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiErrorMsg]);
    } finally {
      setIsLoadingAi(false);
      inputRef.current?.focus();
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      setIsLoggingIn(true);
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      fetchUserProfile(accessToken);
      window.history.replaceState({}, document.title, "/");
    } else {
      const token = localStorage.getItem('access_token');
      if (token) {
        fetchUserProfile(token);
      } else {
        setIsInitialLoading(false);
      }
    }
  }, []);

  const handleKakaoLogin = () => {
    setIsLoggingIn(true);
    const KAKAO_CLIENT_ID = '810bb035b44a77dbc46896dccb59432b';
    const KAKAO_REDIRECT_URI = 'https://proto-backend.yohan1067.workers.dev/api/auth/kakao/callback';
    const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}`;
    window.location.href = kakaoAuthURL;
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_nickname');
    setIsLoggedIn(false);
    setIsLoggingIn(false);
    setIsInitialLoading(false);
    setNickname(null);
    setIsAdmin(false);
    setQuestion('');
    setMessages([]);
    setHistory([]);
    setActiveTab('chat');
    window.history.replaceState({}, document.title, "/");
  };

  const filteredHistory = history.filter(item => 
    item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background-dark">
        <div className="relative w-32 h-32 rounded-full ai-orb-core animate-pulse-slow flex items-center justify-center shadow-[0_0_40px_rgba(19,91,236,0.3)]">
          <span className="material-symbols-outlined text-white animate-spin">progress_activity</span>
        </div>
        <p className="mt-8 text-white/40 text-sm tracking-widest uppercase animate-pulse">{t('loading_profile')}</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-background-dark text-white font-display">
      <div className="absolute top-4 left-4 z-50">
        <button 
          onClick={toggleLanguage}
          className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-wider"
        >
          {i18n.language.startsWith('ko') ? 'English' : '한국어'}
        </button>
      </div>

      {isLoggedIn ? (
        <div className="relative flex h-screen w-full flex-col bg-gradient-mesh overflow-hidden">
          {activeTab === 'chat' ? (
            <>
              <div className="absolute inset-0 gradient-blur pointer-events-none"></div>
              
              <header className="flex items-center justify-between px-6 pt-14 pb-4 z-20">
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

              <main className="flex-1 overflow-y-auto px-4 py-2 space-y-6 z-10 scroll-smooth no-scrollbar pb-40">
                {messages.length === 0 && (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 px-10 text-center py-20">
                      <span className="material-symbols-outlined text-6xl mb-4">chat_bubble</span>
                      <p className="text-lg">{t('help_label')}</p>
                   </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[85%] ${msg.sender === 'user' ? 'ml-auto' : ''} animate-slide-in`}>
                    <div className={`${msg.sender === 'ai' ? 'glass-ai rounded-tl-none' : 'glass-user rounded-tr-none'} rounded-2xl p-4 text-[15px] leading-relaxed relative group`}>
                      {msg.text}
                      {msg.sender === 'ai' && (
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(msg.text);
                            alert(t('copied'));
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
              </main>

              <div className="fixed bottom-24 left-0 right-0 p-4 z-50 pointer-events-auto">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleAskAi(); }}
                  className="input-container flex items-center gap-3 p-2 pl-4 rounded-2xl max-w-2xl mx-auto w-full shadow-2xl bg-[#161b2a] border border-white/10 backdrop-blur-2xl"
                >
                  <input 
                    ref={inputRef}
                    className="bg-transparent border-none flex-1 min-w-0 focus:ring-0 text-sm text-white placeholder-white/40 py-2" 
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
                              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                className="fixed right-6 bottom-28 w-14 h-14 bg-primary rounded-2xl shadow-lg shadow-primary/25 flex items-center justify-center active:scale-90 transition-transform z-20"
              >
                <span className="material-symbols-outlined text-white text-3xl">add</span>
              </button>
            </>
          ) : (
            <>
              <header className="pt-14 pb-4 px-6 sticky top-0 bg-background-dark/80 backdrop-blur-md z-20">
                <h1 className="text-2xl font-bold tracking-tight">{t('admin_title')}</h1>
              </header>
              <main className="flex-1 p-6 space-y-10 pb-32 overflow-y-auto no-scrollbar">
                <section className="space-y-4">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-widest">System Prompt</h2>
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

                <section className="space-y-4">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-widest">User Management ({users.length})</h2>
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center">
                        <div>
                          <p className="font-bold text-white">{u.nickname} {u.isAdmin && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">ADMIN</span>}</p>
                          <p className="text-xs text-white/40">{u.email || 'No email'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-white/20">{new Date(u.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="pt-6 border-t border-white/5">
                   <button 
                    onClick={handleWithdraw}
                    className="w-full h-12 border border-red-500/30 text-red-500/50 hover:bg-red-500 hover:text-white rounded-xl transition-all text-xs font-bold"
                   >
                     DANGER ZONE: WITHDRAW ACCOUNT
                   </button>
                </section>
              </main>
            </>
          )}

          <nav className="fixed bottom-0 left-0 right-0 bg-background-dark/90 backdrop-blur-xl border-t border-white/5 px-8 pb-8 pt-4 z-30">
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
              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className={`flex flex-col items-center gap-1 group ${activeTab === 'admin' ? 'text-primary' : 'text-white/40'}`}
                >
                  <span className={`material-symbols-outlined ${activeTab === 'admin' ? 'fill-1' : 'group-hover:text-white transition-colors'}`}>settings_suggest</span>
                  <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_admin')}</span>
                </button>
              )}
              <button 
                onClick={() => alert(t('coming_soon'))}
                className="flex flex-col items-center gap-1 group text-white/40"
              >
                <span className="material-symbols-outlined group-hover:text-white transition-colors">explore</span>
                <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_explore')}</span>
              </button>
              <button 
                onClick={() => alert(t('coming_soon'))}
                className="flex flex-col items-center gap-1 group text-white/40"
              >
                <span className="material-symbols-outlined group-hover:text-white transition-colors">person</span>
                <span className="text-[10px] font-medium uppercase tracking-tighter">{t('nav_profile')}</span>
              </button>
            </div>
          </nav>
        </div>
      ) : (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
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
              <button className="flex-1 flex items-center justify-center h-14 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all">
                <span className="material-symbols-outlined text-white/60">mail</span>
              </button>
              <button className="flex-1 flex items-center justify-center h-14 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all">
                <span className="material-symbols-outlined text-white/60">brand_awareness</span>
              </button>
            </div>

            <div className="text-white/30 text-xs text-center font-normal leading-normal mt-4 px-8">
              {t('terms_prefix')}
              <button 
                onClick={() => alert(t('terms_content'))}
                className="underline underline-offset-2 hover:text-white/40"
              >
                {t('terms')}
              </button>
              {t('and')}
              <button 
                onClick={() => alert(t('privacy_content'))}
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