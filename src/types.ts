export type KondisiAset = 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Dihapuskan';

export type KategoriAset = 
  | 'KIB A (Tanah)'
  | 'KIB B (Peralatan dan Mesin)'
  | 'KIB C (Gedung dan Bangunan)'
  | 'KIB D (Jalan, Irigasi, dan Jaringan)'
  | 'KIB E (Aset Tetap Lainnya)'
  | 'KIB F (Konstruksi dalam Pengerjaan)'
  | 'Sarana (Peralatan Belajar)'
  | 'Sarana (Bahan Pembelajaran)'
  | 'Perlengkapan (Mebel/Meja/Kursi)'
  | 'Prasarana (Bangunan/Fasilitas)';

export type StandardRuang = string;

export interface MasterRuang {
  id: string; // e.g. RNG-001
  nama: string; // e.g. 'Ruang Kelas X-1'
  kategori: 'Ruang Pembelajaran' | 'Ruang Penunjang' | 'Ruang Administrasi' | 'Fasilitas Umum' | 'Lainnya';
  idGedungKibC?: string; // Relasi ID Gedung KIB C
  namaGedungKibC?: string; // Nama Gedung KIB C (e.g. 'Gedung Unit Belajar A')
  lantai?: string; // e.g. 'Lantai 1', 'Lantai 2'
  penanggungJawab?: string;
  nipPj?: string;
  kapasitas?: number;
  luasM2?: number;
  keterangan?: string;
}

export const DEFAULT_MASTER_RUANGS: MasterRuang[] = [
  { id: 'RNG-01', nama: 'Ruang Kepala Sekolah', kategori: 'Ruang Administrasi', penanggungJawab: 'Hapri, S.Pd., M.Pd' },
  { id: 'RNG-02', nama: 'Ruang Guru', kategori: 'Ruang Administrasi', penanggungJawab: 'Dewan Guru' },
  { id: 'RNG-03', nama: 'Ruang Tata Usaha (TU)', kategori: 'Ruang Administrasi', penanggungJawab: 'Staf TU' },
  { id: 'RNG-04', nama: 'Ruang Sarpras & Gudang', kategori: 'Ruang Penunjang', penanggungJawab: 'Nursamsi Muslim Widuri, S.Pd.' },
  { id: 'RNG-05', nama: 'Ruang Perpustakaan', kategori: 'Ruang Penunjang', penanggungJawab: 'Kepala Perpustakaan' },
  { id: 'RNG-06', nama: 'Laboratorium Komputer', kategori: 'Ruang Pembelajaran', penanggungJawab: 'Kepala Lab Komputer' },
  { id: 'RNG-07', nama: 'Laboratorium IPA / Biologi / Kimia', kategori: 'Ruang Pembelajaran', penanggungJawab: 'Kepala Lab IPA' },
  { id: 'RNG-08', nama: 'Ruang UKS / Konseling (BK)', kategori: 'Ruang Penunjang', penanggungJawab: 'Petugas UKS & Guru BK' },
  { id: 'RNG-09', nama: 'Ruang Kelas X', kategori: 'Ruang Pembelajaran', penanggungJawab: 'Wali Kelas X' },
  { id: 'RNG-10', nama: 'Ruang Kelas XI', kategori: 'Ruang Pembelajaran', penanggungJawab: 'Wali Kelas XI' },
  { id: 'RNG-11', nama: 'Ruang Kelas XII', kategori: 'Ruang Pembelajaran', penanggungJawab: 'Wali Kelas XII' },
  { id: 'RNG-12', nama: 'Tempat Ibadah (Musholla)', kategori: 'Fasilitas Umum', penanggungJawab: 'Pengurus Musholla' },
  { id: 'RNG-13', nama: 'Aula / Lapangan Olahraga', kategori: 'Fasilitas Umum', penanggungJawab: 'Guru PJOK' },
  { id: 'RNG-14', nama: 'Toilet Guru & Siswa', kategori: 'Fasilitas Umum', penanggungJawab: 'Petugas Kebersihan' }
];

export interface Aset {
  id: string; // Barcode / Kode Aset (e.g. SAR-2026-001)
  nama: string;
  merek?: string;
  spesifikasi?: string;
  kategori: KategoriAset;
  ruangLokasi: StandardRuang;
  jumlah: number;
  satuan: string;
  kondisi: KondisiAset;
  sumberDana: string;
  tahunPerolehan: number;
  fotoUrl?: string; // URL Google Drive or Base64
  catatan?: string;
  tanggalRegister?: string;
  serialNumber?: string;
  hargaPerolehan?: number;
  nomorBuktiPerolehan?: string;

  // Standar Permendagri No. 47 Tahun 2021 (Kodefikasi & Register BMD)
  kodeBarangBmd?: string; // Kodefikasi BMD resmi (e.g. 01.01.11.04.001)
  nomorRegisterBmd?: string; // NUP / Register (e.g. 000001)

