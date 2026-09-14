import React, { useState, useMemo, useEffect } from 'react';
import { 
  Transaction, 
  UserRole, 
  SchoolSettings, 
  DEFAULT_SCHOOL_SETTINGS, 
  SupabaseConfig, 
  DEFAULT_SUPABASE_CONFIG,
  BudgetPhase,
  BudgetSettings,
  DEFAULT_BUDGET_SETTINGS,
  MonthlySignature
} from './types';
import { formatRupiah } from './utils'; // Import Utility
import SummaryCards from './components/SummaryCards';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import ExpenseChart from './components/ExpenseChart';
import BalanceSheetModal from './components/BalanceSheetModal';
import ReceiptModal from './components/ReceiptModal';
import ResetModal from './components/ResetModal';
import DatabaseModal from './components/DatabaseModal'; // Import Database Modal
import BudgetModal from './components/BudgetModal'; // Import Budget Modal
import TreasurerAuthModal from './components/TreasurerAuthModal'; // Import Modal Otentikasi Bendahara
import Toast from './components/Toast'; // Import Toast
import { 
  pullTransactionsFromSupabase, 
  pushTransactionsToSupabase, 
  deleteTransactionFromSupabase,
  extractSyncConfigFromUrl,
  createShareableSyncLink
} from './services/supabaseService';

const STORAGE_KEY = 'arkas_lite_data';
const SETTINGS_KEY = 'arkas_school_settings';
const SUPABASE_KEY = 'arkas_supabase_config';
const ROLE_KEY = 'arkas_user_role';
const BUDGET_KEY = 'arkas_budget_settings';
const PHASE_KEY = 'arkas_selected_phase';

