# Panduan Darurat & Konteks Aplikasi e-Sarpras

> **Untuk siapa saja (AI apa pun atau developer manapun) yang membantu Nursamsi Muslim Widuri
> memperbaiki aplikasi ini saat Claude Code tidak bisa diakses.** Baca file ini dulu sebelum
> mengubah apa pun.

## Tentang aplikasi ini

- **Nama**: e-Sarpras — aplikasi pendataan sarana prasarana sekolah.
- **Sekolah**: SMA Negeri 17 Konawe (dulu bernama SMA Negeri 1 Amonggedo), NPSN 40404643.
- **Pemilik/operator**: Nursamsi Muslim Widuri, S.Pd. — Wakasek Sarpras, **non-teknis** (tidak
  bisa membaca/menulis kode sendiri). Jelaskan setiap perubahan dengan bahasa sederhana, bukan
  istilah teknis.
- **Repo GitHub**: `nursamsimuslim28-bit/sarpras-sman17konawe`, branch `main`.
- **Live**: di-deploy otomatis ke Vercel setiap ada push ke `main`.
- **Backend**: Firebase Firestore (Web Client SDK, bukan Admin SDK) — konfigurasi di `.env.local`
  (`VITE_FIREBASE_*`). Project Firestore: `sman17konawe`.
- **Stack**: React 19 + Vite 6 + TypeScript + Tailwind 4.

## Struktur data utama (koleksi Firestore)

| Koleksi | Isi |
|---|---|
| `asets` | Daftar aset tetap (barang) sekolah |
| `peminjamans` | Data peminjaman aset |
| `pemusnahans` | Log pemusnahan/penghapusan aset |
| `pemeliharaans` | Log pemeliharaan aset |
| `opname_2026` | Hasil Sensus Fisik BMD (opname) 2026 — data **kritis**, dasar laporan resmi ke provinsi |
| `opname_master_2026` | Daftar induk barang acuan opname, diambil verbatim dari data resmi provinsi (KIB B/C/E) |
| `bhp` | Barang Habis Pakai (ATK, dll) |
| `pengambilan_bhp` | Log pengambilan BHP |
| `keluhan` | Keluhan sarpras dari warga sekolah |
| `pengaturan` (doc `default`) | Konfigurasi sekolah (nama, NPSN, dll) |

## 🚨 Kalau Claude Code tidak bisa diakses (langganan/token habis): urutan pilihan darurat

Kode aplikasi ini standar (React/TypeScript, tersimpan di GitHub), jadi bisa dibuka/diedit tools
AI apa saja atau developer manapun — tidak ada kuncian ke Claude. Urutan prioritas yang disarankan
(dari paling aman & praktis ke yang paling belakang):

### 1. GitHub Copilot app (disarankan pertama)

Tombol **"Code" → "Open in GitHub Copilot app"** di halaman repo GitHub ini. Kelebihannya:
- **Tidak ada risiko sinkronisasi ganda** — Copilot bekerja LANGSUNG di atas repo GitHub ini
  (bukan salinan terpisah yang bisa ketinggalan versi seperti AI Studio di bawah).
- Ada jatah gratis (per akun GitHub pribadi): ±2000 saran kode/bulan + ±50 permintaan chat/agent
  premium/bulan — cukup untuk perbaikan darurat sesekali (bukan pemakaian harian). Paket gratis
  ini bahkan menyediakan pilihan model Claude Haiku 4.5, selain GPT-5 mini.
- Tidak perlu daftar akun baru — tinggal pakai akun GitHub yang sudah ada.

### 2. Google AI Studio (kalau Copilot tidak memungkinkan)

Ada project AI Studio lama yang **masih tersambung dua-arah** ke repo GitHub yang sama (menu
"GitHub sync" di AI Studio). **Wajib** ikuti urutan ini:

1. **Klik "Step 1: Pull changes to Google AI Studio" dulu** sebelum minta perubahan apa pun —
   supaya AI Studio bekerja dari kode TERBARU, bukan versi lama yang tertinggal jauh.
2. Baru setelah yakin perbaikannya benar, klik **"Step 2: Push changes to GitHub"**.
3. **JANGAN PERNAH klik "Push changes to GitHub" tanpa Pull dulu** — berisiko menimpa/merusak
   banyak perbaikan yang sudah dikerjakan lewat Claude Code.

### 3. Chat AI gratis apa saja + editor web GitHub (paling aman, paling manual)

Tanya AI gratis apa saja (Gemini, ChatGPT, dll — tidak perlu terhubung ke repo) untuk menuliskan
kode perbaikannya, lalu tempel manual lewat editor bawaan di github.com (ikon pensil di file yang
mau diedit, langsung di browser, gratis, tanpa instalasi apa pun). Ini paling aman karena langsung
ke sumber aslinya, tanpa risiko konflik sinkronisasi apa pun — hanya lebih manual.

### GitHub Desktop itu BUKAN AI

Opsi "Open with GitHub Desktop" di menu Code cuma aplikasi resmi GitHub untuk klik-klik
clone/commit/push tanpa command line — tidak punya kemampuan AI sendiri. Berguna sebagai
pendamping kalau sudah dapat kode perbaikan dari salah satu opsi AI di atas dan butuh cara mudah
menyimpannya. Jangan pakai "Download ZIP" untuk perbaikan — itu memutus riwayat Git dan berisiko
bentrok dengan histori commit yang sudah ada.

### Kalau salinan aplikasi (dari tools manapun di atas) tidak otomatis terhubung ke data asli

Data opname/aset sesungguhnya **tidak tersimpan di kode**, tapi di Firebase Firestore cloud
(lihat tabel koleksi di atas) — jadi bisa diakses tools AI apa pun, ASALKAN tahu kunci koneksinya.
Kunci ini sengaja TIDAK disimpan di file manapun di repo ini (repo bersifat publik, dan file
`.env.local` yang berisi kunci itu memang dikecualikan lewat `.gitignore`).

Kalau salinan aplikasi baru (dari AI Studio/Copilot/dll) tidak otomatis tersambung ke data asli,
pemilik aplikasi bisa menempelkan kunci koneksi itu sendiri di menu
**Pengaturan → "Override Konfigurasi Firebase (Opsional)"** di aplikasi manapun. Kunci itu
tersimpan aman terpisah (di catatan pribadi pemilik aplikasi, bukan di repo), atau bisa diambil
ulang kapan saja dari Firebase Console (console.firebase.google.com → project `sman17konawe` →
Project settings → Your apps) maupun dashboard Vercel (Settings → Environment Variables).

## Aturan kerja yang disukai pemilik aplikasi (penting diikuti)

- **Jangan menebak-nebak / mengarang.** Selalu verifikasi ke sumber data asli (Firestore
  langsung, bukan asumsi) sebelum menyimpulkan sesuatu, apalagi soal data aset/opname.
  Sebelumnya sempat ada insiden "aset tampil 0" yang ternyata cuma bug tampilan lokal, bukan
  data hilang beneran — jangan langsung panik/mengambil tindakan drastis sebelum dicek ke server.
- **Jangan mengubah kode tanpa diminta eksplisit** (lihat `AGENTS.md` di repo ini — ada kata
  kunci "kerjakan" yang dipakai sebagai tanda persetujuan eksekusi di sesi Claude Code).
- **Setiap perubahan pada file Excel/Word yang dihasilkan aplikasi harus diverifikasi rumus/
  strukturnya** (bukan cuma dibuat lalu diasumsikan benar) sebelum dianggap selesai.
- Jelaskan hasil perbaikan dalam bahasa sederhana, non-teknis, ke pemilik aplikasi.

## Ringkasan perubahan terakhir (sampai 21 September 2026)

Riwayat lengkap ada di `git log`, tapi ringkasan yang relevan untuk konteks cepat:

**Hari ini (21 Sep 2026) — perbaikan darurat & penyempurnaan form opname:**
1. **`e134959`** — Perbaiki bug kritis: sebelumnya kalau koneksi ke Firestore gagal sesaat
   (mis. internet putus pas reload halaman), aplikasi salah mengira "gagal ambil data" sebagai
   "datanya memang kosong", lalu menimpa cache lokal dengan data kosong — aset sempat tampil "0"
   padahal data di server aman. Sekarang kegagalan fetch ditandai eksplisit (`null`) dan tidak
   lagi menimpa cache lokal; `mergeById` di `src/api.ts` sekarang melakukan merge asli
   berdasarkan ID, bukan sekadar "ganti semua kalau remote adalah array".
2. **`1c8f441`** — Kolom "Kode Stiker" di form Opname (`src/components/OpnameTab.tsx`) sekarang
   terisi otomatis dengan format standar `KIB/Register/1/KondisiKode/Tahun` sebagai data
   sungguhan yang bisa diedit (dulu cuma placeholder abu-abu/contoh).
3. **`1ef2ce2`** — Segmen kondisi pada Kode Stiker (`B`/`KB`/`RB` = Baik/Rusak Ringan/Rusak
   Berat, kode resmi yang sama dipakai di laporan sensus) sekarang otomatis mengikuti kondisi
   barang yang benar-benar dipilih operator (termasuk kondisi per-unit untuk barang >1 unit,
   diambil dari yang paling parah), dan tidak menimpa kode yang sudah diedit manual.

**Sesi-sesi sebelumnya (18 Sep 2026 dan sebelumnya) — fitur Opname Fisik BMD 2026:**
- Form opname mendukung data acuan verbatim dari file resmi provinsi (KIB B/C/E), dengan filter
  Kondisi/Tahun/Ditemukan-Tidak, nomor urut sesuai dokumen resmi, dan badge jumlah item hasil
  filter.
- Kondisi bisa diisi per-unit kalau 1 baris punya >1 unit fisik (kondisi keseluruhan = yang
  paling parah di antara unit-unitnya).
- Field Merek/Type, info panel (Letak/Lokasi, Kondisi Bangunan, Asal Usul, Harga Perolehan, dll)
  ditambahkan agar operator opname tidak kehilangan data penting yang sebenarnya sudah ada.
- Laporan sensus (docx & xlsx, di-generate lewat `src/utils/opnameLaporanExport.ts`) disamakan
  strukturnya dengan format baku 6-tabel dari provinsi, termasuk merge sel Unit Kerja dan hanya
  menampilkan KIB sesuai data yang benar-benar ada (B/C/E, bukan A/D/F kosong).
- Nama sekolah pada laporan Opname 2026 khusus memakai nama lama "SMA Negeri 1 Amonggedo"
  (bukan nama baru "SMA Negeri 17 Konawe" yang dipakai di bagian aplikasi lainnya).

## Kalau butuh bantuan lebih jauh

Jelaskan ke pemilik aplikasi bahwa perubahan sudah di-commit & di-push ke GitHub (sebutkan hash
commit-nya), dan Vercel akan otomatis men-deploy ulang. Kalau ragu, jangan buru-buru klik
"Push"/"Deploy" apa pun sebelum benar-benar yakin — lebih baik tanya dulu ke pemiliknya.