  // Spesifik KIB A (Tanah)
  luasTanahM2?: number;
  luasM2?: number; // Alias
  letakAlamatTanah?: string;
  letakAlamat?: string; // Alias
  hakTanah?: string; // Hak Pakai, Hak Milik, Hak Pengelolaan
  nomorSertifikatTanah?: string;
  nomorSertifikat?: string; // Alias
  tanggalSertifikatTanah?: string;
  tanggalSertifikat?: string; // Alias
  penggunaanTanah?: string; // e.g. Bangunan Sekolah, Lapangan Olahraga
  penggunaan?: string; // Alias
  asalUsulTanah?: string; // e.g. Pembelian APBD, Hibah
  nomorRegister?: string; // Alias nomorRegisterBmd

  // Spesifik KIB B (Peralatan & Mesin)
  ukuranCc?: string; // Dimensi / Kapasitas / CC
  bahanMaterial?: string; // Kayu, Besi, Plastik, Aluminium
  nomorPabrik?: string; // Pabrik / Seri / IMEI
  nomorRangka?: string; // Khusus kendaraan / alat berat
  nomorMesin?: string;
  nomorPolisi?: string;
  nomorBpkb?: string;

  // Spesifik KIB C (Gedung & Bangunan)
  kondisiBangunanTingkat?: 'Bertingkat' | 'Tidak Bertingkat';
  konstruksiBeton?: 'Beton' | 'Bukan Beton';
  kondisiFisikBangunan?: 'Permanen' | 'Semi Permanen' | 'Darurat';
  luasLantaiM2?: number;
  luasBangunanM2?: number; // Alias
  lokasiGedung?: string;
  nomorDokumenGedung?: string; // IMB / PBG / SIP
  tanggalDokumenGedung?: string;
  statusTanahGedung?: string; // Tanah Milik Pemda, Hak Pakai
  kodeTanahGedung?: string; // Kode Tanah KIB A tempat gedung berdiri
  kodeTanahKibA?: string; // Alias kodeTanahGedung

  // Spesifik KIB D (Jalan, Irigasi & Jaringan)
  konstruksiJaringan?: string; // Aspal, Rabat Beton, Pipa PVC, Fiber Optik
  panjangM?: number;
  panjangMeter?: number; // Alias
  lebarM?: number;
  lebarMeter?: number; // Alias
  luasJaringanM2?: number;
  lokasiJaringan?: string;
  nomorDokumenJaringan?: string;
  nomorDokumenJalan?: string; // Alias
  statusTanahJaringan?: string;

  // Spesifik KIB E (Aset Tetap Lainnya - Buku, Kesenian, Olahraga, Peraga)
  jenisAsetLainnya?: 'Buku/Perpustakaan' | 'Barang Bercorak Kesenian' | 'Hewan/Tumbuhan' | 'Alat Olahraga/Peraga' | string;
  judulBuku?: string;
  pengarangBuku?: string;
  penerbitBuku?: string;
  tahunCetakBuku?: number;
  asalDaerahKesenian?: string;
  penciptaKesenian?: string;
  penciptaSeni?: string; // Alias
  bahanKesenian?: string;

  // Spesifik KIB F (Konstruksi Dalam Pengerjaan / KDP)
  bangunanKdp?: string;
  konstruksiKdp?: 'Bertingkat' | 'Tidak Bertingkat';
  luasKdpM2?: number;
  lokasiKdp?: string;
  tanggalMulaiKdp?: string;
  tanggalMulaiPembangunan?: string; // Alias
  statusTanahKdp?: string;
  nilaiKontrakKdp?: number;
  nilaiKontrakPembangunan?: number; // Alias
  progressFisikPersen?: number;
  persentaseFisikKdp?: number; // Alias
  updatedAt?: string;
}

export interface Peminjaman {
  id: string;
  asetId: string;
  namaAset: string;
  namaPeminjam: string;
  jabatanPeminjam: 'Siswa' | 'Guru' | 'Staf TU' | 'Lainnya';
  tanggalPinjam: string;
  tanggalTargetKembali: string;
  tanggalKembaliAktual?: string;
  jumlahPinjam: number;
  status: 'Dipinjam' | 'Kembali';
  keterangan: string;
  updatedAt?: string;
}

export interface LogPemusnahan {
  id: string;
  asetId: string;
  namaAset: string;
  jumlah: number;
  tanggalPemusnahan: string;
  metode: 'Penjualan/Lelang' | 'Pemusnahan Fisik' | 'Hibah' | 'Transfer Satuan Lain';
  alasan: string; // Alasan penghapusan (e.g. Rusak Berat Total, Kadaluwarsa)
  noSkPenghapusan: string; // Surat Keputusan Penghapusan
  petugasEksekusi: string;
  catatan: string;
  updatedAt?: string;
}

export const AUTHORIZED_USERS = [
  'Nursamsi Muslim Widuri, S.Pd.',
  'Alwing',
  'Apriadi'
] as const;

export type AuthorizedUser = typeof AUTHORIZED_USERS[number];

