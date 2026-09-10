import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, TransactionType, INCOME_CATEGORIES, EXPENSE_CATEGORIES, UserRole } from '../types';

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  onUpdateTransaction: (transaction: Transaction) => void;
  editingTransaction: Transaction | null;
  onCancelEdit: () => void;
  userRole?: UserRole;
  onUnlockTreasurer?: () => void;
}

// Data Saran Uraian Berdasarkan Kategori (Kamus Data ARKAS Sederhana)
const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  // --- PEMASUKAN ---
  'BOS Reguler': [
    'Penyaluran Dana BOS Tahap 1 Tahun 2024',
    'Penyaluran Dana BOS Tahap 2 Tahun 2024',
    'Sisa Dana BOS Tahun Lalu'
  ],
  'BOS Kinerja': [
    'Dana BOS Kinerja Prestasi',
    'Dana BOS Kinerja Kemajuan Terbaik'
  ],
  'Dana Komite': [
    'Sumbangan Sukarela Orang Tua Siswa',
    'Sumbangan Alumni'
  ],
  
  // --- PENGELUARAN ---
  'Standar Kelulusan': [
    'Biaya Pelaksanaan Ujian Sekolah (US)',
    'Biaya Penyusunan Soal Ujian',
    'Pencetakan Ijazah dan SKhu',
    'Biaya Pengawasan Ujian'
  ],
  'Standar Isi': [
    'Penyusunan Pembagian Tugas Guru',
    'Penyusunan Program Tahunan dan Semester',
    'Penyusunan KTSP / Kurikulum Sekolah',
    'Pengembangan Silabus dan RPP'
  ],
  'Standar Proses': [
    'Pembelian Alat Peraga Pembelajaran',
    'Biaya Fotocopy Bahan Ajar',
    'Kegiatan Ekstrakurikuler Pramuka',
    'Kegiatan Lomba Siswa (FLS2N/O2SN)'
  ],
  'Standar Penilaian': [
    'Pelaksanaan Penilaian Tengah Semester (PTS)',
    'Pelaksanaan Penilaian Akhir Semester (PAS)',
    'Penggandaan Soal Ulangan Harian',
    'Input Nilai Rapor Digital'
  ],
  'Standar Pendidik & Tenaga Kependidikan': [
    'Honor Guru Honorer (GTT)',
    'Honor Tenaga Kependidikan (PTT)',
    'Biaya Pelatihan / Workshop Guru',
    'Transport Kegiatan MGMP/KKG'
  ],
  'Standar Sarana & Prasarana': [
    'Belanja Alat Tulis Kantor (ATK)',
    'Pembelian Buku Teks Utama Siswa',
    'Perawatan Ringan Gedung Sekolah',
    'Pembayaran Tagihan Listrik',
    'Pembayaran Tagihan Internet (WiFi)',
    'Perbaikan Laptop/Printer Sekolah',
    'Pengadaan Alat Kebersihan'
  ],
  'Standar Pengelolaan': [
    'Konsumsi Rapat Dinas Sekolah',
    'Perjalanan Dinas Kepala Sekolah/Guru',
    'Langganan Koran/Majalah',
    'Biaya Penerimaan Peserta Didik Baru (PPDB)'
  ],
  'Standar Pembiayaan': [
    'Honor Bendahara BOS',
    'Honor Penyusunan Laporan Keuangan',
    'Biaya Materai dan Administrasi Bank'
  ],
  'Pembayaran Utang': [
    'Pembayaran Utang Belanja Barang/Jasa Tahun Lalu',
    'Pembayaran Utang Tagihan Daya dan Jasa',
    'Pelunasan Utang Pengadaan Sarana Prasarana',
    'Pembayaran Kewajiban/Utang Lainnya'
  ]
};

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  onAddTransaction, 
  onUpdateTransaction,
  editingTransaction,
  onCancelEdit,
  userRole = 'treasurer',
  onUnlockTreasurer
}) => {
  const isReadOnly = userRole !== 'treasurer';
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Efek untuk mengisi form saat mode edit aktif
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setRecipient(editingTransaction.recipient || '');
      setDescription(editingTransaction.description);
      setCategory(editingTransaction.category);
      setDate(editingTransaction.date);
    } else {
      resetForm();
    }
  }, [editingTransaction]);

  const resetForm = () => {
    setAmount('');
    setRecipient('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    // Jangan reset tipe agar user bisa input berulang tipe sama dengan cepat
    setCategory(type === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;

    if (editingTransaction) {
      onUpdateTransaction({
        ...editingTransaction,
        date,
        recipient: recipient.trim(),
        description,
        amount: parseFloat(amount),
        type,
        category,
      });
    } else {
      onAddTransaction({
        date,
        recipient: recipient.trim(),
        description,
        amount: parseFloat(amount),
        type,
        category,
      });
    }

    if (!editingTransaction) resetForm();
  };

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    setDescription(''); // Reset description when type changes
  };

  // Helper untuk mengisi uraian dari dropdown template
  const handleTemplateSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setDescription(val);
    }
  };

  // Mendapatkan daftar saran berdasarkan kategori yang dipilih
  const currentSuggestions = useMemo(() => {
    return CATEGORY_SUGGESTIONS[category] || [];
  }, [category]);

  return (
    <div className={`p-6 rounded-2xl shadow-xl border h-full transition-all text-slate-100 ${
      editingTransaction 
        ? 'bg-[#141A26] border-amber-500/40 shadow-amber-500/5' 
        : 'bg-[#101621] border-cyan-500/20 shadow-cyan-500/5'
    }`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold flex items-center text-white">
          {editingTransaction ? (
            <>
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </span>
              <span>Edit Transaksi BKU</span>
            </>
          ) : (
            <>
              <span className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              </span>
              <span>Input Transaksi BKU</span>
            </>
          )}
        </h2>
        {editingTransaction && (
          <button 
            onClick={onCancelEdit}
            className="text-xs bg-[#151C28] hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 18 18"/></svg> Batal
          </button>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipe Transaksi Toggle */}
        <div className="grid grid-cols-2 gap-2 bg-[#0B111B] p-1 rounded-xl mb-4 border border-slate-800">
          <button
            type="button"
            onClick={() => handleTypeChange('income')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === 'income' 
                ? 'bg-emerald-950/80 text-[#00E6A7] border border-emerald-500/40 shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pemasukan (Kredit)
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange('expense')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
              type === 'expense' 
                ? 'bg-rose-950/80 text-[#FF5575] border border-rose-500/40 shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pengeluaran (Debet)
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Tanggal Transaksi</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#0B111B] border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Kategori (SNP / Sumber Dana)</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#0B111B] border border-slate-800 rounded-xl text-slate-200 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all appearance-none text-sm cursor-pointer"
          >
            {type === 'income'
              ? INCOME_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#101621] text-slate-200">{c}</option>)
              : EXPENSE_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#101621] text-slate-200">{c}</option>)
            }
          </select>
        </div>

        {/* Kolom Nama Penerima / Pihak Ketiga (Sebelum Uraian) */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Nama Penerima / Pihak Ketiga
          </label>
          <input
            type="text"
            placeholder={type === 'expense' ? "Contoh: Bpk. Ahmad Suhendar / Toko ATK Mandiri" : "Contoh: Bendahara BOSP / Rekening Sekolah"}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#0B111B] border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all text-sm"
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Uraian Kegiatan / Belanja
          </label>
          
          {/* 1. Select Template (Pilih Cepat) */}
          <select
             onChange={handleTemplateSelect}
             className="w-full px-3.5 py-2 bg-[#151C28] border border-cyan-500/25 rounded-xl text-xs text-cyan-300 focus:ring-1 focus:ring-cyan-400 outline-none cursor-pointer"
             defaultValue=""
          >
             <option value="" disabled className="bg-[#101621] text-slate-400">-- Pilih Uraian Standar (Template Cepat) --</option>
             {currentSuggestions.length > 0 ? (
                currentSuggestions.map((suggestion, idx) => (
                    <option key={idx} value={suggestion} className="bg-[#101621] text-slate-200">{suggestion}</option>
                ))
             ) : (
                <option value="" disabled className="bg-[#101621] text-slate-400">Tidak ada saran untuk kategori ini</option>
             )}
          </select>

          {/* 2. Input Manual (Bisa diedit) */}
          <input
            type="text"
            required
            placeholder="Atau ketik uraian manual disini..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-[#0B111B] border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all text-sm"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nominal Transaksi (Rp)</label>
          <input
            type="number"
            required
            min="0"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 bg-[#0B111B] border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:ring-1 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-all text-right font-mono text-xl font-bold tracking-tight"
          />
        </div>

        <button
          type={isReadOnly ? "button" : "submit"}
          onClick={isReadOnly ? onUnlockTreasurer : undefined}
          className={`w-full py-3 mt-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer ${
            isReadOnly
              ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 shadow-none'
              : editingTransaction 
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 shadow-amber-600/20' 
                : (type === 'income' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-emerald-900/30' 
                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-900/30')
          }`}
        >
          {isReadOnly ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Buka Akses Bendahara</span>
            </>
          ) : (
            <>
              {editingTransaction ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
              )}
              <span>{editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi ke BKU'}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default TransactionForm;