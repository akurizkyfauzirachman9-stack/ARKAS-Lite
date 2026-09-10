import React from 'react';
import { CATEGORY_COLORS } from '../types';
import { formatRupiah } from '../utils';

interface ExpenseChartProps {
  expenseByCategory: Record<string, number>;
  totalExpense: number;
}

const ExpenseChart: React.FC<ExpenseChartProps> = ({ expenseByCategory, totalExpense }) => {
  // 1. Urutkan data dari terbesar ke terkecil
  const sortedData = (Object.entries(expenseByCategory) as [string, number][])
    .sort(([, a], [, b]) => b - a)
    .filter(([, amount]) => amount > 0); // Hanya tampilkan yang ada nilainya

  // 2. Konfigurasi SVG
  const size = 200;
  const strokeWidth = 40;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // 3. Menyiapkan data segmen SVG
  let currentOffset = 0;
  const segments = sortedData.map(([category, amount]) => {
    const percentage = totalExpense > 0 ? amount / totalExpense : 0;
    const strokeDasharray = `${percentage * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    const color = CATEGORY_COLORS[category] || '#94a3b8'; // Fallback color
    
    // Simpan offset untuk segmen berikutnya
    currentOffset += percentage * circumference;

    return {
      category,
      amount,
      percentage: (percentage * 100).toFixed(1),
      color,
      strokeDasharray,
      strokeDashoffset
    };
  });

  // Jika tidak ada data, tampilkan lingkaran abu-abu
  const isEmpty = totalExpense === 0;

  return (
    <div className="bg-[#101621] p-6 rounded-2xl shadow-lg border border-cyan-500/20 h-full flex flex-col text-slate-100">
      <h3 className="font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-800/80 pb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
        <span>Analisis Belanja BKU</span>
      </h3>

      <div className="flex flex-col items-center gap-6 flex-1">
        
        {/* SVG Donut Chart */}
        <div className="relative w-52 h-52 flex-shrink-0 group">
          <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 transition-all duration-500">
            {isEmpty ? (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#1F293D"
                strokeWidth={strokeWidth}
              />
            ) : (
              segments.map((segment, index) => (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={segment.strokeDasharray}
                  strokeDashoffset={segment.strokeDashoffset}
                  strokeLinecap="butt"
                  className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                >
                  <title>{`${segment.category}: ${formatRupiah(segment.amount)} (${segment.percentage}%)`}</title>
                </circle>
              ))
            )}
          </svg>
          
          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
             <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-0.5">Total Realisasi</span>
             <span className="text-xl font-extrabold text-white font-mono tracking-tight">
               {totalExpense >= 1000000000 
                  ? `${(totalExpense / 1000000000).toFixed(2)}M` 
                  : (totalExpense >= 1000000 
                      ? `${(totalExpense / 1000000).toFixed(1)}jt` 
                      : (totalExpense > 0 ? (totalExpense / 1000).toFixed(0) + 'k' : '0'))
               }
             </span>
             {totalExpense > 0 && (
                <span className="text-[10px] text-cyan-300 mt-1 font-mono bg-[#151C28] px-2 py-0.5 rounded-full border border-cyan-500/20">
                    {formatRupiah(totalExpense)}
                </span>
             )}
          </div>
        </div>

        {/* Professional Legend Table */}
        <div className="w-full flex-1 overflow-hidden flex flex-col">
          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-2">
            <span>Kategori Standar BOS</span>
            <span>Proporsi</span>
          </div>
          
          <div className="overflow-y-auto pr-1 flex-1 max-h-56 space-y-1">
            {segments.length > 0 ? (
              segments.map((item) => (
                <div key={item.category} className="flex items-center justify-between p-2 hover:bg-[#151C28] rounded-xl transition-colors group border border-transparent hover:border-slate-800">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div 
                      className="w-3 h-3 rounded-full shadow-sm shrink-0 ring-2 ring-slate-800" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                            {item.category}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                            {formatRupiah(item.amount)}
                        </span>
                    </div>
                  </div>
                  <div className="text-right pl-2 shrink-0">
                    <span className="block text-xs font-bold text-white font-mono">{item.percentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-6 border border-dashed border-slate-800 rounded-xl bg-[#151C28]/40">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-50 text-slate-500"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                  <span className="text-xs">Belum ada transaksi belanja</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExpenseChart;