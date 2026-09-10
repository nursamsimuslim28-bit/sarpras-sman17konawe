-- SQL SCHEMA UNTUK APLIKASI E-SARPRAS (SUPABASE)
-- Silakan salin dan jalankan query ini di SQL Editor Supabase Anda.

-- 1. Tabel Pengaturan Sekolah
CREATE TABLE IF NOT EXISTS pengaturan (
  id TEXT PRIMARY KEY DEFAULT 'default',
  nama_sekolah TEXT NOT NULL,
  npsn TEXT,
  alamat TEXT,
  kepala_sekolah TEXT,
  nip_kepala_sekolah TEXT,
  nama_petugas_sarpras TEXT,
  nip_petugas_sarpras TEXT,
  target_kapasitas_siswa INTEGER DEFAULT 596,
  jumlah_rombel INTEGER DEFAULT 16,
  jumlah_siswa_aktif INTEGER DEFAULT 400,
  google_apps_script_url TEXT,
  google_drive_folder_id TEXT,
  admin_password TEXT DEFAULT 'admin123',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Masukkan data pengaturan default jika belum ada
INSERT INTO pengaturan (
  id, nama_sekolah, npsn, alamat, kepala_sekolah, nip_kepala_sekolah, nama_petugas_sarpras, nip_petugas_sarpras, target_kapasitas_siswa, jumlah_rombel, jumlah_siswa_aktif, admin_password
) VALUES (
  'default', 'SMAN 1 AMONGGEDO', '40404643', 'Jl. Poros Amonggedo - Meluhu', 'Hapri, S.Pd., M.Pd', '197108172005021002', 'Nursamsi Muslim Widuri, S.Pd.', '198708012025211059', 596, 16, 400, 'admin123'
) ON CONFLICT (id) DO NOTHING;

-- 2. Tabel Aset Sarpras
CREATE TABLE IF NOT EXISTS asets (
  id TEXT PRIMARY KEY, -- Barcode / Kode Aset
  nama TEXT NOT NULL,
  merek TEXT,
  spesifikasi TEXT,
  kategori TEXT NOT NULL,
  ruang_lokasi TEXT NOT NULL,
  jumlah INTEGER NOT NULL DEFAULT 1,
  satuan TEXT NOT NULL DEFAULT 'Unit',
  kondisi TEXT NOT NULL DEFAULT 'Baik',
  sumber_dana TEXT,
  tahun_perolehan INTEGER,
  foto_url TEXT, -- Dapat menyimpan URL foto atau base64 string
  catatan TEXT,
  tanggal_register TEXT NOT NULL,
  serial_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Peminjaman Aset
CREATE TABLE IF NOT EXISTS peminjamans (
  id TEXT PRIMARY KEY,
  aset_id TEXT NOT NULL REFERENCES asets(id) ON DELETE CASCADE,
  nama_aset TEXT NOT NULL,
  nama_peminjam TEXT NOT NULL,
  jabatan_peminjam TEXT NOT NULL, -- 'Siswa' | 'Guru' | 'Staf TU' | 'Lainnya'
  tanggal_pinjam TEXT NOT NULL,
  tanggal_target_kembali TEXT NOT NULL,
  tanggal_kembali_aktual TEXT,
  jumlah_pinjam INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Dipinjam', -- 'Dipinjam' | 'Kembali'
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabel Log Pemusnahan Aset
CREATE TABLE IF NOT EXISTS pemusnahans (
  id TEXT PRIMARY KEY,
  aset_id TEXT NOT NULL REFERENCES asets(id) ON DELETE CASCADE,
  nama_aset TEXT NOT NULL,
  jumlah INTEGER NOT NULL DEFAULT 1,
  tanggal_pemusnahan TEXT NOT NULL,
  metode TEXT NOT NULL, -- 'Penjualan/Lelang' | 'Pemusnahan Fisik' | 'Hibah' | 'Transfer Satuan Lain'
  alasan TEXT NOT NULL,
  no_sk_penghapusan TEXT NOT NULL,
  petugas_eksekusi TEXT NOT NULL,
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabel Barang Habis Pakai (BHP)
CREATE TABLE IF NOT EXISTS bhp (
  id TEXT PRIMARY KEY,
  nama TEXT NOT NULL,
  merek TEXT,
  kategori TEXT NOT NULL,
  stok_awal INTEGER NOT NULL DEFAULT 0,
  stok_sekarang INTEGER NOT NULL DEFAULT 0,
  satuan TEXT NOT NULL,
  lokasi_penyimpanan TEXT,
  catatan TEXT,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabel Pengambilan BHP
CREATE TABLE IF NOT EXISTS pengambilan_bhp (
  id TEXT PRIMARY KEY,
  bhp_id TEXT NOT NULL REFERENCES bhp(id) ON DELETE CASCADE,
  nama_bhp TEXT NOT NULL,
  nama_penerima TEXT NOT NULL,
  jabatan_penerima TEXT NOT NULL, -- 'Guru' | 'Staf TU' | 'Lainnya'
  tanggal_ambil TEXT NOT NULL,
  jumlah_diambil INTEGER NOT NULL DEFAULT 1,
  satuan TEXT NOT NULL,
  keterangan TEXT,
  bukti_fisik TEXT, -- Menyimpan base64 bukti fisik serah terima
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Tambahkan Kebijakan RLS (Row Level Security) - Opsional tetapi direkomendasikan
-- Secara default, kita nonaktifkan RLS agar dapat dibaca/tulis secara mudah oleh aplikasi,
-- atau buat kebijakan akses publik penuh jika RLS diaktifkan:
ALTER TABLE pengaturan DISABLE ROW LEVEL SECURITY;
ALTER TABLE asets DISABLE ROW LEVEL SECURITY;
ALTER TABLE peminjamans DISABLE ROW LEVEL SECURITY;
ALTER TABLE pemusnahans DISABLE ROW LEVEL SECURITY;
ALTER TABLE bhp DISABLE ROW LEVEL SECURITY;
ALTER TABLE pengambilan_bhp DISABLE ROW LEVEL SECURITY;
