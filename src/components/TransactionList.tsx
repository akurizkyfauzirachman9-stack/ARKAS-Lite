import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Receipt, 
  Edit3, 
  Trash2, 
  Calendar,
  Building2,
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react';
import { Transaction } from '../types';
import { formatRupiah, formatDateIndo } from '../utils';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onEdit: (tx: Transaction) => void;
  onExport: () => void;
  onOpenReceipt: (tx: Transaction) => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onDelete,
  onEdit,
  onExport,
  onOpenReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'Kas Tunai' | 'Bank / Transfer'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Generate available months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((tx) => {
      if (tx.date) {
        months.add(tx.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(months).sort().reverse();
  }, [transactions]);

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.recipient && tx.recipient.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (tx.receiptNumber && tx.receiptNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        tx.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = typeFilter === 'all' || tx.type === typeFilter;
      const matchMethod = methodFilter === 'all' || tx.paymentMethod === methodFilter;
      const matchMonth = monthFilter === 'all' || tx.date.startsWith(monthFilter);

      return matchSearch && matchType && matchMethod && matchMonth;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [transactions, searchTerm, typeFilter, methodFilter, monthFilter, sortBy]);

  // Total summary of filtered view
  const { filteredIncome, filteredExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') income += t.amount;
      else expense += t.amount;
    });
    return { filteredIncome: income, filteredExpense: expense };
  }, [filteredTransactions]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header with Search and Export */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Buku Transaksi & Pembukuan Kas
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan {filteredTransactions.length} dari {transactions.length} total transaksi tercatat
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
              title="Unduh format spreadsheet CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Search & Quick Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          {/* Search Box (5 cols) */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari uraian, toko/rekanan, no. bukti..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {/* Type Filter (3 cols) */}
          <div className="sm:col-span-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">Semua Tipe Kas</option>
              <option value="expense">Pengeluaran Saja</option>
              <option value="income">Penerimaan Saja</option>
            </select>
          </div>

          {/* Method Filter (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as any)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">Kas & Bank</option>
              <option value="Kas Tunai">Kas Tunai</option>
              <option value="Bank / Transfer">Bank / Giro</option>
            </select>
          </div>

          {/* Month Filter (2 cols) */}
          <div className="sm:col-span-2">
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-300 bg-white focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="all">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Bar */}
        {(typeFilter !== 'all' || methodFilter !== 'all' || monthFilter !== 'all' || searchTerm) && (
          <div className="flex flex-wrap items-center justify-between text-xs bg-slate-50 py-2 px-3 rounded-lg border border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-600">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filter Aktif</span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-emerald-700">Masuk: {formatRupiah(filteredIncome)}</span>
              <span className="text-slate-300">|</span>
              <span className="text-rose-700">Keluar: {formatRupiah(filteredExpense)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-700">Tidak ada transaksi ditemukan</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {transactions.length === 0
                ? 'Belum ada transaksi tersimpan di pembukuan. Tambahkan transaksi baru di formulir sebelah kiri.'
                : 'Coba ubah kata kunci pencarian atau sesuaikan filter di atas.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-700 text-[11px] uppercase tracking-wider border-b border-slate-200/80 font-bold">
              <tr>
                <th className="py-3.5 px-4">Tanggal & Bukti</th>
                <th className="py-3.5 px-4">Uraian & Komponen BOS</th>
                <th className="py-3.5 px-4">Rekening</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => {
                const isExpense = tx.type === 'expense';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Tanggal & No Bukti */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateIndo(tx.date)}
                      </div>
                      {tx.receiptNumber ? (
                        <span className="font-mono text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                          {tx.receiptNumber}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic mt-1 inline-block">
                          Tanpa No. Bukti
                        </span>
                      )}
                    </td>

                    {/* Uraian & Komponen */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-medium text-slate-900 leading-snug">
                        {tx.description}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="bg-slate-100 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md border border-slate-200/60">
                          {tx.category}
                        </span>
                        {tx.recipient && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            • Toko/Penerima: <span className="text-slate-700 font-semibold">{tx.recipient}</span>
                          </span>
                        )}
                      </div>
                      {/* Pajak Tag if present */}
                      {((tx.taxPpn || 0) > 0 || (tx.taxPph21 || 0) > 0 || (tx.taxPph22 || 0) > 0 || (tx.taxPph23 || 0) > 0) && (
                        <div className="mt-1 text-[10px] text-amber-700 flex items-center gap-1 font-mono">
                          <span>Pot. Pajak: {formatRupiah((tx.taxPpn || 0) + (tx.taxPph21 || 0) + (tx.taxPph22 || 0) + (tx.taxPph23 || 0))}</span>
                        </div>
                      )}
                    </td>

                    {/* Rekening Kas / Bank */}
                    <td className="py-3.5 px-4 align-top whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                        {tx.paymentMethod === 'Kas Tunai' ? (
                          <>
                            <Banknote className="w-3.5 h-3.5 text-amber-600" />
                            <span>Kas Tunai</span>
                          </>
                        ) : (
                          <>
                            <Building2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Bank / Giro</span>
                          </>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                        {tx.fundSource}
                      </span>
                    </td>

                    {/* Nominal */}
                    <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                      <div className={`font-mono text-xs font-bold ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpense ? '- ' : '+ '}
                        {formatRupiah(tx.amount)}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase inline-block mt-1 ${isExpense ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                        {isExpense ? 'Pengeluaran' : 'Penerimaan'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 align-top text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {/* Kuitansi button */}
                        <button
                          onClick={() => onOpenReceipt(tx)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-colors"
                          title="Cetak Kuitansi Resmi"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit button */}
                        <button
                          onClick={() => onEdit(tx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                          title="Edit Transaksi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete button */}
                        <button
                          onClick={() => onDelete(tx.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                          title="Hapus Transaksi"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