export interface AuditLog {
  id: string; // e.g. LOG-2026-0001
  timestamp: string; // ISO / Wita formatted string
  operator: string; // 'Nursamsi Muslim Widuri, S.Pd.' | 'Alwing' | 'Apriadi'
  action: 'TAMBAH_ASET' | 'EDIT_ASET' | 'HAPUS_ASET' | 'PINJAM_ASET' | 'KEMBALI_ASET' | 'PEMUSNAHAN_ASET' | 'TAMBAH_BHP' | 'EDIT_BHP' | 'HAPUS_BHP' | 'AMBIL_BHP' | 'UBAH_PENGATURAN' | 'KELOLA_RUANG';
  target: string;
  details: string;
}

export interface PengaturanSekolah {
  namaSekolah: string;
  npsn: string;
  alamat: string;
  kepalaSekolah: string;
  nipKepalaSekolah: string;
  namaPetugasSarpras: string;
  nipPetugasSarpras: string;
  targetKapasitasSiswa: number;
  jumlahRombel?: number;
  jumlahSiswaAktif?: number;
  googleAppsScriptUrl: string;
  googleSpreadsheetUrl?: string;
  googleDriveFolderId: string;
  adminPassword?: string;
  logoUrl?: string;
  updatedAt?: string;
}

// Default state bersih tanpa hardcode URL produksi / data privat
export const DEFAULT_PENGATURAN: PengaturanSekolah = {
  namaSekolah: "SMA Negeri 17 Konawe",
  npsn: "40404643",
  alamat: "Jl. Poros Amonggedo - Meluhu",
  kepalaSekolah: "Hapri, S.Pd., M.Pd",
  nipKepalaSekolah: "",
  namaPetugasSarpras: "Petugas Sarpras",
  nipPetugasSarpras: "",
  targetKapasitasSiswa: 596,
  jumlahRombel: 16,
  jumlahSiswaAktif: 400,
  googleAppsScriptUrl: (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || "",
  googleSpreadsheetUrl: "",
  googleDriveFolderId: (import.meta as any).env?.VITE_GOOGLE_DRIVE_FOLDER_ID || "",
  adminPassword: (import.meta as any).env?.VITE_ADMIN_PASSWORD || "admin123"
};

// Initial state data (kosong secara default untuk penggunaan data real)
export const SAMPLE_ASETS: Aset[] = [];
export const SAMPLE_PEMINJAMANS: Peminjaman[] = [];
export const SAMPLE_PEMUSNAHANS: LogPemusnahan[] = [];

export type KategoriBHP = 
  | 'Alat Tulis Kantor (ATK)'
  | 'Bahan Kebersihan & Sanitasi'
  | 'Kebutuhan Dapur & Konsumsi'
  | 'Alat Pertanian & Taman'
  | 'Kesehatan (UKS/Obat-obatan)'
  | 'Lainnya';

export interface BarangHabisPakai {
  id: string; // e.g. BHP-001
  nama: string;
  merek: string;
  kategori: KategoriBHP;
  stokAwal: number;
  stokSekarang: number;
  stokMinimum?: number; // Batas peringatan restock minimum (default 20-30% atau 5)
  satuan: string; // e.g. Rim, Pcs, Botol, Tabung, Pak
  lokasiPenyimpanan: string; // e.g. Lemari TU, Gudang Sekolah, dll.
  catatan?: string;
  fotoUrl?: string; // URL Google Drive or Base64/Unsplash
  updatedAt?: string;
}

export interface PengambilanBHP {
  id: string; // e.g. AMB-2026-0001
  bhpId: string;
  namaBhp: string;
  namaPenerima: string;
  jabatanPenerima: 'Guru' | 'Staf TU' | 'Lainnya';
  tanggalAmbil: string;
  jumlahDiambil: number;
  satuan: string;
  keterangan: string; // e.g. "Jatah Mengajar Kelas XI-B"
  buktiFisik?: string; // Base64 data string (PDF / Image)
  updatedAt?: string;
}

export const SAMPLE_BHP: BarangHabisPakai[] = [];

export const SAMPLE_PENGAMBILAN_BHP: PengambilanBHP[] = [];

export type StatusKeluhan = 'Menunggu' | 'Dalam Proses' | 'Selesai' | 'Ditolak/Ditunda' | 'Diusulkan ke RAB';
export type UrgensiKeluhan = 'Biasa' | 'Mendesak' | 'Darurat';

export interface KeluhanSarpras {
  id: string; // e.g. KLH-2026-0001
  tanggal: string; // YYYY-MM-DD
  namaPelapor: string;
  jabatanPelapor: 'Guru' | 'Siswa' | 'Staf TU' | 'Masyarakat/Wali' | 'Lainnya';
  lokasiRuang: string;
  namaBarangFasilitas: string;
  deskripsiKerusakan: string;
  urgensi: UrgensiKeluhan;
  fotoKerusakan?: string; // Base64 or Drive URL
  status: StatusKeluhan;
  tanggapanSarpras?: string;
  petugasPenanggungJawab?: string;
  estimasiBiaya?: number;
  tanggalTindakLanjut?: string;
  tanggalSelesai?: string;
  catatanHasil?: string;
}

export const SAMPLE_KELUHAN: KeluhanSarpras[] = [];
