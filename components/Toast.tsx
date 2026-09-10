import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: {
      container: 'bg-[#101621]/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/40',
      iconBox: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    },
    error: {
      container: 'bg-[#101621]/95 border-rose-500/40 text-rose-200 shadow-rose-950/40',
      iconBox: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    },
    info: {
      container: 'bg-[#101621]/95 border-cyan-500/40 text-cyan-200 shadow-cyan-950/40',
      iconBox: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
    },
  };

  const icons = {
    success: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
    ),
    error: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
    ),
    info: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    ),
  };

  return (
    <div className={`fixed top-20 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-2xl transform transition-all duration-300 animate-in slide-in-from-right ${styles[type].container}`}>
      <div className={`p-1.5 rounded-lg shrink-0 ${styles[type].iconBox}`}>
        {icons[type]}
      </div>
      <p className="font-semibold text-xs sm:text-sm text-slate-100">{message}</p>
      <button onClick={onClose} className="ml-2 hover:bg-slate-800 rounded-lg p-1 text-slate-400 hover:text-white transition-colors cursor-pointer">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
};

export default Toast;