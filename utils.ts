// Fungsi format Rupiah
export const formatRupiah = (amount: number): string => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
};

// Fungsi format Tanggal Indonesia (Bebas dari pergeseran zona waktu UTC)
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-';
  try {
    // Jika format YYYY-MM-DD, parse bagian tahun, bulan, hari secara manual
    // untuk mencegah pergeseran 1 hari akibat UTC midnight di zona waktu WIB/GMT+7
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const localDate = new Date(year, monthIndex, day);
      return localDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    }
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Fungsi Terbilang Akuntansi Resmi (Mendukung hingga Triliun & Penanganan Nilai Nol)
export const terbilang = (nilai: number): string => {
  const nilaiAbs = Math.abs(Math.floor(Number.isFinite(nilai) ? nilai : 0));
  if (nilaiAbs === 0) return "Nol";

  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  const prosesTerbilang = (n: number): string => {
    if (n < 12) return " " + angka[n];
    if (n < 20) return prosesTerbilang(n - 10) + " Belas";
    if (n < 100) return prosesTerbilang(Math.floor(n / 10)) + " Puluh" + prosesTerbilang(n % 10);
    if (n < 200) return " Seratus" + prosesTerbilang(n - 100);
    if (n < 1000) return prosesTerbilang(Math.floor(n / 100)) + " Ratus" + prosesTerbilang(n % 100);
    if (n < 2000) return " Seribu" + prosesTerbilang(n - 1000);
    if (n < 1000000) return prosesTerbilang(Math.floor(n / 1000)) + " Ribu" + prosesTerbilang(n % 1000);
    if (n < 1000000000) return prosesTerbilang(Math.floor(n / 1000000)) + " Juta" + prosesTerbilang(n % 1000000);
    if (n < 1000000000000) return prosesTerbilang(Math.floor(n / 1000000000)) + " Miliar" + prosesTerbilang(n % 1000000000);
    if (n < 1000000000000000) return prosesTerbilang(Math.floor(n / 1000000000000)) + " Triliun" + prosesTerbilang(n % 1000000000000);
    return " Nilai terlalu besar";
  };

  return prosesTerbilang(nilaiAbs).trim();
};

// Parser Nominal Rupiah Cerdas: Mencegah '1.500.000' terpotong jadi '1.5'
export const parseNominal = (val: string | number): number => {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? Math.max(0, val) : 0;
  }
  if (!val || typeof val !== 'string') return 0;

  // Bersihkan karakter selain digit, minus, titik, dan koma
  let cleaned = val.replace(/[^0-9.,-]/g, '').trim();
  if (!cleaned) return 0;

  // Jika format Indonesia dengan titik ribuan (misal: "1.500.000" atau "1.500.000,50")
  if (cleaned.includes('.') && !cleaned.includes(',')) {
    // Kasus seperti "1.500.000" -> titik adalah ribuan jika ada beberapa digit setelahnya
    const parts = cleaned.split('.');
    if (parts.length > 1 && parts[parts.length - 1].length === 3) {
      cleaned = cleaned.replace(/\./g, '');
    } else if (parts.length > 2) {
      // Lebih dari 1 titik, pasti separator ribuan
      cleaned = cleaned.replace(/\./g, '');
    }
  } else if (cleaned.includes('.') && cleaned.includes(',')) {
    // Kasus "1.500.000,00" -> titik adalah ribuan, koma adalah desimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    // Kasus "1500000,00"
    cleaned = cleaned.replace(',', '.');
  }

  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};