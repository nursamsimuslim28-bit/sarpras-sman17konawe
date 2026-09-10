import { Aset, PengaturanSekolah, KategoriAset, KondisiAset } from '../types';

export type KibType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface KibColumnDef {
  key: string;
  label: string;
  required?: boolean;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  description?: string;
  example: string;
}

export interface KibTemplateConfig {
  id: KibType;
  name: string;
  title: string;
  kategoriAset: KategoriAset;
  prefixId: string;
  kodeBarangBmd: string;
  defaultSatuan: string;
  columns: KibColumnDef[];
  sampleData: Record<string, any>[];
}

export const KIB_CONFIGS: Record<KibType, KibTemplateConfig> = {
  A: {
    id: 'A',
    name: 'KIB A',
    title: 'KIB A - Tanah',
    kategoriAset: 'KIB A (Tanah)',
    prefixId: 'TNH',
    kodeBarangBmd: '01.01.01.01.001',
    defaultSatuan: 'Bidang',
    columns: [
      { key: 'nama', label: 'Nama Barang / Lahan', required: true, example: 'Tanah Bangunan Sekolah SMA Negeri 17 Konawe' },
      { key: 'luasTanahM2', label: 'Luas Tanah (m2)', required: true, type: 'number', example: '10000' },
      { key: 'tahunPerolehan', label: 'Tahun Pengadaan / Perolehan', required: true, type: 'number', example: '2015' },
      { key: 'letakAlamatTanah', label: 'Letak / Alamat Lokasi Tanah', required: true, example: 'Jl. Poros Routa, Kec. Routa, Kab. Konawe' },
      { key: 'hakTanah', label: 'Hak Tanah', type: 'select', options: ['Hak Pakai', 'Hak Milik', 'Hak Pengelolaan', 'Tanah Kas Desa', 'Tanah Negara'], example: 'Hak Pakai' },
      { key: 'nomorSertifikatTanah', label: 'Nomor Sertifikat / Sertifikat Hak Pakai', example: 'HP.001/Konawe/2015' },
      { key: 'tanggalSertifikatTanah', label: 'Tanggal Sertifikat (YYYY-MM-DD)', type: 'date', example: '2015-05-20' },
      { key: 'penggunaanTanah', label: 'Penggunaan Tanah', example: 'Bangunan Sekolah & Lapangan Upacara' },
      { key: 'asalUsulTanah', label: 'Asal Usul Perolehan', example: 'Pemerintah Daerah / APBD Provinsi' },
      { key: 'hargaPerolehan', label: 'Harga / Nilai Perolehan (Rp)', type: 'number', example: '500000000' },
      { key: 'kondisi', label: 'Kondisi Fisik', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], example: 'Baik' },
      { key: 'ruangLokasi', label: 'Lokasi Penempatan', example: 'Lahan Sekolah / Area Terbuka' },
      { key: 'sumberDana', label: 'Sumber Dana', example: 'APBD Provinsi / Kabupaten' },
      { key: 'kodeBarangBmd', label: 'Kodefikasi BMD (Permendagri 47/2021)', example: '01.01.01.01.001' },
      { key: 'nomorRegisterBmd', label: 'Nomor Register / NUP (Opsional - Auto jika kosong)', example: '000001' },
      { key: 'id', label: 'ID Barcode Aset (Opsional - Auto jika kosong)', example: 'TNH-2026-0001' },
      { key: 'catatan', label: 'Keterangan Tambahan', example: 'Kondisi tanah datar dan bersertifikat resmi' }
    ],
    sampleData: [
      {
        nama: 'Tanah Bangunan Gedung Utama',
        luasTanahM2: 7500,
        tahunPerolehan: 2012,
        letakAlamatTanah: 'Kec. Routa, Kab. Konawe, Sulawesi Tenggara',
        hakTanah: 'Hak Pakai',
        nomorSertifikatTanah: 'HP.04.11/ROUTA/2012',
        tanggalSertifikatTanah: '2012-08-17',
        penggunaanTanah: 'Kompleks Ruang Belajar & Kantor',
        asalUsulTanah: 'Pemerintah Provinsi Sulawesi Tenggara',
        hargaPerolehan: 450000000,
        kondisi: 'Baik',
        ruangLokasi: 'Lahan Sekolah / Area Terbuka',
        sumberDana: 'APBD Provinsi / Kabupaten',
        kodeBarangBmd: '01.01.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Lahan bersertifikat Pemprov Sultra'
      },
      {
        nama: 'Tanah Lapangan Olahraga & Upacara',
        luasTanahM2: 2500,
        tahunPerolehan: 2015,
        letakAlamatTanah: 'Kec. Routa, Kab. Konawe, Sulawesi Tenggara',
        hakTanah: 'Hak Pakai',
        nomorSertifikatTanah: 'HP.04.12/ROUTA/2015',
        tanggalSertifikatTanah: '2015-11-10',
        penggunaanTanah: 'Lapangan Upacara & Bola Voli',
        asalUsulTanah: 'Hibah Pemerintah Daerah',
        hargaPerolehan: 150000000,
        kondisi: 'Baik',
        ruangLokasi: 'Lahan Sekolah / Area Terbuka',
        sumberDana: 'Dana Hibah / Donasi / CSR',
        kodeBarangBmd: '01.01.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Dikelilingi pagar pembatas'
      }
    ]
  },
  B: {
    id: 'B',
    name: 'KIB B',
    title: 'KIB B - Peralatan dan Mesin',
    kategoriAset: 'KIB B (Peralatan dan Mesin)',
    prefixId: 'SAR',
    kodeBarangBmd: '02.06.01.01.001',
    defaultSatuan: 'Unit',
    columns: [
      { key: 'nama', label: 'Nama Barang / Peralatan', required: true, example: 'Laptop Guru / Siswa Core i5' },
      { key: 'merek', label: 'Merek / Pabrikan', required: true, example: 'ASUS / Lenovo / Acer' },
      { key: 'spesifikasi', label: 'Spesifikasi Lengkap / Tipe', example: 'Core i5 12th Gen, RAM 8GB, SSD 512GB, 14 Inch' },
      { key: 'ukuranCc', label: 'Ukuran / Dimensi / CC (Jika Ada)', example: '14 Inch' },
      { key: 'bahanMaterial', label: 'Bahan Material', example: 'Plastik / Aluminium' },
      { key: 'tahunPerolehan', label: 'Tahun Pembelian / Perolehan', required: true, type: 'number', example: '2024' },
      { key: 'jumlah', label: 'Jumlah Unit', required: true, type: 'number', example: '1' },
      { key: 'satuan', label: 'Satuan', example: 'Unit' },
      { key: 'hargaPerolehan', label: 'Harga Satuan (Rp)', type: 'number', example: '8500000' },
      { key: 'kondisi', label: 'Kondisi Barang', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], example: 'Baik' },
      { key: 'ruangLokasi', label: 'Lokasi Penempatan Ruangan', required: true, example: 'Laboratorium Komputer' },
      { key: 'sumberDana', label: 'Sumber Dana', example: 'BOS Reguler' },
      { key: 'serialNumber', label: 'Nomor Seri / Pabrik / IMEI', example: 'SN-9872134612' },
      { key: 'nomorRangka', label: 'Nomor Rangka (Kendaraan Dinas)', example: '-' },
      { key: 'nomorMesin', label: 'Nomor Mesin (Kendaraan Dinas)', example: '-' },
      { key: 'nomorPolisi', label: 'Nomor Polisi (Kendaraan Dinas)', example: '-' },
      { key: 'nomorBpkb', label: 'Nomor BPKB (Kendaraan Dinas)', example: '-' },
      { key: 'kodeBarangBmd', label: 'Kodefikasi BMD (Permendagri 47/2021)', example: '02.06.01.01.001' },
      { key: 'nomorRegisterBmd', label: 'Nomor Register / NUP (Opsional - Auto jika kosong)', example: '000001' },
      { key: 'id', label: 'ID Barcode Aset (Opsional - Auto jika kosong)', example: 'SAR-2026-0001' },
      { key: 'catatan', label: 'Keterangan Tambahan', example: 'Pengadaan BOS Tahun 2024 untuk Lab Komputer' }
    ],
    sampleData: [
      {
        nama: 'PC Desktop All-in-One Lab',
        merek: 'Lenovo',
        spesifikasi: 'IdeaCentre AIO 3, Core i5, RAM 16GB, SSD 512GB',
        ukuranCc: '24 Inch Full HD',
        bahanMaterial: 'Plastik / Logam',
        tahunPerolehan: 2024,
        jumlah: 1,
        satuan: 'Unit',
        hargaPerolehan: 9500000,
        kondisi: 'Baik',
        ruangLokasi: 'Laboratorium Komputer',
        sumberDana: 'BOS Reguler',
        serialNumber: 'LNV-AIO-2024-001',
        nomorRangka: '-',
        nomorMesin: '-',
        nomorPolisi: '-',
        nomorBpkb: '-',
        kodeBarangBmd: '02.06.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Siap digunakan untuk ANBK'
      },
      {
        nama: 'Printer Multifungsi Laser',
        merek: 'Epson',
        spesifikasi: 'EcoTank L3210 Print, Scan, Copy',
        ukuranCc: 'A4 / Folio',
        bahanMaterial: 'Plastik',
        tahunPerolehan: 2023,
        jumlah: 1,
        satuan: 'Unit',
        hargaPerolehan: 2750000,
        kondisi: 'Baik',
        ruangLokasi: 'Ruang Tata Usaha (TU)',
        sumberDana: 'BOS Reguler',
        serialNumber: 'EP-L3210-9921',
        nomorRangka: '-',
        nomorMesin: '-',
        nomorPolisi: '-',
        nomorBpkb: '-',
        kodeBarangBmd: '02.06.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Digunakan untuk administrasi sekolah'
      },
      {
        nama: 'Meja Kursi Siswa Kayu Jati',
        merek: 'Lokal Kerajinan',
        spesifikasi: '1 Meja + 1 Kursi Kayu Solid Pelitur',
        ukuranCc: '60x40x75 cm',
        bahanMaterial: 'Kayu Solid & Besi',
        tahunPerolehan: 2022,
        jumlah: 30,
        satuan: 'Set',
        hargaPerolehan: 450000,
        kondisi: 'Baik',
        ruangLokasi: 'Ruang Kelas X',
        sumberDana: 'DAK Fisik Pendidikan',
        serialNumber: '-',
        nomorRangka: '-',
        nomorMesin: '-',
        nomorPolisi: '-',
        nomorBpkb: '-',
        kodeBarangBmd: '02.06.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Pengadaan mebeler kelas'
      }
    ]
  },
  C: {
    id: 'C',
    name: 'KIB C',
    title: 'KIB C - Gedung dan Bangunan',
    kategoriAset: 'KIB C (Gedung dan Bangunan)',
    prefixId: 'GDG',
    kodeBarangBmd: '03.11.01.01.001',
    defaultSatuan: 'Unit Gedung',
    columns: [
      { key: 'nama', label: 'Nama Gedung / Bangunan', required: true, example: 'Gedung Ruang Kelas Belajar (RKB) Unit 1' },
      { key: 'konstruksiBeton', label: 'Konstruksi Beton', type: 'select', options: ['Beton', 'Bukan Beton'], example: 'Beton' },
      { key: 'kondisiBangunanTingkat', label: 'Tingkat Bangunan', type: 'select', options: ['Tidak Bertingkat', 'Bertingkat'], example: 'Tidak Bertingkat' },
      { key: 'kondisiFisikBangunan', label: 'Kondisi Bangunan', type: 'select', options: ['Permanen', 'Semi Permanen', 'Darurat'], example: 'Permanen' },
      { key: 'luasLantaiM2', label: 'Luas Lantai Gedung (m2)', required: true, type: 'number', example: '144' },
      { key: 'tahunPerolehan', label: 'Tahun Selesai Bangun / Perolehan', required: true, type: 'number', example: '2016' },
      { key: 'statusTanahGedung', label: 'Status Tanah Tempat Berdiri', required: true, example: 'Tanah Hak Pakai Pemerintah Daerah' },
      { key: 'kodeTanahKibA', label: 'Kode ID Tanah KIB A Terkait (Opsional)', example: 'TNH-2026-0001' },
      { key: 'nomorDokumenGedung', label: 'Nomor IMB / PBG / BAST Gedung', example: 'IMB-GDG/2016/001' },
      { key: 'tanggalDokumenGedung', label: 'Tanggal Dokumen Gedung (YYYY-MM-DD)', type: 'date', example: '2016-10-15' },
      { key: 'hargaPerolehan', label: 'Harga / Nilai Bangunan (Rp)', type: 'number', example: '250000000' },
      { key: 'kondisi', label: 'Kondisi Fisik', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], example: 'Baik' },
      { key: 'ruangLokasi', label: 'Kompleks / Area Lokasi', example: 'Kompleks Gedung Sekolah' },
      { key: 'sumberDana', label: 'Sumber Dana', example: 'DAK Fisik Pendidikan' },
      { key: 'kodeBarangBmd', label: 'Kodefikasi BMD (Permendagri 47/2021)', example: '03.11.01.01.001' },
      { key: 'nomorRegisterBmd', label: 'Nomor Register / NUP (Opsional - Auto jika kosong)', example: '000001' },
      { key: 'id', label: 'ID Barcode Aset (Opsional - Auto jika kosong)', example: 'GDG-2026-0001' },
      { key: 'catatan', label: 'Keterangan Tambahan', example: 'Gedung 2 ruang kelas belajar siswa' }
    ],
    sampleData: [
      {
        nama: 'Gedung Ruang Kelas Belajar (X & XI)',
        konstruksiBeton: 'Beton',
        kondisiBangunanTingkat: 'Tidak Bertingkat',
        kondisiFisikBangunan: 'Permanen',
        luasLantaiM2: 144,
        tahunPerolehan: 2016,
        statusTanahGedung: 'Tanah Hak Pakai Pemerintah Daerah',
        kodeTanahKibA: 'TNH-2026-0001',
        nomorDokumenGedung: 'IMB.02/KONAWE/2016',
        tanggalDokumenGedung: '2016-11-20',
        hargaPerolehan: 280000000,
        kondisi: 'Baik',
        ruangLokasi: 'Kompleks Gedung Sekolah',
        sumberDana: 'DAK Fisik Pendidikan',
        kodeBarangBmd: '03.11.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Terdiri dari 2 ruang kelas standar 7x8 meter'
      },
      {
        nama: 'Gedung Laboratorium Komputer & IPA',
        konstruksiBeton: 'Beton',
        kondisiBangunanTingkat: 'Tidak Bertingkat',
        kondisiFisikBangunan: 'Permanen',
        luasLantaiM2: 120,
        tahunPerolehan: 2018,
        statusTanahGedung: 'Tanah Hak Pakai Pemerintah Daerah',
        kodeTanahKibA: 'TNH-2026-0001',
        nomorDokumenGedung: 'BAST.05/DIKBUD/2018',
        tanggalDokumenGedung: '2018-12-10',
        hargaPerolehan: 220000000,
        kondisi: 'Baik',
        ruangLokasi: 'Kompleks Gedung Sekolah',
        sumberDana: 'APBD Provinsi / Kabupaten',
        kodeBarangBmd: '03.11.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Lengkap dengan instalasi listrik dan meja lab'
      }
    ]
  },
  D: {
    id: 'D',
    name: 'KIB D',
    title: 'KIB D - Jalan, Irigasi, dan Jaringan',
    kategoriAset: 'KIB D (Jalan, Irigasi, dan Jaringan)',
    prefixId: 'JAL',
    kodeBarangBmd: '04.14.01.01.001',
    defaultSatuan: 'Ruas / Titik',
    columns: [
      { key: 'nama', label: 'Nama Jaringan / Jalan / Instalasi', required: true, example: 'Jalan Lingkungan Paving Block Sekolah' },
      { key: 'konstruksiJaringan', label: 'Konstruksi', example: 'Paving Block / Rabat Beton / Pipa PVC / Kabel Optik' },
      { key: 'panjangM', label: 'Panjang (Meter)', type: 'number', example: '120' },
      { key: 'lebarM', label: 'Lebar (Meter)', type: 'number', example: '3.5' },
      { key: 'tahunPerolehan', label: 'Tahun Pembuatan / Perolehan', required: true, type: 'number', example: '2021' },
      { key: 'statusTanahJaringan', label: 'Status Tanah', example: 'Tanah Hak Pakai Sekolah' },
      { key: 'nomorDokumenJaringan', label: 'Nomor Dokumen / BAST', example: 'BAST-JAL/2021/001' },
      { key: 'hargaPerolehan', label: 'Nilai Perolehan (Rp)', type: 'number', example: '45000000' },
      { key: 'kondisi', label: 'Kondisi Fisik', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], example: 'Baik' },
      { key: 'ruangLokasi', label: 'Lokasi Penempatan', example: 'Lingkungan Sekolah' },
      { key: 'sumberDana', label: 'Sumber Dana', example: 'BOS Kinerja' },
      { key: 'kodeBarangBmd', label: 'Kodefikasi BMD (Permendagri 47/2021)', example: '04.14.01.01.001' },
      { key: 'nomorRegisterBmd', label: 'Nomor Register / NUP (Opsional - Auto jika kosong)', example: '000001' },
      { key: 'id', label: 'ID Barcode Aset (Opsional - Auto jika kosong)', example: 'JAL-2026-0001' },
      { key: 'catatan', label: 'Keterangan Tambahan', example: 'Akses jalan masuk dari gerbang ke halaman' }
    ],
    sampleData: [
      {
        nama: 'Jalan Paving Blok Akses Gerbang & Lapangan',
        konstruksiJaringan: 'Paving Block K-250',
        panjangM: 85,
        lebarM: 4,
        tahunPerolehan: 2021,
        statusTanahJaringan: 'Tanah Hak Pakai Sekolah',
        nomorDokumenJaringan: 'BAST-JAL/2021/001',
        hargaPerolehan: 35000000,
        kondisi: 'Baik',
        ruangLokasi: 'Lingkungan Sekolah',
        sumberDana: 'BOS Reguler',
        kodeBarangBmd: '04.14.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Kondisi rapi dan rata'
      },
      {
        nama: 'Instalasi Jaringan Internet Fiber Optik & LAN',
        konstruksiJaringan: 'Kabel UTP Cat6 & Fiber Optik FO',
        panjangM: 250,
        lebarM: 0,
        tahunPerolehan: 2023,
        statusTanahJaringan: 'Kompleks Sekolah',
        nomorDokumenJaringan: 'BAST-LAN/2023/004',
        hargaPerolehan: 18500000,
        kondisi: 'Baik',
        ruangLokasi: 'Laboratorium Komputer',
        sumberDana: 'BOS Reguler',
        kodeBarangBmd: '04.14.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Menghubungkan ruang guru, TU, lab, dan kelas'
      }
    ]
  },
  E: {
    id: 'E',
    name: 'KIB E',
    title: 'KIB E - Aset Tetap Lainnya',
    kategoriAset: 'KIB E (Aset Tetap Lainnya)',
    prefixId: 'ATL',
    kodeBarangBmd: '05.17.01.01.001',
    defaultSatuan: 'Eksemplar',
    columns: [
      { key: 'nama', label: 'Nama Buku / Judul Karya / Alat Peraga', required: true, example: 'Buku Siswa Matematika Kelas X Kurikulum Merdeka' },
      { key: 'jenisAsetLainnya', label: 'Jenis Aset', type: 'select', options: ['Buku/Perpustakaan', 'Barang Bercorak Kesenian', 'Alat Olahraga/Peraga', 'Hewan/Tumbuhan'], example: 'Buku/Perpustakaan' },
      { key: 'judulBuku', label: 'Judul Lengkap (Khusus Buku)', example: 'Matematika SMA/MA Kelas X' },
      { key: 'pengarangBuku', label: 'Pengarang / Pencipta Seni', example: 'Dick Susanto, dkk.' },
      { key: 'penerbitBuku', label: 'Penerbit (Khusus Buku)', example: 'Kemendikbudristek RI' },
      { key: 'tahunCetakBuku', label: 'Tahun Cetak / Terbit', type: 'number', example: '2023' },
      { key: 'tahunPerolehan', label: 'Tahun Pengadaan / Perolehan', required: true, type: 'number', example: '2023' },
      { key: 'jumlah', label: 'Jumlah (Eks / Buah / Set)', required: true, type: 'number', example: '45' },
      { key: 'satuan', label: 'Satuan', example: 'Eksemplar' },
      { key: 'hargaPerolehan', label: 'Harga Satuan (Rp)', type: 'number', example: '35000' },
      { key: 'kondisi', label: 'Kondisi Fisik', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], example: 'Baik' },
      { key: 'ruangLokasi', label: 'Lokasi Penempatan Ruangan', required: true, example: 'Ruang Perpustakaan' },
      { key: 'sumberDana', label: 'Sumber Dana', example: 'BOS Reguler' },
      { key: 'kodeBarangBmd', label: 'Kodefikasi BMD (Permendagri 47/2021)', example: '05.17.01.01.001' },
      { key: 'nomorRegisterBmd', label: 'Nomor Register / NUP (Opsional - Auto jika kosong)', example: '000001' },
      { key: 'id', label: 'ID Barcode Aset (Opsional - Auto jika kosong)', example: 'ATL-2026-0001' },
      { key: 'catatan', label: 'Keterangan Tambahan', example: 'Buku teks utama siswa' }
    ],
    sampleData: [
      {
        nama: 'Buku Teks Siswa Bahasa Indonesia Kelas X',
        jenisAsetLainnya: 'Buku/Perpustakaan',
        judulBuku: 'Cerdas Cergas Berbahasa dan Bersastra Indonesia Kelas X',
        pengarangBuku: 'Fadilah Tri Aulia',
        penerbitBuku: 'Kemendikbudristek Pusat Kurikulum & Perbukuan',
        tahunCetakBuku: 2023,
        tahunPerolehan: 2023,
        jumlah: 40,
        satuan: 'Eksemplar',
        hargaPerolehan: 32000,
        kondisi: 'Baik',
        ruangLokasi: 'Ruang Perpustakaan',
        sumberDana: 'BOS Reguler',
        kodeBarangBmd: '05.17.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Tersedia di rak buku pelajaran kurikulum merdeka'
      },
      {
        nama: 'Globe Bola Dunia Fisik Berputar',
        jenisAsetLainnya: 'Alat Olahraga/Peraga',
        judulBuku: '-',
        pengarangBuku: '-',
        penerbitBuku: '-',
        tahunCetakBuku: 2022,
        tahunPerolehan: 2022,
        jumlah: 2,
        satuan: 'Unit',
        hargaPerolehan: 350000,
        kondisi: 'Baik',
        ruangLokasi: 'Laboratorium IPA / Biologi / Kimia',
        sumberDana: 'BOS Reguler',
        kodeBarangBmd: '05.17.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Alat peraga geografi dan IPS'
      }
    ]
  },
  F: {
    id: 'F',
    name: 'KIB F',
    title: 'KIB F - Konstruksi dalam Pengerjaan (KDP)',
    kategoriAset: 'KIB F (Konstruksi dalam Pengerjaan)',
    prefixId: 'KDP',
    kodeBarangBmd: '06.20.01.01.001',
    defaultSatuan: 'Paket Proyek',
    columns: [
      { key: 'nama', label: 'Nama Bangunan / Proyek Fisik KDP', required: true, example: 'Pembangunan Ruang Laboratorium Bahasa Terpadu' },
      { key: 'bangunanKdp', label: 'Tipe Bangunan Rencana', example: 'Gedung Laboratorium Bahasa' },
      { key: 'konstruksiKdp', label: 'Konstruksi Bertingkat', type: 'select', options: ['Tidak Bertingkat', 'Bertingkat'], example: 'Tidak Bertingkat' },
      { key: 'luasKdpM2', label: 'Luas Bangunan Rencana (m2)', type: 'number', example: '96' },
      { key: 'tahunPerolehan', label: 'Tahun Anggaran Pelaksanaan', required: true, type: 'number', example: '2026' },
      { key: 'tanggalMulaiKdp', label: 'Tanggal Mulai Pengerjaan (YYYY-MM-DD)', type: 'date', example: '2026-03-01' },
      { key: 'statusTanahKdp', label: 'Status Tanah Tempat Konstruksi', example: 'Tanah Hak Pakai Pemerintah Daerah' },
      { key: 'nilaiKontrakKdp', label: 'Nilai Kontrak / Nilai Proyek (Rp)', type: 'number', example: '185000000' },
      { key: 'progressFisikPersen', label: 'Progress Kemajuan Fisik (%)', type: 'number', example: '65' },
      { key: 'kondisi', label: 'Kondisi Konstruksi', type: 'select', options: ['Baik', 'Rusak Ringan', 'Rusak Berat'], example: 'Baik' },
      { key: 'ruangLokasi', label: 'Lokasi Area Proyek', example: 'Kompleks Gedung Sekolah' },
      { key: 'sumberDana', label: 'Sumber Dana Proyek', example: 'DAK Fisik Pendidikan' },
      { key: 'kodeBarangBmd', label: 'Kodefikasi BMD (Permendagri 47/2021)', example: '06.20.01.01.001' },
      { key: 'nomorRegisterBmd', label: 'Nomor Register / NUP (Opsional - Auto jika kosong)', example: '000001' },
      { key: 'id', label: 'ID Barcode Aset (Opsional - Auto jika kosong)', example: 'KDP-2026-0001' },
      { key: 'catatan', label: 'Keterangan Tambahan & Nama Pelaksana Proyek', example: 'Kontraktor: CV. Mandiri Konstruksi Jaya' }
    ],
    sampleData: [
      {
        nama: 'Pembangunan Ruang Praktik Siswa (RPS)',
        bangunanKdp: 'Gedung Workshop Keterampilan',
        konstruksiKdp: 'Tidak Bertingkat',
        luasKdpM2: 120,
        tahunPerolehan: 2026,
        tanggalMulaiKdp: '2026-02-15',
        statusTanahKdp: 'Tanah Hak Pakai Pemerintah Daerah',
        nilaiKontrakKdp: 195000000,
        progressFisikPersen: 70,
        kondisi: 'Baik',
        ruangLokasi: 'Kompleks Gedung Sekolah',
        sumberDana: 'DAK Fisik Pendidikan',
        kodeBarangBmd: '06.20.01.01.001',
        nomorRegisterBmd: '',
        id: '',
        catatan: 'Pengerjaan atap dan instalasi listrik dalam tahap penyelesaian'
      }
    ]
  }
};

