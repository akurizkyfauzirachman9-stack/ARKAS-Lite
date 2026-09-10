import React, { useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  Sparkles, 
  AlertCircle,
  FileJson,
  CheckCircle2
} from 'lucide-react';
import { Transaction, SchoolProfile } from '../types';
import { SAMPLE_TRANSACTIONS } from '../utils';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  schoolProfile: SchoolProfile;
  onImport: (importedData: Transaction[], profile?: SchoolProfile) => void;
  onLoadDemoData: () => void;
}

const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  transactions,
  schoolProfile,
  onImport,
  onLoadDemoData,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handler Export JSON
  const handleExportJson = () => {
    const backupData = {
      app: 'ARKAS Lite',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      schoolProfile,
      transactions,
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ARKAS_Lite_Backup_${schoolProfile.npsn || 'School'}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handler File Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        if (Array.isArray(parsed)) {
          // Direct array of transactions
          onImport(parsed);
        } else if (parsed.transactions && Array.isArray(parsed.transactions)) {
          // Backup object format
          onImport(parsed.transactions, parsed.schoolProfile);
        } else {
          alert('Format berkas cadangan tidak dikenali. Pastikan file JSON berasal dari ARKAS Lite.');
        }
      } catch (err) {
        console.error(err);
        alert('Gagal membaca file JSON. Pastikan file tidak rusak.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-auto overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Pusat Data & Cadangan (Database)</h3>
              <p className="text-xs text-slate-400">Ekspor, impor, dan pemulihan data pembukuan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Status info */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-900">
              <FileJson className="w-4 h-4 text-indigo-600" />
              <span className="font-semibold">Status Penyimpanan Lokal</span>
            </div>
            <span className="font-mono font-bold text-indigo-800 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 text-xs">
              {transactions.length} Transaksi Tercatat
            </span>
          </div>

          {/* Action 1: Download Backup */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-indigo-600" />
                  Cadangkan Database (Backup JSON)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Simpan seluruh transaksi BKU dan pengaturan profil sekolah ke dalam berkas JSON aman.
                </p>
              </div>
              <button
                onClick={handleExportJson}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-colors whitespace-nowrap"
              >
                Unduh JSON
              </button>
            </div>
          </div>

          {/* Action 2: Upload / Restore Backup */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Pulihkan dari Berkas Cadangan (Restore)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Muat kembali berkas cadangan JSON yang sebelumnya pernah diunduh dari perangkat ini atau komputer lain.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-xs transition-colors whitespace-nowrap"
                >
                  Pilih File
                </button>
              </div>
            </div>
          </div>

          {/* Action 3: Load Demo Sample Data */}
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Muat Data Contoh BOS (Demo)
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  Isi aplikasi dengan 6 transaksi contoh realistis (Penyaluran Tahap I, Belanja ATK, Daya/Jasa PLN-Internet, Honor Guru GTT, Perbaikan Sarpras, dan Buku Kurikulum Merdeka).
                </p>
              </div>
              <button
                onClick={onLoadDemoData}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-xs transition-colors whitespace-nowrap ml-2"
              >
                Muat Demo
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseModal;
