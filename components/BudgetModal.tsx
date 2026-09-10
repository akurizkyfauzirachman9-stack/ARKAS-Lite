import React, { useState, useEffect } from 'react';
import { BudgetSettings } from '../types';
import { formatRupiah } from '../utils';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetSettings: BudgetSettings;
  onSave: (newSettings: BudgetSettings) => void;
  userRole?: string;
}

const BudgetModal: React.FC<BudgetModalProps> = ({
  isOpen,
  onClose,
  budgetSettings,
  onSave,
  userRole = 'treasurer'
}) => {
  const [phase1, setPhase1] = useState<number>(budgetSettings.phase1Budget || 0);
  const [phase2, setPhase2] = useState<number>(budgetSettings.phase2Budget || 0);

  useEffect(() => {
    if (isOpen) {
      setPhase1(budgetSettings.phase1Budget || 0);
      setPhase2(budgetSettings.phase2Budget || 0);
    }
  }, [isOpen, budgetSettings]);

  if (!isOpen) return null;

  const totalAnnualBudget = Number(phase1 || 0) + Number(phase2 || 0);
  const isReadOnly = userRole !== 'treasurer';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    onSave({
      phase1Budget: Math.max(0, Number(phase1) || 0),
      phase2Budget: Math.max(0, Number(phase2) || 0),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#101621] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-cyan-500/30 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="bg-[#0B111B] text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Atur Pagu Anggaran BOS</h2>
              <p className="text-xs text-slate-400">Plafon Rencana Anggaran (RKAS) Tahap 1 & Tahap 2</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isReadOnly && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>Hanya <strong>Bendahara BOSP</strong> yang dapat mengubah pagu anggaran alokasi.</span>
            </div>
          )}

          <div className="bg-cyan-950/20 p-3.5 rounded-xl border border-cyan-500/20 text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              Plafon Murni Tanpa Input Transaksi
            </p>
            <p className="text-slate-400 leading-relaxed">
              Pagu anggaran adalah batas maksimal dana yang dialokasikan pemerintah untuk sekolah Anda.
              Pemasukan riil bulanan tetap dicatat melalui menu transaksi saat dana ditarik dari bank/kas.
            </p>
          </div>

          {/* Input Tahap 1 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                Pagu BOS Tahap 1 (Januari - Juni)
              </label>
              <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
                {formatRupiah(phase1)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm font-mono">Rp</span>
              <input
                type="number"
                min="0"
                step="100000"
                disabled={isReadOnly}
                value={phase1 || ''}
                onChange={(e) => setPhase1(Number(e.target.value) || 0)}
                placeholder="Contoh: 60000000"
                className="w-full pl-11 pr-4 py-2.5 bg-[#0B111B] border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition disabled:opacity-50 disabled:bg-slate-900"
              />
            </div>
            {/* Shortcut Buttons */}
            {!isReadOnly && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500">Pilihan Cepat:</span>
                {[40000000, 60000000, 80000000, 100000000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPhase1(val)}
                    className="px-2.5 py-1 text-[10px] font-medium bg-[#151C28] hover:bg-[#1C2638] text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    {val / 1000000} Jt
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Tahap 2 */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                Pagu BOS Tahap 2 (Juli - Desember)
              </label>
              <span className="text-xs font-mono font-bold text-teal-300 bg-teal-500/10 px-2.5 py-0.5 rounded-lg border border-teal-500/30">
                {formatRupiah(phase2)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm font-mono">Rp</span>
              <input
                type="number"
                min="0"
                step="100000"
                disabled={isReadOnly}
                value={phase2 || ''}
                onChange={(e) => setPhase2(Number(e.target.value) || 0)}
                placeholder="Contoh: 60000000"
                className="w-full pl-11 pr-4 py-2.5 bg-[#0B111B] border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition disabled:opacity-50 disabled:bg-slate-900"
              />
            </div>
            {!isReadOnly && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-500">Pilihan Cepat:</span>
                <button
                  type="button"
                  onClick={() => setPhase2(phase1)}
                  className="px-2.5 py-1 text-[10px] font-medium bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 rounded-lg border border-teal-500/30 transition-colors cursor-pointer"
                >
                  Samakan dg Tahap 1
                </button>
                {[40000000, 60000000, 80000000, 100000000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setPhase2(val)}
                    className="px-2.5 py-1 text-[10px] font-medium bg-[#151C28] hover:bg-[#1C2638] text-slate-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                  >
                    {val / 1000000} Jt
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ringkasan Total Tahunan */}
          <div className="p-4 bg-gradient-to-br from-[#0B111B] to-[#151C28] rounded-xl border border-cyan-500/30 flex items-center justify-between shadow-inner">
            <div>
              <p className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">Total Pagu 1 Tahun Anggaran</p>
              <p className="text-[10px] text-slate-400">Gabungan Tahap 1 + Tahap 2</p>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold font-mono text-[#00E6A7]">
                {formatRupiah(totalAnnualBudget)}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#151C28] hover:bg-[#1C2638] border border-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span>Simpan Pagu Anggaran</span>
              </button>
            )}
          </div>
        </form>

      </div>
    </div>
  );
};

export default BudgetModal;