// DATA AWAL KOSONG (Sesuai Permintaan)
const DEFAULT_TRANSACTIONS: Transaction[] = [];

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
    } catch (e) {
      return DEFAULT_TRANSACTIONS;
    }
  });

  // State Profil Satuan Pendidikan & Pejabat BOSP
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrasi otomatis jika masih menggunakan nama placeholder bawaan lama
        if (parsed.headmasterName === 'Drs. H. Ahmad Fauzi, M.Pd.' || !parsed.headmasterName) {
          parsed.headmasterName = 'Drs. IIS RAIS, M.M.';
          parsed.headmasterNip = '19750814 200212 1 003';
        }
        if (parsed.committeeName === 'H. Bambang Sudirman' || !parsed.committeeName) {
          parsed.committeeName = 'Ustz. Encep Al Gipari';
        }
        if (parsed.treasurerName === 'Siti Rahmawati, S.Pd.' || !parsed.treasurerName) {
          parsed.treasurerName = 'Drs. AEP Saepudin, M.Pd.';
        }
        if (parsed.city === 'Bandung' || !parsed.city) {
          parsed.city = 'Tasikmalaya';
        }
        if (!parsed.fiscalYear || parsed.fiscalYear === '2025') {
          parsed.fiscalYear = '2026';
        }
        return { ...DEFAULT_SCHOOL_SETTINGS, ...parsed };
      }
      return DEFAULT_SCHOOL_SETTINGS;
    } catch (e) {
      return DEFAULT_SCHOOL_SETTINGS;
    }
  });

  // State Konfigurasi Supabase REST API (Mendukung Tautan Sinkronisasi Cepat, Env Vercel & LocalStorage)
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    try {
      // 1. Cek apakah pengguna membuka aplikasi lewat tautan sinkronisasi (#sync=...)
      const fromUrl = extractSyncConfigFromUrl();
      if (fromUrl) {
        localStorage.setItem(SUPABASE_KEY, JSON.stringify(fromUrl));
        return fromUrl;
      }
      // 2. Cek Environment Variable Vercel
      const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
      const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
      const saved = localStorage.getItem(SUPABASE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_SUPABASE_CONFIG,
          ...parsed,
          url: parsed.url || envUrl,
          anonKey: parsed.anonKey || envKey,
        };
      }
      return {
        ...DEFAULT_SUPABASE_CONFIG,
        url: envUrl,
        anonKey: envKey,
      };
    } catch (e) {
      return DEFAULT_SUPABASE_CONFIG;
    }
  });

  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const isCloudConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

  // State Role-Based Access Control (RBAC)
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const isTreasurerAuthed = sessionStorage.getItem('arkas_treasurer_auth') === 'true';
      const saved = localStorage.getItem(ROLE_KEY);
      if (saved === 'treasurer') {
        return isTreasurerAuthed ? 'treasurer' : 'headmaster';
      }
      if (saved === 'committee' || saved === 'headmaster') {
        return saved as UserRole;
      }
      return 'headmaster';
    } catch (e) {
      return 'headmaster';
    }
  });

  // State Modal Otentikasi Password Bendahara
  const [isTreasurerAuthModalOpen, setIsTreasurerAuthModalOpen] = useState(false);

  // State Pagu Anggaran BOS (Tahap 1 & 2)
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettings>(() => {
    try {
      const saved = localStorage.getItem(BUDGET_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_BUDGET_SETTINGS;
    } catch {
      return DEFAULT_BUDGET_SETTINGS;
    }
  });

  // State Pilihan Tahap Aktif (Tahap 1, Tahap 2, atau Semua)
  const [selectedPhase, setSelectedPhase] = useState<BudgetPhase>(() => {
    try {
      const saved = localStorage.getItem(PHASE_KEY);
      if (saved === 'phase1' || saved === 'phase2' || saved === 'all') {
        return saved as BudgetPhase;
      }
      return 'phase1';
    } catch {
      return 'phase1';
    }
  });

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // State for Modals & UI
  const [isBalanceSheetOpen, setIsBalanceSheetOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isDatabaseModalOpen, setIsDatabaseModalOpen] = useState(false); // State Database Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false); // State Modal Pagu Anggaran
  const [duplicatePromptTx, setDuplicatePromptTx] = useState<Omit<Transaction, 'id'> | null>(null); // Modal Konfirmasi Duplikasi Transaksi In-App
  
  const [currentReceiptData, setCurrentReceiptData] = useState<Transaction | null>(null);
  const [currentReceiptSignature, setCurrentReceiptSignature] = useState<MonthlySignature | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // State for Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Helper untuk menampilkan toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  const handleRoleSelectChange = (newRole: UserRole) => {
    if (newRole === 'treasurer') {
      if (userRole === 'treasurer') return;
      setIsTreasurerAuthModalOpen(true);
    } else if (newRole === 'headmaster') {
      setUserRole('headmaster');
      sessionStorage.removeItem('arkas_treasurer_auth');
      showToast('Mode Kepala Sekolah aktif: Akses Read-Only untuk verifikasi laporan & pengesahan.', 'info');
    } else if (newRole === 'committee') {
      setUserRole('committee');
      sessionStorage.removeItem('arkas_treasurer_auth');
      showToast('Mode Komite Sekolah aktif: Akses Read-Only untuk pengawasan dan transparansi.', 'info');
    }
  };

  const handleTreasurerAuthSuccess = () => {
    sessionStorage.setItem('arkas_treasurer_auth', 'true');
    setUserRole('treasurer');
    setIsTreasurerAuthModalOpen(false);
    showToast('Otentikasi Berhasil: Mode Bendahara BOSP aktif (Hak CRUD penuh).', 'success');
  };

  // Auto Save to local storage whenever transactions change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    setLastSaved(new Date());
  }, [transactions]);

  // Persist School Settings
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(schoolSettings));
  }, [schoolSettings]);

  // Persist Supabase Config
  useEffect(() => {
    localStorage.setItem(SUPABASE_KEY, JSON.stringify(supabaseConfig));
  }, [supabaseConfig]);

  // Persist User Role
  useEffect(() => {
    localStorage.setItem(ROLE_KEY, userRole);
  }, [userRole]);

  // Persist Budget Settings
  useEffect(() => {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(budgetSettings));
  }, [budgetSettings]);

  // Persist Selected Phase
  useEffect(() => {
    localStorage.setItem(PHASE_KEY, selectedPhase);
  }, [selectedPhase]);

  // Helper sinkronisasi latar belakang ke Supabase Cloud
  const syncTransactionsToCloud = async (dataToSync: Transaction[]) => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) return;
    try {
      setIsCloudSyncing(true);
      await pushTransactionsToSupabase(supabaseConfig, dataToSync);
      const updatedConfig = { ...supabaseConfig, lastSyncedAt: new Date().toISOString() };
      setSupabaseConfig(updatedConfig);
      localStorage.setItem(SUPABASE_KEY, JSON.stringify(updatedConfig));
    } catch (e) {
      console.warn('Gagal sinkronisasi otomatis ke cloud:', e);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Auto-Pull data transaksi dari Cloud saat aplikasi pertama kali dibuka
  useEffect(() => {
    if (supabaseConfig.url && supabaseConfig.anonKey) {
      setIsCloudSyncing(true);
      pullTransactionsFromSupabase(supabaseConfig)
        .then(res => {
          if (res.success && res.data && res.data.length > 0) {
            setTransactions(prev => {
              const map = new Map<string, Transaction>();
              prev.forEach(t => map.set(t.id, t));
              res.data!.forEach(t => map.set(t.id, t));
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
            });
            showToast(`Sinkronisasi Cloud Aktif: ${res.data.length} transaksi termutakhir dimuat.`, 'info');
          }
        })
        .catch(err => {
          console.warn('Auto-pull error:', err);
        })
        .finally(() => {
          setIsCloudSyncing(false);
        });
    }
  }, [supabaseConfig.url, supabaseConfig.anonKey]);

  // Sinkronisasi otomatis saat beralih tab/perangkat aktif (Focus) atau berkala
  useEffect(() => {
    if (!supabaseConfig.url || !supabaseConfig.anonKey) return;

    const pullBackground = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await pullTransactionsFromSupabase(supabaseConfig);
        if (res.success && res.data) {
          setTransactions(prev => {
            const map = new Map<string, Transaction>();
            prev.forEach(t => map.set(t.id, t));
            res.data!.forEach(t => map.set(t.id, t));
            return Array.from(map.values()).sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
          });
        }
      } catch (e) {
        console.warn('Background sync check failed:', e);
      }
    };

    window.addEventListener('focus', pullBackground);
    const interval = setInterval(pullBackground, 15000); // Polling otomatis tiap 15 detik

    return () => {
      window.removeEventListener('focus', pullBackground);
      clearInterval(interval);
    };
  }, [supabaseConfig.url, supabaseConfig.anonKey]);

  // Tombol Sinkronisasi Cepat Antar-Perangkat
  const handleTriggerCloudSync = async () => {
    if (!isCloudConfigured) {
      setIsDatabaseModalOpen(true);
      return;
    }
    setIsCloudSyncing(true);
    try {
      const pullRes = await pullTransactionsFromSupabase(supabaseConfig);
      if (pullRes.success && pullRes.data) {
        const map = new Map<string, Transaction>();
        transactions.forEach(t => map.set(t.id, t));
        pullRes.data.forEach(t => map.set(t.id, t));
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setTransactions(merged);
        await pushTransactionsToSupabase(supabaseConfig, merged);
        const updatedConfig = { ...supabaseConfig, lastSyncedAt: new Date().toISOString() };
        setSupabaseConfig(updatedConfig);
        localStorage.setItem(SUPABASE_KEY, JSON.stringify(updatedConfig));
        showToast(`Sinkronisasi berhasil! ${merged.length} transaksi termutakhirkan.`, 'success');
      } else {
        showToast(pullRes.message || 'Gagal sinkronisasi data.', 'error');
      }
    } catch (e: any) {
      showToast(`Gagal sinkronisasi: ${e?.message || 'Cek koneksi internet'}`, 'error');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  // Sorted Transactions (Selalu urutkan berdasarkan tanggal terbaru)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const saveTransactionToState = (tx: Omit<Transaction, 'id'>) => {
    const newId = Date.now().toString();
    const transaction: Transaction = {
      ...tx,
      id: newId,
    };
    const updated = [transaction, ...transactions];
    setTransactions(updated);
    syncTransactionsToCloud(updated);
    showToast('Transaksi berhasil disimpan & dicadangkan otomatis!', 'success');
  };

  const handleAddTransaction = (newTx: Omit<Transaction, 'id'>) => {
    // Validasi Hak Akses (RBAC)
    if (userRole !== 'treasurer') {
      showToast('Akses Ditolak: Hanya Bendahara BOSP yang berhak menginput transaksi.', 'error');
      return;
    }

    // Constraint: unique_bku_entry (date, description, amount)
    const isDuplicate = transactions.some(
      t => t.date === newTx.date && 
           t.description.trim().toLowerCase() === newTx.description.trim().toLowerCase() && 
           t.amount === newTx.amount
    );

    if (isDuplicate) {
      // Buka modal in-app yang aman dari pemblokiran iframe sandbox
      setDuplicatePromptTx(newTx);
      return;
    }

    saveTransactionToState(newTx);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    if (userRole !== 'treasurer') {
      showToast('Akses Ditolak: Hanya Bendahara BOSP yang berhak memperbarui transaksi.', 'error');
      return;
    }
    const updated = transactions.map(t => t.id === updatedTx.id ? updatedTx : t);
    setTransactions(updated);
    syncTransactionsToCloud(updated);
    setEditingTransaction(null);
    showToast('Perubahan berhasil disimpan', 'info');
  };

  const handleDeleteTransaction = (id: string) => {
    if (userRole !== 'treasurer') {
      showToast('Akses Ditolak: Hanya Bendahara BOSP yang berhak menghapus transaksi.', 'error');
      return;
    }
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    if (supabaseConfig.url && supabaseConfig.anonKey) {
      deleteTransactionFromSupabase(supabaseConfig, id);
    }
    if (editingTransaction?.id === id) setEditingTransaction(null);
    showToast('Transaksi berhasil dihapus dari BKU', 'success');
  };


  // Handler for Reset All Data
  const handleResetData = () => {
    if (userRole !== 'treasurer') {
      showToast('Akses Ditolak: Hanya Bendahara BOSP yang dapat mereset data.', 'error');
      return;
    }
    setTransactions([]); 
    localStorage.removeItem(STORAGE_KEY);
    setIsResetModalOpen(false);
    setEditingTransaction(null);
    showToast('Database berhasil dikosongkan', 'success');
  };

  // Handler Import Database
  const handleImportDatabase = (
    importedData: Transaction[],
    extraData?: {
      schoolSettings?: SchoolSettings;
      budgetSettings?: BudgetSettings;
      activitySignatures?: Record<string, MonthlySignature>;
      officialSignatures?: Record<string, string>;
      reportDate?: string;
    }
  ) => {
    setTransactions(importedData);
    if (extraData?.schoolSettings) {
      setSchoolSettings(extraData.schoolSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(extraData.schoolSettings));
    }
    if (extraData?.budgetSettings) {
      setBudgetSettings(extraData.budgetSettings);
      localStorage.setItem(BUDGET_KEY, JSON.stringify(extraData.budgetSettings));
    }
    if (extraData?.activitySignatures) {
      localStorage.setItem('arkas_activity_signatures', JSON.stringify(extraData.activitySignatures));
      localStorage.setItem('arkas_monthly_signatures', JSON.stringify(extraData.activitySignatures));
    }
    if (extraData?.officialSignatures) {
      localStorage.setItem('arkas_official_signatures', JSON.stringify(extraData.officialSignatures));
    }
    if (extraData?.reportDate) {
      localStorage.setItem('arkas_report_date', extraData.reportDate);
    }
    setIsDatabaseModalOpen(false);
  };

  const handleExportCSV = (customTransactions?: Transaction[], customLabel?: string) => {
    const listToExport = customTransactions || sortedTransactions;
    const headers = ['ID', 'Tanggal', 'Tipe', 'Kategori', 'Uraian', 'Penerima', 'Nominal', 'Sumber Dana'];
    const rows = listToExport.map(t => [
      t.id,
      t.date,
      t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      `"${(t.recipient || '-').replace(/"/g, '""')}"`,
      t.amount,
      t.source || 'BOS Reguler'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const label = customLabel ? `_${customLabel.replace(/\s+/g, '_')}` : '';
    // Tambahkan \uFEFF (UTF-8 BOM) agar Microsoft Excel membaca karakter Indonesia dan encoding dengan benar
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Laporan_Keuangan_ARKAS${label}_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Laporan Excel ${customLabel ? customLabel.replace(/_/g, ' ') : 'BKU'} berhasil diunduh!`, 'success');
  };

  // Filter transaksi berdasarkan tahap periode:
  // Tahap 1: Bulan 1-6 (Januari - Juni)
  // Tahap 2: Bulan 7-12 (Juli - Desember)
  // All: Seluruh tahun
  const phaseTransactions = useMemo(() => {
    return transactions.filter(t => {
      const parts = (t.date || '').split('-');
      if (parts.length < 2) return selectedPhase === 'all';
      
      const tYear = parts[0];
      const month = parseInt(parts[1], 10);

      // Jika tahun buku disetel, pastikan transaksi sesuai dengan tahun anggaran aktif
      if (schoolSettings.fiscalYear && tYear && tYear !== schoolSettings.fiscalYear) {
        return false;
      }

      if (selectedPhase === 'phase1') return month >= 1 && month <= 6;
      if (selectedPhase === 'phase2') return month >= 7 && month <= 12;
      return true;
    });
  }, [transactions, selectedPhase, schoolSettings.fiscalYear]);

  // Pagu untuk tahap yang aktif
  const phaseBudget = useMemo(() => {
    if (selectedPhase === 'phase1') return budgetSettings.phase1Budget || 0;
    if (selectedPhase === 'phase2') return budgetSettings.phase2Budget || 0;
    return (budgetSettings.phase1Budget || 0) + (budgetSettings.phase2Budget || 0);
  }, [selectedPhase, budgetSettings]);

  // Realisasi pada tahap yang aktif
  const { phaseIncome, phaseExpense, phaseBalance, phaseExpenseByCategory } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    const catMap: Record<string, number> = {};

    phaseTransactions.forEach(t => {
      if (t.type === 'income') {
        inc += t.amount;
      } else {
        exp += t.amount;
      }
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    return {
      phaseIncome: inc,
      phaseExpense: exp,
      phaseBalance: inc - exp,
      phaseExpenseByCategory: catMap
    };
  }, [phaseTransactions]);

  // Total keseluruhan transaksi (sepanjang tahun) untuk buku kas umum
  const { totalIncome, totalExpense, balance, expenseByCategory } = useMemo(() => {
    let income = 0;
    let expense = 0;
    const catMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expense += t.amount;
      }
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    return {
      totalIncome: income,
      totalExpense: expense,
      balance: income - expense,
      expenseByCategory: catMap
    };
  }, [transactions]);

  const handleOpenReceipt = (tx: Transaction, sig?: MonthlySignature) => {
    setCurrentReceiptData(tx);
    let signatureToUse = sig || null;
    if (!signatureToUse) {
      try {
        const saved = localStorage.getItem('arkas_activity_signatures') || localStorage.getItem('arkas_monthly_signatures');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed[tx.id]) signatureToUse = parsed[tx.id];
        }
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentReceiptSignature(signatureToUse);
    setIsReceiptModalOpen(true);
  };

  return (
    <div className="min-h-screen fintech-bg font-sans text-slate-100 pb-12 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Toast Notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      {/* Header Dark Fintech */}
      <header className="bg-[#0B111B]/95 backdrop-blur-md text-white sticky top-0 z-50 border-b border-cyan-500/15 print:hidden shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-cyan-500/20 border border-cyan-400/40 shrink-0">
              A
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg sm:text-xl tracking-tight leading-none text-white">
                  ARKAS <span className="text-cyan-400 font-light">Lite</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-indicator"></span>
                  FINTECH BKU
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium truncate max-w-[140px] sm:max-w-xs">{schoolSettings.schoolName}</p>
                {lastSaved && (
                  <span className="text-[10px] bg-[#101621] px-2 py-0.5 rounded-full text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Tersimpan
                  </span>
                )}
                {isCloudConfigured ? (
                  <button
                    type="button"
                    onClick={handleTriggerCloudSync}
                    disabled={isCloudSyncing}
                    className="text-[10px] bg-[#101621] hover:bg-[#151C28] px-2.5 py-0.5 rounded-full text-cyan-300 border border-cyan-500/40 flex items-center gap-1 font-medium cursor-pointer transition-all"
                    title="Cloud Sync Aktif: Data otomatis disinkronkan ke seluruh perangkat. Klik untuk sinkron sekarang."
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isCloudSyncing ? 'bg-amber-400 animate-pulse' : 'bg-cyan-400'}`}></span>
                    <span>{isCloudSyncing ? 'Sinkron...' : 'Cloud Aktif'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsDatabaseModalOpen(true)}
                    className="text-[10px] bg-[#101621] hover:bg-slate-800 px-2 py-0.5 rounded-full text-slate-400 hover:text-cyan-300 border border-slate-700/80 flex items-center gap-1 cursor-pointer transition-all"
                    title="Mode Lokal/Offline. Klik untuk menyambungkan Cloud Supabase gratis agar data otomatis sinkron ke HP/perangkat lain."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <span className="hidden sm:inline">Lokal</span>
                    <span className="text-cyan-400 font-bold">&bull; Auto-Sync?</span>
                  </button>
                )}
              </div>

            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 md:gap-2.5">
            {/* RBAC Role Switcher */}
            <div className="flex items-center bg-[#101621] border border-cyan-500/20 rounded-xl p-1 gap-1 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-cyan-400 px-1.5 hidden sm:inline tracking-wider">Peran:</span>
              <select
                value={userRole}
                onChange={(e) => handleRoleSelectChange(e.target.value as UserRole)}
                className={`text-xs font-semibold rounded-lg px-2.5 py-1 outline-none cursor-pointer transition-all ${
                  userRole === 'treasurer'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : userRole === 'headmaster'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
                title="Ganti Peran Pengguna (Role-Based Access Control)"
              >
                <option value="treasurer" className="bg-[#101621] text-emerald-400">
                  {userRole === 'treasurer' ? 'Bendahara (Aktif)' : 'Bendahara (Kunci Password)'}
                </option>
                <option value="headmaster" className="bg-[#101621] text-amber-300">Kepala Sekolah (Read-Only)</option>
                <option value="committee" className="bg-[#101621] text-blue-300">Komite Sekolah (Read-Only)</option>
              </select>

              {userRole === 'treasurer' ? (
                <button
                  type="button"
                  onClick={() => {
                    setUserRole('headmaster');
                    sessionStorage.removeItem('arkas_treasurer_auth');
                    showToast('Akses Bendahara berhasil dikunci. Beralih ke peran Kepala Sekolah.', 'info');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 hover:text-white rounded-lg text-[11px] font-medium transition-all cursor-pointer border border-emerald-500/40"
                  title="Kunci Akses Bendahara (Beralih ke Kepala Sekolah)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span className="hidden sm:inline">Kunci</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsTreasurerAuthModalOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#151C28] hover:bg-cyan-950 text-cyan-300 hover:text-white rounded-lg text-[11px] font-medium transition-all cursor-pointer border border-cyan-500/30"
                  title="Buka Akses Bendahara (Memerlukan Kata Sandi)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span className="hidden sm:inline">Buka</span>
                </button>
              )}
            </div>

            {/* Tombol Database */}
            <button
              onClick={() => setIsDatabaseModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#101621] hover:bg-[#151C28] rounded-xl text-xs md:text-sm font-medium transition-all border border-cyan-500/20 text-slate-200 hover:text-white hover:border-cyan-500/40 shadow-sm cursor-pointer"
              title="Kelola Database, Supabase & Skema SQL"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
              <span className="hidden md:inline">Database</span>
            </button>

            {userRole === 'treasurer' && (
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="flex items-center justify-center p-2 bg-rose-950/60 hover:bg-rose-900 rounded-xl text-rose-300 hover:text-rose-100 transition-all border border-rose-500/30 cursor-pointer"
                title="Reset Semua Data Transaksi"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            )}

            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>

            <button 
              onClick={() => setIsBalanceSheetOpen(true)}
              className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-[#101621] hover:bg-[#151C28] text-slate-200 hover:text-white rounded-xl text-xs md:text-sm font-medium transition-all border border-cyan-500/20 hover:border-cyan-500/40 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V21"/><path d="M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
              Neraca & Laporan
            </button>

            <div className="hidden lg:flex flex-col items-end mr-2 border-l border-slate-800 pl-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Saldo Kas BKU</span>
              <span className="font-bold font-mono text-[#00E6A7] text-sm tracking-tight">
                {formatRupiah(balance)}
              </span>
            </div>

            <button onClick={() => window.print()} className="p-2 bg-[#101621] rounded-xl hover:bg-[#151C28] transition-all text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 cursor-pointer" title="Cetak Halaman">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="1"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            </button>
          </div>
        </div>
      </header>

      {/* Role Banner if not treasurer */}
      {userRole !== 'treasurer' && (
        <div className="bg-[#121620] border-b border-amber-500/25 text-amber-200 text-xs px-4 py-2 text-center flex flex-wrap items-center justify-center gap-2 print:hidden shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span>
              Mode <strong>{userRole === 'headmaster' ? 'Kepala Sekolah' : 'Komite Sekolah'} (Read-Only)</strong>: {userRole === 'headmaster' ? 'Akses penanggung jawab & verifikasi serapan anggaran, kuitansi belanja, serta pengesahan BKU.' : 'Akses pengawasan transparansi kas dan realisasi program sekolah bagi komite/wali murid.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsTreasurerAuthModalOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-white rounded-lg text-[11px] font-bold transition-colors cursor-pointer border border-amber-500/40"
            title="Masukkan kata sandi otorisasi untuk membuka akses Bendahara"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Masuk Peran Bendahara
          </button>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 print:hidden">
        <SummaryCards 
          totalIncome={phaseIncome} 
          totalExpense={phaseExpense} 
          balance={phaseBalance} 
          overallBalance={balance}
          phaseBudget={phaseBudget}
          selectedPhase={selectedPhase}
          onSelectPhase={setSelectedPhase}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
          userRole={userRole}
        />
        
        {/* Mobile Button for Neraca */}
        <div className="md:hidden grid grid-cols-2 gap-4">
          <button 
            onClick={() => setIsBalanceSheetOpen(true)}
            className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-[#101621] text-cyan-300 shadow-md rounded-xl font-bold border border-cyan-500/25"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V21"/><path d="M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
            Neraca & Laporan
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Form & Charts (4/12) */}
          <div className="lg:col-span-4 space-y-6 lg:space-y-8">
            <TransactionForm 
              onAddTransaction={handleAddTransaction} 
              onUpdateTransaction={handleUpdateTransaction}
              editingTransaction={editingTransaction}
              onCancelEdit={() => setEditingTransaction(null)}
              userRole={userRole}
              onUnlockTreasurer={() => setIsTreasurerAuthModalOpen(true)}
            />
            <ExpenseChart 
              expenseByCategory={selectedPhase === 'all' ? expenseByCategory : phaseExpenseByCategory} 
              totalExpense={selectedPhase === 'all' ? totalExpense : phaseExpense} 
            />
          </div>

          {/* Right Column: Transaction History (8/12) */}
          <div className="lg:col-span-8 min-h-[500px]">
            <TransactionList 
              transactions={sortedTransactions} 
              onDelete={handleDeleteTransaction} 
              onEdit={setEditingTransaction}
              onExport={handleExportCSV}
              onPrintReceipt={handleOpenReceipt}
              userRole={userRole}
            />
          </div>
        </div>
      </main>

      <footer className="mt-16 py-8 text-center text-slate-500 text-sm border-t border-slate-800/80 bg-[#0B111B]/60 print:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 pulse-indicator"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Sistem Keuangan BKU Berjalan Normal</span>
          </div>
          <p className="font-medium text-slate-400">{schoolSettings.schoolName} &bull; ARKAS Lite &copy; {schoolSettings.fiscalYear}</p>
          <p className="mt-1 text-xs text-slate-500">Membantu Tata Kelola Dana BOSP dengan Transparansi & Akuntabilitas Standar Kemendikbudristek</p>
        </div>
      </footer>

      {/* MODALS */}
      <BalanceSheetModal 
        isOpen={isBalanceSheetOpen} 
        onClose={() => setIsBalanceSheetOpen(false)}
        transactions={sortedTransactions}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={balance}
        schoolSettings={schoolSettings}
        onUpdateSchoolSettings={setSchoolSettings}
        onShowToast={showToast}
        onOpenReceipt={handleOpenReceipt}
      />

      <ResetModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetData}
      />

      <DatabaseModal 
        isOpen={isDatabaseModalOpen} 
        onClose={() => setIsDatabaseModalOpen(false)}
        transactions={transactions}
        onImport={handleImportDatabase}
        schoolSettings={schoolSettings}
        onUpdateSchoolSettings={setSchoolSettings}
        budgetSettings={budgetSettings}
        onUpdateBudgetSettings={setBudgetSettings}
        supabaseConfig={supabaseConfig}
        onUpdateSupabaseConfig={setSupabaseConfig}
        onShowToast={showToast}
      />

      <ReceiptModal 
        isOpen={isReceiptModalOpen}
        onClose={() => {
          setIsReceiptModalOpen(false);
          setCurrentReceiptSignature(null);
          setCurrentReceiptData(null);
        }}
        transaction={currentReceiptData}
        signature={currentReceiptSignature}
        schoolSettings={schoolSettings}
      />

      <BudgetModal 
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        budgetSettings={budgetSettings}
        onSave={(newSettings) => {
          setBudgetSettings(newSettings);
          showToast('Pagu Anggaran BOS berhasil diperbarui!', 'success');
        }}
        userRole={userRole}
      />

      {/* Modal Otentikasi Password Bendahara (admin123) */}
      <TreasurerAuthModal 
        isOpen={isTreasurerAuthModalOpen}
        onClose={() => setIsTreasurerAuthModalOpen(false)}
        onSuccess={handleTreasurerAuthSuccess}
      />

      {/* Modal Peringatan Duplikasi Transaksi In-App (Bebas dari iframe sandbox) */}
      {duplicatePromptTx && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#101621] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-500/30 text-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl shrink-0 border border-amber-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">Perhatian Integritas BKU</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Transaksi dengan tanggal, uraian, dan nominal yang sama persis terdeteksi sudah tercatat sebelumnya:
                </p>
                <div className="mt-2.5 p-3 bg-[#151C28] border border-amber-500/20 rounded-xl text-xs space-y-1">
                  <div className="text-slate-200 font-semibold">{duplicatePromptTx.description}</div>
                  <div className="text-slate-400 flex justify-between">
                    <span>Tgl: {duplicatePromptTx.date}</span>
                    <span className="font-bold text-amber-400 font-mono">{formatRupiah(duplicatePromptTx.amount)}</span>
                  </div>
                </div>
                <p className="text-xs text-amber-300 font-medium mt-2">
                  Apakah Anda yakin ingin tetap menyimpan entri transaksi ini ke BKU?
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDuplicatePromptTx(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const tx = duplicatePromptTx;
                  setDuplicatePromptTx(null);
                  if (tx) saveTransactionToState(tx);
                }}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-all shadow-md cursor-pointer"
              >
                Tetap Simpan Transaksi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
