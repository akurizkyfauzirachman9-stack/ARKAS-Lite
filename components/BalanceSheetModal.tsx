import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Transaction, SchoolSettings, DEFAULT_SCHOOL_SETTINGS, MonthlySignature } from '../types';
import { formatRupiah } from '../utils';
import SignaturePadModal from './SignaturePadModal';

interface BalanceSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  schoolSettings?: SchoolSettings;
  onUpdateSchoolSettings?: (settings: SchoolSettings) => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenReceipt?: (tx: Transaction, signature?: MonthlySignature) => void;
}

const SIGNATURES_STORAGE_KEY = 'arkas_monthly_signatures';

// Simulasi Kode Akun Standar (Bagan Akun Standar)
const getAccountCode = (category: string, type: 'income' | 'expense'): string => {
  const codes: Record<string, string> = {
    // Pendapatan (4.x.x)
    'BOS Reguler': '4.1.01',
    'BOS Kinerja': '4.1.02',
    'BOS Afirmasi': '4.1.03',
    'Dana Komite': '4.2.01',
    'Lain-lain': '4.3.99',
    // Belanja (5.x.x)
    'Standar Kelulusan': '5.1.01',
    'Standar Isi': '5.1.02',
    'Standar Proses': '5.1.03',
    'Standar Penilaian': '5.1.04',
    'Standar Pendidik & Tenaga Kependidikan': '5.1.05',
    'Standar Sarana & Prasarana': '5.1.06',
    'Standar Pengelolaan': '5.1.07',
    'Standar Pembiayaan': '5.1.08',
    'Pembayaran Utang': '5.1.09',
  };
  return codes[category] || (type === 'income' ? '4.0.00' : '5.0.00');
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const BalanceSheetModal: React.FC<BalanceSheetModalProps> = ({ 
  isOpen, 
  onClose, 
  transactions, 
  totalIncome, 
  totalExpense, 
  balance,
  schoolSettings = DEFAULT_SCHOOL_SETTINGS,
  onUpdateSchoolSettings,
  onShowToast,
  onOpenReceipt
}) => {
  // State untuk penyimpanan tanda tangan touchscreen per kegiatan (berdasarkan ID transaksi)
  const [activitySignatures, setActivitySignatures] = useState<Record<string, MonthlySignature>>(() => {
    try {
      const saved = localStorage.getItem('arkas_activity_signatures');
      if (saved) return JSON.parse(saved);
      const old = localStorage.getItem(SIGNATURES_STORAGE_KEY);
      return old ? JSON.parse(old) : {};
    } catch {
      return {};
    }
  });

  // State tanda tangan digital pejabat BOSP (Kepala Sekolah, Komite, Bendahara)
  const [officialSignatures, setOfficialSignatures] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('arkas_official_signatures');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // State tanggal penetapan / pengesahan laporan
  const [reportDate, setReportDate] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('arkas_report_date');
      if (saved) return saved;
      return '10 September 2026';
    } catch {
      return '10 September 2026';
    }
  });

  // State Modal Edit Pejabat Pengesahan
  const [isEditOfficialsOpen, setIsEditOfficialsOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    headmasterName: schoolSettings.headmasterName,
    headmasterNip: schoolSettings.headmasterNip,
    committeeName: schoolSettings.committeeName,
    treasurerName: schoolSettings.treasurerName,
    treasurerNip: schoolSettings.treasurerNip,
    city: schoolSettings.city || 'Tasikmalaya',
    reportDate: '10 September 2026',
  });

  // Sinkronisasi data form saat schoolSettings atau reportDate berubah
  useEffect(() => {
    setEditFormData({
      headmasterName: schoolSettings.headmasterName,
      headmasterNip: schoolSettings.headmasterNip,
      committeeName: schoolSettings.committeeName,
      treasurerName: schoolSettings.treasurerName,
      treasurerNip: schoolSettings.treasurerNip,
      city: schoolSettings.city || 'Tasikmalaya',
      reportDate: reportDate,
    });
  }, [schoolSettings, reportDate]);

  // Sinkronisasi data tanda tangan & tanggal saat modal dibuka (memastikan data hasil impor langsung aktif)
  useEffect(() => {
    if (isOpen) {
      try {
        const savedAct = localStorage.getItem('arkas_activity_signatures') || localStorage.getItem(SIGNATURES_STORAGE_KEY);
        if (savedAct) setActivitySignatures(JSON.parse(savedAct));
        const savedOff = localStorage.getItem('arkas_official_signatures');
        if (savedOff) setOfficialSignatures(JSON.parse(savedOff));
        const savedDate = localStorage.getItem('arkas_report_date');
        if (savedDate) setReportDate(savedDate);
      } catch (e) {
        console.error('Failed to sync signatures from localStorage', e);
      }
    }
  }, [isOpen]);

  // State untuk modal tanda tangan touchscreen aktif
  const [activeSignModal, setActiveSignModal] = useState<{
    id: string; // transaction id or official key
    title: string;
    recipientName: string;
    initialSignature?: string;
    isOfficial?: boolean;
    officialRole?: 'headmaster' | 'committee' | 'treasurer';
  } | null>(null);

  // Filter tampilan rekapitulasi kegiatan
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'expense' | 'income'>('all');

  // Loading state untuk export PDF dan cetak
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Auto-save activity signatures to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('arkas_activity_signatures', JSON.stringify(activitySignatures));
    } catch (e) {
      console.error('Failed to save activity signatures', e);
    }
  }, [activitySignatures]);

  // Daftar opsi bulan yang tersedia dari transaksi
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    transactions.forEach(tx => {
      const [year, monthNum] = tx.date.split('-');
      const key = `${year}-${monthNum}`;
      const mIndex = parseInt(monthNum, 10) - 1;
      const label = `${MONTH_NAMES[mIndex] || monthNum} ${year}`;
      map.set(key, label);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [transactions]);

  // 1. Group Data untuk Laporan Realisasi (Debit/Kredit)
  const incomeDetails = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  const expenseDetails = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions]);

  // 2. Data Kegiatan / Transaksi Lengkap dengan Saldo Berjalan dan Pengelompokan Bulan
  const activityData = useMemo(() => {
    // Urutkan transaksi secara kronologis
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let runningBalance = 0;
    const allActivities = sorted.map((tx, idx) => {
      if (tx.type === 'income') {
        runningBalance += tx.amount;
      } else {
        runningBalance -= tx.amount;
      }

      const [year, monthNum] = tx.date.split('-');
      const monthKey = `${year}-${monthNum}`;
      const mIndex = parseInt(monthNum, 10) - 1;

      return {
        ...tx,
        rowNumber: idx + 1,
        monthKey,
        monthName: MONTH_NAMES[mIndex] || monthNum,
        year,
        monthLabel: `${MONTH_NAMES[mIndex] || monthNum} ${year}`,
        runningBalance,
      };
    });

    // Terapkan filter bulan dan tipe jika dipilih
    const filtered = allActivities.filter(item => {
      const matchMonth = selectedMonthFilter === 'all' || item.monthKey === selectedMonthFilter;
      const matchType = selectedTypeFilter === 'all' || item.type === selectedTypeFilter;
      return matchMonth && matchType;
    });

    // Kelompokkan per bulan untuk tabel rekapitulasi berjenjang
    const groups: Record<string, {
      monthKey: string;
      monthLabel: string;
      items: typeof filtered;
      incomeSubtotal: number;
      expenseSubtotal: number;
    }> = {};

    filtered.forEach(item => {
      if (!groups[item.monthKey]) {
        groups[item.monthKey] = {
          monthKey: item.monthKey,
          monthLabel: item.monthLabel,
          items: [],
          incomeSubtotal: 0,
          expenseSubtotal: 0,
        };
      }
      groups[item.monthKey].items.push(item);
      if (item.type === 'income') {
        groups[item.monthKey].incomeSubtotal += item.amount;
      } else {
        groups[item.monthKey].expenseSubtotal += item.amount;
      }
    });

    return {
      allActivities,
      filteredActivities: filtered,
      groupedByMonth: Object.values(groups),
      totalFilteredIncome: filtered.filter(f => f.type === 'income').reduce((acc, c) => acc + c.amount, 0),
      totalFilteredExpense: filtered.filter(f => f.type === 'expense').reduce((acc, c) => acc + c.amount, 0),
    };
  }, [transactions, selectedMonthFilter, selectedTypeFilter]);

  const handleSaveSignature = (
    id: string, 
    recipientName: string, 
    signatureDataUrl: string, 
    isOfficial?: boolean, 
    officialRole?: 'headmaster' | 'committee' | 'treasurer'
  ) => {
    if (isOfficial && officialRole) {
      setOfficialSignatures(prev => {
        const updated = { ...prev, [officialRole]: signatureDataUrl };
        try {
          localStorage.setItem('arkas_official_signatures', JSON.stringify(updated));
        } catch (e) {
          console.error('Gagal menyimpan tanda tangan pejabat:', e);
        }
        return updated;
      });
      if (onShowToast) {
        onShowToast(`Tanda tangan ${recipientName} berhasil dibubuhkan pada dokumen pengesahan.`, 'success');
      }
    } else {
      setActivitySignatures(prev => ({
        ...prev,
        [id]: {
          recipientName,
          signatureDataUrl,
          signedAt: new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }),
        }
      }));
    }
  };

  const openOfficialSignModal = (role: 'headmaster' | 'committee' | 'treasurer', name: string, title: string) => {
    setActiveSignModal({
      id: `official_${role}`,
      title: `Pengesahan: ${title}`,
      recipientName: name,
      initialSignature: officialSignatures[role],
      isOfficial: true,
      officialRole: role
    });
  };

  const clearOfficialSignature = (role: 'headmaster' | 'committee' | 'treasurer', title: string) => {
    if (window.confirm(`Hapus tanda tangan digital ${title}?`)) {
      setOfficialSignatures(prev => {
        const updated = { ...prev };
        delete updated[role];
        try {
          localStorage.setItem('arkas_official_signatures', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
      if (onShowToast) {
        onShowToast(`Tanda tangan ${title} berhasil dihapus.`, 'info');
      }
    }
  };

  const handleSaveOfficialForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSchoolSettings) {
      onUpdateSchoolSettings({
        ...schoolSettings,
        headmasterName: editFormData.headmasterName,
        headmasterNip: editFormData.headmasterNip,
        committeeName: editFormData.committeeName,
        treasurerName: editFormData.treasurerName,
        treasurerNip: editFormData.treasurerNip,
        city: editFormData.city,
      });
    }
    setReportDate(editFormData.reportDate);
    try {
      localStorage.setItem('arkas_report_date', editFormData.reportDate);
    } catch (err) {
      console.error(err);
    }
    setIsEditOfficialsOpen(false);
    if (onShowToast) {
      onShowToast('Data Pejabat Pengesahan berhasil diperbarui!', 'success');
    }
  };

  const handleScrollToSignatures = () => {
    const el = document.getElementById('lembar-pengesahan-bosp');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRemoveSignature = (id: string) => {
    if (window.confirm('Hapus tanda tangan penerima untuk kegiatan ini?')) {
      setActivitySignatures(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    }
  };

  // Handler Ekspor Dokumen Laporan Lengkap ke File PDF (A4 Multi-halaman)
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    try {
      const element = document.getElementById('balance-sheet-printable');
      if (!element) {
        if (onShowToast) onShowToast("Elemen laporan tidak ditemukan.", "error");
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        windowWidth: 1100,
        onclone: (clonedDoc) => {
          const cloned = clonedDoc.getElementById('balance-sheet-printable');
          if (cloned) {
            cloned.style.maxWidth = '1000px';
            cloned.style.width = '1000px';
            cloned.style.margin = '0 auto';
            cloned.style.padding = '24px';
            
            // Sembunyikan elemen tombol interaktif yang tidak perlu dicetak
            const noPrints = cloned.querySelectorAll('.no-print');
            noPrints.forEach(el => ((el as HTMLElement).style.display = 'none'));
            
            // Tampilkan elemen khusus cetak
            const printOnlys = cloned.querySelectorAll('.print-only');
            printOnlys.forEach(el => ((el as HTMLElement).style.display = 'block'));
          }
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const contentWidth = pageWidth - (margin * 2); // 190mm
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = contentHeight;
      let position = margin;

      // Halaman pertama
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pageHeight - (margin * 2));

      // Halaman berikutnya jika laporan melebihi 1 halaman A4
      while (heightLeft > 0) {
        position -= (pageHeight - (margin * 2));
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
        heightLeft -= (pageHeight - (margin * 2));
      }

      pdf.save(`Laporan-SPJ-BOSP-${schoolSettings.fiscalYear}-${schoolSettings.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    } catch (err) {
      console.error("Gagal mengekspor PDF laporan:", err);
      if (onShowToast) {
        onShowToast("Gagal membuat file PDF laporan. Silakan coba gunakan tombol Cetak Langsung.", "error");
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handler Cetak Dokumen Langsung ke Printer Fisik (dengan dukungan iframe terisolasi)
  const handlePrint = () => {
    const element = document.getElementById('balance-sheet-printable');
    if (!element) {
      window.print();
      return;
    }

    setIsPrinting(true);

    try {
      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('style', 'position:fixed;width:0px;height:0px;left:-9999px;top:-9999px;border:none;');
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        setIsPrinting(false);
        return;
      }

      let activeStyles = '';
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(tag => {
        activeStyles += tag.outerHTML + '\n';
      });

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html lang="id">
          <head>
            <meta charset="UTF-8" />
            <title>Laporan_Pertanggungjawaban_BOSP_${schoolSettings.fiscalYear}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <script src="https://cdn.tailwindcss.com"></script>
            ${activeStyles}
            <style>
              @page {
                size: A4 portrait;
                margin: 12mm 15mm;
              }
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              }
              .no-print {
                display: none !important;
              }
              .print-only {
                display: block !important;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body class="bg-white p-4">
            <div class="max-w-5xl mx-auto">
              ${element.outerHTML}
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          console.warn("Iframe print terhalang, beralih ke window.print():", err);
          window.print();
        } finally {
          setIsPrinting(false);
          setTimeout(() => {
            if (document.body.contains(printIframe)) {
              document.body.removeChild(printIframe);
            }
          }, 2000);
        }
      }, 500);

    } catch (error) {
      console.error("Gagal mencetak dokumen:", error);
      setIsPrinting(false);
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:static print:p-0 print:bg-white print:z-auto">
      <div className="bg-[#0B111B] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto border border-cyan-500/30 flex flex-col print:max-h-none print:shadow-none print:border-none print:max-w-none print:bg-white print:overflow-visible text-slate-100">
        
        {/* Header Modal (Toolbar) - Disembunyikan saat dicetak */}
        <div className="p-3 sm:p-4 border-b border-slate-800 flex flex-wrap justify-between items-center bg-[#101621] sticky top-0 z-10 shadow-lg rounded-t-2xl no-print gap-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
             </div>
             <div>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-white leading-tight">Neraca & Laporan Pertanggungjawaban BOSP</h2>
                <p className="text-[11px] sm:text-xs text-slate-400">Format Resmi Standar Akuntansi & Pembukuan Kas Sekolah</p>
             </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Tombol Ekspor PDF Asli */}
            <button 
                onClick={handleExportPdf}
                disabled={isExportingPdf || isPrinting}
                className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shadow-md shadow-rose-950/40 disabled:opacity-50 cursor-pointer"
                title="Unduh laporan lengkap sebagai dokumen PDF resmi (A4 Multi-halaman)"
            >
                {isExportingPdf ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Membuat PDF...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    <span>Ekspor PDF</span>
                  </>
                )}
            </button>

            {/* Tombol Cetak Dokumen Fisik */}
            <button 
                onClick={handlePrint}
                disabled={isExportingPdf || isPrinting}
                className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 sm:gap-2 shadow-md shadow-cyan-950/40 disabled:opacity-50 cursor-pointer"
                title="Cetak langsung menggunakan printer fisik"
            >
                {isPrinting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Menyiapkan...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                    <span>Cetak</span>
                  </>
                )}
            </button>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-white cursor-pointer"
              title="Tutup Modal"
              disabled={isExportingPdf || isPrinting}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* BANNER INFORMASI PEJABAT PENGESAHAN & NAVIGASI CEPAT (Disembunyikan saat dicetak) */}
        <div className="bg-[#121927] border-b border-cyan-500/20 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs no-print">
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-slate-300">
            <div className="flex items-center gap-1.5 bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-lg font-bold text-[11px]">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>Pejabat Pengesahan</span>
            </div>

            {/* Chip Kepala Sekolah */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400">Kepala Sekolah:</span>
              <span className="font-bold text-white tracking-wide">{schoolSettings.headmasterName}</span>
              {schoolSettings.headmasterNip && (
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({schoolSettings.headmasterNip})</span>
              )}
            </div>

            {/* Chip Komite Sekolah */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400">Komite:</span>
              <span className="font-bold text-white tracking-wide">{schoolSettings.committeeName || 'Ustz. Encep Al Gipari'}</span>
            </div>

            {/* Chip Bendahara BOSP */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/60 px-2.5 py-1 rounded-lg">
              <span className="text-slate-400">Bendahara:</span>
              <span className="font-bold text-white tracking-wide">{schoolSettings.treasurerName}</span>
              <span className="text-cyan-400 font-medium hidden md:inline">&bull; {schoolSettings.city || 'Tasikmalaya'}</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScrollToSignatures}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Gulir langsung ke Lembar Pengesahan dan Tanda Tangan"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              <span>Lembar Pengesahan</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditOfficialsOpen(true)}
              className="px-2.5 py-1 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-200 hover:text-white border border-cyan-400/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Ubah nama pejabat, NIP, tanggal, dan kota"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Ubah Pejabat</span>
            </button>
          </div>
        </div>

        {/* CONTENT AREA (PRINTABLE) */}
        <div id="balance-sheet-printable" className="p-6 md:p-10 space-y-8 bg-white min-h-[850px] text-gray-800">
            
            {/* KOP LAPORAN RESMI */}
            <div className="text-center border-b-2 border-double border-gray-900 pb-5 mb-6">
                <h1 className="text-xs md:text-sm font-bold uppercase tracking-widest text-gray-600">
                  PEMERINTAH {schoolSettings.city ? `KOTA/KABUPATEN ${schoolSettings.city.toUpperCase()}` : 'DAERAH'} &bull; DINAS PENDIDIKAN
                </h1>
                <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-wide uppercase mt-1">
                  {schoolSettings.schoolName}
                </h2>
                <p className="text-xs font-medium text-gray-600 mt-1">
                  NPSN: {schoolSettings.npsn} | Alamat: {schoolSettings.address} {schoolSettings.city ? `- ${schoolSettings.city}` : ''} ({schoolSettings.province})
                </p>
                <div className="mt-3 inline-block px-4 py-1 bg-slate-100 rounded border border-slate-200">
                  <p className="text-xs md:text-sm font-bold text-indigo-950 uppercase tracking-wide">
                    Laporan Posisi Keuangan, BKU & Rekapitulasi Realisasi Bulanan
                  </p>
                  <p className="text-[11px] text-gray-500 italic">
                    Tahun Anggaran {schoolSettings.fiscalYear} &bull; {schoolSettings.bosPeriod}
                  </p>
                </div>
            </div>

            {/* I. LAPORAN POSISI KEUANGAN (NERACA) - DIOPTIMALKAN & SEIMBANG */}
            <div>
                <div className="bg-gray-800 text-white px-4 py-2.5 rounded-t-lg font-bold tracking-wider uppercase text-xs md:text-sm flex justify-between items-center">
                    <span>I. Laporan Posisi Keuangan (Neraca Saldo Kas)</span>
                    <span className="text-[11px] font-normal text-gray-300">Format Akuntansi Standar BOSP</span>
                </div>

                <div className="border border-t-0 border-gray-300 rounded-b-lg overflow-hidden bg-white shadow-sm">
                    {/* T-ACCOUNT LAYOUT (AKTIVA VS PASIVA) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                        {/* SISI KIRI: AKTIVA (ASET) */}
                        <div className="flex flex-col">
                            <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-gray-700 uppercase border-b border-gray-200 flex justify-between">
                                <span>Aktiva (Aset Lancar)</span>
                                <span className="font-mono text-gray-500">KODE REKENING</span>
                            </div>
                            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center text-xs md:text-sm">
                                        <div>
                                            <span className="font-mono text-[11px] text-gray-400 mr-2">1.1.01</span>
                                            <span className="text-gray-800 font-medium">Kas Tunai di Bendahara BOSP</span>
                                        </div>
                                        <span className="font-mono font-bold text-gray-900">{formatRupiah(balance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                                        <div>
                                            <span className="font-mono text-[11px] text-gray-400 mr-2">1.1.02</span>
                                            <span>Rekening Bank Penampung BOS</span>
                                        </div>
                                        <span className="font-mono text-gray-400">Rp 0</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                                        <div>
                                            <span className="font-mono text-[11px] text-gray-400 mr-2">1.1.03</span>
                                            <span>Piutang / Kas Titipan</span>
                                        </div>
                                        <span className="font-mono text-gray-400">Rp 0</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                                        <span className="font-bold text-gray-900 text-xs md:text-sm uppercase">Total Aktiva</span>
                                        <span className="font-bold font-mono text-indigo-700 border-b-2 border-double border-indigo-700 text-sm md:text-base">
                                            {formatRupiah(balance)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SISI KANAN: PASIVA (KEWAJIBAN & EKUITAS) */}
                        <div className="flex flex-col">
                            <div className="bg-slate-100 px-4 py-2 text-xs font-bold text-gray-700 uppercase border-b border-gray-200 flex justify-between">
                                <span>Pasiva (Kewajiban & Ekuitas)</span>
                                <span className="font-mono text-gray-500">KODE REKENING</span>
                            </div>
                            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                                        <div>
                                            <span className="font-mono text-[11px] text-gray-400 mr-2">2.1.01</span>
                                            <span>Utang Belanja / Rekanan Belum Bayar</span>
                                        </div>
                                        <span className="font-mono text-gray-400">Rp 0</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-500">
                                        <div>
                                            <span className="font-mono text-[11px] text-gray-400 mr-2">2.1.02</span>
                                            <span>Utang Pajak PPh / PPN Belum Setor</span>
                                        </div>
                                        <span className="font-mono text-gray-400">Rp 0</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs md:text-sm">
                                        <div>
                                            <span className="font-mono text-[11px] text-gray-400 mr-2">3.1.01</span>
                                            <span className="text-gray-800 font-medium">Ekuitas Dana Lancar (SiLPA Kas BKU)</span>
                                        </div>
                                        <span className="font-mono font-bold text-gray-900">{formatRupiah(balance)}</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                    <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded border border-slate-200">
                                        <span className="font-bold text-gray-900 text-xs md:text-sm uppercase">Total Pasiva</span>
                                        <span className="font-bold font-mono text-indigo-700 border-b-2 border-double border-indigo-700 text-sm md:text-base">
                                            {formatRupiah(balance)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* KARTU RINGKASAN SURPLUS/DEFISIT & ANALISIS RASIO */}
                    <div className="border-t border-gray-200 bg-slate-50/50 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <span className="text-gray-500 block uppercase font-bold text-[10px]">Surplus / (Defisit) Berjalan:</span>
                            <div className="flex items-baseline justify-between mt-1">
                                <span className={`text-base font-black font-mono ${balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {formatRupiah(balance)}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${balance >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                    {balance >= 0 ? 'Surplus Kas' : 'Defisit Kas'}
                                </span>
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <span className="text-gray-500 block uppercase font-bold text-[10px]">Tingkat Penyerapan Dana BOSP:</span>
                            <div className="flex items-center justify-between mt-1">
                                <span className="text-base font-black font-mono text-gray-900">
                                    {totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0}%
                                </span>
                                <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="bg-indigo-600 h-2 rounded-full" 
                                      style={{ width: `${Math.min(totalIncome > 0 ? (totalExpense/totalIncome)*100 : 0, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-gray-500 block uppercase font-bold text-[10px]">Status Keseimbangan Neraca:</span>
                            <span className="text-xs font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                Seimbang (Aktiva = Pasiva)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* II. REKAPITULASI PENDAPATAN & BELANJA (BUKU KAS UMUM) - KESEDERHANAAN TERJAGA */}
            <div className="mt-8">
                <div className="bg-gray-800 text-white px-4 py-2.5 rounded-t-lg font-bold tracking-wider uppercase text-xs md:text-sm flex justify-between items-center">
                    <span>II. Rekapitulasi Pendapatan & Belanja (Buku Kas Umum)</span>
                    <span className="text-[11px] font-normal text-gray-300">Format Akun Standar BKU</span>
                </div>
                <div className="overflow-x-auto border border-t-0 border-gray-300 rounded-b-lg bg-white shadow-sm">
                    <table className="w-full text-xs md:text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 border-b border-gray-300 text-[11px] uppercase font-bold tracking-wider">
                                <th className="py-2.5 px-3 text-left w-24">Kode Akun</th>
                                <th className="py-2.5 px-4 text-left">Uraian Akun</th>
                                <th className="py-2.5 px-4 text-right bg-emerald-50/60 w-44">Debit (Penerimaan)</th>
                                <th className="py-2.5 px-4 text-right bg-rose-50/60 w-44">Kredit (Pengeluaran)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {/* SALDO AWAL */}
                            <tr className="hover:bg-gray-50/80">
                                <td className="py-2 px-3 font-mono text-gray-400 text-xs">0.0.00</td>
                                <td className="py-2 px-4 font-semibold text-gray-700">Saldo Awal Buku Kas</td>
                                <td className="py-2 px-4 text-right font-mono text-gray-600 bg-emerald-50/20">Rp 0</td>
                                <td className="py-2 px-4 text-right font-mono text-gray-400 bg-rose-50/20">-</td>
                            </tr>

                            {/* PENDAPATAN */}
                            {Object.entries(incomeDetails).map(([cat, amount], idx) => (
                                <tr key={`inc-${idx}`} className="hover:bg-gray-50/80">
                                    <td className="py-2 px-3 font-mono text-gray-600 text-xs">{getAccountCode(cat, 'income')}</td>
                                    <td className="py-2 px-4 text-gray-800">{cat}</td>
                                    <td className="py-2 px-4 text-right font-mono font-semibold text-emerald-800 bg-emerald-50/20">
                                        {formatRupiah(amount as number)}
                                    </td>
                                    <td className="py-2 px-4 text-right font-mono text-gray-300 bg-rose-50/20">-</td>
                                </tr>
                            ))}

                            {/* BELANJA */}
                            {Object.entries(expenseDetails).map(([cat, amount], idx) => (
                                <tr key={`exp-${idx}`} className="hover:bg-gray-50/80">
                                    <td className="py-2 px-3 font-mono text-gray-600 text-xs">{getAccountCode(cat, 'expense')}</td>
                                    <td className="py-2 px-4 text-gray-800">{cat}</td>
                                    <td className="py-2 px-4 text-right font-mono text-gray-300 bg-emerald-50/20">-</td>
                                    <td className="py-2 px-4 text-right font-mono font-semibold text-rose-800 bg-rose-50/20">
                                        {formatRupiah(amount as number)}
                                    </td>
                                </tr>
                            ))}

                            {/* JUMLAH MUTASI */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-gray-300">
                                <td className="py-2.5 px-3"></td>
                                <td className="py-2.5 px-4 text-gray-900 uppercase text-xs">Jumlah Mutasi Transaksi</td>
                                <td className="py-2.5 px-4 text-right font-mono text-emerald-800 border-t border-gray-400">
                                    {formatRupiah(totalIncome)}
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono text-rose-800 border-t border-gray-400">
                                    {formatRupiah(totalExpense)}
                                </td>
                            </tr>
                            
                            {/* SALDO AKHIR KAS */}
                            <tr className="bg-indigo-950 text-white font-bold text-xs md:text-sm">
                                <td colSpan={2} className="py-3 px-4 text-right uppercase tracking-wider">
                                    Saldo Akhir Kas (Tunai & Bank)
                                </td>
                                <td className="py-3 px-4 text-right font-mono bg-indigo-900" colSpan={2}>
                                    {formatRupiah(balance)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* III. REKAPITULASI PENDAPATAN & BELANJA PER KEGIATAN & BUKTI PENERIMAAN (TOUCHSCREEN) */}
            <div className="mt-8 page-break-before-auto">
                <div className="bg-gray-800 text-white px-4 py-2.5 rounded-t-lg font-bold tracking-wider uppercase text-xs md:text-sm flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                        <span>III. Rekapitulasi Realisasi Belanja Per Kegiatan & Bukti Penerima</span>
                        <p className="text-[11px] font-normal text-indigo-200 capitalize mt-0.5">
                            Setiap kegiatan penerimaan/pengeluaran disertai tanda tangan touchscreen penerima anggaran
                        </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-normal print:hidden">
                        <span className="bg-indigo-900/80 px-2.5 py-1 rounded text-[11px] text-indigo-100 border border-indigo-700/50">
                            {activityData.filteredActivities.filter(a => !!activitySignatures[a.id]).length} dari {activityData.filteredActivities.length} Terverifikasi TTD
                        </span>
                    </div>
                </div>

                {/* Filter & Toolbar Khusus Bagian III (Sembunyi saat cetak) */}
                <div className="p-3 bg-slate-100 border-x border-gray-300 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-gray-600">Filter Bulan:</label>
                            <select
                                value={selectedMonthFilter}
                                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                                className="px-2.5 py-1.5 bg-white border border-gray-300 rounded shadow-2xs text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="all">Semua Periode Transaksi</option>
                                {availableMonths.map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <label className="font-semibold text-gray-600">Tipe Kegiatan:</label>
                            <select
                                value={selectedTypeFilter}
                                onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                                className="px-2.5 py-1.5 bg-white border border-gray-300 rounded shadow-2xs text-gray-700 outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="all">Semua Realisasi</option>
                                <option value="expense">Hanya Pengeluaran (Belanja/Honor/US)</option>
                                <option value="income">Hanya Pemasukan (Penyaluran BOS)</option>
                            </select>
                        </div>
                    </div>

                    <div className="text-[11px] text-gray-500 italic">
                        Tip: Klik tombol <strong>Tanda Tangan</strong> pada baris kegiatan untuk membuka kanvas sentuh.
                    </div>
                </div>

                <div className="overflow-x-auto border border-t-0 border-gray-300 rounded-b-lg bg-white shadow-sm">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-gray-100 text-gray-700 border-b border-gray-300 text-[11px] uppercase font-bold tracking-wider">
                                <th className="py-2.5 px-2 text-center w-8">No</th>
                                <th className="py-2.5 px-2.5 text-center w-24">Tanggal</th>
                                <th className="py-2.5 px-2.5 text-center w-20">Kodering</th>
                                <th className="py-2.5 px-3 text-left w-44">Penerima Anggaran</th>
                                <th className="py-2.5 px-3 text-left">Kegiatan & Uraian Belanja</th>
                                <th className="py-2.5 px-2.5 text-right bg-emerald-50/60 w-28">Debit (Masuk)</th>
                                <th className="py-2.5 px-2.5 text-right bg-rose-50/60 w-28">Kredit (Keluar)</th>
                                <th className="py-2.5 px-2.5 text-right w-28 bg-slate-50">Saldo Kas</th>
                                <th className="py-2.5 px-3 text-center w-48 bg-indigo-50/40">Tanda Tangan Penerima</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {activityData.filteredActivities.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-8 text-center text-gray-400 italic bg-gray-50">
                                        Belum ada transaksi kegiatan untuk filter yang dipilih.
                                    </td>
                                </tr>
                            ) : (
                                activityData.groupedByMonth.map((group) => (
                                    <React.Fragment key={group.monthKey}>
                                        {/* BANNER BULAN */}
                                        <tr className="bg-slate-200/90 text-slate-800 font-bold border-y border-slate-300">
                                            <td colSpan={5} className="py-2 px-3 tracking-wide">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
                                                    <span>PERIODE: {group.monthLabel.toUpperCase()}</span>
                                                    <span className="text-[10px] font-normal text-slate-500">
                                                        ({group.items.length} Kegiatan Realisasi)
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-mono text-[11px] text-emerald-800">
                                                {formatRupiah(group.incomeSubtotal)}
                                            </td>
                                            <td className="py-2 px-2.5 text-right font-mono text-[11px] text-rose-800">
                                                {formatRupiah(group.expenseSubtotal)}
                                            </td>
                                            <td colSpan={2} className="py-2 px-3 text-[10px] text-slate-500 italic">
                                                Subtotal Bulan {group.monthLabel}
                                            </td>
                                        </tr>

                                        {/* DAFTAR KEGIATAN INDIVIDUAL DI DALAM BULAN */}
                                        {group.items.map((act) => {
                                            const sig = activitySignatures[act.id];
                                            const defaultRecipient = act.recipient || (act.type === 'income' ? 'Bendahara / Kas Sekolah' : 'Pihak Ketiga / Rekanan');

                                            return (
                                                <tr key={act.id} className="hover:bg-indigo-50/30 transition-colors align-middle">
                                                    <td className="py-2.5 px-2 text-center font-mono text-gray-500 text-[11px]">
                                                        {act.rowNumber}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-center text-gray-700 whitespace-nowrap font-medium text-[11px]">
                                                        {new Date(act.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-center font-mono text-gray-600 text-[11px]">
                                                        {getAccountCode(act.category, act.type)}
                                                    </td>
                                                    <td className="py-2.5 px-3 align-middle">
                                                        <div className="flex items-start gap-1.5">
                                                            <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5 print:hidden">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                                            </span>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-xs">
                                                                    {act.recipient ? act.recipient : defaultRecipient}
                                                                </p>
                                                                {!act.recipient && (
                                                                    <span className="text-[10px] text-amber-600 print:hidden italic">
                                                                        (Belum diisi di input)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-3 align-middle">
                                                        <p className="font-semibold text-gray-800 text-xs leading-snug">
                                                            {act.description}
                                                        </p>
                                                        <p className="text-[10px] text-gray-500 mt-0.5">
                                                            Kategori: {act.category}
                                                        </p>
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-right font-mono font-medium text-emerald-800 bg-emerald-50/20 whitespace-nowrap">
                                                        {act.type === 'income' ? formatRupiah(act.amount) : '-'}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-right font-mono font-medium text-rose-800 bg-rose-50/20 whitespace-nowrap">
                                                        {act.type === 'expense' ? formatRupiah(act.amount) : '-'}
                                                    </td>
                                                    <td className="py-2.5 px-2.5 text-right font-mono font-bold text-gray-900 bg-slate-50/50 whitespace-nowrap">
                                                        {formatRupiah(act.runningBalance)}
                                                    </td>

                                                    {/* KOLOM TANDA TANGAN PENERIMA SETIAP KEGIATAN */}
                                                    <td className="py-2 px-3 text-center bg-indigo-50/20 border-l border-indigo-100 align-middle">
                                                        {sig ? (
                                                            <div className="flex flex-col items-center justify-center p-1 group">
                                                                {/* Tanda tangan digital hasil sentuhan layar */}
                                                                <div className="w-32 h-12 bg-white border border-gray-200 rounded p-0.5 flex items-center justify-center shadow-2xs">
                                                                    <img 
                                                                        src={sig.signatureDataUrl} 
                                                                        alt={`Tanda tangan ${sig.recipientName}`} 
                                                                        className="max-w-full max-h-full object-contain"
                                                                    />
                                                                </div>
                                                                <p className="text-[11px] font-bold text-gray-900 mt-1 underline decoration-dotted underline-offset-2">
                                                                    {sig.recipientName}
                                                                </p>
                                                                <p className="text-[9px] text-gray-500">
                                                                    {sig.signedAt}
                                                                </p>
                                                                {/* Aksi ubah / download kwitansi / hapus tanda tangan */}
                                                                <div className="flex items-center gap-1.5 mt-1 no-print print:hidden opacity-90 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveSignModal({
                                                                            id: act.id,
                                                                            title: act.description,
                                                                            recipientName: sig.recipientName,
                                                                            initialSignature: sig.signatureDataUrl
                                                                        })}
                                                                        className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                                                        title="Ubah tanda tangan penerima"
                                                                    >
                                                                        Ubah
                                                                    </button>
                                                                    <span className="text-gray-300">|</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onOpenReceipt?.(act, sig)}
                                                                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold hover:underline flex items-center gap-1 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shadow-2xs"
                                                                        title="Download Kwitansi dengan Tanda Tangan Digital"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                                                        <span>Download Kwitansi</span>
                                                                    </button>
                                                                    <span className="text-gray-300">|</span>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveSignature(act.id)}
                                                                        className="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-medium"
                                                                        title="Hapus tanda tangan ini"
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-1 gap-1">
                                                                {/* Tombol Tanda Tangan Layar Sentuh & Tombol Kwitansi */}
                                                                <div className="flex items-center gap-1 no-print print:hidden">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setActiveSignModal({
                                                                            id: act.id,
                                                                            title: act.description,
                                                                            recipientName: act.recipient || (act.type === 'income' ? 'Bendahara BOSP' : '')
                                                                        })}
                                                                        className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                                                                        title="Buka kanvas tanda tangan layar sentuh"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                                                                        <span>Tanda Tangan</span>
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => onOpenReceipt?.(act, undefined)}
                                                                        className="px-1.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-indigo-800 rounded text-[11px] font-medium flex items-center gap-1 shadow-2xs transition-colors"
                                                                        title="Download / Cetak Kwitansi Kosong (Tanda Tangan Fisik/Basah)"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                                                        <span>Kwitansi</span>
                                                                    </button>
                                                                </div>
                                                                {/* Tampilan cetak fisik jika belum ada tanda tangan digital */}
                                                                <div className="hidden print:block print-only w-32 text-center pt-7">
                                                                    <div className="border-b border-gray-400 w-full mb-1"></div>
                                                                    <p className="text-[9px] text-gray-700 font-semibold">
                                                                        ( {act.recipient || 'Tanda Tangan Penerima'} )
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))
                            )}

                            {/* TOTAL REALISASI DARI SEMUA KEGIATAN YANG DITAMPILKAN */}
                            <tr className="bg-slate-100 font-bold border-t-2 border-gray-400 text-xs">
                                <td colSpan={5} className="py-3 px-3 text-right uppercase text-gray-800">
                                    Total Realisasi {selectedMonthFilter === 'all' ? 'Seluruh Periode' : 'Bulan Terpilih'}
                                </td>
                                <td className="py-3 px-2.5 text-right font-mono text-emerald-800">
                                    {formatRupiah(activityData.totalFilteredIncome)}
                                </td>
                                <td className="py-3 px-2.5 text-right font-mono text-rose-800">
                                    {formatRupiah(activityData.totalFilteredExpense)}
                                </td>
                                <td className="py-3 px-2.5 text-right font-mono text-indigo-900 bg-slate-200/50">
                                    {formatRupiah(balance)}
                                </td>
                                <td className="py-3 px-3 text-center text-[10px] text-gray-500">
                                    Sah & Terverifikasi
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* III. LEMBAR PENGESAHAN & TANDA TANGAN FORMAL TIM BOSP */}
            <div id="lembar-pengesahan-bosp" className="mt-12 pt-6 page-break-inside-avoid">
                {/* Header Lembar Pengesahan */}
                <div className="bg-slate-800 text-white px-5 py-3 rounded-t-xl font-bold tracking-wider uppercase text-xs sm:text-sm flex flex-wrap justify-between items-center gap-2 print:bg-slate-100 print:text-black print:border-b-2 print:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 print:hidden"></span>
                        <span>III. Lembar Pengesahan & Akuntabilitas Tim Manajemen BOSP</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-normal text-slate-300 print:text-gray-700">
                        <span>Penetapan: <strong className="text-white print:text-black">{schoolSettings.city || 'Tasikmalaya'}, {reportDate}</strong></span>
                        <button
                          type="button"
                          onClick={() => setIsEditOfficialsOpen(true)}
                          className="no-print text-cyan-300 hover:text-white font-bold flex items-center gap-1 ml-2 bg-slate-700 hover:bg-slate-600 px-2.5 py-1 rounded-md border border-slate-500 text-[11px] transition-colors cursor-pointer"
                          title="Ubah data pejabat pengesahan dan tanggal"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          <span>Ubah</span>
                        </button>
                    </div>
                </div>

                {/* Kotak Pengesahan Resmi 3 Kolom */}
                <div className="border border-t-0 border-gray-300 rounded-b-xl p-5 sm:p-7 bg-gradient-to-b from-slate-50/70 to-white shadow-xs">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 text-center">
                        
                        {/* KOLOM 1: KEPALA SEKOLAH */}
                        <div className="flex flex-col justify-between items-center bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs print:border-none print:shadow-none print:p-0 min-h-[220px]">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase tracking-wider mb-1 print:hidden">
                                    Penanggung Jawab / PA
                                </span>
                                <p className="text-gray-700 text-xs">Menyetujui,</p>
                                <p className="font-black text-gray-900 text-sm tracking-wide mt-0.5">Kepala Sekolah</p>
                            </div>

                            {/* Area Tanda Tangan */}
                            <div className="my-3 flex flex-col items-center justify-center w-full min-h-[90px]">
                                {officialSignatures.headmaster ? (
                                    <div className="flex flex-col items-center">
                                        <img 
                                            src={officialSignatures.headmaster} 
                                            alt="Tanda tangan Kepala Sekolah" 
                                            className="h-16 max-w-[170px] object-contain"
                                        />
                                        <div className="no-print mt-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openOfficialSignModal('headmaster', schoolSettings.headmasterName, 'Kepala Sekolah')}
                                                className="text-[10px] text-cyan-700 hover:underline font-semibold cursor-pointer"
                                            >
                                                Ubah TTD
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => clearOfficialSignature('headmaster', 'Kepala Sekolah')}
                                                className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => openOfficialSignModal('headmaster', schoolSettings.headmasterName, 'Kepala Sekolah')}
                                            className="no-print px-3 py-1.5 bg-slate-50 hover:bg-cyan-50 border border-slate-300 hover:border-cyan-400 text-slate-700 hover:text-cyan-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                            title="Bubuhi tanda tangan digital layar sentuh"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                                            <span>+ TTD Digital</span>
                                        </button>
                                        {/* Blank space saat dicetak untuk stempel & tanda tangan basah */}
                                        <div className="hidden print:block w-36 h-16"></div>
                                    </div>
                                )}
                            </div>

                            {/* Nama & NIP */}
                            <div className="w-full">
                                <p className="font-black text-gray-900 text-sm tracking-wide leading-tight uppercase">
                                    {schoolSettings.headmasterName}
                                </p>
                                <div className="w-44 border-b-2 border-black mx-auto mt-1 mb-1"></div>
                                <p className="text-xs font-mono font-medium text-gray-700">
                                    NIP. {schoolSettings.headmasterNip || '-'}
                                </p>
                            </div>
                        </div>

                        {/* KOLOM 2: KETUA KOMITE SEKOLAH */}
                        <div className="flex flex-col justify-between items-center bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs print:border-none print:shadow-none print:p-0 min-h-[220px]">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase tracking-wider mb-1 print:hidden">
                                    Pemeriksaan & Transparansi
                                </span>
                                <p className="text-gray-700 text-xs">Memeriksa,</p>
                                <p className="font-black text-gray-900 text-sm tracking-wide mt-0.5">Ketua Komite Sekolah</p>
                            </div>

                            {/* Area Tanda Tangan */}
                            <div className="my-3 flex flex-col items-center justify-center w-full min-h-[90px]">
                                {officialSignatures.committee ? (
                                    <div className="flex flex-col items-center">
                                        <img 
                                            src={officialSignatures.committee} 
                                            alt="Tanda tangan Ketua Komite" 
                                            className="h-16 max-w-[170px] object-contain"
                                        />
                                        <div className="no-print mt-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openOfficialSignModal('committee', schoolSettings.committeeName || 'Ustz. Encep Al Gipari', 'Ketua Komite Sekolah')}
                                                className="text-[10px] text-cyan-700 hover:underline font-semibold cursor-pointer"
                                            >
                                                Ubah TTD
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => clearOfficialSignature('committee', 'Ketua Komite Sekolah')}
                                                className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => openOfficialSignModal('committee', schoolSettings.committeeName || 'Ustz. Encep Al Gipari', 'Ketua Komite Sekolah')}
                                            className="no-print px-3 py-1.5 bg-slate-50 hover:bg-cyan-50 border border-slate-300 hover:border-cyan-400 text-slate-700 hover:text-cyan-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                            title="Bubuhi tanda tangan digital layar sentuh"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                                            <span>+ TTD Digital</span>
                                        </button>
                                        <div className="hidden print:block w-36 h-16"></div>
                                    </div>
                                )}
                            </div>

                            {/* Nama & Keterangan Komite */}
                            <div className="w-full">
                                <p className="font-black text-gray-900 text-sm tracking-wide leading-tight">
                                    {schoolSettings.committeeName || 'Ustz. Encep Al Gipari'}
                                </p>
                                <div className="w-44 border-b-2 border-black mx-auto mt-1 mb-1"></div>
                                <p className="text-xs text-gray-600 font-medium">
                                    Perwakilan Wali Murid & Masyarakat
                                </p>
                            </div>
                        </div>

                        {/* KOLOM 3: BENDAHARA BOSP */}
                        <div className="flex flex-col justify-between items-center bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-2xs print:border-none print:shadow-none print:p-0 min-h-[220px]">
                            <div>
                                <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase tracking-wider mb-1 print:hidden">
                                    Penyusun Laporan BOSP
                                </span>
                                <p className="text-gray-700 text-xs font-semibold">
                                    {schoolSettings.city || 'Tasikmalaya'}, {reportDate}
                                </p>
                                <p className="font-black text-gray-900 text-sm tracking-wide mt-0.5">Bendahara BOSP</p>
                            </div>

                            {/* Area Tanda Tangan */}
                            <div className="my-3 flex flex-col items-center justify-center w-full min-h-[90px]">
                                {officialSignatures.treasurer ? (
                                    <div className="flex flex-col items-center">
                                        <img 
                                            src={officialSignatures.treasurer} 
                                            alt="Tanda tangan Bendahara BOSP" 
                                            className="h-16 max-w-[170px] object-contain"
                                        />
                                        <div className="no-print mt-1 flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openOfficialSignModal('treasurer', schoolSettings.treasurerName, 'Bendahara BOSP')}
                                                className="text-[10px] text-cyan-700 hover:underline font-semibold cursor-pointer"
                                            >
                                                Ubah TTD
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => clearOfficialSignature('treasurer', 'Bendahara BOSP')}
                                                className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center">
                                        <button
                                            type="button"
                                            onClick={() => openOfficialSignModal('treasurer', schoolSettings.treasurerName, 'Bendahara BOSP')}
                                            className="no-print px-3 py-1.5 bg-slate-50 hover:bg-cyan-50 border border-slate-300 hover:border-cyan-400 text-slate-700 hover:text-cyan-900 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                                            title="Bubuhi tanda tangan digital layar sentuh"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                                            <span>+ TTD Digital</span>
                                        </button>
                                        <div className="hidden print:block w-36 h-16"></div>
                                    </div>
                                )}
                            </div>

                            {/* Nama & NIP */}
                            <div className="w-full">
                                <p className="font-black text-gray-900 text-sm tracking-wide leading-tight">
                                    {schoolSettings.treasurerName}
                                </p>
                                <div className="w-44 border-b-2 border-black mx-auto mt-1 mb-1"></div>
                                <p className="text-xs font-mono font-medium text-gray-700">
                                    {schoolSettings.treasurerNip ? `NIP. ${schoolSettings.treasurerNip}` : 'Bendahara Pengeluaran BOSP'}
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>

        {/* MODAL KANVAS TANDA TANGAN TOUCHSCREEN */}
        {activeSignModal && (
          <SignaturePadModal 
            isOpen={true}
            onClose={() => setActiveSignModal(null)}
            title={activeSignModal.title}
            recipientName={activeSignModal.recipientName}
            initialSignature={activeSignModal.initialSignature || (activeSignModal.isOfficial ? '' : activitySignatures[activeSignModal.id]?.signatureDataUrl)}
            onSave={(name, dataUrl) => {
              handleSaveSignature(
                activeSignModal.id, 
                name, 
                dataUrl, 
                activeSignModal.isOfficial, 
                activeSignModal.officialRole
              );
              setActiveSignModal(null);
            }}
          />
        )}

        {/* MODAL FORMULIR KELOLA PEJABAT PENGESAHAN & TANGGAL */}
        {isEditOfficialsOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm no-print">
            <div className="bg-[#101621] border border-cyan-500/40 rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-2xl text-slate-100">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Kelola Pejabat Pengesahan BOSP</h3>
                    <p className="text-xs text-slate-400">Atur nama, NIP, tanggal, dan kota pengesahan laporan</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditOfficialsOpen(false)}
                  className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
                </button>
              </div>

              <form onSubmit={handleSaveOfficialForm} className="space-y-4 text-xs">
                {/* Tempat & Tanggal */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tempat / Kota</label>
                    <input
                      type="text"
                      value={editFormData.city}
                      onChange={e => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Contoh: Tasikmalaya"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tanggal Pengesahan</label>
                    <input
                      type="text"
                      value={editFormData.reportDate}
                      onChange={e => setEditFormData({ ...editFormData, reportDate: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Contoh: 10 September 2026"
                      required
                    />
                  </div>
                </div>

                {/* Data Kepala Sekolah */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400">1. Kepala Sekolah (Menyetujui)</span>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={editFormData.headmasterName}
                      onChange={e => setEditFormData({ ...editFormData, headmasterName: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Contoh: Drs. IIS RAIS, M.M."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      value={editFormData.headmasterNip}
                      onChange={e => setEditFormData({ ...editFormData, headmasterNip: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-mono"
                      placeholder="Contoh: 19750814 200212 1 003"
                    />
                  </div>
                </div>

                {/* Data Komite Sekolah */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400">2. Ketua Komite Sekolah (Memeriksa)</span>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nama Ketua Komite</label>
                    <input
                      type="text"
                      value={editFormData.committeeName}
                      onChange={e => setEditFormData({ ...editFormData, committeeName: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Contoh: Ustz. Encep Al Gipari"
                      required
                    />
                  </div>
                </div>

                {/* Data Bendahara BOSP */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400">3. Bendahara BOSP (Penyusun)</span>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Nama Lengkap Bendahara</label>
                    <input
                      type="text"
                      value={editFormData.treasurerName}
                      onChange={e => setEditFormData({ ...editFormData, treasurerName: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400"
                      placeholder="Contoh: Drs. AEP Saepudin, M.Pd."
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">NIP Bendahara (Opsional)</label>
                    <input
                      type="text"
                      value={editFormData.treasurerNip}
                      onChange={e => setEditFormData({ ...editFormData, treasurerNip: e.target.value })}
                      className="w-full bg-[#0B111B] border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-cyan-400 font-mono"
                      placeholder="Kosongkan jika bukan PNS"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setEditFormData({
                        headmasterName: 'Drs. IIS RAIS, M.M.',
                        headmasterNip: '19750814 200212 1 003',
                        committeeName: 'Ustz. Encep Al Gipari',
                        treasurerName: 'Drs. AEP Saepudin, M.Pd.',
                        treasurerNip: '',
                        city: 'Tasikmalaya',
                        reportDate: '10 September 2026',
                      });
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Reset Nama Resmi
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditOfficialsOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white rounded-xl font-bold transition-all shadow-md shadow-cyan-950/40 cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BalanceSheetModal;
