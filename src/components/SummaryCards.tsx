import React from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Wallet, 
  Building2, 
  Banknote,
  Percent,
  ReceiptText
} from 'lucide-react';
import { formatRupiah } from '../utils';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  cashBalance: number;
  bankBalance: number;
  totalTax: number;
  transactionCount: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalIncome,
  totalExpense,
  balance,
  cashBalance,
  bankBalance,
  totalTax,
  transactionCount,
}) => {
  const absorptionRate = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : '0.0';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
      {/* 1. Total Penerimaan Dana */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Penerimaan BOS
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {formatRupiah(totalIncome)}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
            Tahap Salur & Pendapatan Giro
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
      </div>

      {/* 2. Total Realisasi Belanja */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Realisasi Pengeluaran
          </span>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
            {formatRupiah(totalExpense)}
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-500"></span>
            Belanja Barang, Jasa & Modal
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500"></div>
      </div>

      {/* 3. Sisa Saldo Kas Berjalan */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Sisa Saldo Kas Buku
          </span>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-105 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className={`text-2xl font-bold font-mono tracking-tight ${balance < 0 ? 'text-rose-600' : 'text-indigo-950'}`}>
            {formatRupiah(balance)}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-amber-600" />
              Tunai: <strong className="font-mono text-slate-700">{formatRupiah(cashBalance)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Bank: <strong className="font-mono text-slate-700">{formatRupiah(bankBalance)}</strong>
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-blue-500"></div>
      </div>

      {/* 4. Serapan Anggaran & Pajak */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Serapan & Pajak SPJ
          </span>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-105 transition-transform">
            <Percent className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {absorptionRate}%
            </span>
            <span className="text-xs font-medium text-slate-400">Terserap</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1" title="Total Pajak Terpungut (PPN + PPh)">
              <ReceiptText className="w-3.5 h-3.5 text-indigo-500" />
              Pajak: <strong className="font-mono text-slate-700">{formatRupiah(totalTax)}</strong>
            </span>
            <span className="text-slate-400">
              {transactionCount} Transaksi
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400"></div>
      </div>
    </div>
  );
};

export default SummaryCards;
