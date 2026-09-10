import {
  RabSarprasData,
  ProgramKerjaData,
  JadwalPemeliharaanItem,
  RiwayatPemeliharaanItem,
  LaporanBerkalaData,
  BapPemeriksaanItem,
  SuratUsulanPenghapusanData,
  BaPenghapusanItem,
  AlatPeragaItem,
  BukuPerpustakaanItem,
  JadwalLabSlot
} from '../types/dokumenSarpras';

export const DEFAULT_PROGRAM_KERJA: ProgramKerjaData = {
  tahunPelajaran: "2026/2027",
  latarBelakang: "Sarana dan prasarana merupakan komponen penting penunjang proses belajar mengajar. Program kerja ini disusun sebagai pedoman pelaksanaan tugas Wakasek Sarpras selama satu tahun pelajaran, agar pengelolaan sarpras berjalan terencana, tercatat rapi, dan dapat dipertanggungjawabkan.",
  dasarHukum: [
    "Peraturan Pemerintah No. 27 Tahun 2014 jo. PP No. 28 Tahun 2020 tentang Pengelolaan Barang Milik Negara/Daerah.",
    "Permendagri No. 47 Tahun 2021 tentang Tata Cara Pelaksanaan Pembukuan, Inventarisasi, dan Pelaporan Barang Milik Daerah.",
    "Permendagri No. 108 Tahun 2016 tentang Penggolongan dan Kodefikasi Barang Milik Daerah.",
    "Permendagri No. 1 Tahun 2019 tentang Penyusutan Barang Milik Daerah.",
    "Permendikbudristek No. 22 Tahun 2023 tentang Standar Sarana dan Prasarana pada PAUD, Pendidikan Dasar, dan Pendidikan Menengah.",
    "Permendikdasmen No. 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana BOSP.",
    "Surat Keputusan Kepala Sekolah tentang Pembagian Tugas Tahun Pelajaran 2026/2027."
  ],
  tujuan: [
    "Memastikan seluruh sarana-prasarana tercatat, terpantau kondisinya, dan sesuai standar minimal yang berlaku.",
    "Menjamin ketersediaan fasilitas yang mendukung kelancaran proses belajar mengajar (KBM).",
    "Menyediakan data dan dokumen administrasi yang akurat untuk kebutuhan akreditasi maupun pelaporan ke Dinas Pendidikan."
  ],
  sasaran: [
    "Seluruh ruang dan aset sekolah (kelas, kantor, laboratorium, perpustakaan, sanitasi, dan area penunjang lain).",
    "Seluruh dokumen administrasi sarpras: Buku Induk Inventaris, KIR, RAB, laporan berkala, dan berita acara penghapusan."
  ],
  matriks: [
    { id: 'pk-1', no: 1, kegiatan: 'Serah terima data & evaluasi kondisi sarpras tahun lalu', jadwalBulan: [true, false, false, false, false, false, false, false, false, false, false, false] },
    { id: 'pk-2', no: 2, kegiatan: 'Stock opname / pengecekan fisik seluruh ruang', jadwalBulan: [true, false, false, false, false, false, true, false, false, false, false, false] },
    { id: 'pk-3', no: 3, kegiatan: 'Penyusunan & pembaruan Buku Induk Inventaris dan KIR', jadwalBulan: [true, true, false, false, false, false, true, true, false, false, false, false] },
    { id: 'pk-4', no: 4, kegiatan: 'Penyusunan RAB dan Program Kerja tahunan', jadwalBulan: [true, true, false, false, false, false, false, false, false, false, false, false] },
    { id: 'pk-5', no: 5, kegiatan: 'Pengajuan RAB ke Kepala Sekolah/Komite', jadwalBulan: [false, true, false, false, false, false, false, false, false, false, false, false] },
    { id: 'pk-6', no: 6, kegiatan: 'Pemeliharaan rutin kebersihan & kelistrikan', jadwalBulan: [true, true, true, true, true, true, true, true, true, true, true, true] },
    { id: 'pk-7', no: 7, kegiatan: 'Pemeliharaan berkala gedung & sanitasi', jadwalBulan: [false, false, true, false, false, true, false, false, true, false, false, true] },
    { id: 'pk-8', no: 8, kegiatan: 'Pengadaan sarana sesuai RAB', jadwalBulan: [false, false, true, true, false, false, false, false, true, true, false, false] },
    { id: 'pk-9', no: 9, kegiatan: 'Penanganan laporan kerusakan (insidental)', jadwalBulan: [true, true, true, true, true, true, true, true, true, true, true, true] },
    { id: 'pk-10', no: 10, kegiatan: 'Penyusunan laporan berkala (semester)', jadwalBulan: [false, false, false, false, false, true, false, false, false, false, false, true] },
    { id: 'pk-11', no: 11, kegiatan: 'Pendataan barang rusak berat & usulan penghapusan', jadwalBulan: [false, false, false, false, true, false, false, false, false, false, true, false] },
    { id: 'pk-12', no: 12, kegiatan: 'Evaluasi & penyusunan laporan tahunan', jadwalBulan: [false, false, false, false, false, false, false, false, false, false, false, true] }
  ],
  penutup: "Program kerja ini bersifat fleksibel dan dapat disesuaikan dengan kondisi serta kebutuhan mendesak yang muncul selama tahun pelajaran berjalan, dengan tetap melapor dan berkoordinasi dengan Kepala Sekolah."
};

