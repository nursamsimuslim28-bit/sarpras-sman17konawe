// Master Kode Barang BMD - diekstrak dari data resmi Provinsi Sulawesi Tenggara
// (rptrekapkib_b/c/e.xls, BPKAD/Pemprov Sultra) - bukan perkiraan, sumbernya asli.
// Struktur kode 5 segmen (Golongan.Bidang.Kelompok.SubKelompok.SubSubKelompok) sesuai Permendagri 108/2016.
import { KategoriAset } from '../types';

export interface MasterKodeBmd {
  kode: string;
  nama: string;
  kategori: KategoriAset;
  frekuensi: number; // jumlah unit terdaftar resmi dengan kode ini di data provinsi
}

export const MASTER_KODE_BMD: MasterKodeBmd[] = [
  { kode: '02.04.03.08.012', nama: 'Termometer Standard', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.05.01.04.005', nama: 'Lemari Penyimpanan', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 5 },
  { kode: '02.05.02.04.009', nama: 'Alat Laboratorium Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 148 },
  { kode: '02.06.01.05.007', nama: 'Papan Pengumunan', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.01.05.008', nama: 'Papan Tulis', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.06.01.05.017', nama: 'Mesin Absensi', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.01.05.040', nama: 'Alat Kantor Lainnya (lain-lain)', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 19 },
  { kode: '02.06.01.05.043', nama: 'Mesin Pompa Air', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.06.02.01.004', nama: 'Meja Kayu/rotan', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 5 },
  { kode: '02.06.02.01.005', nama: 'Kursi Besi/metal', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.01.006', nama: 'Kursi Kayu/rotan/bambu', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 3 },
  { kode: '02.06.02.01.026', nama: 'Meja Sekolah', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 3 },
  { kode: '02.06.02.01.027', nama: 'Kursi Rapat', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.01.030', nama: 'Kursi Putar', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.01.031', nama: 'Kursi Biasa', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.01.032', nama: 'Bangku Sekolah', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.06.02.01.047', nama: 'Tenda', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.01.048', nama: 'Meja Biro', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 3 },
  { kode: '02.06.02.01.066', nama: 'Kursi Kerja', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.02.001', nama: 'Jam Mekanis', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.03.003', nama: 'Mesin Potong Rumput', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.06.02.04.006', nama: 'Kipas Angin', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 7 },
  { kode: '02.06.02.06.003', nama: 'Televisi', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.06.018', nama: 'Unit Power Supply', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.06.028', nama: 'Lambang Garuda Pancasila', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.02.06.050', nama: 'Alat Rumah Tangga Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 7 },
  { kode: '02.06.03.02.001', nama: 'P.c Unit/ Komputer Pc', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 3 },
  { kode: '02.06.03.02.002', nama: 'Lap Top', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 9 },
  { kode: '02.06.03.04.008', nama: 'Printer', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 7 },
  { kode: '02.06.03.06.004', nama: 'Modem', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.03.06.006', nama: 'Peralatan Jaringan Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.06.03.06.010', nama: 'Switch Hub', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.04.01.010', nama: 'Meja Kerja', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.06.04.07.006', nama: 'Lemari Arsip Untuk Arsip Dinamis', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.07.01.01.003', nama: 'Proyektor + Attachment', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 7 },
  { kode: '02.07.01.01.040', nama: 'Microphone/wireless Mic', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.07.01.01.087', nama: 'Layar Proyektor', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 5 },
  { kode: '02.07.02.01.024', nama: 'Alat Komunikasi Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.07.03.06.001', nama: 'Antena Mf/mw Portable', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.09.01.17.022', nama: 'Tangki Liquid Nitrogen', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.09.02.04.059', nama: 'Layar', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 2 },
  { kode: '02.09.02.04.070', nama: 'Bel Listrik', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.09.02.06.040', nama: 'Alat Peraga Ipa Atas Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.09.02.10.017', nama: 'Alat Peraga Kesenian Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 5 },
  { kode: '02.09.02.11.008', nama: 'Alat Peraga Olah Raga Lain-lain', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 23 },
  { kode: '02.09.02.12.005', nama: 'Gambar Tokoh-tokoh Nasional', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '02.10.05.01.004', nama: 'Cctv', kategori: 'KIB B (Peralatan dan Mesin)', frekuensi: 1 },
  { kode: '03.11.01.01.001', nama: 'Bangunan Gedung Kantor Permanen', kategori: 'KIB C (Gedung dan Bangunan)', frekuensi: 1 },
  { kode: '03.11.01.05.001', nama: 'Bangunan Gedung Laboratorium Permanen', kategori: 'KIB C (Gedung dan Bangunan)', frekuensi: 1 },
  { kode: '03.11.01.10.001', nama: 'Bangunan Gedung Tempat Pendidikan Permanen', kategori: 'KIB C (Gedung dan Bangunan)', frekuensi: 4 },
  { kode: '03.11.01.10.005', nama: 'Bangunan Kamar Mandi', kategori: 'KIB C (Gedung dan Bangunan)', frekuensi: 1 },
  { kode: '03.11.01.27.005', nama: 'Konstruksi Pagar', kategori: 'KIB C (Gedung dan Bangunan)', frekuensi: 1 },
  { kode: '05.17.01.01.004', nama: 'Ensyclopedia, Kamus, Buku Referensi', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 36 },
  { kode: '05.17.01.01.010', nama: 'Buku Umum Lain-lain', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 599 },
  { kode: '05.17.01.02.001', nama: 'Metafisika', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 11 },
  { kode: '05.17.01.03.001', nama: 'Agama Islam', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 92 },
  { kode: '05.17.01.03.002', nama: 'Agama Kristen', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 30 },
  { kode: '05.17.01.03.003', nama: 'Agama Budha', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 23 },
  { kode: '05.17.01.03.004', nama: 'Agama Hindu', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 39 },
  { kode: '05.17.01.03.005', nama: 'Buku Agama Lain-lain', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 20 },
  { kode: '05.17.01.04.001', nama: 'Sosiologi', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 85 },
  { kode: '05.17.01.04.004', nama: 'Ekonomi', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 106 },
  { kode: '05.17.01.05.002', nama: 'Pengetahuan Bahasa Indonesia', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 119 },
  { kode: '05.17.01.05.003', nama: 'Pengetahuan Bahasa Inggris', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 127 },
  { kode: '05.17.01.05.004', nama: 'Buku Ilmu Bahasa Lain-lain', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 1 },
  { kode: '05.17.01.06.001', nama: 'Matematika', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 145 },
  { kode: '05.17.01.06.003', nama: 'Fisika Dan Mekanika', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 104 },
  { kode: '05.17.01.06.004', nama: 'Kimia', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 96 },
  { kode: '05.17.01.06.005', nama: 'Geologi, Metrologi', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 1 },
  { kode: '05.17.01.06.007', nama: 'Biologi, Antopologi', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 108 },
  { kode: '05.17.01.08.009', nama: 'Buku Arsitektur, Kesenian, Olah Raga Lain-lain', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 198 },
  { kode: '05.17.01.09.001', nama: 'Geografi, Eksplorasi', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 47 },
  { kode: '05.17.01.09.003', nama: 'Sejarah', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 229 },
  { kode: '05.17.01.09.004', nama: 'Buku Geografi, Biografi , Sejarah Lain-lain', kategori: 'KIB E (Aset Tetap Lainnya)', frekuensi: 4 },
];

/**
 * Cari kode BMD resmi berdasarkan nama barang yang diketik pengguna.
 * Pencocokan berbasis kata kunci (bukan sekadar kemiripan karakter), diurutkan
 * dari yang paling relevan (jumlah kata kunci sama terbanyak, lalu frekuensi
 * pemakaian resmi tertinggi).
 */
export function searchMasterKodeBmd(query: string, limit: number = 6): MasterKodeBmd[] {
  const q = (query || '').trim().toLowerCase();
  if (q.length < 3) return [];

  const qWords = q.split(/\s+/).filter(w => w.length >= 3);
  if (qWords.length === 0) return [];

  const scored = MASTER_KODE_BMD.map(entry => {
    const nameLower = entry.nama.toLowerCase();
    let score = 0;
    if (nameLower === q) score += 100;
    else if (nameLower.startsWith(q)) score += 50;
    else if (nameLower.includes(q)) score += 30;
    for (const w of qWords) {
      if (nameLower.includes(w)) score += 5;
    }
    return { entry, score };
  }).filter(s => s.score > 0);

  scored.sort((a, b) => b.score - a.score || b.entry.frekuensi - a.entry.frekuensi);
  return scored.slice(0, limit).map(s => s.entry);
}
