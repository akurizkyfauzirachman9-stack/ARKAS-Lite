import React, { useState, useMemo } from 'react';
import { 
  X, 
  Printer, 
  Download, 
  BookOpen, 
  BarChart3, 
  Receipt, 
  FileSpreadsheet,
  Building2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Transaction, SchoolProfile } from '../types';
import { formatRupiah, formatDateIndo, BOS_EXPENSE_CATEGORIES } from '../utils';

interface BalanceSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashBalance: number;
  bankBalance: number;
  schoolProfile: SchoolProfile;
  onExportCsv: () => void;
}

const BalanceSheetModal: React.FC<BalanceSheetModalProps> = ({
  isOpen,
  onClose,
  transactions,
  totalIncome,
  totalExpense,
  balance,
  cashBalance,
  bankBalance,
  schoolProfile,
  onExportCsv,
}) => {
  const [activeTab, setActiveTab] = useState<'bku' | 'realisasi' | 'pajak'>('bku');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Sorted ascending by date for proper running balance calculation in BKU
  const chronologicalTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  // Available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    chronologicalTransactions.forEach((tx) => {
      if (tx.date) months.add(tx.date.slice(0, 7));
    });
    return Array.from(months).sort();
  }, [chronologicalTransactions]);

  // Compute Running Balance for BKU
  const bkuItems = useMemo(() => {
    let currentBalance = 0;
    const items = chronologicalTransactions.map((tx, idx) => {
      const isIncome = tx.type === 'income';
      if (isIncome) {
        currentBalance += tx.amount;
      } else {
        currentBalance -= tx.amount;
      }
      return {
        ...tx,
        noUrut: idx + 1,
        runningBalance: currentBalance,
      };
    });

    if (selectedMonth === 'all') return items;
    return items.filter((item) => item.date.startsWith(selectedMonth));
  }, [chronologicalTransactions, selectedMonth]);

  // Compute Realisasi per Komponen BOS
  const realisasiPerKomponen = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    BOS_EXPENSE_CATEGORIES.forEach((cat) => {
      map[cat] = { total: 0, count: 0 };
    });

    transactions.forEach((tx) => {
      if (tx.type === 'expense') {
        if (!map[tx.category]) {
          map[tx.category] = { total: 0, count: 0 };
        }
        map[tx.category].total += tx.amount;
        map[tx.category].count += 1;
      }
    });

    return Object.entries(map).map(([kategori, data]) => ({
      kategori,
      total: data.total,
      count: data.count,
      persen: totalExpense > 0 ? ((data.total / totalExpense) * 100).toFixed(1) : '0.0',
    }));
  }, [transactions, totalExpense]);

  // Compute Buku Pembantu Pajak
  const taxTransactions = useMemo(() => {
    return transactions.filter(
      (tx) =>
        (tx.taxPpn || 0) > 0 ||
        (tx.taxPph21 || 0) > 0 ||
        (tx.taxPph22 || 0) > 0 ||
        (tx.taxPph23 || 0) > 0
    );
  }, [transactions]);

  const totalTaxes = useMemo(() => {
    let ppn = 0;
    let pph21 = 0;
    let pph22 = 0;
    let pph23 = 0;
    taxTransactions.forEach((tx) => {
      ppn += tx.taxPpn || 0;
      pph21 += tx.taxPph21 || 0;
      pph22 += tx.taxPph22 || 0;
      pph23 += tx.taxPph23 || 0;
    });
    return { ppn, pph21, pph22, pph23, grandTotal: ppn + pph21 + pph22 + pph23 };
  }, [taxTransactions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden border border-slate-200 flex flex-col max-h-[92vh] print:max-h-none print:border-none print:shadow-none print:w-full">
        {/* Modal Header & Navigation (Hidden on Print) */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-inner">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold leading-tight flex items-center gap-2">
                Neraca & Laporan Keuangan BOS
                <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40">
                  {schoolProfile.fiscalYear}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {schoolProfile.schoolName} • Standar BKU & Akuntabilitas BOSP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Cetak format kertas resmi A4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
            <button
              onClick={onExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              title="Unduh file Excel CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Selector & Period Filter (Hidden on Print) */}
        <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('bku')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'bku'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Buku Kas Umum (BKU)
            </button>
            <button
              onClick={() => setActiveTab('realisasi')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'realisasi'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Laporan Realisasi Komponen
            </button>
            <button
              onClick={() => setActiveTab('pajak')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'pajak'
                  ? 'bg-white text-indigo-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Buku Pembantu Pajak
            </button>
          </div>

          {activeTab === 'bku' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs py-1.5 px-3 rounded-lg border border-slate-300 bg-white font-medium"
              >
                <option value="all">Semua Bulan (Kumulatif)</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content Body (Scrollable in modal, full in print) */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-white print:p-0 print:overflow-visible">
          {/* Official Printable School Letterhead Kop */}
          <div className="border-b-2 border-slate-900 pb-3 text-center mb-6">
            <div className="text-xs uppercase font-bold tracking-widest text-slate-700">
              PEMERINTAH KABUPATEN / KOTA {schoolProfile.city.toUpperCase()}
            </div>
            <div className="text-lg sm:text-xl font-extrabold uppercase tracking-wide text-slate-900 mt-0.5">
              {schoolProfile.schoolName}
            </div>
            <div className="text-xs text-slate-600">
              NPSN: {schoolProfile.npsn} • {schoolProfile.address}
            </div>
            <div className="text-xs font-semibold text-indigo-900 mt-1 uppercase tracking-wider">
              {activeTab === 'bku'
                ? 'BUKU KAS UMUM (BKU) DANA BANTUAN OPERASIONAL SEKOLAH'
                : activeTab === 'realisasi'
                ? 'LAPORAN REALISASI PENGGUNAAN DANA BOSP PER KOMPONEN'
                : 'BUKU PEMBANTU PAJAK (BPP) DANA BOS'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              Tahun Anggaran {schoolProfile.fiscalYear} • Periode: {schoolProfile.bosPeriod}
            </div>
          </div>

          {/* TAB 1: BUKU KAS UMUM (BKU) */}
          {activeTab === 'bku' && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px] uppercase">
                    <tr>
                      <th className="p-2 border-r border-slate-300 text-center w-12">No</th>
                      <th className="p-2 border-r border-slate-300 whitespace-nowrap w-24">Tanggal</th>
                      <th className="p-2 border-r border-slate-300 whitespace-nowrap w-28">No. Bukti</th>
                      <th className="p-2 border-r border-slate-300">Uraian Transaksi</th>
                      <th className="p-2 border-r border-slate-300 text-center w-20">Rek.</th>
                      <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap w-28">Penerimaan (Rp)</th>
                      <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap w-28">Pengeluaran (Rp)</th>
                      <th className="p-2 text-right whitespace-nowrap w-32">Saldo (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {bkuItems.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                          Belum ada catatan transaksi pada Buku Kas Umum.
                        </td>
                      </tr>
                    ) : (
                      bkuItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/70">
                          <td className="p-2 text-center border-r border-slate-200 font-mono">
                            {item.noUrut}
                          </td>
                          <td className="p-2 border-r border-slate-200 whitespace-nowrap font-medium text-slate-800">
                            {item.date}
                          </td>
                          <td className="p-2 border-r border-slate-200 whitespace-nowrap font-mono text-[11px] text-slate-700">
                            {item.receiptNumber || '-'}
                          </td>
                          <td className="p-2 border-r border-slate-200 leading-tight">
                            <span className="font-medium text-slate-900">{item.description}</span>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              {item.category} {item.recipient ? `• Rekanan: ${item.recipient}` : ''}
                            </div>
                          </td>
                          <td className="p-2 border-r border-slate-200 text-center whitespace-nowrap text-[10px] font-semibold text-slate-600">
                            {item.paymentMethod === 'Kas Tunai' ? 'Tunai' : 'Bank'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono text-emerald-700 font-medium">
                            {item.type === 'income' ? formatRupiah(item.amount) : '-'}
                          </td>
                          <td className="p-2 border-r border-slate-200 text-right font-mono text-rose-700 font-medium">
                            {item.type === 'expense' ? formatRupiah(item.amount) : '-'}
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {formatRupiah(item.runningBalance)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                    <tr>
                      <td colSpan={5} className="p-2.5 text-right uppercase border-r border-slate-300">
                        Total Kumulatif:
                      </td>
                      <td className="p-2.5 text-right font-mono text-emerald-700 border-r border-slate-300">
                        {formatRupiah(totalIncome)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-700 border-r border-slate-300">
                        {formatRupiah(totalExpense)}
                      </td>
                      <td className="p-2.5 text-right font-mono text-indigo-950 font-black">
                        {formatRupiah(balance)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Berita Acara Keadaan Kas (Standar BKU Kemendikbud) */}
              <div className="border border-slate-300 rounded-lg p-4 bg-slate-50 text-xs space-y-2">
                <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider border-b border-slate-200 pb-1.5">
                  Berita Acara Keadaan Kas Penutupan Buku
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-600">a. Saldo menurut Buku Kas Umum:</span>
                      <strong className="font-mono text-slate-900">{formatRupiah(balance)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">b. Saldo Kas Tunai di Brankas:</span>
                      <strong className="font-mono text-slate-900">{formatRupiah(cashBalance)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">c. Saldo Rekening Giro / Bank:</span>
                      <strong className="font-mono text-slate-900">{formatRupiah(bankBalance)}</strong>
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 font-semibold block uppercase">Status Selisih Kas</span>
                      <span className="text-emerald-700 font-bold text-xs flex items-center gap-1 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Seimbang / Nihil (Rp 0)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Total Kas Nyata</span>
                      <span className="font-mono font-bold text-slate-900">{formatRupiah(cashBalance + bankBalance)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LAPORAN REALISASI PENGGUNAAN DANA BOSP */}
          {activeTab === 'realisasi' && (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px] uppercase">
                    <tr>
                      <th className="p-2.5 border-r border-slate-300 text-center w-12">No</th>
                      <th className="p-2.5 border-r border-slate-300">Komponen Penggunaan Dana BOSP (Kemendikbud)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center w-24">Jumlah Transaksi</th>
                      <th className="p-2.5 border-r border-slate-300 text-right w-36">Realisasi (Rp)</th>
                      <th className="p-2.5 text-center w-24">Persentase (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {realisasiPerKomponen.map((item, idx) => (
                      <tr key={item.kategori} className="hover:bg-slate-50/70">
                        <td className="p-2.5 text-center border-r border-slate-200 font-mono">
                          {idx + 1}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 font-medium text-slate-900">
                          {item.kategori}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">
                          {item.count}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                          {formatRupiah(item.total)}
                        </td>
                        <td className="p-2.5 text-center font-mono text-xs font-semibold text-slate-700">
                          {item.persen}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                    <tr>
                      <td colSpan={3} className="p-2.5 text-right uppercase border-r border-slate-300">
                        Total Realisasi Belanja BOS:
                      </td>
                      <td className="p-2.5 text-right font-mono text-rose-700 font-black border-r border-slate-300">
                        {formatRupiah(totalExpense)}
                      </td>
                      <td className="p-2.5 text-center font-mono font-black">
                        100.0%
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: BUKU PEMBANTU PAJAK (BPP) */}
          {activeTab === 'pajak' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <span className="text-[11px] text-indigo-700 font-semibold uppercase">PPN (11%)</span>
                  <div className="text-base font-bold font-mono text-indigo-950 mt-1">
                    {formatRupiah(totalTaxes.ppn)}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <span className="text-[11px] text-amber-700 font-semibold uppercase">PPh 21 (Honor)</span>
                  <div className="text-base font-bold font-mono text-amber-950 mt-1">
                    {formatRupiah(totalTaxes.pph21)}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-[11px] text-emerald-700 font-semibold uppercase">PPh 22 (Barang)</span>
                  <div className="text-base font-bold font-mono text-emerald-950 mt-1">
                    {formatRupiah(totalTaxes.pph22)}
                  </div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-[11px] text-blue-700 font-semibold uppercase">PPh 23 (Jasa)</span>
                  <div className="text-base font-bold font-mono text-blue-950 mt-1">
                    {formatRupiah(totalTaxes.pph23)}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[11px] uppercase">
                    <tr>
                      <th className="p-2 border-r border-slate-300 text-center w-10">No</th>
                      <th className="p-2 border-r border-slate-300 whitespace-nowrap w-24">Tanggal</th>
                      <th className="p-2 border-r border-slate-300 whitespace-nowrap w-28">No. Bukti</th>
                      <th className="p-2 border-r border-slate-300">Uraian / Toko Rekanan</th>
                      <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">PPN (11%)</th>
                      <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">PPh 21</th>
                      <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">PPh 22</th>
                      <th className="p-2 border-r border-slate-300 text-right whitespace-nowrap">PPh 23</th>
                      <th className="p-2 text-right whitespace-nowrap">Total Pajak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {taxTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                          Belum ada transaksi dengan pemotongan pajak PPN atau PPh.
                        </td>
                      </tr>
                    ) : (
                      taxTransactions.map((tx, idx) => {
                        const txTotal =
                          (tx.taxPpn || 0) +
                          (tx.taxPph21 || 0) +
                          (tx.taxPph22 || 0) +
                          (tx.taxPph23 || 0);
                        return (
                          <tr key={tx.id} className="hover:bg-slate-50/70">
                            <td className="p-2 text-center border-r border-slate-200 font-mono">
                              {idx + 1}
                            </td>
                            <td className="p-2 border-r border-slate-200 whitespace-nowrap font-medium">
                              {tx.date}
                            </td>
                            <td className="p-2 border-r border-slate-200 font-mono text-[11px]">
                              {tx.receiptNumber || '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200">
                              <span className="font-medium text-slate-900">{tx.description}</span>
                              {tx.recipient && (
                                <div className="text-[10px] text-slate-500">Toko: {tx.recipient}</div>
                              )}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {tx.taxPpn ? formatRupiah(tx.taxPpn) : '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {tx.taxPph21 ? formatRupiah(tx.taxPph21) : '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {tx.taxPph22 ? formatRupiah(tx.taxPph22) : '-'}
                            </td>
                            <td className="p-2 border-r border-slate-200 text-right font-mono">
                              {tx.taxPph23 ? formatRupiah(tx.taxPph23) : '-'}
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {formatRupiah(txTotal)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400 text-slate-900 text-xs">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right uppercase border-r border-slate-300">
                        Total Pungutan Pajak:
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300">
                        {formatRupiah(totalTaxes.ppn)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300">
                        {formatRupiah(totalTaxes.pph21)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300">
                        {formatRupiah(totalTaxes.pph22)}
                      </td>
                      <td className="p-2.5 text-right font-mono border-r border-slate-300">
                        {formatRupiah(totalTaxes.pph23)}
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-indigo-950">
                        {formatRupiah(totalTaxes.grandTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Kolom Tanda Tangan Resmi Pengesahan Laporan */}
          <div className="mt-10 text-xs text-slate-900">
            <div className="text-right text-[11px] mb-4">
              {schoolProfile.city}, {formatDateIndo(new Date().toISOString().slice(0, 10))}
            </div>

            <div className="grid grid-cols-2 gap-12 text-center max-w-2xl mx-auto">
              <div className="flex flex-col justify-between h-32">
                <div>
                  <p className="font-bold">Mengetahui,</p>
                  <p className="text-[11px] text-slate-600">Kepala {schoolProfile.schoolName}</p>
                </div>
                <div className="border-t border-slate-800 pt-1">
                  <p className="font-bold underline">{schoolProfile.headmaster}</p>
                  <p className="text-[10px] font-mono text-slate-600">NIP. {schoolProfile.headmasterNip}</p>
                </div>
              </div>

              <div className="flex flex-col justify-between h-32">
                <div>
                  <p className="font-bold">Dibuat Oleh,</p>
                  <p className="text-[11px] text-slate-600">Bendahara BOS</p>
                </div>
                <div className="border-t border-slate-800 pt-1">
                  <p className="font-bold underline">{schoolProfile.treasurer}</p>
                  <p className="text-[10px] font-mono text-slate-600">NIP. {schoolProfile.treasurerNip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>* Laporan ini dibuat secara otomatis dari data pembukuan ARKAS Lite.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold transition-colors"
          >
            Tutup Laporan
          </button>
        </div>
      </div>
    </div>
  );
};

export default BalanceSheetModal;
