import { useState, useEffect } from 'react';

function App() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check for token in URL after redirect
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');

    if (tokenFromUrl) {
      localStorage.setItem('jwt_token', tokenFromUrl);
      setToken(tokenFromUrl);
      // Clean the URL
      window.history.replaceState({}, document.title, "/");
    } else {
      // 2. Check for token in localStorage for existing sessions
      const tokenFromStorage = localStorage.getItem('jwt_token');
      if (tokenFromStorage) {
        setToken(tokenFromStorage);
      }
    }
  }, []);

  const handleKakaoLogin = () => {
    const KAKAO_CLIENT_ID = '810bb035b44a77dbc46896dccb59432b';
    const KAKAO_REDIRECT_URI = 'https://us-central1-project-1-ebbf0.cloudfunctions.net/api/auth/kakao/callback';
    const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}`;
    window.location.href = kakaoAuthURL;
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    setToken(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md text-center">
        {token ? (
          <div>
            <h1 className="text-2xl font-bold mb-6">로그인 성공!</h1>
            <p className="mb-4">환영합니다!</p>
            <button
              onClick={handleLogout}
              className="bg-gray-500 text-white font-bold py-2 px-4 rounded-md hover:bg-gray-600 transition-colors"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold mb-6">카카오 로그인</h1>
            <button
              onClick={handleKakaoLogin}
              className="bg-[#FEE500] text-[#3C1E1E] font-bold py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
            >
              카카오로 로그인
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
