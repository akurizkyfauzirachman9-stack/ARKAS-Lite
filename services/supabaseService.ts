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

  const cleanUrl = config.url.replace(/\/+$/, '');
  const tableName = config.tableName || 'transactions';
  const endpoint = `${cleanUrl}/rest/v1/${tableName}?select=count`;

  try {
    const res = await fetch(endpoint, {
      method: 'HEAD',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
      },
    });

    if (res.ok) {
      return { success: true, message: 'Koneksi ke Supabase REST API berhasil terhubung!' };
    } else {
      return { success: false, message: `HTTP ${res.status}: ${res.statusText}. Periksa apakah tabel '${tableName}' sudah dibuat dan RLS mengizinkan akses.` };
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

  const cleanUrl = config.url.replace(/\/+$/, '');
  const tableName = config.tableName || 'transactions';
  const endpoint = `${cleanUrl}/rest/v1/${tableName}?order=date.desc&select=*`;

  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
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

    // Transformasi data database (snake_case jika ada) ke format Transaction aplikasi
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
 * Menggunakan POST dengan header Prefer: resolution=merge-duplicates (ON CONFLICT id DO UPDATE)
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

  const cleanUrl = config.url.replace(/\/+$/, '');
  const tableName = config.tableName || 'transactions';
  const endpoint = `${cleanUrl}/rest/v1/${tableName}`;

  // Siapkan payload dengan tipe numerik presisi dan field database
  const payload = transactions.map(t => ({
    id: t.id,
    date: t.date,
    recipient: t.recipient || null,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: Number(t.amount),
    fund_source: t.source || 'BOS Reguler',
    notes: t.notes || null,
    updated_at: new Date().toISOString(),
  }));

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${config.anonKey}`,
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
