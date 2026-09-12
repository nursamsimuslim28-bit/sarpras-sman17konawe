import { BarangHabisPakai } from './types';

export const INITIAL_BOSP_BHP_DATA: BarangHabisPakai[] = [
  // --- 1. KATEGORI ALAT TULIS KANTOR (ATK) & ADMINISTRASI (ARKAS 2024 & 2025) ---
  {
    id: 'BHP-2025-001',
    nama: 'Kertas HVS A4 70/80 GSM PaperOne / Sinar Dunia',
    merek: 'PaperOne / SiDU',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 50,
    stokSekarang: 50,
    stokMinimum: 10,
    satuan: 'Rim',
    lokasiPenyimpanan: 'Lemari Persediaan TU',
    catatan: 'Pengadaan Belanja Bahan Operasional Kantor & Ujian Sekolah (ARKAS 2024/2025)'
  },
  {
    id: 'BHP-2025-002',
    nama: 'Kertas HVS Folio / F4 70/80 GSM',
    merek: 'SiDU / Bola Dunia',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 60,
    stokSekarang: 60,
    stokMinimum: 12,
    satuan: 'Rim',
    lokasiPenyimpanan: 'Lemari Persediaan TU',
    catatan: 'Pengadaan Belanja Kertas Penggandaan Modul Ajar & Ulangan Semester'
  },
  {
    id: 'BHP-2025-003',
    nama: 'Tinta Printer Epson 003 Black Original (EcoTank)',
    merek: 'Epson 003',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 15,
    stokSekarang: 15,
    stokMinimum: 4,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Tinta Printer L3210/L3110 Administrasi & Pencetakan Nilai/Rapor'
  },
  {
    id: 'BHP-2025-004',
    nama: 'Tinta Printer Epson 003 Color Set (Cyan, Magenta, Yellow)',
    merek: 'Epson 003 Color',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 12,
    stokSekarang: 12,
    stokMinimum: 3,
    satuan: 'Set',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Tinta Warna Cetak Piagam, Sertifikat & Grafik Sekolah'
  },
  {
    id: 'BHP-2025-005',
    nama: 'Spidol Whiteboard Snowman Boardmarker Hitam/Biru (BG-12)',
    merek: 'Snowman',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 36,
    stokSekarang: 36,
    stokMinimum: 8,
    satuan: 'Lusin',
    lokasiPenyimpanan: 'Lemari ATK Guru / TU',
    catatan: 'Distribusi Bulanan Ruang Kelas Belajar (ARKAS BOSP)'
  },
  {
    id: 'BHP-2025-006',
    nama: 'Tinta Isi Ulang Spidol Whiteboard Snowman Ink Refill',
    merek: 'Snowman Refill Ink',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 24,
    stokSekarang: 24,
    stokMinimum: 6,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Lemari ATK Guru / TU',
    catatan: 'Refill Spidol Papan Tulis Kelas'
  },
  {
    id: 'BHP-2025-007',
    nama: 'Map Kertas Snelhecter & Map Folio Stopmap',
    merek: 'Diamond / Biola',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 10,
    stokSekarang: 10,
    stokMinimum: 2,
    satuan: 'Pak',
    lokasiPenyimpanan: 'Lemari Persediaan TU',
    catatan: 'Pengarsipan Dokumen Kesiswaan & Kurikulum'
  },
  {
    id: 'BHP-2025-008',
    nama: 'Map Plastik Portofolio Siswa / Ordner Dokumen',
    merek: 'Bantex / Joyko',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 30,
    stokSekarang: 30,
    stokMinimum: 5,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Arsip Akreditasi & Surat Masuk/Keluar'
  },
  {
    id: 'BHP-2025-009',
    nama: 'Buku Agenda Surat & Buku Induk Ekspedisi',
    merek: 'Mirage / Gelatik',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 12,
    stokSekarang: 12,
    stokMinimum: 3,
    satuan: 'Buku',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Buku Catatan Persuratan & Disposisi Kepala Sekolah'
  },
  {
    id: 'BHP-2025-010',
    nama: 'Isi Staples No. 10 & No. 3 Joyko / Max',
    merek: 'Joyko / Max',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 20,
    stokSekarang: 20,
    stokMinimum: 4,
    satuan: 'Kotak',
    lokasiPenyimpanan: 'Lemari Persediaan TU',
    catatan: 'Kelengkapan Penjilidan Soal Ujian'
  },
  {
    id: 'BHP-2025-011',
    nama: 'Plastik Laminating KTP/Ijazah & Sampul Rapor K-Merdeka',
    merek: 'Hombo / Joyko',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 5,
    stokSekarang: 5,
    stokMinimum: 1,
    satuan: 'Pak',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Pelindung Dokumen & Ijazah Siswa'
  },
  {
    id: 'BHP-2025-012',
    nama: 'Amplop Surat Dinas Berkop Sekolah (Kabinet)',
    merek: 'Merpati / Paperline',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 15,
    stokSekarang: 15,
    stokMinimum: 3,
    satuan: 'Kotak',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Distribusi Undangan Wali Murid & Surat Dinas'
  },

  // --- 2. KATEGORI BAHAN PRAKTIK / LAINNYA ---
  {
    id: 'BHP-2025-013',
    nama: 'Kertas Gambar / Karton / Kanvas Lukis Praktik Seni',
    merek: 'Fabriano / Joyko',
    kategori: 'Lainnya',
    stokAwal: 100,
    stokSekarang: 100,
    stokMinimum: 20,
    satuan: 'Lembar',
    lokasiPenyimpanan: 'Sanggar Seni / Lab Prakarya',
    catatan: 'Bahan Pembelajaran Praktik Seni Budaya & PKWu'
  },
  {
    id: 'BHP-2025-014',
    nama: 'Cat Akrilik & Kuas Lukis Set Praktik Siswa',
    merek: 'Maries / Pentel',
    kategori: 'Lainnya',
    stokAwal: 15,
    stokSekarang: 15,
    stokMinimum: 3,
    satuan: 'Set',
    lokasiPenyimpanan: 'Sanggar Seni',
    catatan: 'Praktik Melukis & Karya Siswa (ARKAS BOSP)'
  },
  {
    id: 'BHP-2025-015',
    nama: 'Kaca Benda & Kaca Penutup (Cover Glass Mikroskop Lab)',
    merek: 'Sail Brand',
    kategori: 'Lainnya',
    stokAwal: 10,
    stokSekarang: 10,
    stokMinimum: 2,
    satuan: 'Kotak',
    lokasiPenyimpanan: 'Laboratorium Biologi/Kimia',
    catatan: 'Bahan Praktikum Pengamatan Mikroskop IPA/Biologi'
  },
  {
    id: 'BHP-2025-016',
    nama: 'Kertas Lakmus Merah & Biru (Indikator Asam Basa Kimia)',
    merek: 'Merck / Indikator',
    kategori: 'Lainnya',
    stokAwal: 8,
    stokSekarang: 8,
    stokMinimum: 2,
    satuan: 'Buku/Kotak',
    lokasiPenyimpanan: 'Laboratorium Kimia',
    catatan: 'Praktikum Kimia Pengujian pH Larutan'
  },

  // --- 3. KATEGORI KEBERSIHAN & SANITASI SEKOLAH ---
  {
    id: 'BHP-2025-017',
    nama: 'Cairan Pembersih Lantai & Karbol Disinfektan (4-5 Liter)',
    merek: 'Wipol / SuperPell / SOS',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 12,
    stokSekarang: 12,
    stokMinimum: 3,
    satuan: 'Jerigen',
    lokasiPenyimpanan: 'Gudang Kebersihan & Sarpras',
    catatan: 'Sanitasi Harian Ruang Kelas, Koridor & Ruang Guru'
  },
  {
    id: 'BHP-2025-018',
    nama: 'Sabun Cuci Tangan Cair (Hand Soap Refill 4L)',
    merek: 'Yuri / Dettol / SOS',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 8,
    stokSekarang: 8,
    stokMinimum: 2,
    satuan: 'Jerigen',
    lokasiPenyimpanan: 'Gudang Kebersihan & Sarpras',
    catatan: 'Refill Dispenser Sabun Wastafel Seluruh Kelas'
  },
  {
    id: 'BHP-2025-019',
    nama: 'Cairan Pembersih Kloset / Porstex Keramik Porselen',
    merek: 'Porstex / Vixal',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 10,
    stokSekarang: 10,
    stokMinimum: 2,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Gudang Kebersihan & Sarpras',
    catatan: 'Perawatan Kebersihan Toilet Guru & Siswa'
  },
  {
    id: 'BHP-2025-020',
    nama: 'Kantong Plastik Sampah Hitam Besar (Trash Bag 90x120 cm)',
    merek: 'Eco Trash Bag',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 15,
    stokSekarang: 15,
    stokMinimum: 3,
    satuan: 'Pak',
    lokasiPenyimpanan: 'Gudang Kebersihan & Sarpras',
    catatan: 'Pengelolaan Sampah Lingkungan Sekolah'
  },
  {
    id: 'BHP-2025-021',
    nama: 'Kain Pel Refill & Lap Microfiber Kebersihan',
    merek: 'Nagoya / Scotch Brite',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 20,
    stokSekarang: 20,
    stokMinimum: 4,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Gudang Kebersihan & Sarpras',
    catatan: 'Penggantian Berkala Kain Pel Kelas & TU'
  },
  {
    id: 'BHP-2025-022',
    nama: 'Kamper Toilet & Pengharum Ruangan Spray / Gantung',
    merek: 'Swallow / Glade / Stella',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 25,
    stokSekarang: 25,
    stokMinimum: 5,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Gudang Kebersihan & Sarpras',
    catatan: 'Kenyamanan Ruang Kantor, Guru, & Toilet'
  },

  // --- 4. KATEGORI RUMAH TANGGA SEKOLAH & GAS DAPUR ---
  {
    id: 'BHP-2025-023',
    nama: 'Tabung Gas Elpiji 3 Kg (Refill Isi Ulang)',
    merek: 'Pertamina Bright/LPG 3Kg',
    kategori: 'Kebutuhan Dapur & Konsumsi',
    stokAwal: 6,
    stokSekarang: 6,
    stokMinimum: 2,
    satuan: 'Tabung',
    lokasiPenyimpanan: 'Dapur Sekolah / Ruang Guru',
    catatan: 'Kebutuhan Dapur Guru & Kegiatan Praktik Boga Siswa'
  },
  {
    id: 'BHP-2025-024',
    nama: 'Air Mineral Galon Aqua / Club Refill',
    merek: 'Aqua / Club',
    kategori: 'Kebutuhan Dapur & Konsumsi',
    stokAwal: 30,
    stokSekarang: 30,
    stokMinimum: 6,
    satuan: 'Galon',
    lokasiPenyimpanan: 'Ruang Guru & Tata Usaha',
    catatan: 'Konsumsi Harian Tenaga Pendidik & Kependidikan'
  },

  // --- 5. KATEGORI KESEHATAN, OBAT & P3K UKS ---
  {
    id: 'BHP-2025-025',
    nama: 'Obat-obatan Dasar P3K (Paracetamol, Antasida, Tolak Angin)',
    merek: 'Kimia Farma / Generic',
    kategori: 'Kesehatan (UKS/Obat-obatan)',
    stokAwal: 20,
    stokSekarang: 20,
    stokMinimum: 5,
    satuan: 'Strip/Kotak',
    lokasiPenyimpanan: 'Ruang UKS (Lemari Obat)',
    catatan: 'Pertolongan Pertama Penanganan Sakit Siswa/Guru'
  },
  {
    id: 'BHP-2025-026',
    nama: 'Minyak Kayu Putih 120ml / Minyak Telon',
    merek: 'Cap Lang',
    kategori: 'Kesehatan (UKS/Obat-obatan)',
    stokAwal: 8,
    stokSekarang: 8,
    stokMinimum: 2,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Ruang UKS',
    catatan: 'Persediaan Kotak P3K Sekolah & UKS'
  },
  {
    id: 'BHP-2025-027',
    nama: 'Kasa Steril, Kapas Medis, Plester Cepat & Betadine Antiseptik',
    merek: 'Hansaplast / Onemed',
    kategori: 'Kesehatan (UKS/Obat-obatan)',
    stokAwal: 15,
    stokSekarang: 15,
    stokMinimum: 4,
    satuan: 'Pak/Kotak',
    lokasiPenyimpanan: 'Ruang UKS (Kotak P3K)',
    catatan: 'Penanganan Luka Ringan Siswa Saat Olahraga/Upacara'
  },
  {
    id: 'BHP-2025-028',
    nama: 'Alkohol 70% 300ml & Hand Sanitizer Gel',
    merek: 'Onemed / Medika',
    kategori: 'Kesehatan (UKS/Obat-obatan)',
    stokAwal: 10,
    stokSekarang: 10,
    stokMinimum: 3,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Ruang UKS & Lab IPA',
    catatan: 'Antiseptik Pembersih Luka & Higienitas Medis'
  },

  // --- 6. KATEGORI PERALATAN OLAHRAGA & PORSENI SISWA (RKAS 2023) ---
  {
    id: 'BHP-2023-001',
    nama: 'Bola Basket Molten / Mikasa Original',
    merek: 'Molten / Mikasa',
    kategori: 'Lainnya',
    stokAwal: 4,
    stokSekarang: 4,
    stokMinimum: 1,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Ruang Olahraga / OSIS',
    catatan: 'Penyelenggaraan PORSENI & Pembelajaran PJOK (RKAS 2023 No. 129)'
  },
  {
    id: 'BHP-2023-002',
    nama: 'Bola Kaki / Sepak Bola Standar FIFA',
    merek: 'Specs / Mikasa Size 5',
    kategori: 'Lainnya',
    stokAwal: 8,
    stokSekarang: 8,
    stokMinimum: 2,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Ruang Olahraga / OSIS',
    catatan: 'Penyelenggaraan PORSENI & Ekskul Sepak Bola (RKAS 2023 No. 130)'
  },
  {
    id: 'BHP-2023-003',
    nama: 'Bola Voli & Net Voli Standar Pertandingan',
    merek: 'Mikasa / Molten V300W',
    kategori: 'Lainnya',
    stokAwal: 6,
    stokSekarang: 6,
    stokMinimum: 2,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Ruang Olahraga / OSIS',
    catatan: 'Penyelenggaraan PORSENI & PJOK Bola Voli (RKAS 2023 No. 131-132)'
  },
  {
    id: 'BHP-2023-004',
    nama: 'Bola Takraw Rotan/Sintetis & Net Takraw',
    merek: 'Marathon Gajah Emas',
    kategori: 'Lainnya',
    stokAwal: 8,
    stokSekarang: 8,
    stokMinimum: 2,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Ruang Olahraga / OSIS',
    catatan: 'PORSENI & Ekskul Sepak Takraw (RKAS 2023 No. 133-134)'
  },
  {
    id: 'BHP-2023-005',
    nama: 'Shuttlecock Bulutangkis & Raket Badminton',
    merek: 'Samurai / Garuda / Yonex',
    kategori: 'Lainnya',
    stokAwal: 15,
    stokSekarang: 15,
    stokMinimum: 3,
    satuan: 'Slop/Buah',
    lokasiPenyimpanan: 'Ruang Olahraga / OSIS',
    catatan: 'PORSENI & Praktik Bulutangkis Siswa (RKAS 2023 No. 136-137)'
  },

  // --- 7. KATEGORI TAMAN, PERTANIAN & PEMELIHARAAN LAPANGAN (RKAS 2023) ---
  {
    id: 'BHP-2023-006',
    nama: 'Herbisida Pembasmi Rumput Liar (Rondap & Ramuska)',
    merek: 'Roundup / Ramuska 486 SL',
    kategori: 'Alat Pertanian & Taman',
    stokAwal: 20,
    stokSekarang: 20,
    stokMinimum: 4,
    satuan: 'Liter',
    lokasiPenyimpanan: 'Gudang Sarpras / Kebersihan',
    catatan: 'Pemeliharaan Taman & Halaman Upacara (RKAS 2023 No. 75-76)'
  },
  {
    id: 'BHP-2023-007',
    nama: 'Bahan Bakar Bensin & Oli Mesin Rumput Sekolah',
    merek: 'Pertalite & Castrol/Mesran 2T/4T',
    kategori: 'Alat Pertanian & Taman',
    stokAwal: 50,
    stokSekarang: 50,
    stokMinimum: 10,
    satuan: 'Liter',
    lokasiPenyimpanan: 'Gudang Sarpras',
    catatan: 'Operasional Pemotongan Rumput Lapangan & Kebun (RKAS 2023 No. 77-78)'
  },

  // --- 8. KATEGORI BHP & ATK PENGADAAN RKAS 2026 ---
  {
    id: 'BHP-2026-001',
    nama: 'Kertas HVS Folio / F4 75 GSM (RKAS 2026)',
    merek: 'SiDU / Bola Dunia 75 GSM',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 150,
    stokSekarang: 150,
    stokMinimum: 25,
    satuan: 'Rim',
    lokasiPenyimpanan: 'Lemari Persediaan TU',
    catatan: 'Belanja Kertas Administrasi, P5, Asesmen & Ujian Sekolah (RKAS 2026)'
  },
  {
    id: 'BHP-2026-002',
    nama: 'Tinta Printer Epson Original Hitam 65 ml (003)',
    merek: 'Epson 003 Black',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 30,
    stokSekarang: 30,
    stokMinimum: 5,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Tinta Printer EcoTank Cetak Dokumen Sekolah (RKAS 2026)'
  },
  {
    id: 'BHP-2026-003',
    nama: 'Tinta Printer Epson Original Warna 65 ml (Cyan/Magenta/Yellow)',
    merek: 'Epson 003 Color',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 80,
    stokSekarang: 80,
    stokMinimum: 15,
    satuan: 'Botol',
    lokasiPenyimpanan: 'Ruang Tata Usaha (TU)',
    catatan: 'Tinta Warna Cetak Piagam, Rapor & Brosur PPDB (RKAS 2026)'
  },
  {
    id: 'BHP-2026-004',
    nama: 'Benda Pos - Materai Tempel 10.000',
    merek: 'Pos Indonesia / DJP 10.000',
    kategori: 'Alat Tulis Kantor (ATK)',
    stokAwal: 600,
    stokSekarang: 600,
    stokMinimum: 50,
    satuan: 'Lembar',
    lokasiPenyimpanan: 'Brankas / Lemari Bendahara',
    catatan: 'Bea Materai Laporan Pertanggungjawaban & Administrasi Bank (RKAS 2026 No. 348)'
  },
  {
    id: 'BHP-2026-005',
    nama: 'Paket Alat Kebersihan & Sanitasi Lingkungan (Sapu, Pel, Tong Sampah)',
    merek: 'Nagoya / Lion Star',
    kategori: 'Bahan Kebersihan & Sanitasi',
    stokAwal: 60,
    stokSekarang: 60,
    stokMinimum: 10,
    satuan: 'Buah',
    lokasiPenyimpanan: 'Gudang Kebersihan Sarpras',
    catatan: 'Penunjang Sanitasi & Kebersihan Seluruh Kelas (RKAS 2026 No. 326-330)'
  },
  {
    id: 'BHP-2026-006',
    nama: 'Obat & Perlengkapan Kesehatan Penunjang UKS',
    merek: 'Betadine, Alkohol 70%, Masker Medis',
    kategori: 'Kesehatan (UKS/Obat-obatan)',
    stokAwal: 25,
    stokSekarang: 25,
    stokMinimum: 5,
    satuan: 'Paket',
    lokasiPenyimpanan: 'Ruang UKS Sekolah',
    catatan: 'Penyelenggaraan & Pertolongan Pertama Siswa UKS (RKAS 2026 No. 90-96)'
  }
];
