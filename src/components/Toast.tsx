import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose, duration = 3500 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const config = {
    success: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-300 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-300 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
    },
    info: {
      bg: 'bg-indigo-50 border-indigo-300 text-indigo-900',
      icon: <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />,
    },
  }[type];

  return (
    <div className="fixed top-5 right-5 z-[100] max-w-md w-full animate-in fade-in slide-in-from-top-3 duration-200">
      <div className={`flex items-start justify-between gap-3 p-4 rounded-xl border shadow-lg ${config.bg}`}>
        <div className="flex items-start gap-3">
          {config.icon}
          <p className="text-sm font-medium leading-tight">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded-lg transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
