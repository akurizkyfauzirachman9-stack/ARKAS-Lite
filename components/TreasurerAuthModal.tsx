import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface TreasurerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const TreasurerAuthModal: React.FC<TreasurerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShowPassword(false);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password.trim()) {
      setError('Silakan masukkan kata sandi Bendahara');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    // Verifikasi password 'admin123'
    if (password === 'admin123') {
      setIsSubmitting(false);
      onSuccess();
    } else {
      setIsSubmitting(false);
      setError('Kata sandi salah! Akses ke peran Bendahara ditolak.');
      setPassword('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs print:hidden animate-fade-in">
      <div className="bg-[#101621] rounded-2xl shadow-2xl w-full max-w-md border border-cyan-500/30 overflow-hidden text-slate-100">
        
        {/* Header Modal */}
        <div className="bg-gradient-to-br from-[#0c1927] to-[#08101a] border-b border-cyan-500/20 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-cyan-500/30 backdrop-blur-xs shadow-inner">
            <Lock className="w-7 h-7 text-cyan-300" />
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white">Otorisasi Peran Bendahara</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Peran Bendahara memiliki hak penuh (CRUD) pengelolaan kas dan pagu anggaran BOSP.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Kata Sandi Akses Bendahara
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Masukkan kata sandi Bendahara..."
                className={`w-full pl-10 pr-11 py-2.5 text-sm border rounded-xl focus:outline-none transition-all ${
                  error 
                    ? 'border-rose-500 ring-1 ring-rose-500 bg-rose-950/30 text-white placeholder-slate-500' 
                    : 'border-slate-800 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 bg-[#0B111B] text-white placeholder-slate-500'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded transition-colors cursor-pointer"
                title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {/* Pesan Error */}
            {error && (
              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/50 p-2.5 rounded-xl border border-rose-500/30">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 bg-[#151C28] hover:bg-[#1C2638] border border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white rounded-xl transition-all shadow-md shadow-cyan-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Buka Akses Bendahara</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TreasurerAuthModal;
