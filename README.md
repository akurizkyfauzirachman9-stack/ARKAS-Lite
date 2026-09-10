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