export const DEFAULT_RAB: RabSarprasData = {
  tahunAnggaran: "2026",
  sumberDana: "Dana BOSP (BOS Reguler)",
  paguTotalBos: 380000000,
  items: [
    {
      id: 'rab-1',
      kodeRekening: '5.1.02.03.02.0112',
      uraian: 'Pemeliharaan dan perbaikan plafon & atap ruang kelas',
      jenisBelanja: 'Pemeliharaan',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 12500000,
      keterangan: 'Prioritas mendesak (mencegah bocor saat hujan)'
    },
    {
      id: 'rab-2',
      kodeRekening: '5.1.02.03.02.0405',
      uraian: 'Perbaikan instalasi listrik & penggantian lampu LED hemat energi ruang kelas',
      jenisBelanja: 'Pemeliharaan',
      volume: 16,
      satuan: 'Titik',
      hargaSatuan: 350000,
      keterangan: 'Kenyamanan penerangan belajar KBM'
    },
    {
      id: 'rab-3',
      kodeRekening: '5.1.02.03.02.0401',
      uraian: 'Servis berkala pendingin ruangan (AC) Laboratorium Komputer & Perpustakaan',
      jenisBelanja: 'Pemeliharaan',
      volume: 8,
      satuan: 'Unit',
      hargaSatuan: 250000,
      keterangan: 'Perawatan rutin per semester'
    },
    {
      id: 'rab-4',
      kodeRekening: '5.2.02.05.01.0005',
      uraian: 'Pengadaan Meja dan Kursi Siswa Standar Kemendikbud',
      jenisBelanja: 'Modal',
      volume: 30,
      satuan: 'Set',
      hargaSatuan: 650000,
      keterangan: 'Penambahan daya tampung rombel baru'
    },
    {
      id: 'rab-5',
      kodeRekening: '5.2.02.10.01.0002',
      uraian: 'Pengadaan PC Komputer Client Laboratorium Informatika',
      jenisBelanja: 'Modal',
      volume: 5,
      satuan: 'Unit',
      hargaSatuan: 9500000,
      keterangan: 'Penunjang Asesmen Nasional & TIK'
    }
  ]
};

export const DEFAULT_JADWAL_PEMELIHARAAN: JadwalPemeliharaanItem[] = [
  { id: 'jp-1', no: 1, kegiatan: 'Kebersihan ruangan & lingkungan', frekuensi: 'Harian/Mingguan', jadwalBulan: [true, true, true, true, true, true, true, true, true, true, true, true] },
  { id: 'jp-2', no: 2, kegiatan: 'Pengecekan instalasi listrik', frekuensi: 'Bulanan', jadwalBulan: [true, true, true, true, true, true, true, true, true, true, true, true] },
  { id: 'jp-3', no: 3, kegiatan: 'Pengecekan & pengisian ulang APAR', frekuensi: 'Semester', jadwalBulan: [true, false, false, false, false, false, true, false, false, false, false, false] },
  { id: 'jp-4', no: 4, kegiatan: 'Perawatan taman & area luar', frekuensi: 'Bulanan', jadwalBulan: [true, true, true, true, true, true, true, true, true, true, true, true] },
  { id: 'jp-5', no: 5, kegiatan: 'Pengecekan sanitasi & saluran air', frekuensi: 'Bulanan', jadwalBulan: [true, true, true, true, true, true, true, true, true, true, true, true] },
  { id: 'jp-6', no: 6, kegiatan: 'Pengecatan ulang gedung/kelas', frekuensi: 'Tahunan', jadwalBulan: [false, false, false, false, false, true, false, false, false, false, false, false] },
  { id: 'jp-7', no: 7, kegiatan: 'Servis komputer/perangkat TIK', frekuensi: 'Semester', jadwalBulan: [false, true, false, false, false, false, false, true, false, false, false, false] },
  { id: 'jp-8', no: 8, kegiatan: 'Pengecekan atap & talang air', frekuensi: 'Sebelum musim hujan', jadwalBulan: [false, false, false, false, false, false, false, false, false, true, false, false] },
  { id: 'jp-9', no: 9, kegiatan: 'Perawatan alat laboratorium', frekuensi: 'Semester', jadwalBulan: [false, true, false, false, false, false, false, true, false, false, false, false] },
  { id: 'jp-10', no: 10, kegiatan: 'Pengecekan pagar, tangga, area rawan kecelakaan', frekuensi: 'Semester', jadwalBulan: [true, false, false, false, false, false, true, false, false, false, false, false] }
];

