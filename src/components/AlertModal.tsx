import React from 'react';
import { useUIStore } from '../store/useUIStore';

const AlertModal: React.FC = () => {
  const { modalConfig, setModalConfig } = useUIStore();

  if (!modalConfig.show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-[#161b2a] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/50 text-center space-y-6">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
          modalConfig.type === 'success' ? 'bg-green-500/10 border border-green-500/20' :
          modalConfig.type === 'error' ? 'bg-red-500/10 border border-red-500/20' :
          modalConfig.type === 'warning' ? 'bg-orange-500/10 border border-orange-500/20' :
          'bg-primary/10 border border-primary/20'
        }`}>
          <span className={`material-symbols-outlined text-3xl ${
            modalConfig.type === 'success' ? 'text-green-500' :
            modalConfig.type === 'error' ? 'text-red-500' :
            modalConfig.type === 'warning' ? 'text-orange-500' :
            'text-primary'
          }`}>
            {modalConfig.type === 'success' ? 'check_circle' : 
             modalConfig.type === 'error' ? 'error' : 
             modalConfig.type === 'warning' ? 'warning' : 'info'}
          </span>
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">{modalConfig.title}</h3>
          <p className="text-sm text-white/50 leading-relaxed break-words whitespace-pre-wrap">
            {modalConfig.message}
          </p>
        </div>
        <div className="flex gap-3">
          {modalConfig.showCancel && (
            <button 
              onClick={() => setModalConfig({ ...modalConfig, show: false })}
              className="flex-1 h-14 bg-white/5 border border-white/10 text-white/70 font-bold rounded-2xl hover:bg-white/10 transition-all active:scale-95"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={() => {
              setModalConfig({ ...modalConfig, show: false });
              if (modalConfig.onConfirm) modalConfig.onConfirm();
            }}
            className="flex-1 h-14 bg-white/10 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/20 transition-all active:scale-95"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
