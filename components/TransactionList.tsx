import React, { useState, useMemo } from 'react';
import { Transaction, UserRole } from '../types';
import { formatRupiah, formatDate } from '../utils'; // Import Utility

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onExport: (customTransactions?: Transaction[], customLabel?: string) => void;
  onPrintReceipt?: (transaction: Transaction) => void;
  userRole?: UserRole;
}

const MONTHS = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' }
];

const TransactionList: React.FC<TransactionListProps> = ({ 
  transactions, 
  onDelete, 
  onEdit, 
  onExport,
  onPrintReceipt,
  userRole = 'treasurer'
}) => {
  // State Filter Uraian, Bulan, & Tipe
  const [searchUraian, setSearchUraian] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // State Pengurutan Tanggal: 'asc' = A-Z (Terlama ke Terbaru), 'desc' = Z-A (Terbaru ke Terlama)
  const [dateSortOrder, setDateSortOrder] = useState<'asc' | 'desc'>('asc');

  // State Modal Konfirmasi Hapus In-App (Bebas dari masalah iframe sandbox)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  // Hitung Saldo Berjalan (Running Balance) untuk setiap transaksi secara kronologis
  const runningBalances = useMemo(() => {
    const chronological = [...transactions].sort((a, b) => {
      const comp = a.date.localeCompare(b.date);
      if (comp !== 0) return comp;
      return a.id.localeCompare(b.id);
    });

    let currentBalance = 0;
    const balanceMap: Record<string, number> = {};

    chronological.forEach(t => {
      if (t.type === 'income') {
        currentBalance += t.amount;
      } else {
        currentBalance -= t.amount;
      }
      balanceMap[t.id] = currentBalance;
    });

    return balanceMap;
  }, [transactions]);

  // Logika Filter & Pengurutan Transaksi
  const filteredAndSortedTransactions = useMemo(() => {
    // 1. Filter transaksi
    const filtered = transactions.filter(t => {
      // Filter Uraian (mencakup uraian transaksi, nama penerima, atau kategori)
      const query = searchUraian.trim().toLowerCase();
      const matchesUraian = !query || 
        t.description.toLowerCase().includes(query) ||
        (t.recipient && t.recipient.toLowerCase().includes(query)) ||
        t.category.toLowerCase().includes(query);

      // Filter Bulanan
      let matchesMonth = true;
      if (selectedMonth !== 'all') {
        const parts = t.date.split('-');
        const tMonth = parts.length >= 2 ? parts[1] : (new Date(t.date).getMonth() + 1).toString().padStart(2, '0');
        matchesMonth = tMonth === selectedMonth;
      }

      // Filter Tipe Transaksi
      const matchesType = filterType === 'all' ? true : t.type === filterType;

      return matchesUraian && matchesMonth && matchesType;
    });

    // 2. Pengurutan Tanggal (A-Z / asc vs Z-A / desc)
    return filtered.sort((a, b) => {
      const comp = a.date.localeCompare(b.date);
      if (comp !== 0) {
        return dateSortOrder === 'asc' ? comp : -comp;
      }
      // Jika tanggal sama, urutkan berdasarkan waktu buat/id
      return dateSortOrder === 'asc' 
        ? String(a.id).localeCompare(String(b.id)) 
        : String(b.id).localeCompare(String(a.id));
    });
  }, [transactions, searchUraian, selectedMonth, filterType, dateSortOrder]);

  // Cek apakah filter sedang aktif
  const isFilterActive = Boolean(searchUraian || selectedMonth !== 'all' || filterType !== 'all');

  // Hitung total realisasi yang sedang tampil
  const filteredSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredAndSortedTransactions.forEach(t => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { income, expense };
  }, [filteredAndSortedTransactions]);

  // Toggle Urutan Tanggal
  const handleToggleSort = () => {
    setDateSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Reset Semua Filter
  const handleResetFilters = () => {
    setSearchUraian('');
    setSelectedMonth('all');
    setFilterType('all');
    setDateSortOrder('asc');
  };

  // Ekspor Excel Khusus Data yang Sedang Ditampilkan / Difilter
  const handleExportClick = () => {
    if (selectedMonth !== 'all') {
      const monthObj = MONTHS.find(m => m.value === selectedMonth);
      const label = monthObj ? `Bulan_${monthObj.label}` : 'Filtered';
      onExport(filteredAndSortedTransactions, label);
    } else {
      onExport(filteredAndSortedTransactions, 'Semua_Data');
    }
  };

  // Eksekusi Konfirmasi Hapus
  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    setDeleteTarget(null);
    onDelete(targetId);
  };

  return (
    <div className="bg-[#101621] rounded-2xl shadow-xl border border-cyan-500/20 overflow-hidden flex flex-col h-full text-slate-100">
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0B111B]/80 space-y-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-white text-sm md:text-base leading-tight">
                    Riwayat Transaksi BKU
                </h3>
                <p className="text-[11px] text-slate-400">
                    Menampilkan <span className="font-semibold text-cyan-400 font-mono">{filteredAndSortedTransactions.length}</span> dari {transactions.length} entri pembukuan
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isFilterActive && (
                <button 
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-500/30 rounded-xl transition-all font-medium cursor-pointer"
                  title="Reset semua filter ke kondisi awal"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  <span>Reset Filter</span>
                </button>
              )}
              <button 
                  onClick={handleExportClick}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-[#00E6A7] border border-emerald-500/40 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  title={selectedMonth !== 'all' ? `Ekspor Excel BKU ${MONTHS.find(m => m.value === selectedMonth)?.label}` : 'Ekspor Excel Seluruh BKU'}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  <span>{selectedMonth !== 'all' ? `Ekspor ${MONTHS.find(m => m.value === selectedMonth)?.label}` : 'Ekspor Excel'}</span>
              </button>
            </div>
        </div>
        
        {/* Panel Form Filter: Uraian, Filter Bulan, Tipe, & Sortir Tanggal */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* 1. Input Filter Uraian */}
            <div className="sm:col-span-5 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <input 
                    type="text" 
                    placeholder="Filter uraian kegiatan / penerima..."
                    value={searchUraian}
                    onChange={(e) => setSearchUraian(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs md:text-sm border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 bg-[#101621] text-slate-200 placeholder-slate-500"
                />
                {searchUraian && (
                  <button
                    type="button"
                    onClick={() => setSearchUraian('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
                    title="Kosongkan pencarian uraian"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
            </div>

            {/* 2. Filter Bulanan */}
            <div className="sm:col-span-3 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full pl-8 pr-7 py-2 text-xs border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 bg-[#101621] text-slate-200 appearance-none cursor-pointer font-medium"
                    title="Filter Berdasarkan Bulan"
                >
                    {MONTHS.map(m => (
                      <option key={m.value} value={m.value} className="bg-[#101621] text-slate-200">{m.label}</option>
                    ))}
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
            </div>

            {/* 3. Filter Tipe Transaksi */}
            <div className="sm:col-span-2 relative">
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-800 rounded-xl focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 bg-[#101621] text-slate-200 appearance-none cursor-pointer font-medium"
                    title="Filter Tipe Transaksi"
                >
                    <option value="all" className="bg-[#101621] text-slate-200">Semua Tipe</option>
                    <option value="income" className="bg-[#101621] text-slate-200">Pemasukan (+)</option>
                    <option value="expense" className="bg-[#101621] text-slate-200">Pengeluaran (-)</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
            </div>

            {/* 4. Tombol Sortir Tanggal A-Z / Z-A */}
            <div className="sm:col-span-2">
                <button
                    type="button"
                    onClick={handleToggleSort}
                    className="w-full py-2 px-2.5 text-xs font-semibold rounded-xl border border-cyan-500/25 bg-[#151C28] hover:bg-[#1C2638] text-cyan-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    title={`Klik untuk ubah urutan tanggal. Saat ini: ${dateSortOrder === 'asc' ? 'A-Z (Terlama ke Terbaru)' : 'Z-A (Terbaru ke Terlama)'}`}
                >
                    {dateSortOrder === 'asc' ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18"/><path d="M7 12h10"/><path d="M10 18h4"/></svg>
                        <span>Tgl: A-Z (Lama)</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 6h4"/><path d="M7 12h10"/><path d="M3 18h18"/></svg>
                        <span>Tgl: Z-A (Baru)</span>
                      </>
                    )}
                </button>
            </div>
        </div>

        {/* Ringkasan Akumulasi Realisasi Jika Sedang Difilter */}
        {isFilterActive && filteredAndSortedTransactions.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs bg-cyan-950/30 p-2.5 rounded-xl border border-cyan-500/20">
            <span className="text-cyan-300 font-semibold flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Akumulasi Data Terfilter:
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[#00E6A7] font-bold font-mono">
                Masuk: +{formatRupiah(filteredSummary.income)}
              </span>
              <span className="text-[#FF5575] font-bold font-mono">
                Keluar: -{formatRupiah(filteredSummary.expense)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Table List */}
      <div className="overflow-y-auto flex-1 p-0 min-h-[300px]">
        {filteredAndSortedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-4">
                <div className="w-16 h-16 bg-[#151C28] border border-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <p className="text-slate-300 font-medium">Tidak ada transaksi ditemukan</p>
                <p className="text-slate-500 text-xs mt-1">Coba ubah kata kunci pencarian, filter bulan, atau tipe transaksi</p>
            </div>
        ) : (
            <table className="w-full text-left border-collapse">
                <thead className="bg-[#0B111B] sticky top-0 z-10 border-b border-slate-800">
                    <tr>
                        <th 
                          onClick={handleToggleSort}
                          className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-28 cursor-pointer hover:bg-white/5 transition-colors select-none group"
                          title="Klik untuk mengurutkan Tanggal (A-Z atau Z-A)"
                        >
                          <div className="flex items-center gap-1">
                            <span>Tanggal</span>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {dateSortOrder === 'asc' ? 'A-Z ↑' : 'Z-A ↓'}
                            </span>
                          </div>
                        </th>
                        <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Uraian Transaksi</th>
                        <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right w-32">Nominal</th>
                        <th className="px-3.5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right w-32">Saldo Kas</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center w-28">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                    {filteredAndSortedTransactions.map((t) => (
                        <tr key={t.id} className="hover:bg-[#151C28]/60 transition-colors group">
                            <td className="px-3.5 py-3.5 text-xs text-slate-400 whitespace-nowrap align-top font-medium font-mono">
                                {formatDate(t.date)}
                            </td>
                            <td className="px-3.5 py-3.5 align-top">
                                <p className="text-xs md:text-sm font-semibold text-slate-100 leading-snug">
                                  {t.description}
                                </p>
                                {t.recipient && (
                                    <p className="text-[11px] text-cyan-400 font-medium mt-0.5 flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        <span>Penerima: <strong className="text-cyan-300">{t.recipient}</strong></span>
                                    </p>
                                )}
                                <span className={`text-[10px] px-2 py-0.5 rounded-md inline-block mt-1 font-medium tracking-wide ${
                                    t.type === 'income' 
                                      ? 'bg-emerald-950/70 text-[#00E6A7] border border-emerald-500/30' 
                                      : 'bg-rose-950/70 text-[#FF5575] border border-rose-500/30'
                                }`}>
                                    {t.category}
                                </span>
                            </td>
                            <td className={`px-3.5 py-3.5 text-xs md:text-sm font-bold text-right whitespace-nowrap align-top font-mono tracking-tight ${
                                t.type === 'income' ? 'text-[#00E6A7]' : 'text-[#FF5575]'
                            }`}>
                                {t.type === 'income' ? '+ ' : '- '}
                                {formatRupiah(t.amount)}
                            </td>
                            <td className="px-3.5 py-3.5 text-xs md:text-sm font-semibold text-right whitespace-nowrap align-top font-mono text-slate-200 tracking-tight">
                                {formatRupiah(runningBalances[t.id] ?? 0)}
                            </td>
                            <td className="px-3 py-3.5 text-center align-top">
                                <div className="flex items-center justify-center gap-1">
                                    {/* Tombol Cetak Kuitansi Resmi BOSP (Khusus Pengeluaran) */}
                                    {t.type === 'expense' && onPrintReceipt && (
                                        <button 
                                            type="button"
                                            onClick={() => onPrintReceipt(t)}
                                            className="text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                                            title="Cetak Kuitansi Resmi BOSP"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/></svg>
                                        </button>
                                    )}

                                    {userRole === 'treasurer' ? (
                                        <>
                                            {/* Tombol Ubah Transaksi */}
                                            <button 
                                                type="button"
                                                onClick={() => onEdit(t)}
                                                className="text-amber-400 hover:text-amber-200 hover:bg-amber-500/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                title="Ubah / Edit Transaksi"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                                            </button>
                                            {/* Tombol Hapus Transaksi (Membuka Modal Konfirmasi In-App) */}
                                            <button 
                                                type="button"
                                                onClick={() => setDeleteTarget(t)}
                                                className="text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                                                title="Hapus Transaksi dari BKU"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                            </button>
                                        </>
                                    ) : (
                                        t.type !== 'expense' && (
                                            <span className="text-slate-600 inline-block p-1.5" title="Terkunci - Hanya Bendahara yang berhak mengedit/menghapus">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                            </span>
                                        )
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        )}
      </div>

      {/* MODAL KONFIRMASI HAPUS TRANSAKSI (IN-APP MODAL, BEBAS DARI SANDBOX IFRAME) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#101621] rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-rose-500/30 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 mb-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[#FF5575] flex items-center justify-center shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Konfirmasi Hapus Transaksi</h3>
                <p className="text-xs text-slate-400">Tindakan ini akan menghapus entri dari buku kas</p>
              </div>
            </div>

            <div className="bg-[#0B111B] border border-slate-800 rounded-xl p-3.5 my-3.5 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Tanggal:</span>
                <span className="font-semibold text-slate-200 font-mono">{formatDate(deleteTarget.date)}</span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-400 shrink-0">Uraian:</span>
                <span className="font-semibold text-white text-right">{deleteTarget.description}</span>
              </div>
              {deleteTarget.recipient && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Penerima:</span>
                  <span className="font-semibold text-cyan-400">{deleteTarget.recipient}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Nominal:</span>
                <span className={`font-bold font-mono text-sm ${deleteTarget.type === 'income' ? 'text-[#00E6A7]' : 'text-[#FF5575]'}`}>
                  {deleteTarget.type === 'income' ? '+ ' : '- '}{formatRupiah(deleteTarget.amount)}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-300 mb-5 bg-rose-950/40 p-3 rounded-xl border border-rose-500/30 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5 text-rose-400"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Apakah Anda yakin ingin menghapus data transaksi ini secara permanen dari buku kas?</span>
            </p>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-[#151C28] hover:bg-[#1C2638] border border-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg>
                <span>Ya, Hapus Transaksi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;