export const DEFAULT_RIWAYAT_PEMELIHARAAN: RiwayatPemeliharaanItem[] = [
  {
    id: 'rp-1',
    tanggal: '2026-07-18',
    namaBarang: 'AC Split Panasonic 1.5 PK',
    kerusakanAwal: 'Kurang dingin & filter tersumbat debu tebal',
    tindakan: 'Cuci filter, cuci evaporator, dan tambah freon R32',
    pelaksana: 'Vendor CV. Sultra Teknik Mandiri',
    biaya: 250000,
    hasilAkhir: 'Baik',
    ruangLokasi: 'Ruang Laboratorium Komputer'
  },
  {
    id: 'rp-2',
    tanggal: '2026-08-05',
    namaBarang: 'Instalasi Lampu LED Ruang Kelas XI-A',
    kerusakanAwal: 'Lampu berkedip dan saklar longgar',
    tindakan: 'Penggantian 2 unit tube LED 18W & perbaikan fiting',
    pelaksana: 'Swakelola (Teknisi Sekolah)',
    biaya: 140000,
    hasilAkhir: 'Baik',
    ruangLokasi: 'Ruang Kelas XI-A'
  },
  {
    id: 'rp-3',
    tanggal: '2026-08-22',
    namaBarang: 'Pintu & Engsel Toilet Siswa',
    kerusakanAwal: 'Engsel berkarat dan slot grendel patah',
    tindakan: 'Penggantian engsel stainless dan slot kunci baru',
    pelaksana: 'Swakelola (Teknisi Sekolah)',
    biaya: 95000,
    hasilAkhir: 'Baik',
    ruangLokasi: 'Toilet Siswa Putra'
  }
];

export const DEFAULT_LAPORAN_BERKALA: LaporanBerkalaData = {
  periodeLaporan: "Semester Ganjil",
  tahunPelajaran: "2026/2027",
  ringkasanKegiatan: "Pada periode Semester Ganjil 2026/2027, pengelolaan sarana dan prasarana SMA Negeri 17 Konawe telah melaksanakan pengecekan fisik sarpras (stock-opname), pembaharuan Buku Induk Inventaris dan KIR di seluruh ruangan, pemeliharaan rutin instalasi kelistrikan serta pendingin ruangan laboratorium, dan penanganan perbaikan ringan sarana penunjang KBM secara berkala.",
  kegiatanDilaksanakan: [
    {
      id: 'kb-1',
      tanggal: '2026-07-15',
      kegiatan: 'Pengecekan fisik (stock-opname) dan pembaruan KIR di 16 ruang kelas dan lab',
      pelaksana: 'Swakelola (Tim Sarpras)',
      sumberDana: 'BOS Reguler',
      keterangan: 'KIR tercetak dan terpasang di setiap ruang'
    },
    {
      id: 'kb-2',
      tanggal: '2026-08-10',
      kegiatan: 'Perawatan berkala perangkat komputer & jaringan internet Lab TIK',
      pelaksana: 'Vendor / Teknisi Luar',
      sumberDana: 'BOS Reguler',
      keterangan: '30 unit PC siap untuk simulasi ANBK'
    },
    {
      id: 'kb-3',
      tanggal: '2026-08-28',
      kegiatan: 'Perbaikan sanitasi, instalasi kran, dan tandon air bersih sekolah',
      pelaksana: 'Swakelola',
      sumberDana: 'BOS Reguler',
      keterangan: 'Kondisi sanitasi normal dan bersih'
    }
  ],
  realisasiAnggaran: [
    {
      id: 'ra-1',
      uraian: 'Pemeliharaan Sarana Gedung, Listrik, dan Sanitasi',
      anggaranDiajukan: 15000000,
      realisasi: 12450000
    },
    {
      id: 'ra-2',
      uraian: 'Pemeliharaan & Servis Komputer Lab TIK',
      anggaranDiajukan: 8000000,
      realisasi: 7200000
    },
    {
      id: 'ra-3',
      uraian: 'Pengadaan Perlengkapan Mebel Kursi Siswa',
      anggaranDiajukan: 19500000,
      realisasi: 19500000
    }
  ],
  kendala: "Beberapa komponen mebel di ruang kelas mengalami kerusakan akibat usia pemakaian yang sudah lebih dari 7 tahun sehingga memerlukan peremajaan secara bertahap. Selain itu, fluktuasi tegangan listrik sering terjadi pada siang hari.",
  rencanaTindakLanjut: "Mengajukan usulan stabilisator daya listrik (stabilizer/UPS terpusat) ke dalam RAB periode berikutnya dan mendata mebel rusak berat untuk proses penghapusan resmi sesuai Permendagri No. 19/2016."
};

