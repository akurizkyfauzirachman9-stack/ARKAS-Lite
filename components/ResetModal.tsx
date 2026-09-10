import React, { useState, useEffect } from 'react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Reset state setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setIsConfirmed(false);
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:hidden">
      <div className="bg-[#101621] rounded-2xl shadow-2xl w-full max-w-md border border-rose-500/30 overflow-hidden text-slate-100 flex flex-col">
        
        {/* Header Warning */}
        <div className="bg-rose-950/40 p-6 flex flex-col items-center text-center border-b border-rose-500/20">
          <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-400"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </div>
          <h3 className="text-xl font-bold text-white">Reset Seluruh Data?</h3>
          <p className="text-rose-300 text-xs sm:text-sm mt-2">
            Tindakan ini akan <b>MENGHAPUS SEMUA</b> data transaksi pemasukan dan pengeluaran secara permanen.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-[#080B12] p-4 rounded-xl border border-slate-800 text-xs sm:text-sm text-slate-300">
            <p className="mb-2 font-semibold text-white">Pernyataan Reset:</p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400">
              <li>Data yang dihapus tidak dapat dikembalikan.</li>
              <li>Riwayat transaksi akan kosong kembali.</li>
              <li>Laporan neraca akan di-reset menjadi 0.</li>
            </ul>
          </div>

          {/* Checkbox Konfirmasi */}
          <div 
            className="flex items-start gap-3 p-3.5 border border-rose-500/30 rounded-xl bg-rose-950/20 hover:bg-rose-950/30 transition-colors cursor-pointer" 
            onClick={() => setIsConfirmed(!isConfirmed)}
          >
            <div className="flex items-center h-5">
              <input
                id="confirm-checkbox"
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="w-4 h-4 text-rose-600 bg-[#0B111B] border-slate-600 rounded focus:ring-rose-500 cursor-pointer"
              />
            </div>
            <div className="text-xs sm:text-sm">
              <label htmlFor="confirm-checkbox" className="font-semibold text-rose-200 cursor-pointer select-none">
                Saya mengerti dan ingin menghapus semua data
              </label>
              <p className="text-xs text-slate-400 mt-1">
                Centang kotak ini untuk mengaktifkan tombol reset.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="p-4 bg-[#0B111B] border-t border-slate-800 flex gap-2.5 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#151C28] text-slate-300 border border-slate-700 rounded-xl hover:bg-slate-800 font-medium text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={!isConfirmed}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              isConfirmed 
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/50' 
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            Hapus Semua Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetModal;