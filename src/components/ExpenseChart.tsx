import React from 'react';
import { PieChart, TrendingDown } from 'lucide-react';
import { formatRupiah } from '../utils';

interface ExpenseChartProps {
  expenseByCategory: Record<string, number>;
  totalExpense: number;
}

const COLOR_PALETTE = [
  'bg-indigo-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-purple-500',
  'bg-cyan-500',
  'bg-teal-500',
  'bg-orange-500',
];

const ExpenseChart: React.FC<ExpenseChartProps> = ({
  expenseByCategory,
  totalExpense,
}) => {
  const categories: [string, number][] = (Object.entries(expenseByCategory) as [string, number][])
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <PieChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              Distribusi Belanja BOS
            </h3>
            <p className="text-[11px] text-slate-500">
              Realisasi menurut Komponen Standar
            </p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-slate-700">
          {formatRupiah(totalExpense)}
        </span>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-xs font-medium">Belum ada data pengeluaran yang tercatat</p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {categories.map(([category, amount], idx) => {
            const percentage = totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : '0';
            const colorClass = COLOR_PALETTE[idx % COLOR_PALETTE.length];

            return (
              <div key={category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium truncate max-w-[200px]" title={category}>
                    {category}
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="font-bold text-slate-900">{formatRupiah(amount)}</span>
                    <span className="text-slate-400 w-10 text-right">{percentage}%</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(2, parseFloat(percentage)))}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpenseChart;
