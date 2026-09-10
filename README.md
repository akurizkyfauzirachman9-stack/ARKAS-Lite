<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# ARKAS Lite - Keuangan & BOSP Sekolah

Aplikasi pembukuan keuangan sekolah dan BOSP berbasis web yang ringan, cepat, dan siap digunakan di berbagai perangkat (desktop, tablet, mobile).

## Deploy ke Vercel (Gratis Selamanya)

Aplikasi ini sudah dilengkapi konfigurasi resmi `vercel.json` untuk Vite SPA.

### Cara 1: Deploy Otomatis via GitHub (Direkomendasikan)
1. Di Google AI Studio, klik menu pengaturan / ikon titik tiga &rarr; pilih **Export to GitHub**.
2. Buka [vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
3. Klik **Add New...** &rarr; **Project**.
4. Pilih repositori GitHub aplikasi ini.
5. Vercel akan otomatis mengenali framework **Vite** dan folder output `dist`.
6. Klik **Deploy**. Dalam hitungan detik, aplikasi Anda sudah online dengan domain kustom gratis (contoh: `arkas-lite.vercel.app`).

### Cara 2: Deploy Cepat via Vercel CLI
1. Di terminal folder proyek ini, jalankan:
   ```bash
   npx vercel
   ```
2. Ikuti instruksi login dan pilih pengaturan bawaan (*default*).

---

## Sinkronisasi Otomatis Antar-Perangkat (Multi-Device Live Sync)

Secara bawaan, ARKAS Lite menyimpan data kas di penyimpanan lokal browser (*Local Storage*) untuk kecepatan dan privasi.

Untuk mengaktifkan sinkronisasi data otomatis antar-HP, Laptop, dan Tablet secara *real-time* (gratis):
1. Buat akun dan proyek gratis di [supabase.com](https://supabase.com).
2. Di aplikasi ARKAS Lite, buka menu **Database** &rarr; tab **Skema SQL DDL**, salin kodenya, dan jalankan di **SQL Editor** Supabase.
3. Masukkan **Project URL** dan **Anon Key** pada tab **Cloud (Supabase REST)**.
4. **Tip Vercel**: Agar semua perangkat yang membuka tautan Vercel otomatis tersambung tanpa perlu input konfigurasi, tambahkan dua *Environment Variables* di dashboard Vercel (**Settings** &rarr; **Environment Variables**):
   - `VITE_SUPABASE_URL`: (URL proyek Supabase Anda)
   - `VITE_SUPABASE_ANON_KEY`: (Anon/Public key Supabase Anda)

Setelah diatur, setiap penambahan atau perubahan transaksi di laptop akan langsung tersinkronkan otomatis ke HP dan perangkat lainnya!

---

## Menjalankan Secara Lokal (Offline)

1. Install dependensi:
   ```bash
   npm install
   ```
2. Jalankan server lokal:
   ```bash
   npm run dev
   ```
3. Buka peramban di `http://localhost:3000`.

