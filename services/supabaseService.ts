import { Transaction, SchoolSettings, SupabaseConfig } from '../types';

/**
 * Layanan integrasi REST API Supabase / PostgREST
 * Mengikuti cetak biru:
 * - GET /transactions?order=date.desc
 * - Bulk Upsert via POST dengan header Prefer: resolution=merge-duplicates
 * - REST endpoint terstandardisasi
 */

export interface SyncResult {
  success: boolean;
  message: string;
  count?: number;
  data?: Transaction[];
}

export const testSupabaseConnection = async (config: SupabaseConfig): Promise<{ success: boolean; message: string }> => {
  if (!config.url || !config.anonKey) {
    return { success: false, message: 'Supabase URL dan Anon Key harus diisi.' };
  }

  const cleanUrl = config.url.trim().replace(/\/+$/, '');
  const tableName = config.tableName || 'transactions';
  const endpoint = `${cleanUrl}/rest/v1/${tableName}?select=id&limit=1`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey.trim(),
        'Authorization': `Bearer ${config.anonKey.trim()}`,
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      return { success: true, message: 'Koneksi ke Supabase REST API berhasil terhubung!' };
    } else {
      const errText = await res.text();
      return { 
        success: false, 
        message: `HTTP ${res.status}: ${errText || res.statusText}. Pastikan Skema SQL sudah di-Run di Supabase.` 
      };
    }
  } catch (err: any) {
    return { success: false, message: `Koneksi gagal: ${err?.message || 'Cek URL dan koneksi internet Anda.'}` };
  }
};

/**
 * Tarik data (PULL) dari Supabase / PostgREST: GET /transactions?order=date.desc
 */
export const pullTransactionsFromSupabase = async (config: SupabaseConfig): Promise<SyncResult> => {
  if (!config.url || !config.anonKey) {
    return { success: false, message: 'Supabase URL dan Anon Key belum dikonfigurasi.' };
  }

  const cleanUrl = config.url.trim().replace(/\/+$/, '');
  const tableName = config.tableName || 'transactions';
  const endpoint = `${cleanUrl}/rest/v1/${tableName}?order=date.desc&select=*`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey.trim(),
        'Authorization': `Bearer ${config.anonKey.trim()}`,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { 
        success: false, 
        message: `Gagal menarik data (HTTP ${res.status}): ${errText || res.statusText}` 
      };
    }

    const rawRows = await res.json();
    if (!Array.isArray(rawRows)) {
      return { success: false, message: 'Respon server tidak valid atau tabel kosong.' };
    }

    // Transformasi data database ke format Transaction aplikasi
    const mappedTransactions: Transaction[] = rawRows.map((r: any) => ({
      id: String(r.id || Date.now()),
      date: r.date || new Date().toISOString().slice(0, 10),
      recipient: r.recipient || '',
      type: r.type === 'income' ? 'income' : 'expense',
      category: r.category || 'Standar Pembiayaan',
      description: r.description || '',
      amount: Number(r.amount) || 0,
      source: r.source || r.fund_source || 'BOS Reguler',
      tax: r.tax !== undefined ? Number(r.tax) : (Number(r.tax_ppn || 0) + Number(r.tax_pph21 || 0)),
      notes: r.notes || '',
    }));

    return {
      success: true,
      message: `Berhasil mengunduh ${mappedTransactions.length} transaksi dari Supabase.`,
      count: mappedTransactions.length,
      data: mappedTransactions,
    };
  } catch (err: any) {
    return { success: false, message: `Gagal menghubungi Supabase: ${err.message}` };
  }
};

/**
 * Dorong & Sinkronkan data (PUSH / Bulk Upsert) ke Supabase:
 * Menggunakan POST dengan endpoint ?on_conflict=id dan header Prefer: resolution=merge-duplicates
 */
