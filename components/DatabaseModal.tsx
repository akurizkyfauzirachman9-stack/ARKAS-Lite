import React, { useRef, useState } from 'react';
import { Transaction, SchoolSettings, SupabaseConfig } from '../types';
import { 
  testSupabaseConnection, 
  pullTransactionsFromSupabase, 
  pushTransactionsToSupabase, 
  generatePostgresDDL 
} from '../services/supabaseService';

interface DatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  onImport: (data: Transaction[]) => void;
  schoolSettings: SchoolSettings;
  onUpdateSchoolSettings: (settings: SchoolSettings) => void;
  supabaseConfig: SupabaseConfig;
  onUpdateSupabaseConfig: (config: SupabaseConfig) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type TabType = 'backup' | 'cloud' | 'profile' | 'schema';

const DatabaseModal: React.FC<DatabaseModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onImport,
  schoolSettings,
  onUpdateSchoolSettings,
  supabaseConfig,
  onUpdateSupabaseConfig,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<TabType>('backup');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local state for school settings
  const [localSettings, setLocalSettings] = useState<SchoolSettings>(schoolSettings);
  // Local state for supabase config
  const [localSupabase, setLocalSupabase] = useState<SupabaseConfig>(supabaseConfig);
  
  // Loading & Action states
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);
  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState('');

  if (!isOpen) return null;

  // 1. Simpan Database (Download JSON)
  const handleExportJSON = () => {
    const backupPayload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      schoolSettings: localSettings,
      transactionsCount: transactions.length,
      transactions,
    };
    const dataStr = JSON.stringify(backupPayload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_ARKAS_${localSettings.schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('File cadangan database berhasil diunduh!', 'success');
  };

  // Salin Kode Data ke Clipboard untuk dikirim via WA / Catatan ke HP
  const handleCopyJSONToClipboard = () => {
    const backupPayload = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      schoolSettings: localSettings,
      transactionsCount: transactions.length,
      transactions,
    };
    const dataStr = JSON.stringify(backupPayload);
    navigator.clipboard.writeText(dataStr).then(() => {
      onShowToast('Kode data berhasil disalin! Silakan kirimkan (paste) via WhatsApp atau pesan ke HP Anda.', 'success');
    }).catch(() => {
      onShowToast('Gagal menyalin teks secara otomatis. Silakan gunakan tombol unduh file.', 'error');
    });
  };

  // Helper pemrosesan impor data (baik dari file maupun teks paste)
  const processImportData = (parsedData: any) => {
    let incomingTransactions: Transaction[] = [];

    if (Array.isArray(parsedData)) {
      incomingTransactions = parsedData;
    } else if (parsedData && Array.isArray(parsedData.transactions)) {
      incomingTransactions = parsedData.transactions;
      if (parsedData.schoolSettings) {
        setLocalSettings(parsedData.schoolSettings);
        onUpdateSchoolSettings(parsedData.schoolSettings);
      }
    } else {
      throw new Error('Format file tidak valid. Format harus berupa array transaksi atau objek backup ARKAS.');
    }

    // Mekanisme ON CONFLICT (id) DO UPDATE & unique_bku_entry (date, description, amount)
    const existingMap = new Map<string, Transaction>();
    transactions.forEach(t => existingMap.set(t.id, t));

    let updatedCount = 0;
    let insertedCount = 0;

    incomingTransactions.forEach(item => {
      if (!item.id) item.id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
      
      if (existingMap.has(item.id)) {
        existingMap.set(item.id, item);
        updatedCount++;
      } else {
        // Check unique_bku_entry constraint (date, description, amount)
        const duplicate = Array.from(existingMap.values()).find(
          existing => existing.date === item.date && 
                      existing.description.trim().toLowerCase() === item.description.trim().toLowerCase() && 
                      existing.amount === item.amount
        );

        if (duplicate) {
          // Merge/update duplicate
          existingMap.set(duplicate.id, { ...duplicate, ...item, id: duplicate.id });
          updatedCount++;
        } else {
          existingMap.set(item.id, item);
          insertedCount++;
        }
      }
    });

    const mergedList = Array.from(existingMap.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    onImport(mergedList);
    onShowToast(`Pemulihan berhasil: ${insertedCount} baru, ${updatedCount} diperbarui (ON CONFLICT).`, 'success');
    onClose();
  };

  // 2. Trigger Input File
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 3. Masukan Database dari File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const parsedData = JSON.parse(json);
        processImportData(parsedData);
      } catch (err: any) {
        console.error("Gagal membaca file:", err);
        setErrorMsg(err.message || "File rusak atau format tidak sesuai.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3b. Masukan Database dari Teks Paste
  const handleApplyPaste = () => {
    setErrorMsg(null);
    try {
      if (!pasteText.trim()) {
        setErrorMsg('Silakan tempelkan teks kode data terlebih dahulu.');
        return;
      }
      const parsedData = JSON.parse(pasteText.trim());
      processImportData(parsedData);
      setShowPasteBox(false);
      setPasteText('');
    } catch (err: any) {
      setErrorMsg('Format teks yang Anda tempel bukan kode JSON yang valid: ' + (err.message || ''));
    }
  };


  // 4. Test Supabase Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    const res = await testSupabaseConnection(localSupabase);
    setIsTesting(false);
    if (res.success) {
      onShowToast(res.message, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  // 5. Push to Supabase (Bulk Upsert)
  const handlePushSupabase = async () => {
    setIsSyncing(true);
    const res = await pushTransactionsToSupabase(localSupabase, transactions);
    setIsSyncing(false);
    if (res.success) {
      const updatedConfig = { ...localSupabase, lastSyncedAt: new Date().toISOString() };
      setLocalSupabase(updatedConfig);
      onUpdateSupabaseConfig(updatedConfig);
      onShowToast(res.message, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  // 6. Pull from Supabase
  const handlePullSupabase = async () => {
    setIsSyncing(true);
    const res = await pullTransactionsFromSupabase(localSupabase);
    setIsSyncing(false);
    if (res.success && res.data) {
      // Bulk Upsert merge
      const existingMap = new Map<string, Transaction>();
      transactions.forEach(t => existingMap.set(t.id, t));
      res.data.forEach(t => existingMap.set(t.id, t));

      const merged = Array.from(existingMap.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      onImport(merged);
      const updatedConfig = { ...localSupabase, lastSyncedAt: new Date().toISOString() };
      setLocalSupabase(updatedConfig);
      onUpdateSupabaseConfig(updatedConfig);
      onShowToast(res.message, 'success');
    } else {
      onShowToast(res.message, 'error');
    }
  };

  // 7. Save Profile Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSchoolSettings(localSettings);
    onShowToast('Profil Sekolah & Penandatangan BKU berhasil diperbarui!', 'success');
  };

  // 8. Copy SQL
  const handleCopySQL = () => {
    const ddl = generatePostgresDDL(localSettings);
    navigator.clipboard.writeText(ddl);
    setCopiedSQL(true);
    setTimeout(() => setCopiedSQL(false), 2500);
    onShowToast('Skrip SQL DDL berhasil disalin ke clipboard!', 'info');
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs print:hidden">
      <div className="bg-[#101621] rounded-2xl shadow-2xl w-full max-w-2xl border border-cyan-500/30 text-slate-100 overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[92vh]">
        
        {/* Header Modal */}
        <div className="bg-[#0B111B] p-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/30 text-cyan-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Pusat Data & Arsitektur Database</h3>
              <p className="text-xs text-slate-400">Kelola cadangan lokal, REST API Supabase, profil BKU & DDL PostgreSQL</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-[#080B12] px-4 text-xs font-semibold overflow-x-auto gap-1 py-1">
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-2.5 px-3.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-[#151C28] text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Cadangan & Pulihkan
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2.5 px-3.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'cloud'
                ? 'bg-[#151C28] text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
            Cloud (Supabase REST)
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2.5 px-3.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#151C28] text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profil Sekolah & SPJ
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`py-2.5 px-3.5 rounded-xl whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-[#151C28] text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            Skema SQL DDL
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: CADANGAN & PULIHKAN */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="bg-cyan-950/20 p-4 rounded-xl border border-cyan-500/20 flex items-start gap-3">
                <svg className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <div className="text-xs text-slate-300 leading-relaxed">
                  <span className="font-bold text-cyan-300">Mekanisme Ketahanan Data:</span> Cadangan mencakup seluruh Buku Kas Umum dan metadata identitas sekolah. Proses impor menerapkan prinsip <strong>ON CONFLICT DO UPDATE</strong> dan constraint entri ganda untuk menjamin integritas transaksi.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Export */}
                <button 
                  onClick={handleExportJSON}
                  className="flex flex-col items-center justify-center p-6 rounded-2xl border border-slate-700 bg-[#151C28]/80 hover:bg-[#1C2638] hover:border-emerald-500/50 transition-all text-center group cursor-pointer"
                >
                  <div className="w-12 h-12 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-[#00E6A7] mb-3 group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  </div>
                  <h4 className="font-bold text-white text-sm">Simpan Cadangan (Export)</h4>
                  <p className="text-xs text-slate-400 mt-1">Unduh seluruh data BKU dalam format JSON standar</p>
                  <span className="mt-3 text-[11px] bg-[#0B111B] text-cyan-300 border border-slate-700 px-3 py-1 rounded-xl font-mono font-medium">
                    {transactions.length} Transaksi Tersimpan
                  </span>
                </button>

                {/* Import */}
                <div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".json" 
                    onChange={handleFileChange}
                  />
                  <button 
                    onClick={handleImportClick}
                    className="w-full h-full flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-700 bg-[#151C28]/80 hover:bg-[#1C2638] hover:border-cyan-500/50 transition-all text-center group cursor-pointer"
                  >
                    <div className="w-12 h-12 bg-cyan-500/15 border border-cyan-500/30 rounded-2xl flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    </div>
                    <h4 className="font-bold text-white text-sm">Pulihkan Data (Import)</h4>
                    <p className="text-xs text-slate-400 mt-1">Unggah file cadangan JSON sebelumnya</p>
                    <span className="mt-3 text-[11px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 px-3 py-1 rounded-xl font-medium">
                      Bulk Upsert (Anti Duplikasi)
                    </span>
                  </button>
                </div>
              </div>

              {/* Opsi Kirim Cepat Antar-Perangkat via Teks / WhatsApp */}
              <div className="bg-[#101621] p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                      Pindah Data ke HP / Perangkat Lain (Instan Tanpa File)
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Salin seluruh data menjadi teks, kirim ke HP via WhatsApp/catatan, lalu tempel di HP Anda.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyJSONToClipboard}
                      className="px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[#00E6A7] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Salin seluruh data ke papan klip untuk dikirimkan"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      Salin Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPasteBox(!showPasteBox)}
                      className="px-3 py-1.5 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/></svg>
                      {showPasteBox ? 'Tutup Tempel' : 'Tempel Data di HP'}
                    </button>
                  </div>
                </div>

                {showPasteBox && (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Tempelkan teks kode cadangan yang Anda terima di sini:
                    </label>
                    <textarea
                      value={pasteText}
                      onChange={e => setPasteText(e.target.value)}
                      placeholder='Tempel (paste) kode JSON di sini...'
                      rows={3}
                      className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-xs font-mono text-cyan-200 placeholder-slate-600 focus:border-cyan-400 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setShowPasteBox(false); setPasteText(''); }}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyPaste}
                        className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer"
                      >
                        Terapkan Data ke HP Ini
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-950/40 text-rose-300 text-xs rounded-xl border border-rose-500/30 text-center">
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CLOUD SUPABASE REST */}
          {activeTab === 'cloud' && (
            <div className="space-y-4 text-xs">
              {/* Panduan Mengapa Data di HP Belum Masuk */}
              <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-500/30 text-slate-300 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  <h4 className="font-bold text-sm text-blue-200">
                    Mengapa Data di HP Belum Otomatis Masuk?
                  </h4>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Vercel menyediakan hosting <strong>website & tampilan</strong> di internet. Data kas BKU Anda secara default disimpan di <strong>penyimpanan lokal browser perangkat</strong> Anda.
                </p>
                <div className="bg-[#0B111B]/80 p-3 rounded-lg border border-blue-500/20 text-xs space-y-1.5">
                  <p className="font-semibold text-cyan-300">Cara Mengaktifkan Sinkronisasi Otomatis Antar-HP/Laptop (Gratis):</p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                    <li>Buat akun dan project gratis di <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline font-semibold">supabase.com</a>.</li>
                    <li>Buka tab <strong>Skema SQL DDL</strong> di modal ini, salin kodenya, lalu jalankan di <em>SQL Editor</em> Supabase.</li>
                    <li>Masukkan <strong>Project URL</strong> dan <strong>Anon Key</strong> pada formulir di bawah (atau simpan di Vercel Settings &gt; Environment Variables sebagai <code className="bg-black text-cyan-300 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> dan <code className="bg-black text-cyan-300 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code>).</li>
                  </ol>
                  <p className="text-[11px] text-emerald-400 font-medium pt-1">
                    ✓ Setelah terhubung, setiap transaksi yang diinput di laptop akan langsung muncul otomatis di HP secara seketika!
                  </p>
                </div>
              </div>

              <div className="bg-cyan-950/20 p-4 rounded-xl border border-cyan-500/20 text-slate-300">
                <h4 className="font-bold text-sm mb-1 flex items-center gap-1.5 text-cyan-300">
                  <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  Protokol Integrasi REST API (PostgREST / Supabase)
                </h4>
                <p className="text-slate-400 leading-relaxed">
                  Menghubungkan langsung aplikasi dengan PostgreSQL cloud melalui endpoint REST terstandardisasi 
                  (<code className="bg-[#0B111B] text-cyan-300 px-1 py-0.5 rounded font-mono border border-slate-700">GET /transactions?order=date.desc</code>) dan sinkronisasi bulk upsert.
                </p>
              </div>

              <div className="space-y-3 bg-[#0B111B] p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Project URL Supabase</label>
                  <input 
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={localSupabase.url}
                    onChange={e => setLocalSupabase({ ...localSupabase, url: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101621] border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs font-mono text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Supabase Anon Key (Public API Key)</label>
                  <input 
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={localSupabase.anonKey}
                    onChange={e => setLocalSupabase({ ...localSupabase, anonKey: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101621] border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs font-mono text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Nama Tabel BKU (Default: transactions)</label>
                  <input 
                    type="text"
                    value={localSupabase.tableName}
                    onChange={e => setLocalSupabase({ ...localSupabase, tableName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#101621] border border-slate-700 rounded-xl focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 text-xs font-mono text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-3.5 py-2 bg-[#151C28] hover:bg-[#1C2638] text-slate-300 border border-slate-700 rounded-xl font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? 'Menguji...' : 'Uji Koneksi API'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateSupabaseConfig(localSupabase);
                      onShowToast('Konfigurasi Supabase berhasil disimpan!', 'success');
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white rounded-xl font-bold transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                  >
                    Simpan Konfigurasi
                  </button>
                </div>
              </div>

              {/* Sync Actions */}
              <div className="border border-slate-800 bg-[#0B111B] p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-white">Sinkronisasi Cloud Dua Arah</h5>
                    <p className="text-slate-400 text-[11px]">
                      {localSupabase.lastSyncedAt 
                        ? `Terakhir disinkronkan: ${new Date(localSupabase.lastSyncedAt).toLocaleString('id-ID')}`
                        : 'Belum pernah disinkronkan'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold px-2 py-0.5 rounded-lg">
                    ON CONFLICT MERGE
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handlePushSupabase}
                    disabled={isSyncing || !localSupabase.url}
                    className="p-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[#00E6A7] rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                    Push ke Cloud (Bulk Upsert)
                  </button>
                  <button
                    onClick={handlePullSupabase}
                    disabled={isSyncing || !localSupabase.url}
                    className="p-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
                    Tarik dari Cloud (Pull)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PROFIL SEKOLAH & SPJ */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-500/30 text-amber-300 leading-relaxed">
                Metadata ini otomatis dicantumkan pada kuitansi formal dan lembar pengesahan BKU/Neraca untuk menghilangkan redundansi data pejabat penandatangan.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-400 block mb-1">Nama Satuan Pendidikan / Sekolah</label>
                  <input 
                    type="text"
                    value={localSettings.schoolName}
                    onChange={e => setLocalSettings({ ...localSettings, schoolName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">NPSN</label>
                  <input 
                    type="text"
                    value={localSettings.npsn}
                    onChange={e => setLocalSettings({ ...localSettings, npsn: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Kabupaten / Kota</label>
                  <input 
                    type="text"
                    value={localSettings.city}
                    onChange={e => setLocalSettings({ ...localSettings, city: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-400 block mb-1">Alamat Sekolah</label>
                  <input 
                    type="text"
                    value={localSettings.address}
                    onChange={e => setLocalSettings({ ...localSettings, address: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Tahun Anggaran</label>
                  <input 
                    type="text"
                    value={localSettings.fiscalYear}
                    onChange={e => setLocalSettings({ ...localSettings, fiscalYear: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Periode BOSP</label>
                  <input 
                    type="text"
                    value={localSettings.bosPeriod}
                    onChange={e => setLocalSettings({ ...localSettings, bosPeriod: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-800">
                  <h5 className="font-bold text-cyan-400 mb-2">Pejabat Pengesahan SPJ & Buku Kas</h5>
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Nama Kepala Sekolah</label>
                  <input 
                    type="text"
                    value={localSettings.headmasterName}
                    onChange={e => setLocalSettings({ ...localSettings, headmasterName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">NIP Kepala Sekolah</label>
                  <input 
                    type="text"
                    value={localSettings.headmasterNip}
                    onChange={e => setLocalSettings({ ...localSettings, headmasterNip: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">Nama Bendahara BOSP</label>
                  <input 
                    type="text"
                    value={localSettings.treasurerName}
                    onChange={e => setLocalSettings({ ...localSettings, treasurerName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-400 block mb-1">NIP Bendahara BOSP</label>
                  <input 
                    type="text"
                    value={localSettings.treasurerNip}
                    onChange={e => setLocalSettings({ ...localSettings, treasurerNip: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-400 block mb-1">Nama Ketua Komite Sekolah</label>
                  <input 
                    type="text"
                    value={localSettings.committeeName}
                    onChange={e => setLocalSettings({ ...localSettings, committeeName: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B111B] border border-slate-700 rounded-xl text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white font-bold rounded-xl transition-all shadow-md shadow-cyan-950/50 cursor-pointer"
                >
                  Simpan Profil Satuan Pendidikan
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: SKEMA SQL DDL */}
          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Skrip DDL PostgreSQL lengkap dengan penegakan tipe data, presisi NUMERIC, unique constraint, dan RLS policy:
                </p>
                <button
                  onClick={handleCopySQL}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/30 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedSQL ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Tersalin!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                      Salin SQL
                    </>
                  )}
                </button>
              </div>

              <pre className="bg-[#080B12] text-cyan-300 p-4 rounded-xl text-[11px] font-mono overflow-x-auto max-h-[340px] border border-slate-800 leading-relaxed selection:bg-cyan-900">
                {generatePostgresDDL(localSettings)}
              </pre>
            </div>
          )}

        </div>

        {/* Footer Modal */}
        <div className="p-4 bg-[#0B111B] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#151C28] hover:bg-[#1C2638] text-slate-300 font-medium border border-slate-700 rounded-xl transition-colors text-xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseModal;
