// Types for complete Wakasek Sarpras documents according to official regulations & guidebook

export interface RabItem {
  id: string;
  kodeRekening: string; // ARKAS code, e.g. 5.1.02.03.02.0112
  uraian: string;
  jenisBelanja: 'Pemeliharaan' | 'Modal';
  volume: number;
  satuan: string;
  hargaSatuan: number;
  keterangan: string; // e.g. "Prioritas mendesak", "Untuk KBM"
}

export interface RabSarprasData {
  tahunAnggaran: string;
  sumberDana: string;
  paguTotalBos: number; // For 20% maintenance cap calculation
  items: RabItem[];
  nomorDokumen?: string;
  tanggalDisusun?: string;
}

export interface ProgramKerjaItem {
  id: string;
  no: number;
  kegiatan: string;
  jadwalBulan: boolean[]; // 12 months: Jul, Ags, Sep, Okt, Nov, Des, Jan, Feb, Mar, Apr, Mei, Jun
}

export interface ProgramKerjaData {
  tahunPelajaran: string;
  latarBelakang: string;
  dasarHukum: string[];
  tujuan: string[];
  sasaran: string[];
  matriks: ProgramKerjaItem[];
  penutup: string;
  tanggalPengesahan?: string;
}

export interface JadwalPemeliharaanItem {
  id: string;
  no: number;
  kegiatan: string;
  frekuensi: string; // e.g. "Harian/Mingguan", "Bulanan", "Semester", "Tahunan", "Sebelum musim hujan"
  jadwalBulan: boolean[]; // 12 months: Jul - Jun
}

export interface RiwayatPemeliharaanItem {
  id: string;
  tanggal: string;
  namaBarang: string;
  kerusakanAwal: string;
  tindakan: string;
  pelaksana: string; // "Swakelola" or "Vendor / Teknisi Luar"
  biaya: number;
  hasilAkhir: 'Baik' | 'Kurang Baik' | 'Perlu Penggantian';
  ruangLokasi: string;
}

export interface LaporanBerkalaData {
  periodeLaporan: string; // e.g. "Semester Ganjil 2026/2027" or "Bulan Agustus 2026"
  tahunPelajaran: string;
  ringkasanKegiatan: string;
  kegiatanDilaksanakan: Array<{
    id: string;
    tanggal: string;
    kegiatan: string;
    pelaksana: string;
    sumberDana: string;
    keterangan: string;
  }>;
  realisasiAnggaran: Array<{
    id: string;
    uraian: string;
    anggaranDiajukan: number;
    realisasi: number;
  }>;
  kendala: string;
  rencanaTindakLanjut: string;
}

export interface BarangPenghapusanItem {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  merkType: string;
  tahunPerolehan: number | string;
  jumlah: number;
  satuan: string;
  hargaPerolehan: number;
  kondisi: 'Rusak Berat' | 'RB';
  alasan: string;
  keterangan: string;
}

export interface BapPemeriksaanItem {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  tahunPerolehan: number | string;
  jumlah: number;
  kondisi: 'RB';
  alasanKerusakan: string;
  usulanTindakLanjut: string;
}

export interface SuratUsulanPenghapusanData {
  nomorSurat: string;
  lampiran: string;
  perihal: string;
  tujuanSurat: string;
  kotaTujuan: string;
  tanggalSurat: string;
  catatanTambahan?: string;
}

export interface BaPenghapusanItem {
  id: string;
  kodeBarang: string;
  namaBarang: string;
  jumlah: number;
  kondisi: 'RB';
  caraPenghapusan: 'Pemusnahan Fisik (Dibakar/Dihancurkan)' | 'Penjualan / Lelang' | 'Hibah Resmi' | 'Transfer Satuan Lain';
}

export interface PenghapusanBmdData {
  nomorBapPemeriksaan: string;
  nomorSuratUsulan: string;
  nomorBaPemusnahan: string;
  tanggalPemeriksaan: string;
  tanggalUsulan: string;
  tanggalPemusnahan: string;
  metodePemusnahan: string;
  items: BarangPenghapusanItem[];
  saksi: Array<{ nama: string; jabatan: string }>;
}

export interface AlatPeragaItem {
  id: string;
  no?: number;
  namaAlat: string;
  mataPelajaran?: string;
  jumlah: number;
  satuan?: string;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat' | 'Rusak';
  ruangPenyimpanan?: string;
  lokasiPenyimpanan?: string;
  keterangan: string;
}

export interface BukuPerpustakaanItem {
  id: string;
  no?: number;
  judulBuku: string;
  penulisPengarang?: string;
  pengarang?: string;
  penerbitTahun?: string;
  penerbit?: string;
  kategori: string;
  jumlahEksemplar: number;
  kondisi: 'Baik' | 'Rusak Ringan' | 'Rusak Berat';
  keterangan?: string;
}

export interface JadwalLabItem {
  id: string;
  hari: string;
  jamKe: string;
  mataPelajaran: string;
  kelas: string;
  guruPengampu: string;
  materiPraktikum: string;
  namaLab: string;
}

export interface JadwalLabSlot {
  hari: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu';
  jam1: string;
  jam2: string;
  jam3: string;
  jam4: string;
  jam5: string;
  jam6: string;
}
