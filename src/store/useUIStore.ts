import { create } from 'zustand';

interface ModalConfig {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  showCancel?: boolean;
  onConfirm?: () => void;
}

interface UIState {
  activeTab: 'chat' | 'history' | 'profile' | 'admin';
  showAuthModal: boolean;
  showToast: boolean;
  modalConfig: ModalConfig;
  setActiveTab: (tab: 'chat' | 'history' | 'profile' | 'admin') => void;
  setShowAuthModal: (show: boolean) => void;
  setShowToast: (show: boolean) => void;
  setModalConfig: (config: ModalConfig) => void;
  showAlert: (title: string, message: string, type?: 'success' | 'error' | 'info' | 'warning', onConfirm?: () => void, showCancel?: boolean) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'chat',
  showAuthModal: false,
  showToast: false,
  modalConfig: {
    show: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setShowToast: (show) => set({ showToast: show }),
  setModalConfig: (config) => set({ modalConfig: config }),
  showAlert: (title, message, type = 'info', onConfirm, showCancel = false) => set({
    modalConfig: { show: true, title, message, type, onConfirm, showCancel }
  }),
  closeModal: () => set((state) => ({
    modalConfig: { ...state.modalConfig, show: false }
  })),
}));
