// Fungsi format Rupiah
export const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Fungsi format Tanggal Indonesia
export const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', 
    month: 'short', 
    year: 'numeric'
  });
};

// Fungsi Terbilang (untuk kuitansi)
export const terbilang = (nilai: number): string => {
  const nilaiAbs = Math.abs(Math.floor(nilai));
  const angka = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  if(nilaiAbs < 12) return " " + angka[nilaiAbs];
  if(nilaiAbs < 20) return terbilang(nilaiAbs - 10) + " Belas";
  if(nilaiAbs < 100) return terbilang(Math.floor(nilaiAbs / 10)) + " Puluh" + terbilang(nilaiAbs % 10);
  if(nilaiAbs < 200) return " Seratus" + terbilang(nilaiAbs - 100);
  if(nilaiAbs < 1000) return terbilang(Math.floor(nilaiAbs / 100)) + " Ratus" + terbilang(nilaiAbs % 100);
  if(nilaiAbs < 2000) return " Seribu" + terbilang(nilaiAbs - 1000);
  if(nilaiAbs < 1000000) return terbilang(Math.floor(nilaiAbs / 1000)) + " Ribu" + terbilang(nilaiAbs % 1000);
  if(nilaiAbs < 1000000000) return terbilang(Math.floor(nilaiAbs / 1000000)) + " Juta" + terbilang(nilaiAbs % 1000000);
  return "Nilai terlalu besar";
};