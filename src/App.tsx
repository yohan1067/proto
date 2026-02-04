// Deployment check: 2026-02-03
// Force redeploy: 2026-02-03-V3
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './components/LoginScreen';
import AlertModal from './components/AlertModal';
import AuthModal from './components/AuthModal';
import MainLayout from './components/MainLayout';
import AdminPage from './pages/AdminPage';
import { useAuthStore } from './store/useAuthStore';
import { useUIStore } from './store/useUIStore';
import { useAuthInit } from './hooks/useAuthInit';

function App() {
  const { t } = useTranslation();
  
  // 1. Initialize Auth
  useAuthInit();

  // 2. Global State
  const { session, isInitialLoading } = useAuthStore();
  const { showToast, themeColor } = useUIStore();

  // Apply Theme Color
  useEffect(() => {
    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r} ${g} ${b}`;
    };
    if (themeColor && /^#[0-9A-F]{6}$/i.test(themeColor)) {
        const rgb = hexToRgb(themeColor);
        document.documentElement.style.setProperty('--color-primary', rgb);
        document.body.style.setProperty('--color-primary', rgb);
    }
  }, [themeColor]);

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

  if (!session) {
    return (
      <div className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-background-dark text-white font-display">
        <AuthModal />
        <AlertModal />
        <LoginScreen />
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

      <AuthModal />
      <AlertModal />

      <Routes>
        <Route path="/" element={<MainLayout />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
