import { create } from 'zustand';

interface ModalConfig {
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
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
  showAlert: (title: string, message: string, type?: 'success' | 'error' | 'info', onConfirm?: () => void) => void;
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
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowAuthModal: (show) => set({ showAuthModal: show }),
  setShowToast: (show) => set({ showToast: show }),
  setModalConfig: (config) => set({ modalConfig: config }),
  showAlert: (title, message, type = 'info', onConfirm) => set({
    modalConfig: { show: true, title, message, type, onConfirm }
  }),
  closeModal: () => set((state) => ({
    modalConfig: { ...state.modalConfig, show: false }
  })),
}));
