export type TransactionType = 'income' | 'expense';

export type FundSource = 
  | 'BOS Reguler' 
  | 'BOS Kinerja' 
  | 'BOS Afirmasi' 
  | 'BOS Daerah (BOSDA)' 
  | 'Komite / Lainnya';

export type PaymentMethod = 'Kas Tunai' | 'Bank / Transfer';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  fundSource: FundSource;
  paymentMethod: PaymentMethod;
  category: string; // Komponen Standar BOS
  description: string;
  amount: number;
  receiptNumber?: string; // No. Kuitansi / Bukti SPJ
  recipient?: string; // Penerima Uang / Toko Rekanan / Nama Guru
  recipientAddress?: string;
  taxPpn?: number; // PPN 11%
  taxPph21?: number; // PPh 21 (Honor)
  taxPph22?: number; // PPh 22 (Barang)
  taxPph23?: number; // PPh 23 (Jasa / Sewa)
  notes?: string;
}

export interface SchoolProfile {
  schoolName: string;
  npsn: string;
  address: string;
  city: string;
  province: string;
  headmaster: string;
  headmasterNip: string;
  treasurer: string;
  treasurerNip: string;
  fiscalYear: string;
  bosPeriod: string;
}

export interface ToastData {
  id?: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}
