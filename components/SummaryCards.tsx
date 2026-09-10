import React from 'react';
import { BudgetPhase } from '../types';
import { formatRupiah } from '../utils';

interface SummaryCardsProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  overallBalance: number;
  phaseBudget: number;
  selectedPhase: BudgetPhase;
  onSelectPhase: (phase: BudgetPhase) => void;
  onOpenBudgetModal: () => void;
  userRole?: string;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalIncome,
  totalExpense,
  balance,
  overallBalance,
  phaseBudget,
  selectedPhase,
  onSelectPhase,
  onOpenBudgetModal,
  userRole = 'treasurer'
}) => {
  // Hitung persentase serapan belanja terhadap pagu
  const absorptionRate = phaseBudget > 0 ? (totalExpense / phaseBudget) * 100 : 0;
  const remainingBudget = phaseBudget - totalExpense;
  const isOverBudget = remainingBudget < 0;

  const phaseLabel = selectedPhase === 'phase1' 
    ? 'Tahap 1' 
    : selectedPhase === 'phase2' 
    ? 'Tahap 2' 
    : 'Seluruh Tahun';

  const phasePeriodLabel = selectedPhase === 'phase1'
    ? 'Januari - Juni'
    : selectedPhase === 'phase2'
    ? 'Juli - Desember'
    : 'Tahun Penuh (Tahap 1 & 2)';

  return (
    <div className="space-y-4 mb-8">
      {/* BAR NAVIGASI TAHAP & ATUR PAGU */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#101621] p-2.5 sm:p-3 rounded-2xl border border-cyan-500/15 shadow-lg shadow-black/20">
        
        {/* Toggle Pilihan Tahap */}
        <div className="flex items-center p-1 bg-[#0B111B] rounded-xl w-full sm:w-auto border border-slate-800/80">
          <button
            type="button"
            onClick={() => onSelectPhase('phase1')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPhase === 'phase1'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedPhase === 'phase1' ? 'bg-cyan-400 pulse-indicator' : 'bg-slate-600'}`}></span>
            <span>Tahap 1 (Jan - Jun)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPhase('phase2')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPhase === 'phase2'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedPhase === 'phase2' ? 'bg-cyan-400 pulse-indicator' : 'bg-slate-600'}`}></span>
            <span>Tahap 2 (Jul - Des)</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPhase('all')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              selectedPhase === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${selectedPhase === 'all' ? 'bg-cyan-400 pulse-indicator' : 'bg-slate-600'}`}></span>
            <span>Semua (1 Tahun)</span>
          </button>
        </div>

        {/* Tombol Atur Pagu Anggaran */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onOpenBudgetModal}
            className="w-full sm:w-auto px-3.5 py-2 bg-[#151C28] hover:bg-[#1c2637] text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm hover:shadow-cyan-500/10 transition-all cursor-pointer"
            title="Ubah Pagu Anggaran BOS Tahap 1 & Tahap 2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            <span>Atur Pagu Anggaran</span>
          </button>
        </div>
      </div>

      {/* 4 KARTU RINGKASAN: PAGU, REALISASI BELANJA, SISA PAGU/SERAPAN, SALDO KAS RIIL */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. PAGU ANGGARAN (RKAS) */}
        <div className="bg-[#101621] p-5 rounded-2xl shadow-md border border-cyan-500/20 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-400/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded-md border border-cyan-500/30">
                Pagu {phaseLabel}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">{phasePeriodLabel}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white mt-3 font-mono tracking-tight z-10">
              {formatRupiah(phaseBudget)}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Plafon Rencana Anggaran</span>
            <button
              type="button"
              onClick={onOpenBudgetModal}
              className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer"
            >
              Ubah
            </button>
          </div>
        </div>

        {/* 2. REALISASI BELANJA (KAS KELUAR) */}
        <div className="bg-[#101621] p-5 rounded-2xl shadow-md border border-rose-500/20 flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 bg-rose-950/70 px-2 py-0.5 rounded-md border border-rose-500/30">
                Realisasi Belanja
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Buku Kas</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-[#FF5575] mt-3 font-mono tracking-tight z-10">
              {formatRupiah(totalExpense)}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total belanja dibukukan</span>
            <span className="font-mono text-rose-400 font-medium text-[11px]">
              {selectedPhase !== 'all' ? `Periode ${phaseLabel}` : '1 Tahun'}
            </span>
          </div>
        </div>

        {/* 3. SISA PAGU & PERSENTASE SERAPAN */}
        <div className="bg-[#101621] p-5 rounded-2xl shadow-md border border-blue-500/20 flex flex-col justify-between relative overflow-hidden group hover:border-blue-400/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 bg-blue-950/70 px-2 py-0.5 rounded-md border border-blue-500/30">
                Sisa Pagu & Serapan
              </span>
              <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-md border ${
                absorptionRate >= 50 
                  ? 'bg-emerald-950/80 text-[#00E6A7] border-emerald-500/40' 
                  : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
              }`}>
                {phaseBudget > 0 ? `${absorptionRate.toFixed(1)}%` : '0%'}
              </span>
            </div>
            <h3 className={`text-xl sm:text-2xl font-extrabold mt-3 font-mono tracking-tight z-10 ${
              isOverBudget ? 'text-[#FF5575]' : 'text-slate-100'
            }`}>
              {formatRupiah(remainingBudget)}
            </h3>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5">
            {/* Progress Bar Serapan */}
            <div className="w-full bg-[#0B111B] h-2 rounded-full overflow-hidden border border-slate-800">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  absorptionRate >= 100 
                    ? 'bg-[#FF5575]' 
                    : absorptionRate >= 50 
                    ? 'bg-[#00E6A7]' 
                    : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, absorptionRate))}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between text-[10px]">
              {selectedPhase === 'phase1' ? (
                absorptionRate >= 50 ? (
                  <span className="text-[#00E6A7] font-semibold flex items-center gap-1">
                    <span>✓</span> Syarat Tahap 2 Terpenuhi (≥50%)
                  </span>
                ) : (
                  <span className="text-amber-400 font-semibold">
                    Target Tahap 2: min. 50%
                  </span>
                )
              ) : (
                <span className="text-slate-400">
                  {phaseBudget > 0 ? `${formatRupiah(remainingBudget)} sisa pagu` : 'Belum diisi'}
                </span>
              )}
              <span className="text-slate-400 font-mono">
                {phaseBudget > 0 ? `${absorptionRate.toFixed(0)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>

        {/* 4. SALDO KAS RIIL (UANG FISIK/BANK) */}
        <div className="bg-[#101621] p-5 rounded-2xl shadow-md border border-emerald-500/25 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-400/50 transition-all">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-bl-full pointer-events-none"></div>
          <div>
            <div className="flex items-center justify-between z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded-md border border-emerald-500/30">
                Saldo Kas Riil
              </span>
              <span className="text-[11px] text-slate-400 font-medium">Fisik & Bank</span>
            </div>
            <h3 className={`text-xl sm:text-2xl font-extrabold mt-3 font-mono tracking-tight z-10 ${
              balance < 0 ? 'text-[#FF5575]' : 'text-[#00E6A7]'
            }`}>
              {formatRupiah(balance)}
            </h3>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="text-[11px] text-slate-400 truncate mr-1">
              Kas Masuk: <span className="font-mono font-medium text-emerald-400">{formatRupiah(totalIncome)}</span>
            </div>
            {selectedPhase !== 'all' && (
              <span className="text-[10px] text-slate-400 font-mono shrink-0" title={`Saldo total seluruh tahun: ${formatRupiah(overallBalance)}`}>
                Tot: {formatRupiah(overallBalance)}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SummaryCards;
