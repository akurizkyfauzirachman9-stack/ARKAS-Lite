import React, { useState, useMemo, useEffect } from 'react';

// ==========================================
// 1. DATA TYPES & DEFAULTS
// ==========================================
export interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  taxType: 'none' | 'ppn' | 'pph21' | 'pph23';
  taxAmount: number;
  netAmount: number; // Jumlah bersih setelah dikurangi/ditambah pajak
}

const STORAGE_KEY = 'arkas_lite_v2_data';
const DEFAULT_TRANSACTIONS: Transaction[] = [];

// Daftar Kategori Belanja Satuan Pendidikan (Sesuai Juknis BOSP / 8 SNP)
const CATEGORIES = {
  income: [
    'BOSP Reguler Tahap 1',
    'BOSP Reguler Tahap 2',
    'BOSP Kinerja',
    'SiLPA Tahun Lalu',
    'Bantuan Daerah / Sumber Lain'
  ],
  expense: [
    'Belanja Alat Tulis Kantor (ATK)',
    'Belanja Honorarium Pendidik/Tenaga Kependidikan',
    'Belanja Daya dan Jasa (Listrik, Air, Internet)',
    'Belanja Pemeliharaan Sarana & Prasarana Sekolah',
    'Belanja Pengadaan Alat Multimedia Pembelajaran',
    'Belanja Kegiatan Evaluasi Pembelajaran & Asesmen',
    'Belanja Penyediaan Konsumsi Kegiatan Sekolah',
    'Belanja Perjalanan Dinas / Transport Kegiatan',
    'Pembayaran Utang'
  ]
};

// ==========================================
// 2. HELPER UTILITIES
// ==========================================
export const formatRupiah = (angka: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(angka);
};

// Fungsi Pintar Mengonversi Angka Menjadi Terbilang Bahasa Indonesia secara Rekursif
export const terbilang = (nominal: number): string => {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 
    'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];
  let temp = '';

  if (nominal < 12) {
    temp = bilangan[Math.floor(nominal)];
  } else if (nominal < 20) {
    temp = terbilang(nominal - 10) + ' Belas';
  } else if (nominal < 100) {
    temp = terbilang(nominal / 10) + ' Puluh ' + terbilang(nominal % 10);
  } else if (nominal < 200) {
    temp = ' Seratus ' + terbilang(nominal - 100);
  } else if (nominal < 1000) {
    temp = terbilang(nominal / 100) + ' Ratus ' + terbilang(nominal % 100);
  } else if (nominal < 2000) {
    temp = ' Seribu ' + terbilang(nominal - 1000);
  } else if (nominal < 1000000) {
    temp = terbilang(nominal / 1000) + ' Ribu ' + terbilang(nominal % 1000);
  } else if (nominal < 1000000000) {
    temp = terbilang(nominal / 1000000) + ' Juta ' + terbilang(nominal % 1000000);
  } else if (nominal < 1000000000000) {
    temp = terbilang(nominal / 1000000000) + ' Miliar ' + terbilang(nominal % 1000000000);
  }
  
  return temp.replace(/\s+/g, ' ').trim();
};

export const formatTerbilangRupiah = (nominal: number): string => {
  if (nominal === 0) return 'Nol Rupiah';
  return `### ${terbilang(nominal)} Rupiah ###`;
};