export const DEFAULT_BAP_PEMERIKSAAN: BapPemeriksaanItem[] = [
  {
    id: 'bap-1',
    kodeBarang: '2.05.01.05.001',
    namaBarang: 'Komputer PC Desktop Wearnes Pentium 4',
    tahunPerolehan: 2013,
    jumlah: 8,
    kondisi: 'RB',
    alasanKerusakan: 'Motherboard mati total, suku cadang usang & tidak ekonomis diperbaiki',
    usulanTindakLanjut: 'Diusulkan Pemusnahan / Penghapusan dari BMD'
  },
  {
    id: 'bap-2',
    kodeBarang: '2.05.02.01.002',
    namaBarang: 'Printer Dot Matrix Epson LX-300',
    tahunPerolehan: 2011,
    jumlah: 2,
    kondisi: 'RB',
    alasanKerusakan: 'Head printer patah, mekanik macet permanen',
    usulanTindakLanjut: 'Diusulkan Pemusnahan Fisik'
  },
  {
    id: 'bap-3',
    kodeBarang: '2.06.01.02.003',
    namaBarang: 'Meja Siswa Kayu Randu',
    tahunPerolehan: 2015,
    jumlah: 15,
    kondisi: 'RB',
    alasanKerusakan: 'Lapuk parah dimakan rayap, patah struktur utama',
    usulanTindakLanjut: 'Diusulkan Pemusnahan Fisik'
  }
];

export const DEFAULT_SURAT_USULAN: SuratUsulanPenghapusanData = {
  nomorSurat: "421.3 / 184 / SMAN17-KNW / IX / 2026",
  lampiran: "1 (satu) Berkas",
  perihal: "Usulan Penghapusan Barang Milik Daerah (BMD)",
  tujuanSurat: "Yth. Kepala Dinas Pendidikan dan Kebudayaan Provinsi Sulawesi Tenggara",
  kotaTujuan: "Kendari",
  tanggalSurat: "05 September 2026",
  catatanTambahan: "Barang-barang yang diusulkan telah melalui verifikasi fisik oleh Tim Pemeriksa Sekolah dan dinyatakan rusak berat serta tidak ekonomis lagi untuk dipelihara."
};

export const DEFAULT_BA_PENGHAPUSAN: BaPenghapusanItem[] = [
  {
    id: 'bah-1',
    kodeBarang: '2.05.01.05.001',
    namaBarang: 'Komputer PC Desktop Wearnes Pentium 4',
    jumlah: 8,
    kondisi: 'RB',
    caraPenghapusan: 'Pemusnahan Fisik (Dibakar/Dihancurkan)'
  },
  {
    id: 'bah-2',
    kodeBarang: '2.05.02.01.002',
    namaBarang: 'Printer Dot Matrix Epson LX-300',
    jumlah: 2,
    kondisi: 'RB',
    caraPenghapusan: 'Pemusnahan Fisik (Dibakar/Dihancurkan)'
  },
  {
    id: 'bah-3',
    kodeBarang: '2.06.01.02.003',
    namaBarang: 'Meja Siswa Kayu Randu',
    jumlah: 15,
    kondisi: 'RB',
    caraPenghapusan: 'Pemusnahan Fisik (Dibakar/Dihancurkan)'
  }
];