/**
 * Utility untuk Escape string ke format CSV RFC 4180
 */
function escapeCsvCell(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generate string CSV Template untuk KIB tertentu
 */
export function generateKibCsvTemplate(kibId: KibType, includeSampleData: boolean = true): string {
  const config = KIB_CONFIGS[kibId];
  if (!config) return '';

  // Header 1: Keterangan / Header Kolom Ramah Pengguna
  const headerLabels = config.columns.map(c => escapeCsvCell(c.label)).join(',');
  // Header 2: Technical Field Keys (digunakan parser saat diimport)
  const headerKeys = config.columns.map(c => escapeCsvCell(c.key)).join(',');

  const rows: string[] = [headerLabels, headerKeys];

  if (includeSampleData && config.sampleData) {
    config.sampleData.forEach(item => {
      const row = config.columns.map(col => {
        const val = item[col.key] !== undefined ? item[col.key] : '';
        return escapeCsvCell(val);
      }).join(',');
      rows.push(row);
    });
  }

  // Tambahkan UTF-8 BOM agar Microsoft Excel di Windows membuka karakter Indonesia & format dengan sempurna
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Export seluruh data aset yang ada saat ini ke format CSV
 */
export function exportExistingAsetsToCsv(asets: Aset[], filterKib?: KibType): string {
  const targetAsets = filterKib 
    ? asets.filter(a => {
        const cat = (a.kategori || '').toUpperCase();
        if (filterKib === 'A') return cat.includes('KIB A') || cat.includes('TANAH');
        if (filterKib === 'B') return cat.includes('KIB B') || cat.includes('PERALATAN') || cat.includes('SARANA') || cat.includes('PERLENGKAPAN');
        if (filterKib === 'C') return cat.includes('KIB C') || cat.includes('GEDUNG') || cat.includes('BANGUNAN') || cat.includes('PRASARANA');
        if (filterKib === 'D') return cat.includes('KIB D') || cat.includes('JALAN') || cat.includes('JARINGAN');
        if (filterKib === 'E') return cat.includes('KIB E') || cat.includes('LAINNYA') || cat.includes('BUKU');
        if (filterKib === 'F') return cat.includes('KIB F') || cat.includes('KONSTRUKSI') || cat.includes('KDP');
        return true;
      })
    : asets;

  const config = filterKib ? KIB_CONFIGS[filterKib] : KIB_CONFIGS.B;
  const cols = config.columns;

  const headerLabels = cols.map(c => escapeCsvCell(c.label)).join(',');
  const headerKeys = cols.map(c => escapeCsvCell(c.key)).join(',');

  const rows: string[] = [headerLabels, headerKeys];

  targetAsets.forEach(item => {
    const row = cols.map(col => {
      const val = (item as any)[col.key] !== undefined ? (item as any)[col.key] : '';
      return escapeCsvCell(val);
    }).join(',');
    rows.push(row);
  });

  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Helper Download file teks/CSV di browser
 */
export function downloadCsvFile(csvContent: string, fileName: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parser CSV RFC 4180 robust (mendukung nilai multiline, tanda petik ganda escape, koma & titik koma)
 */
export function parseCsvString(csvText: string): string[][] {
  // Hapus UTF-8 BOM jika ada
  let text = csvText.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  // Deteksi pemisah (koma atau titik koma) dari baris pertama
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote ("")
          currentCell += '"';
          i++; // Lewati quote berikutnya
        } else {
          // Tutup quote
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++; // Lewati \n
        }
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  // Tambahkan cell / baris terakhir
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  // Filter baris kosong
  return rows.filter(r => r.length > 0 && r.some(c => c.trim().length > 0));
}

/**
 * Konversi baris CSV mentah menjadi objek Aset terstruktur
 * dengan auto-numbering, defaults, dan validasi pintar
 */
export function processImportedKibRows(
  kibId: KibType,
  rows: string[][],
  existingAsets: Aset[],
  pengaturan: PengaturanSekolah,
  defaultSpaces: string[]
): {
  validAsets: Aset[];
  skippedCount: number;
  warnings: string[];
} {
  if (rows.length < 2) {
    return { validAsets: [], skippedCount: 0, warnings: ['File CSV kosong atau tidak memiliki baris data.'] };
  }

  const config = KIB_CONFIGS[kibId];
  const knownKeys = config.columns.map(c => c.key);
  const knownLabels = config.columns.map(c => c.label.toLowerCase());

  // Periksa apakah baris kedua atau baris pertama adalah key teknis
  let headerIndex = -1;
  let keyRow = rows[1];

  // Cek apakah row[1] berisi key teknis yang cocok (misal: 'nama', 'luasTanahM2', dll)
  const matchesKeyRow1 = rows[1] && rows[1].some(k => knownKeys.includes(k.trim()));
  const matchesKeyRow0 = rows[0] && rows[0].some(k => knownKeys.includes(k.trim()));

  let dataStartIndex = 2;
  let detectedKeys: string[] = [];

  if (matchesKeyRow1) {
    detectedKeys = rows[1].map(k => k.trim());
    dataStartIndex = 2;
  } else if (matchesKeyRow0) {
    detectedKeys = rows[0].map(k => k.trim());
    dataStartIndex = 1;
  } else {
    // Coba cocokkan label ramah pengguna pada baris pertama
    detectedKeys = rows[0].map(label => {
      const cleanLabel = label.toLowerCase().trim();
      const matchedCol = config.columns.find(c => 
        c.label.toLowerCase() === cleanLabel ||
        cleanLabel.includes(c.key.toLowerCase()) ||
        cleanLabel.includes(c.label.toLowerCase().slice(0, 8))
      );
      return matchedCol ? matchedCol.key : label;
    });
    dataStartIndex = 1;
  }

  const validAsets: Aset[] = [];
  const warnings: string[] = [];
  let skippedCount = 0;

  // Lacak sequence tertinggi saat ini untuk penomoran otomatis
  const yr = new Date().getFullYear();
  const prefix = config.prefixId;

  // Hitung max ID
  let currentMaxIdNum = existingAsets.reduce((max, a) => {
    const parts = (a.id || '').split('-');
    const num = parseInt(parts[parts.length - 1] || '0', 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  // Hitung max Register / NUP
  const kibAsets = existingAsets.filter(a => {
    const cat = (a.kategori || '').toUpperCase();
    if (kibId === 'A') return cat.includes('KIB A') || cat.includes('TANAH');
    if (kibId === 'B') return cat.includes('KIB B') || cat.includes('PERALATAN');
    if (kibId === 'C') return cat.includes('KIB C') || cat.includes('GEDUNG');
    if (kibId === 'D') return cat.includes('KIB D') || cat.includes('JALAN');
    if (kibId === 'E') return cat.includes('KIB E') || cat.includes('LAINNYA');
    if (kibId === 'F') return cat.includes('KIB F') || cat.includes('KONSTRUKSI');
    return false;
  });

  let currentMaxRegNum = kibAsets.reduce((max, a) => {
    const raw = ((a as any).nomorRegister || a.nomorRegisterBmd || '').replace(/\D/g, '');
    const num = parseInt(raw || '0', 10);
    return !isNaN(num) && num > max ? num : max;
  }, 0);

  for (let r = dataStartIndex; r < rows.length; r++) {
    const rowValues = rows[r];
    if (!rowValues || rowValues.every(c => !c || !c.trim())) {
      skippedCount++;
      continue;
    }

    const rowObj: Record<string, any> = {};
    detectedKeys.forEach((key, colIdx) => {
      if (key && rowValues[colIdx] !== undefined) {
        rowObj[key] = rowValues[colIdx].trim();
      }
    });

    // Validasi field wajib nama barang
    const nama = rowObj.nama || rowObj.namaBarang || rowObj['Nama Barang / Peralatan'] || rowObj['Nama Barang / Lahan'] || rowObj['Nama Gedung / Bangunan'];
    if (!nama || !String(nama).trim()) {
      warnings.push(`Baris ${r + 1} dilewati karena nama barang / aset kosong.`);
      skippedCount++;
      continue;
    }

    // Auto-generate ID unik jika kosong
    currentMaxIdNum++;
    const generatedId = `${prefix}-${yr}-${String(currentMaxIdNum).padStart(4, '0')}`;
    const id = rowObj.id && rowObj.id.trim() ? rowObj.id.trim() : generatedId;

    // Auto-generate Register jika kosong
    currentMaxRegNum++;
    const generatedRegister = String(currentMaxRegNum).padStart(6, '0');
    const nomorRegister = rowObj.nomorRegister || rowObj.nomorRegisterBmd || generatedRegister;

    // Normalisasi kondisi
    let kondisi: KondisiAset = 'Baik';
    const rawKondisi = (rowObj.kondisi || '').toLowerCase();
    if (rawKondisi.includes('rusak berat')) kondisi = 'Rusak Berat';
    else if (rawKondisi.includes('rusak') || rawKondisi.includes('ringan')) kondisi = 'Rusak Ringan';
    else if (rawKondisi.includes('hapus')) kondisi = 'Dihapuskan';
    else kondisi = 'Baik';

    // Normalisasi angka
    const parseNum = (v: any, def: number = 0) => {
      if (v === undefined || v === null || v === '') return def;
      const clean = String(v).replace(/[^0-9.-]/g, '');
      const num = parseFloat(clean);
      return isNaN(num) ? def : num;
    };

    const tahunPerolehanRaw = String(rowObj.tahunPerolehan || '').trim();
    const tahunPerolehan = (tahunPerolehanRaw === '' || tahunPerolehanRaw === '-' || tahunPerolehanRaw === '0') ? 0 : parseNum(rowObj.tahunPerolehan, 0);
    const jumlah = Math.max(1, parseNum(rowObj.jumlah, 1));
    const hargaPerolehan = parseNum(rowObj.hargaPerolehan, 0);

    const baseAset: Aset = {
      id,
      nama: String(nama).trim(),
      merek: rowObj.merek || (kibId === 'B' ? '-' : ''),
      spesifikasi: rowObj.spesifikasi || '',
      kategori: config.kategoriAset,
      ruangLokasi: rowObj.ruangLokasi || (kibId === 'A' ? 'Lahan Sekolah / Area Terbuka' : kibId === 'C' ? 'Kompleks Gedung Sekolah' : kibId === 'D' ? 'Lingkungan Sekolah' : kibId === 'E' ? 'Ruang Perpustakaan' : defaultSpaces[0] || 'Ruang Kelas'),
      jumlah,
      satuan: rowObj.satuan || config.defaultSatuan,
      kondisi,
      sumberDana: rowObj.sumberDana || 'BOS Reguler',
      tahunPerolehan,
      hargaPerolehan,
      fotoUrl: '',
      catatan: rowObj.catatan || '',
      tanggalRegister: new Date().toISOString().split('T')[0],
      serialNumber: rowObj.serialNumber || '',
      kodeBarangBmd: rowObj.kodeBarangBmd || config.kodeBarangBmd,
      nomorRegisterBmd: nomorRegister,
      nomorRegister: nomorRegister
    };

    // Spesifik KIB A
    if (kibId === 'A') {
      baseAset.luasTanahM2 = parseNum(rowObj.luasTanahM2 || rowObj.luasM2, 1000);
      baseAset.luasM2 = baseAset.luasTanahM2;
      baseAset.hakTanah = rowObj.hakTanah || 'Hak Pakai';
      baseAset.nomorSertifikatTanah = rowObj.nomorSertifikatTanah || rowObj.nomorSertifikat || `HP-DIKBUD/${yr}/${String(currentMaxIdNum).padStart(4, '0')}`;
      baseAset.nomorSertifikat = baseAset.nomorSertifikatTanah;
      baseAset.tanggalSertifikatTanah = rowObj.tanggalSertifikatTanah || rowObj.tanggalSertifikat || '-';
      baseAset.tanggalSertifikat = baseAset.tanggalSertifikatTanah;
      baseAset.letakAlamatTanah = rowObj.letakAlamatTanah || rowObj.letakAlamat || pengaturan.alamat || 'Kec. Routa, Kab. Konawe, Sulawesi Tenggara';
      baseAset.letakAlamat = baseAset.letakAlamatTanah;
      baseAset.penggunaanTanah = rowObj.penggunaanTanah || rowObj.penggunaan || 'Bangunan Sekolah & Fasilitas Pembelajaran';
      baseAset.asalUsulTanah = rowObj.asalUsulTanah || 'Pemerintah Provinsi Sulawesi Tenggara';
    }

    // Spesifik KIB B
    if (kibId === 'B') {
      baseAset.ukuranCc = rowObj.ukuranCc || '';
      baseAset.bahanMaterial = rowObj.bahanMaterial || '';
      baseAset.nomorPabrik = rowObj.nomorPabrik || rowObj.serialNumber || '';
      baseAset.nomorRangka = rowObj.nomorRangka || '-';
      baseAset.nomorMesin = rowObj.nomorMesin || '-';
      baseAset.nomorPolisi = rowObj.nomorPolisi || '-';
      baseAset.nomorBpkb = rowObj.nomorBpkb || '-';
    }

    // Spesifik KIB C
    if (kibId === 'C') {
      baseAset.luasLantaiM2 = parseNum(rowObj.luasLantaiM2 || rowObj.luasBangunanM2 || rowObj.luasM2, 72);
      baseAset.luasBangunanM2 = baseAset.luasLantaiM2;
      baseAset.konstruksiBeton = (rowObj.konstruksiBeton === 'Bukan Beton') ? 'Bukan Beton' : 'Beton';
      baseAset.kondisiBangunanTingkat = (rowObj.kondisiBangunanTingkat === 'Bertingkat') ? 'Bertingkat' : 'Tidak Bertingkat';
      baseAset.kondisiFisikBangunan = (rowObj.kondisiFisikBangunan === 'Semi Permanen' || rowObj.kondisiFisikBangunan === 'Darurat') ? rowObj.kondisiFisikBangunan : 'Permanen';
      baseAset.statusTanahGedung = rowObj.statusTanahGedung || 'Tanah Hak Pakai Pemerintah Daerah';
      baseAset.kodeTanahKibA = rowObj.kodeTanahKibA || rowObj.kodeTanahGedung || '';
      baseAset.kodeTanahGedung = baseAset.kodeTanahKibA;
      baseAset.nomorDokumenGedung = rowObj.nomorDokumenGedung || `IMB-GDG/${yr}/${String(currentMaxIdNum).padStart(4, '0')}`;
      baseAset.tanggalDokumenGedung = rowObj.tanggalDokumenGedung || '-';
    }

    // Spesifik KIB D
    if (kibId === 'D') {
      baseAset.konstruksiJaringan = rowObj.konstruksiJaringan || 'Paving Block / Beton';
      baseAset.panjangM = parseNum(rowObj.panjangM || rowObj.panjangMeter, 50);
      baseAset.lebarM = parseNum(rowObj.lebarM || rowObj.lebarMeter, 4);
      baseAset.statusTanahJaringan = rowObj.statusTanahJaringan || 'Tanah Hak Pakai Sekolah';
      baseAset.nomorDokumenJaringan = rowObj.nomorDokumenJaringan || rowObj.nomorDokumenJalan || `BAST-JAL/${yr}/${String(currentMaxIdNum).padStart(4, '0')}`;
      baseAset.nomorDokumenJalan = baseAset.nomorDokumenJaringan;
    }

    // Spesifik KIB E
    if (kibId === 'E') {
      baseAset.jenisAsetLainnya = rowObj.jenisAsetLainnya || 'Buku/Perpustakaan';
      baseAset.judulBuku = rowObj.judulBuku || rowObj.nama;
      baseAset.pengarangBuku = rowObj.pengarangBuku || rowObj.penciptaKesenian || '-';
      baseAset.penerbitBuku = rowObj.penerbitBuku || '-';
      baseAset.tahunCetakBuku = parseNum(rowObj.tahunCetakBuku, tahunPerolehan);
    }

    // Spesifik KIB F
    if (kibId === 'F') {
      baseAset.bangunanKdp = rowObj.bangunanKdp || rowObj.nama;
      baseAset.konstruksiKdp = (rowObj.konstruksiKdp === 'Bertingkat') ? 'Bertingkat' : 'Tidak Bertingkat';
      baseAset.luasKdpM2 = parseNum(rowObj.luasKdpM2, 100);
      baseAset.tanggalMulaiKdp = rowObj.tanggalMulaiKdp || rowObj.tanggalMulaiPembangunan || '-';
      baseAset.tanggalMulaiPembangunan = baseAset.tanggalMulaiKdp;
      baseAset.statusTanahKdp = rowObj.statusTanahKdp || 'Tanah Hak Pakai Pemerintah Daerah';
      baseAset.nilaiKontrakKdp = parseNum(rowObj.nilaiKontrakKdp || rowObj.nilaiKontrakPembangunan, hargaPerolehan);
      baseAset.nilaiKontrakPembangunan = baseAset.nilaiKontrakKdp;
      baseAset.progressFisikPersen = parseNum(rowObj.progressFisikPersen || rowObj.persentaseFisikKdp, 50);
      baseAset.persentaseFisikKdp = baseAset.progressFisikPersen;
    }

    validAsets.push(baseAset);
  }

  return { validAsets, skippedCount, warnings };
}