// ==========================================
// 3. MAIN COMPONENT (ARKAS LITE V2)
// ==========================================
export default function ArkasLiteV2() {
  // Core State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
    } catch (e) {
      return DEFAULT_TRANSACTIONS;
    }
  });

  // State Form Transaksi
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [taxType, setTaxType] = useState<'none' | 'ppn' | 'pph21' | 'pph23'>('none');
  const [editingId, setEditingId] = useState<string | null>(null);

  // State Filter & Pencarian
  const [searchTerm, setSearchDescription] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');

  // UI Modals & Notifications State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Transaction | null>(null);
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [databaseInput, setDatabaseInput] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Auto-set Category Kategori Terpilih Pertama Kali Tipe Berganti
  useEffect(() => {
    setFormCategory(CATEGORIES[formType][0]);
  }, [formType]);

  // Helper untuk Menampilkan Toast Notification Otomatis
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sinkronisasi otomatis ke LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  // ==========================================
  // 4. LOGIKA PERHITUNGAN PAJAK & TRANSAKSI
  // ==========================================
  const calculateTax = (amount: number, type: 'none' | 'ppn' | 'pph21' | 'pph23') => {
    let taxAmount = 0;
    let netAmount = amount;

    if (type === 'ppn') {
      // PPN 11% (Ditambahkan ke nilai transaksi)
      taxAmount = Math.round(amount * 0.11);
      netAmount = amount + taxAmount;
    } else if (type === 'pph21') {
      // PPh 21 - Honorarium/Gaji (Dipotong 5% dari nilai transaksi)
      taxAmount = Math.round(amount * 0.05);
      netAmount = amount - taxAmount;
    } else if (type === 'pph23') {
      // PPh 23 - Jasa (Dipotong 2% dari nilai transaksi)
      taxAmount = Math.round(amount * 0.02);
      netAmount = amount - taxAmount;
    }

    return { taxAmount, netAmount };
  };

  // Simpan / Tambah Transaksi
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formDescription.trim()) {
      showToast('Deskripsi uraian kegiatan tidak boleh kosong!', 'error');
      return;
    }
    if (!formAmount || formAmount <= 0) {
      showToast('Nominal jumlah transaksi harus lebih besar dari nol!', 'error');
      return;
    }

    const { taxAmount, netAmount } = calculateTax(Number(formAmount), formType === 'expense' ? taxType : 'none');

    if (editingId) {
      // Update Transaksi
      setTransactions(prev =>
        prev.map(item =>
          item.id === editingId
            ? {
                ...item,
                date: formDate,
                type: formType,
                category: formCategory,
                description: formDescription,
                amount: Number(formAmount),
                taxType: formType === 'expense' ? taxType : 'none',
                taxAmount,
                netAmount
              }
            : item
        )
      );
      showToast('Transaksi berhasil diperbarui!', 'success');
      setEditingId(null);
    } else {
      // Tambah Transaksi Baru
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: formDate,
        type: formType,
        category: formCategory,
        description: formDescription,
        amount: Number(formAmount),
        taxType: formType === 'expense' ? taxType : 'none',
        taxAmount,
        netAmount
      };

      setTransactions(prev => [newTx, ...prev]);
      showToast('Transaksi berhasil disimpan ke Buku Kas Umum!', 'success');

      // Tawarkan print kwitansi jika transaksi pengeluaran
      if (formType === 'expense') {
        setCurrentReceipt(newTx);
        setShowPrintPrompt(true);
      }
    }

    // Reset Input Form (kecuali Tanggal untuk kenyamanan penatausahaan berurutan)
    setFormDescription('');
    setFormAmount('');
    setTaxType('none');
  };

  // Muat Data untuk Diedit
  const handleStartEdit = (tx: Transaction) => {
    setEditingId(tx.id);
    setFormType(tx.type);
    setFormDate(tx.date);
    setFormCategory(tx.category);
    setFormDescription(tx.description);
    setFormAmount(tx.amount);
    setTaxType(tx.taxType);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Hapus Transaksi
  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus catatan transaksi ini dari Buku Kas Umum?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('Transaksi berhasil dihapus dari Buku Kas Umum.', 'info');
      if (editingId === id) {
        setEditingId(null);
        setFormDescription('');
        setFormAmount('');
      }
    }
  };

  // Batal Edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setFormDescription('');
    setFormAmount('');
    setTaxType('none');
  };

  // Kosongkan Buku Kas Umum (Reset Data)
  const handleResetData = () => {
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
    setIsResetModalOpen(false);
    showToast('Seluruh Buku Kas Umum berhasil dikosongkan!', 'success');
  };

  // Ekspor Database Kas Sekolah ke JSON (Sangat andal untuk AI Studio / Sandbox)
  const handleExportJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(transactions, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `BACKUP_KAS_ARKAS_LITE_V2_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('File backup database (JSON) berhasil diunduh!', 'success');
  };

  // Ekspor Laporan BKU ke Excel / CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Tipe Transaksi', 'Kategori Akun', 'Uraian Belanja/Pemasukan', 'Nominal Dasar', 'Jenis Pajak', 'Besaran Pajak', 'Nominal Bersih'];
    const rows = filteredTransactions.map(t => [
      t.id,
      t.date,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      `"${t.category}"`,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount,
      t.taxType.toUpperCase(),
      t.taxAmount,
      t.netAmount
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `LAPORAN_BKU_BOSP_LITE_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Laporan kas (CSV/Excel) berhasil diunduh!', 'success');
  };

  // Import Database Kas dari JSON
  const handleImportDatabase = () => {
    try {
      const parsed = JSON.parse(databaseInput);
      if (Array.isArray(parsed)) {
        setTransactions(parsed);
        setIsDatabaseModalOpen(false);
        setDatabaseInput('');
        showToast('Database berhasil dipulihkan & disinkronisasi!', 'success');
      } else {
        alert('Format file cadangan tidak valid (Harus berupa JSON Array).');
      }
    } catch (e) {
      alert('Gagal membaca data cadangan. Pastikan teks yang dimasukkan adalah JSON yang valid.');
    }
  };

  // ==========================================
  // 5. PENYARINGAN & PERHITUNGAN DATA
  // ==========================================
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = filterCategory === 'ALL' || t.category === filterCategory;
      const matchMonth = filterMonth === 'ALL' || new Date(t.date).getMonth() === Number(filterMonth);
      return matchSearch && matchCategory && matchMonth;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, filterCategory, filterMonth]);

  // Statistik Ringkasan Finansial Aktif
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    let taxCollected = 0;
    const expenseByCat: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
        expenseByCat[t.category] = (expenseByCat[t.category] || 0) + t.amount;
        if (t.taxType !== 'none') {
          taxCollected += t.taxAmount;
        }
      }
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      taxBalance: taxCollected,
      balance: income - expense,
      expenseByCat
    };
  }, [transactions]);

  // ==========================================
  // 6. RENDER INTERFACE (TAILWIND STYLING)
  // ==========================================
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-16">
      
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-[100] flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl transition-all border transform translate-y-0 scale-100 ${
          toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 
          toast.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' : 
          'bg-sky-600 border-sky-500 text-white'
        }`}>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* Header Utama Aplikasi */}
      <header className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shadow-md sticky top-0 z-50 print:hidden border-b border-indigo-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 w-11 h-11 rounded-xl flex items-center justify-center font-black text-2xl text-white shadow-md border border-indigo-400">
              A
            </div>
            <div>
              <h1 className="font-extrabold text-2xl tracking-tight leading-none">
                ARKAS <span className="text-emerald-400 font-light text-xl">Lite v2</span>
              </h1>
              <p className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider mt-1">
                Aplikasi Tata Kelola Kas Mandiri Sekolah
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Saldo Berjalan */}
            <div className="hidden lg:flex flex-col items-end px-4 py-1.5 bg-slate-950/40 rounded-lg border border-slate-800">
              <span className="text-[10px] text-indigo-200 uppercase tracking-widest font-semibold">Sisa Saldo Kas</span>
              <span className={`font-mono text-lg font-black ${totals.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatRupiah(totals.balance)}
              </span>
            </div>

            {/* Menu Tombol Aksi Database */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDatabaseModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-800/80 hover:bg-indigo-700/90 rounded-lg text-xs font-semibold tracking-wide border border-indigo-700 text-indigo-100 transition-colors shadow-sm"
                title="Backup / Restore Database"
              >
                <span>💾 Backup & Restore</span>
              </button>
              <button
                onClick={() => setIsResetModalOpen(true)}
                className="p-2 bg-rose-900/60 hover:bg-rose-800/80 border border-rose-800 rounded-lg text-rose-200 transition-colors shadow-sm"
                title="Kosongkan Buku Kas Umum"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Area Konten Utama */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:p-0 print:bg-white">
        
        {/* Ringkasan Keuangan (Dashboard Cards) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
          {/* Penerimaan */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Penerimaan</p>
              <h4 className="text-2xl font-black text-slate-900 mt-2 font-mono text-emerald-600">
                {formatRupiah(totals.totalIncome)}
              </h4>
            </div>
            <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center text-xl text-emerald-600">
              📥
            </div>
          </div>

          {/* Pengeluaran */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Realisasi Belanja</p>
              <h4 className="text-2xl font-black text-slate-900 mt-2 font-mono text-rose-600">
                {formatRupiah(totals.totalExpense)}
              </h4>
            </div>
            <div className="bg-rose-50 w-12 h-12 rounded-full flex items-center justify-center text-xl text-rose-600">
              📤
            </div>
          </div>

          {/* Sisa Saldo Kas */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sisa Kas Berjalan</p>
              <h4 className={`text-2xl font-black mt-2 font-mono ${totals.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                {formatRupiah(totals.balance)}
              </h4>
            </div>
            <div className="bg-indigo-50 w-12 h-12 rounded-full flex items-center justify-center text-xl text-indigo-600">
              ⚖️
            </div>
          </div>
        </section>

        {/* Layout Grid Input Form & Historis BKU */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Kolom Kiri: Form Input Transaksi & Chart Pajak */}
          <div className="lg:col-span-4 space-y-8 sticky top-24 print:hidden">
            
            {/* Form Pemasukan / Pengeluaran */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                <span>{editingId ? '✍️ Edit Transaksi' : '📝 Input Buku Kas Umum'}</span>
                {editingId && (
                  <button 
                    onClick={handleCancelEdit}
                    className="text-xs text-rose-500 font-semibold hover:underline"
                  >
                    Batal Edit
                  </button>
                )}
              </h3>

              <form onSubmit={handleSaveTransaction} className="mt-5 space-y-5">
                {/* Switcher Tipe Transaksi */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Tipe Arus Kas</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setFormType('expense')}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${
                        formType === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      📤 Pengeluaran (Belanja)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('income')}
                      className={`py-2 rounded-lg font-bold text-xs transition-all ${
                        formType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      📥 Pemasukan (Penerimaan)
                    </button>
                  </div>
                </div>

                {/* Input Tanggal */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Input Kategori */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    {formType === 'expense' ? 'Kategori (SNP / Sumber)' : 'Kategori (Sumber Penerimaan)'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {CATEGORIES[formType].map((cat, idx) => (
                      <option key={idx} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Deskripsi Uraian */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Deskripsi Uraian Kegiatan</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="misal: Pembelian Kertas HVS A4 untuk ulangan tengah semester"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                    required
                  />
                </div>

                {/* Nominal Anggaran */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Jumlah Nominal Dasar (Rp)</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Contoh: 1500000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  {formAmount !== '' && (
                    <p className="text-[10px] text-indigo-500 font-bold mt-1 font-mono">
                      {formatRupiah(Number(formAmount))}
                    </p>
                  )}
                </div>

                {/* Pilihan Pajak (Khusus Pengeluaran - Autokalkulasi Juknis BOSP) */}
                {formType === 'expense' && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                      ⚖️ Pemotongan / Penambahan Pajak
                    </label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'none', label: 'Tanpa Pajak' },
                        { id: 'ppn', label: 'PPN 11% (Tambah)' },
                        { id: 'pph21', label: 'PPh 21 (Potong 5%)' },
                        { id: 'pph23', label: 'PPh 23 (Potong 2%)' }
                      ].map(option => (
                        <label key={option.id} className="flex items-center gap-2 p-1.5 bg-white border border-slate-100 rounded-lg cursor-pointer">
                          <input
                            type="radio"
                            name="taxType"
                            checked={taxType === option.id}
                            onChange={() => setTaxType(option.id as any)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-semibold text-slate-600">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tombol Simpan */}
                <button
                  type="submit"
                  className={`w-full py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 ${
                    editingId 
                      ? 'bg-amber-500 shadow-amber-500/20' 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                >
                  {editingId ? 'Simpan Perubahan Transaksi' : '✍️ Simpan ke Buku Kas Umum'}
                </button>
              </form>
            </div>

            {/* Visualisasi Dashboard Belanja (Pure CSS & SVG) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6">
              <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <span>📊 Grafik Proporsi Belanja</span>
              </h3>
              
              {Object.keys(totals.expenseByCat).length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs font-semibold">
                  Belum ada realisasi belanja yang dicatat.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {Object.entries(totals.expenseByCat).map(([cat, amount], idx) => {
                    const percent = Math.round((amount / totals.totalExpense) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                          <span className="truncate max-w-[200px]" title={cat}>{cat}</span>
                          <span className="font-bold text-rose-500">{percent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono text-right">
                          {formatRupiah(amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Kolom Kanan: Historis Buku Kas Umum (BKU) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Filter, Pencarian, & Unduh Laporan */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Search Bar */}
                <div className="md:col-span-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Cari Deskripsi Uraian</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchDescription(e.target.value)}
                    placeholder="Ketik kata kunci..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Month Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Saring Bulan</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Bulan</option>
                    {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ].map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Saring Kategori</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Kategori</option>
                    <optgroup label="Akun Pemasukan">
                      {CATEGORIES.income.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                    </optgroup>
                    <optgroup label="Akun Pengeluaran">
                      {CATEGORIES.expense.map((cat, idx) => <option key={idx} value={cat}>{cat}</option>)}
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Ekspor Laporan & Status Ringkasan Saringan */}
              <div className="mt-5 border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-bold text-slate-500 font-mono">
                  Menampilkan {filteredTransactions.length} dari {transactions.length} baris Buku Kas Umum
                </span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm tracking-wide"
                  >
                    📥 Ekspor ke Excel (CSV)
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 bg-indigo-100 hover:bg-indigo-50 text-indigo-700 font-bold text-xs rounded-xl shadow-sm tracking-wide border border-indigo-200"
                  >
                    💾 Ekspor JSON Backup
                  </button>
                </div>
              </div>
            </div>

            {/* Daftar Riwayat Buku Kas Umum (Tabel BKU) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between print:hidden">
                <h3 className="text-lg font-bold text-slate-900">📑 Riwayat Buku Kas Umum (BKU)</h3>
                <span className="text-[10px] bg-slate-100 border border-slate-200 px-3 py-1 rounded-full font-bold uppercase tracking-wider text-slate-500">
                  Transparan & Akuntabel
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4">Tanggal</th>
                      <th className="px-6 py-4">Jenis & Akun Rekening</th>
                      <th className="px-6 py-4">Uraian Transaksi</th>
                      <th className="px-6 py-4 text-right">Nominal Bersih</th>
                      <th className="px-6 py-4 text-center print:hidden">Aksi Penatausahaan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-16 text-slate-400 font-semibold">
                          Belum ada transaksi BKU yang cocok atau dicatat.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Tanggal */}
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-500 whitespace-nowrap">
                            {new Date(t.date).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>

                          {/* Kategori Akun */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                t.type === 'income' 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                  : 'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {t.type === 'income' ? '📥 Penerimaan' : '📤 Pengeluaran'}
                              </span>
                              <p className="font-bold text-slate-700 text-xs truncate max-w-[200px]" title={t.category}>
                                {t.category}
                              </p>
                            </div>
                          </td>

                          {/* Deskripsi Uraian */}
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold text-slate-900 leading-normal max-w-sm">
                                {t.description}
                              </p>
                              {/* Indikator Pajak jika ada */}
                              {t.taxType !== 'none' && (
                                <span className="inline-block text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold uppercase">
                                  {t.taxType.toUpperCase()} ({formatRupiah(t.taxAmount)})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Nominal Bersih */}
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <span className={`font-mono font-extrabold ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {t.type === 'income' ? '+' : '-'} {formatRupiah(t.netAmount)}
                            </span>
                          </td>

                          {/* Aksi Penatausahaan */}
                          <td className="px-6 py-4 print:hidden">
                            <div className="flex items-center justify-center gap-2">
                              {t.type === 'expense' && (
                                <button
                                  onClick={() => {
                                    setCurrentReceipt(t);
                                    setIsReceiptModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all"
                                  title="Cetak Kuitansi Kwitansi"
                                >
                                  📄 Kuitansi
                                </button>
                              )}
                              <button
                                onClick={() => handleStartEdit(t)}
                                className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Edit Transaksi"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Hapus Transaksi"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* ==========================================
      7. MODAL OVERLAYS & LAYOUTS
      ========================================== */}

      {/* PROMPT CETAK KUITANSI OTOMATIS */}
      {showPrintPrompt && currentReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-3xl">
              ✅
            </div>
            <h3 className="text-lg font-bold text-slate-900">Transaksi Berhasil Disimpan!</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Apakah Anda ingin membuat, menyusun, dan mencetak lembar kuitansi resmi sekolah untuk pengeluaran <strong>"{currentReceipt.description}"</strong> ini?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowPrintPrompt(false);
                  setCurrentReceipt(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowPrintPrompt(false);
                  setIsReceiptModalOpen(true);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
              >
                Buat Kuitansi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK KWITANSI (PRINT-READY) */}
      {isReceiptModalOpen && currentReceipt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl p-8 shadow-2xl border border-slate-200 my-8">
            
            {/* Kontrol Modal Atas */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 print:hidden">
              <h3 className="text-lg font-bold text-slate-900">📋 Lembar Cetak Kuitansi Resmi</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all"
                >
                  🖨️ Cetak / Print Lembar
                </button>
                <button
                  onClick={() => {
                    setIsReceiptModalOpen(false);
                    setCurrentReceipt(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Draf Kuitansi Fisik */}
            <div className="border-[3px] border-slate-900 p-8 text-slate-950 font-serif leading-relaxed text-sm relative overflow-hidden bg-white print:border-none print:p-0">
              
              {/* Kop Surat Sekolah */}
              <div className="flex items-center justify-between border-b-[2px] border-slate-900 pb-4 mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 border-2 border-slate-950 rounded-full flex items-center justify-center font-serif text-3xl font-black">
                    KOP
                  </div>
                  <div>
                    <h2 className="text-xl font-bold uppercase tracking-tight font-sans">KOMITE SEKOLAH / SATUAN PENDIDIKAN</h2>
                    <p className="text-xs uppercase font-sans font-bold text-slate-600">Alamat Resmi Satuan Pendidikan Dasar dan Menengah</p>
                  </div>
                </div>
                <div className="text-right text-xs font-sans font-bold">
                  <p>No Kuitansi: {currentReceipt.id}</p>
                  <p>Sumber Dana: BOSP Reguler</p>
                </div>
              </div>

              <h1 className="text-center text-2xl font-black underline uppercase tracking-widest font-sans mb-8">KUITANSI PEMBAYARAN</h1>

              {/* Isian Kwitansi */}
              <div className="space-y-4">
                <div className="flex border-b border-slate-300 pb-2">
                  <span className="w-48 font-bold font-sans uppercase text-xs text-slate-500">Telah Diterima Dari</span>
                  <span className="w-4 text-center">:</span>
                  <span className="flex-1 font-bold">Bendahara Dana BOSP (Bantuan Operasional Satuan Pendidikan)</span>
                </div>

                <div className="flex border-b border-slate-300 pb-2">
                  <span className="w-48 font-bold font-sans uppercase text-xs text-slate-500">Jumlah Uang</span>
                  <span className="w-4 text-center">:</span>
                  <span className="flex-1 font-bold italic bg-slate-100 px-3 py-1 rounded">
                    {formatTerbilangRupiah(currentReceipt.netAmount)}
                  </span>
                </div>

                <div className="flex border-b border-slate-300 pb-2">
                  <span className="w-48 font-bold font-sans uppercase text-xs text-slate-500">Untuk Pembayaran</span>
                  <span className="w-4 text-center">:</span>
                  <span className="flex-1 font-semibold">{currentReceipt.description}</span>
                </div>

                <div className="flex border-b border-slate-300 pb-2">
                  <span className="w-48 font-bold font-sans uppercase text-xs text-slate-500">Kategori Belanja</span>
                  <span className="w-4 text-center">:</span>
                  <span className="flex-1 font-semibold">{currentReceipt.category}</span>
                </div>

                {/* Rincian Potongan Pajak bila Ada */}
                {currentReceipt.taxType !== 'none' && (
                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg space-y-1 text-xs">
                    <p className="font-bold font-sans text-slate-600">Rincian Perhitungan Perpajakan (ARKAS):</p>
                    <p>Nominal Kertas Kerja Dasar: <strong>{formatRupiah(currentReceipt.amount)}</strong></p>
                    <p>Jenis Transaksi Perpajakan: <strong className="uppercase">{currentReceipt.taxType}</strong></p>
                    <p>Jumlah Nilai Pajak: <strong>{formatRupiah(currentReceipt.taxAmount)}</strong></p>
                    <p>Total Nominal Bersih: <strong>{formatRupiah(currentReceipt.netAmount)}</strong></p>
                  </div>
                )}
              </div>

              {/* Jumlah Nominal Besar */}
              <div className="mt-8 flex items-center justify-between">
                <div className="border-[3px] border-slate-900 bg-slate-100 text-2xl font-black font-mono px-6 py-3 tracking-wide rounded">
                  {formatRupiah(currentReceipt.netAmount)}
                </div>
                
                {/* Tanggal Dokumen */}
                <div className="text-right text-xs font-sans font-bold">
                  Kabupaten/Kota, {new Date(currentReceipt.date).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              {/* Tanda Tangan Komite */}
              <div className="mt-12 grid grid-cols-3 text-center text-xs font-sans font-bold gap-4">
                <div className="space-y-16">
                  <p>Menyetujui,<br/>Kepala Sekolah</p>
                  <p className="underline">( ...................................................... )</p>
                </div>
                <div className="space-y-16">
                  <p>Lunas Dibayar,<br/>Bendahara BOSP</p>
                  <p className="underline">( ...................................................... )</p>
                </div>
                <div className="space-y-16">
                  <p>Penerima Barang/Jasa,<br/>Pihak Kedua/Toko</p>
                  <p className="underline">( ...................................................... )</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL DATABASE (BACKUP / RESTORE) */}
      {isDatabaseModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">💾 Sinkronisasi & Backup Database</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dukungan migrasi state lokal. Salin teks JSON di bawah untuk melakukan backup, atau paste teks JSON backup sebelumnya untuk memulihkan seluruh Buku Kas Umum secara instan.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Raw Data JSON</label>
              <textarea
                value={databaseInput}
                onChange={(e) => setDatabaseInput(e.target.value)}
                placeholder="Paste teks JSON cadangan di sini..."
                className="w-full h-36 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setDatabaseInput(JSON.stringify(transactions, null, 2));
                  showToast('Seluruh BKU siap disalin dari textarea!', 'info');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Generate Backup Text
              </button>
              <button
                onClick={() => {
                  setIsDatabaseModalOpen(false);
                  setDatabaseInput('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleImportDatabase}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all"
              >
                Restore & Sinkronisasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESET DATA */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-3xl">
              ⚠️
            </div>
            <h3 className="text-lg font-bold text-slate-900">Kosongkan Buku Kas Umum?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tindakan ini akan <strong>menghapus secara permanen</strong> seluruh catatan transaksi penatausahaan sekolah yang ada di BKU berjalan. Pastikan Anda telah mengunduh backup data terlebih dahulu!
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleResetData}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition-all"
              >
                Ya, Kosongkan Kas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