export const DEFAULT_ALAT_PERAGA: AlatPeragaItem[] = [
  { id: 'ap-1', namaAlat: 'Torso Anatomi Tubuh Manusia Laki-laki & Perempuan', jumlah: 2, satuan: 'Set', kondisi: 'Baik', lokasiPenyimpanan: 'Lab Biologi', keterangan: 'Lengkap dengan organ dalam lepasan' },
  { id: 'ap-2', namaAlat: 'Kit Optika Fisika & Sumber Cahaya Laser', jumlah: 4, satuan: 'Kotak', kondisi: 'Baik', lokasiPenyimpanan: 'Lab Fisika', keterangan: 'Lensa cekung, cembung, dan prisma' },
  { id: 'ap-3', namaAlat: 'Globe / Bola Dunia Diameter 40 cm', jumlah: 3, satuan: 'Buah', kondisi: 'Baik', lokasiPenyimpanan: 'Ruang Geografi', keterangan: 'Skala 1 : 31.800.000' },
  { id: 'ap-4', namaAlat: 'Model Bangun Ruang Transparan Matematika', jumlah: 5, satuan: 'Set', kondisi: 'Baik', lokasiPenyimpanan: 'Lab Matematika', keterangan: 'Kubus, balok, kerucut, limas' },
  { id: 'ap-5', namaAlat: 'Mikroskop Monokuler Siswa 1600x', jumlah: 12, satuan: 'Unit', kondisi: 'Baik', lokasiPenyimpanan: 'Lemari Kaca Lab Biologi', keterangan: 'Kondisi lensa jernih terawat' }
];

export const DEFAULT_BUKU_PERPUSTAKAAN: BukuPerpustakaanItem[] = [
  { id: 'bp-1', judulBuku: 'Biologi untuk SMA/MA Kelas XI Kurikulum Merdeka', pengarang: 'Irnaningtyas & Sylva Sagita', penerbit: 'Erlangga', kategori: 'Buku Pelajaran', jumlahEksemplar: 85, kondisi: 'Baik', keterangan: 'Buku teks utama siswa' },
  { id: 'bp-2', judulBuku: 'Fisika Konsep dan Aplikasinya Kelas XI', pengarang: 'Marthen Kanginan', penerbit: 'Erlangga', kategori: 'Buku Pelajaran', jumlahEksemplar: 80, kondisi: 'Baik', keterangan: 'Penunjang peminatan MIPA' },
  { id: 'bp-3', judulBuku: 'Ensiklopedia Sejarah Dunia & Peradaban Kuno', pengarang: 'Tim Redaksi Ilmu', penerbit: 'Penerbit Gramedia', kategori: 'Referensi/Ensiklopedia', jumlahEksemplar: 6, kondisi: 'Baik', keterangan: 'Koleksi referensi umum' },
  { id: 'bp-4', judulBuku: 'Laskar Pelangi', pengarang: 'Andrea Hirata', penerbit: 'Bentang Pustaka', kategori: 'Fiksi', jumlahEksemplar: 14, kondisi: 'Baik', keterangan: 'Koleksi literasi sastra' },
  { id: 'bp-5', judulBuku: 'Kamus Besar Bahasa Indonesia (KBBI) Edisi V', pengarang: 'Badan Bahasa Kemendikbud', penerbit: 'Balai Pustaka', kategori: 'Referensi/Ensiklopedia', jumlahEksemplar: 5, kondisi: 'Baik', keterangan: 'Buku rujukan bahasa baku' }
];

export const DEFAULT_JADWAL_LAB: JadwalLabSlot[] = [
  { hari: 'Senin', jam1: 'X-1 (Kimia)', jam2: 'X-1 (Kimia)', jam3: 'XI-A (Biologi)', jam4: 'XI-A (Biologi)', jam5: '', jam6: '' },
  { hari: 'Selasa', jam1: 'XII-IPA 1 (Fisika)', jam2: 'XII-IPA 1 (Fisika)', jam3: '', jam4: 'X-2 (Informatika)', jam5: 'X-2 (Informatika)', jam6: '' },
  { hari: 'Rabu', jam1: 'XI-B (Informatika)', jam2: 'XI-B (Informatika)', jam3: 'XII-IPA 2 (Kimia)', jam4: 'XII-IPA 2 (Kimia)', jam5: '', jam6: '' },
  { hari: 'Kamis', jam1: 'X-3 (Biologi)', jam2: 'X-3 (Biologi)', jam3: 'XI-C (Fisika)', jam4: 'XI-C (Fisika)', jam5: '', jam6: '' },
  { hari: 'Jumat', jam1: 'Pembersihan & Kalibrasi', jam2: 'Pembersihan & Kalibrasi', jam3: '', jam4: '', jam5: '', jam6: '' },
  { hari: 'Sabtu', jam1: 'Ekskul KIR & Olimpiade Sains', jam2: 'Ekskul KIR & Olimpiade Sains', jam3: '', jam4: '', jam5: '', jam6: '' }
];
