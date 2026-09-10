import { Transaction, SchoolProfile } from './types';

// Format angka ke format mata uang Rupiah
export const formatRupiah = (amount: number): string => {
  if (isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Format tanggal standar Indonesia (DD MMMM YYYY)
export const formatDateIndo = (dateString: string): string => {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    if (!year || !month || !day) return dateString;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
};

// Fungsi Terbilang Bahasa Indonesia Resmi untuk Kuitansi SPJ BOS
export const terbilang = (angka: number): string => {
  if (isNaN(angka) || angka <= 0) return 'Nol Rupiah';
  
  const bilangan: string[] = [
    '',
    'Satu',
    'Dua',
    'Tiga',
    'Empat',
    'Lima',
    'Enam',
    'Tujuh',
    'Delapan',
    'Sembilan',
    'Sepuluh',
    'Sebelas',
  ];

  const konversi = (n: number): string => {
    n = Math.floor(n);
    if (n < 12) {
      return bilangan[n];
    } else if (n < 20) {
      return konversi(n - 10) + ' Belas';
    } else if (n < 100) {
      return konversi(Math.floor(n / 10)) + ' Puluh ' + konversi(n % 10);
    } else if (n < 200) {
      return 'Seratus ' + konversi(n - 100);
    } else if (n < 1000) {
      return konversi(Math.floor(n / 100)) + ' Ratus ' + konversi(n % 100);
    } else if (n < 2000) {
      return 'Seribu ' + konversi(n - 1000);
    } else if (n < 1000000) {
      return konversi(Math.floor(n / 1000)) + ' Ribu ' + konversi(n % 1000);
    } else if (n < 1000000000) {
      return konversi(Math.floor(n / 1000000)) + ' Juta ' + konversi(n % 1000000);
    } else if (n < 1000000000000) {
      return konversi(Math.floor(n / 1000000000)) + ' Miliar ' + konversi(n % 1000000000);
    } else {
      return konversi(Math.floor(n / 1000000000000)) + ' Triliun ' + konversi(n % 1000000000000);
    }
  };

  const hasil = konversi(Math.abs(angka)).trim().replace(/\s+/g, ' ');
  return hasil ? `${hasil} Rupiah` : 'Nol Rupiah';
};

// 12 Komponen Penggunaan Dana BOSP (Kemendikbudristek)
export const BOS_EXPENSE_CATEGORIES = [
  'Penerimaan Peserta Didik Baru (PPDB)',
  'Pengembangan Perpustakaan & Buku',
  'Pelaksanaan Pembelajaran & Ekstrakurikuler',
  'Pelaksanaan Evaluasi & Asesmen Pembelajaran',
  'Administrasi Sekolah & Pengelolaan Perkantoran',
  'Pengembangan Profesi Pendidik & Tenaga Kependidikan',
  'Langganan Daya dan Jasa (Listrik, Air, Internet, Telepon)',
  'Pemeliharaan Sarana dan Prasarana Sekolah',
  'Penyediaan Alat Multi Media Pembelajaran',
  'Penyelenggaraan Uji Kompetensi & Sertifikasi',
  'Pembayaran Honorarium Guru & Tendik Non-ASN',
  'Pembelian Alat Kebersihan, Sanitasi & Kesehatan',
  'Pembayaran Utang',
] as const;

// Kategori Penerimaan
export const BOS_INCOME_CATEGORIES = [
  'Penyaluran Dana BOS Reguler Tahap I',
  'Penyaluran Dana BOS Reguler Tahap II',
  'Penyaluran Dana BOS Kinerja / Afirmasi',
  'Bantuan Operasional Sekolah Daerah (BOSDA)',
  'Pendapatan Bunga Bank / Jasa Giro',
  'Penerimaan Lain-lain yang Sah',
] as const;

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  schoolName: 'SD Negeri 01 Merdeka',
  npsn: '20214567',
  address: 'Jl. Pendidikan No. 45, Kompleks Ki Hajar Dewantara',
  city: 'Bandung',
  province: 'Jawa Barat',
  headmaster: 'Drs. H. Ahmad Fauzi, M.Pd.',
  headmasterNip: '19750814 200212 1 003',
  treasurer: 'Siti Rahmawati, S.Pd.',
  treasurerNip: '19880421 201101 2 007',
  fiscalYear: '2025',
  bosPeriod: 'Tahap I (Januari - Juni 2025)',
};

// Contoh Data Awal Realistis (Bisa dimuat dari modal Database jika diinginkan)
export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-1',
    date: '2025-01-15',
    type: 'income',
    fundSource: 'BOS Reguler',
    paymentMethod: 'Bank / Transfer',
    category: 'Penyaluran Dana BOS Reguler Tahap I',
    description: 'Penerimaan Penyaluran Dana BOS Reguler Tahap I dari Kas Daerah / Kemenkeu',
    amount: 54000000,
    receiptNumber: '001/P-BOS/I/2025',
    recipient: 'Kemenkeu / Kas Daerah RI',
    notes: 'Masuk ke rekening giro sekolah Bank BJB',
  },
  {
    id: 'tx-2',
    date: '2025-01-20',
    type: 'expense',
    fundSource: 'BOS Reguler',
    paymentMethod: 'Kas Tunai',
    category: 'Administrasi Sekolah & Pengelolaan Perkantoran',
    description: 'Pembelian Kertas HVS F4/A4, Tinta Printer Epson, dan ATK Kantor Semester I',
    amount: 2850000,
    receiptNumber: '001/K-BOS/I/2025',
    recipient: 'Toko Buku & ATK Sejahtera',
    recipientAddress: 'Jl. Ahmad Yani No. 12',
    taxPpn: 0,
    notes: 'Disertai nota toko & cap lunas',
  },
  {
    id: 'tx-3',
    date: '2025-01-28',
    type: 'expense',
    fundSource: 'BOS Reguler',
    paymentMethod: 'Bank / Transfer',
    category: 'Langganan Daya dan Jasa (Listrik, Air, Internet, Telepon)',
    description: 'Pembayaran Tagihan Listrik PLN & Internet Dedicated Sekolah Bulan Januari',
    amount: 1450000,
    receiptNumber: '002/K-BOS/I/2025',
    recipient: 'PT Telekomunikasi Indonesia / PLN',
    taxPpn: 143694,
    notes: 'Bukti transfer m-banking terlampir',
  },
  {
    id: 'tx-4',
    date: '2025-02-05',
    type: 'expense',
    fundSource: 'BOS Reguler',
    paymentMethod: 'Kas Tunai',
    category: 'Pembayaran Honorarium Guru & Tendik Non-ASN',
    description: 'Honorarium Guru Tidak Tetap (GTT) & Tenaga Operator Dapodik Bulan Januari',
    amount: 4500000,
    receiptNumber: '003/K-BOS/II/2025',
    recipient: '3 Orang Guru & Tendik Honorer',
    taxPph21: 225000,
    notes: 'Daftar hadir dan tanda terima SPJ lengkap',
  },
  {
    id: 'tx-5',
    date: '2025-02-14',
    type: 'expense',
    fundSource: 'BOS Reguler',
    paymentMethod: 'Kas Tunai',
    category: 'Pemeliharaan Sarana dan Prasarana Sekolah',
    description: 'Perbaikan instalasi kran air wastafel siswa dan pengecatan ruang kelas IV',
    amount: 1950000,
    receiptNumber: '004/K-BOS/II/2025',
    recipient: 'Tukang Servis & Toko Cat Bintang',
    notes: 'Foto kondisi 0%, 50%, dan 100% terlampir',
  },
  {
    id: 'tx-6',
    date: '2025-02-25',
    type: 'expense',
    fundSource: 'BOS Reguler',
    paymentMethod: 'Bank / Transfer',
    category: 'Pengembangan Perpustakaan & Buku',
    description: 'Pengadaan Buku Teks Pendamping Kurikulum Merdeka Fase B & C',
    amount: 6800000,
    receiptNumber: '005/K-BOS/II/2025',
    recipient: 'Penerbit CV Graha Ilmu Mandiri',
    taxPpn: 672072,
    taxPph22: 102000,
    notes: 'Sesuai pesanan e-Katalog SIPLah',
  }
];
