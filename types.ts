
export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  recipient?: string; // Nama Penerima / Pihak yang Menerima
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  source?: string; // Sumber Dana BOS (BOS Reguler, dsb.)
  notes?: string; // Catatan Tambahan
}

export const INCOME_CATEGORIES = [
  'BOS Reguler',
  'BOS Kinerja',
  'BOS Afirmasi',
  'Dana Komite',
  'Lain-lain'
];

export const EXPENSE_CATEGORIES = [
  'Standar Kelulusan',
  'Standar Isi',
  'Standar Proses',
  'Standar Penilaian',
  'Standar Pendidik & Tenaga Kependidikan',
  'Standar Sarana & Prasarana',
  'Standar Pengelolaan',
  'Standar Pembiayaan',
  'Pembayaran Utang'
];

// Mapping warna untuk chart
export const CATEGORY_COLORS: Record<string, string> = {
  'Standar Kelulusan': '#EF4444', // Red
  'Standar Isi': '#F97316', // Orange
  'Standar Proses': '#F59E0B', // Amber
  'Standar Penilaian': '#EAB308', // Yellow
  'Standar Pendidik & Tenaga Kependidikan': '#84CC16', // Lime
  'Standar Sarana & Prasarana': '#10B981', // Emerald
  'Standar Pengelolaan': '#06B6D4', // Cyan
  'Standar Pembiayaan': '#6366F1', // Indigo
  'Pembayaran Utang': '#EC4899', // Pink / Rose
  'BOS Reguler': '#10B981',
  'BOS Kinerja': '#3B82F6',
  'BOS Afirmasi': '#8B5CF6',
  'Dana Komite': '#EC4899',
  'Lain-lain': '#64748B'
};

export type UserRole = 'treasurer' | 'headmaster' | 'committee';

export interface SchoolSettings {
  schoolName: string;
  npsn: string;
  address: string;
  city: string;
  province: string;
  headmasterName: string;
  headmasterNip: string;
  treasurerName: string;
  treasurerNip: string;
  committeeName: string;
  fiscalYear: string;
  bosPeriod: string;
}

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'SD Negeri 01 Merdeka',
  npsn: '20214567',
  address: 'Jl. Pendidikan No. 45',
  city: 'Tasikmalaya',
  province: 'Jawa Barat',
  headmasterName: 'Drs. IIS RAIS, M.M.',
  headmasterNip: '19750814 200212 1 003',
  treasurerName: 'Drs. AEP Saepudin, M.Pd.',
  treasurerNip: '',
  committeeName: 'Ustz. Encep Al Gipari',
  fiscalYear: '2026',
  bosPeriod: 'Tahap II (Juli - Desember 2026)',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  lastSyncedAt?: string | null;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: '',
  anonKey: '',
  tableName: 'transactions',
  lastSyncedAt: null,
};

export interface MonthlySignature {
  recipientName: string;
  signatureDataUrl: string;
  signedAt: string;
}

export type BudgetPhase = 'phase1' | 'phase2' | 'all';

export interface BudgetSettings {
  phase1Budget: number; // Pagu Alokasi BOS Tahap 1 (Jan - Jun)
  phase2Budget: number; // Pagu Alokasi BOS Tahap 2 (Jul - Des)
}

export const DEFAULT_BUDGET_SETTINGS: BudgetSettings = {
  phase1Budget: 60000000, // Default Pagu Tahap 1: Rp 60.000.000
  phase2Budget: 60000000, // Default Pagu Tahap 2: Rp 60.000.000
};

