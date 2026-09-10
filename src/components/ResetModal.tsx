import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Kosongkan Seluruh Data Pembukuan?
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Tindakan ini akan menghapus semua riwayat transaksi Buku Kas Umum (BKU) yang tersimpan di perangkat ini. Tindakan ini tidak dapat dibatalkan kecuali Anda memiliki cadangan berkas JSON.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              Batalkan
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Ya, Kosongkan Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetModal;