export const pushTransactionsToSupabase = async (
  config: SupabaseConfig, 
  transactions: Transaction[]
): Promise<SyncResult> => {
  if (!config.url || !config.anonKey) {
    return { success: false, message: 'Supabase URL dan Anon Key belum dikonfigurasi.' };
  }

  if (transactions.length === 0) {
    return { success: false, message: 'Tidak ada data transaksi untuk disinkronkan.' };
  }

  const cleanUrl = config.url.trim().replace(/\/+$/, '');
  const tableName = config.tableName || 'transactions';
  const endpoint = `${cleanUrl}/rest/v1/${tableName}?on_conflict=id`;

  // Siapkan payload dengan tipe numerik presisi dan field database
  const payload = transactions.map(t => ({
    id: String(t.id),
    date: t.date,
    recipient: t.recipient || null,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: Math.max(0.01, Number(t.amount) || 1),
    fund_source: t.source || 'BOS Reguler',
    notes: t.notes || null,
    updated_at: new Date().toISOString(),
  }));

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey.trim(),
        'Authorization': `Bearer ${config.anonKey.trim()}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates', // PostgREST Bulk Upsert ON CONFLICT
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { 
        success: false, 
        message: `Gagal sinkronisasi data (HTTP ${res.status}): ${errText || res.statusText}` 
      };
    }

    return {
      success: true,
      message: `Berhasil menyinkronkan (Bulk Upsert) ${transactions.length} transaksi ke Cloud!`,
      count: transactions.length,
    };
  } catch (err: any) {
    return { success: false, message: `Gagal sinkronisasi ke Supabase: ${err.message}` };
  }
};

/**
 * Hapus transaksi dari Supabase saat dihapus dari aplikasi
 */
export const deleteTransactionFromSupabase = async (
  config: SupabaseConfig,
  id: string
): Promise<boolean> => {
  if (!config.url || !config.anonKey) return false;
  try {
    const cleanUrl = config.url.trim().replace(/\/+$/, '');
    const tableName = config.tableName || 'transactions';
    const endpoint = `${cleanUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`;

    const res = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'apikey': config.anonKey.trim(),
        'Authorization': `Bearer ${config.anonKey.trim()}`,
      },
    });
    return res.ok;
  } catch (e) {
    console.warn('Gagal menghapus transaksi dari Supabase:', e);
    return false;
  }
};

/**
 * Buat Tautan Sinkronisasi Cepat (Share Sync Link)
 * Memungkinkan pengguna berbagi konfigurasi database ke HP / rekan bendahara via WhatsApp/Link
 */
export const createShareableSyncLink = (config: SupabaseConfig): string => {
  if (!config.url || !config.anonKey) return '';
  const payload = {
    u: config.url.trim(),
    k: config.anonKey.trim(),
    t: config.tableName || 'transactions',
  };
  const encoded = btoa(JSON.stringify(payload));
  const baseUrl = window.location.origin + window.location.pathname;
  return `${baseUrl}#sync=${encoded}`;
};

/**
 * Deteksi dan terapkan Tautan Sinkronisasi Cepat dari URL Hash
 */
export const extractSyncConfigFromUrl = (): SupabaseConfig | null => {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('sync=')) return null;

    const match = hash.match(/sync=([^&]+)/);
    if (!match || !match[1]) return null;

    const decoded = atob(decodeURIComponent(match[1]));
    const parsed = JSON.parse(decoded);

    if (parsed.u && parsed.k) {
      // Bersihkan hash agar URL tetap bersih di browser
      window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
      return {
        url: parsed.u,
        anonKey: parsed.k,
        tableName: parsed.t || 'transactions',
        lastSyncedAt: new Date().toISOString(),
      };
    }
    return null;
  } catch (e) {
    console.warn('Gagal memproses sync link:', e);
    return null;
  }
};


/**
 * SQL DDL Blueprint Generator
 */
export const generatePostgresDDL = (settings: SchoolSettings): string => {
  return `-- ============================================================================
-- ARSITEKTUR BASIS DATA POSTGRESQL & BKU ARKAS BOSP
-- DDL & KEBIJAKAN KEAMANAN ROW-LEVEL SECURITY (RLS)
-- Satuan Pendidikan: ${settings.schoolName} (NPSN: ${settings.npsn})
-- ============================================================================

-- 1. ENUM TIPE TRANSAKSI & ROLE (Idempotent: Aman dijalankan berulang kali)
DO $$ BEGIN
    CREATE TYPE tx_type AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('treasurer', 'headmaster', 'committee');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL PROFIL SATUAN PENDIDIKAN & PEJABAT BOSP
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name VARCHAR(255) NOT NULL DEFAULT '${settings.schoolName.replace(/'/g, "''")}',
    npsn VARCHAR(10) NOT NULL UNIQUE DEFAULT '${settings.npsn}',
    address TEXT DEFAULT '${settings.address.replace(/'/g, "''")}',
    city VARCHAR(100) DEFAULT '${settings.city.replace(/'/g, "''")}',
    province VARCHAR(100) DEFAULT '${settings.province.replace(/'/g, "''")}',
    headmaster_name VARCHAR(150) NOT NULL DEFAULT '${settings.headmasterName.replace(/'/g, "''")}',
    headmaster_nip VARCHAR(30) DEFAULT '${settings.headmasterNip}',
    treasurer_name VARCHAR(150) NOT NULL DEFAULT '${settings.treasurerName.replace(/'/g, "''")}',
    treasurer_nip VARCHAR(30) DEFAULT '${settings.treasurerNip}',
    committee_name VARCHAR(150) DEFAULT '${settings.committeeName.replace(/'/g, "''")}',
    fiscal_year VARCHAR(10) DEFAULT '${settings.fiscalYear}',
    bos_period VARCHAR(50) DEFAULT '${settings.bosPeriod}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL TRANSAKSI BUKU KAS UMUM (BKU)
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    date DATE NOT NULL,
    type tx_type NOT NULL,
    category VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    fund_source VARCHAR(100) DEFAULT 'BOS Reguler',
    payment_method VARCHAR(50) DEFAULT 'Kas Tunai',
    receipt_number VARCHAR(100),
    recipient VARCHAR(150),
    tax_ppn NUMERIC(15, 2) DEFAULT 0.00,
    tax_pph21 NUMERIC(15, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks Performa untuk Kueri Tanggal & Kategori
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions (category);

-- 4. KEBIJAKAN ROW LEVEL SECURITY (RLS)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Kebijakan Akses Baca & Tulis untuk REST API (anon dan authenticated)
DROP POLICY IF EXISTS "Akses Sinkronisasi BKU" ON transactions;
CREATE POLICY "Akses Sinkronisasi BKU"
ON transactions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Akses Sinkronisasi Settings" ON settings;
CREATE POLICY "Akses Sinkronisasi Settings"
ON settings FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
`;
};
