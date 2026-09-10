import { Aset } from '../types';

export interface KibTableConfig {
  title: string;
  pdfHeaders: Array<Array<{ content: string; styles?: any }>>;
  pdfNumbering: Array<{ content: string; styles?: any }>;
  columnStylesF4: Record<number, any>;
  columnStylesA4: Record<number, any>;
  csvHeaders: string[];
  previewHeaders: string[];
}

export function getKibConfig(kibType: string): KibTableConfig {
  switch (kibType) {
    case 'A':
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) A - TANAH',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Jenis / Nama Barang', styles: { halign: 'left' } },
          { content: 'Kode Barang', styles: { halign: 'center' } },
          { content: 'No. Register', styles: { halign: 'center' } },
          { content: 'Luas (m²)', styles: { halign: 'right' } },
          { content: 'Thn Pengadaan', styles: { halign: 'center' } },
          { content: 'Letak / Alamat', styles: { halign: 'left' } },
          { content: 'Hak Tanah', styles: { halign: 'center' } },
          { content: 'Tgl Sertifikat', styles: { halign: 'center' } },
          { content: 'Nomor Sertifikat', styles: { halign: 'left' } },
          { content: 'Penggunaan', styles: { halign: 'left' } },
          { content: 'Asal Usul', styles: { halign: 'left' } },
          { content: 'Harga Perolehan (Rp)', styles: { halign: 'right' } },
          { content: 'Keterangan', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } },
          { content: '13', styles: { halign: 'center' } },
          { content: '14', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 32 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 16, halign: 'right' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 32 },
          7: { cellWidth: 18, halign: 'center' },
          8: { cellWidth: 18, halign: 'center' },
          9: { cellWidth: 24 },
          10: { cellWidth: 24 },
          11: { cellWidth: 20 },
          12: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          13: { cellWidth: 25 }
        },
        columnStylesA4: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 14, halign: 'right' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 28 },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 16, halign: 'center' },
          9: { cellWidth: 22 },
          10: { cellWidth: 20 },
          11: { cellWidth: 18 },
          12: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
          13: { cellWidth: 20 }
        },
        csvHeaders: [
          'No',
          'Jenis Barang / Nama Barang',
          'Nomor Kode Barang',
          'Nomor Register',
          'Luas (m2)',
          'Tahun Pengadaan',
          'Letak / Alamat',
          'Status Hak Tanah',
          'Tanggal Sertifikat',
          'Nomor Sertifikat',
          'Penggunaan',
          'Asal Usul',
          'Harga Perolehan (Rp)',
          'Keterangan'
        ],
        previewHeaders: [
          'No', 'Nama / Jenis Barang', 'Kode Barang', 'No. Register', 'Luas (m²)', 'Thn Pengadaan', 'Letak / Alamat', 'Hak Tanah', 'Sertifikat (Tgl/No)', 'Penggunaan', 'Asal Usul', 'Nilai Perolehan (Rp)', 'Keterangan'
        ]
      };

    case 'B':
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) B - PERALATAN DAN MESIN',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Kode Barang', styles: { halign: 'center' } },
          { content: 'Nama Barang', styles: { halign: 'left' } },
          { content: 'No. Register', styles: { halign: 'center' } },
          { content: 'Merek / Tipe', styles: { halign: 'left' } },
          { content: 'Ukuran/CC', styles: { halign: 'left' } },
          { content: 'Bahan', styles: { halign: 'left' } },
          { content: 'Thn', styles: { halign: 'center' } },
          { content: 'No. Pabrik / Polisi', styles: { halign: 'left' } },
          { content: 'Asal Usul', styles: { halign: 'left' } },
          { content: 'Kond', styles: { halign: 'center' } },
          { content: 'Jml', styles: { halign: 'center' } },
          { content: 'Harga (Rp)', styles: { halign: 'right' } },
          { content: 'Total (Rp)', styles: { halign: 'right' } },
          { content: 'Lokasi / Keterangan', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } },
          { content: '13', styles: { halign: 'center' } },
          { content: '14', styles: { halign: 'center' } },
          { content: '15', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 32 },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 26 },
          5: { cellWidth: 16 },
          6: { cellWidth: 16 },
          7: { cellWidth: 11, halign: 'center' },
          8: { cellWidth: 24 },
          9: { cellWidth: 18 },
          10: { cellWidth: 10, halign: 'center' },
          11: { cellWidth: 12, halign: 'center' },
          12: { cellWidth: 23, halign: 'right' },
          13: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          14: { cellWidth: 35 }
        },
        columnStylesA4: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 28 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 22 },
          5: { cellWidth: 14 },
          6: { cellWidth: 14 },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 20 },
          9: { cellWidth: 16 },
          10: { cellWidth: 9, halign: 'center' },
          11: { cellWidth: 11, halign: 'center' },
          12: { cellWidth: 21, halign: 'right' },
          13: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
          14: { cellWidth: 30 }
        },
        csvHeaders: [
          'No',
          'Kode Barang',
          'Nama Barang / Jenis BMD',
          'Nomor Register',
          'Merk / Tipe',
          'Ukuran / CC',
          'Bahan',
          'Tahun Perolehan',
          'No. Pabrik / Chasis / Mesin / Polisi / BPKB',
          'Asal Usul / Sumber',
          'Kondisi Fisik',
          'Jumlah',
          'Satuan',
          'Harga Satuan (Rp)',
          'Total Nilai (Rp)',
          'Ruang / Lokasi'
        ],
        previewHeaders: [
          'No', 'Kode Barang', 'Nama Barang', 'No. Register', 'Merk / Tipe', 'Ukuran/Bahan', 'Thn', 'No. Pabrik / Polisi', 'Asal Usul', 'Kond', 'Jml', 'Harga (Rp)', 'Total (Rp)', 'Lokasi'
        ]
      };

    case 'C':
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) C - GEDUNG DAN BANGUNAN',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Kode Barang', styles: { halign: 'center' } },
          { content: 'Nama Bangunan / Gedung', styles: { halign: 'left' } },
          { content: 'No. Reg', styles: { halign: 'center' } },
          { content: 'Kondisi', styles: { halign: 'center' } },
          { content: 'Tingkat', styles: { halign: 'center' } },
          { content: 'Beton', styles: { halign: 'center' } },
          { content: 'Luas Lantai (m²)', styles: { halign: 'right' } },
          { content: 'Letak / Alamat', styles: { halign: 'left' } },
          { content: 'Dokumen / IMB', styles: { halign: 'left' } },
          { content: 'Luas Tanah (m²)', styles: { halign: 'right' } },
          { content: 'Status Tanah', styles: { halign: 'left' } },
          { content: 'Asal Usul', styles: { halign: 'left' } },
          { content: 'Harga (Rp)', styles: { halign: 'right' } },
          { content: 'Keterangan', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } },
          { content: '13', styles: { halign: 'center' } },
          { content: '14', styles: { halign: 'center' } },
          { content: '15', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 34 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 15, halign: 'center' },
          5: { cellWidth: 14, halign: 'center' },
          6: { cellWidth: 13, halign: 'center' },
          7: { cellWidth: 18, halign: 'right' },
          8: { cellWidth: 32 },
          9: { cellWidth: 24 },
          10: { cellWidth: 18, halign: 'right' },
          11: { cellWidth: 18 },
          12: { cellWidth: 18 },
          13: { cellWidth: 27, halign: 'right', fontStyle: 'bold' },
          14: { cellWidth: 20 }
        },
        columnStylesA4: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 28 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 13, halign: 'center' },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 11, halign: 'center' },
          7: { cellWidth: 16, halign: 'right' },
          8: { cellWidth: 26 },
          9: { cellWidth: 20 },
          10: { cellWidth: 15, halign: 'right' },
          11: { cellWidth: 16 },
          12: { cellWidth: 16 },
          13: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
          14: { cellWidth: 17 }
        },
        csvHeaders: [
          'No',
          'Kode Barang',
          'Nama Bangunan / Gedung',
          'Nomor Register',
          'Kondisi Bangunan',
          'Bertingkat (Ya/Tidak)',
          'Beton (Ya/Tidak)',
          'Luas Lantai (m2)',
          'Letak / Lokasi Alamat',
          'Dokumen / Nomor IMB-PBG',
          'Luas Tanah (m2)',
          'Status Tanah',
          'Asal Usul',
          'Nilai Perolehan (Rp)',
          'Keterangan'
        ],
        previewHeaders: [
          'No', 'Kode Gedung', 'Nama Gedung', 'No. Reg', 'Kondisi', 'Konstruksi', 'Luas Lantai (m²)', 'Lokasi Alamat', 'Dokumen IMB', 'Luas / Status Tanah', 'Asal Usul', 'Nilai Perolehan (Rp)', 'Keterangan'
        ]
      };

    case 'D':
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) D - JALAN, IRIGASI, DAN JARINGAN',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Kode Barang', styles: { halign: 'center' } },
          { content: 'Nama Barang / Jaringan', styles: { halign: 'left' } },
          { content: 'No. Reg', styles: { halign: 'center' } },
          { content: 'Konstruksi', styles: { halign: 'left' } },
          { content: 'Panjang (m)', styles: { halign: 'right' } },
          { content: 'Lebar (m)', styles: { halign: 'right' } },
          { content: 'Luas (m²)', styles: { halign: 'right' } },
          { content: 'Letak / Lokasi', styles: { halign: 'left' } },
          { content: 'Dokumen', styles: { halign: 'left' } },
          { content: 'Status Tanah', styles: { halign: 'left' } },
          { content: 'Asal Usul', styles: { halign: 'left' } },
          { content: 'Kond', styles: { halign: 'center' } },
          { content: 'Harga (Rp)', styles: { halign: 'right' } },
          { content: 'Keterangan', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } },
          { content: '13', styles: { halign: 'center' } },
          { content: '14', styles: { halign: 'center' } },
          { content: '15', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 34 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 22 },
          5: { cellWidth: 15, halign: 'right' },
          6: { cellWidth: 14, halign: 'right' },
          7: { cellWidth: 16, halign: 'right' },
          8: { cellWidth: 30 },
          9: { cellWidth: 22 },
          10: { cellWidth: 18 },
          11: { cellWidth: 18 },
          12: { cellWidth: 11, halign: 'center' },
          13: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          14: { cellWidth: 25 }
        },
        columnStylesA4: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 28 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 18 },
          5: { cellWidth: 13, halign: 'right' },
          6: { cellWidth: 12, halign: 'right' },
          7: { cellWidth: 14, halign: 'right' },
          8: { cellWidth: 25 },
          9: { cellWidth: 18 },
          10: { cellWidth: 16 },
          11: { cellWidth: 16 },
          12: { cellWidth: 10, halign: 'center' },
          13: { cellWidth: 23, halign: 'right', fontStyle: 'bold' },
          14: { cellWidth: 21 }
        },
        csvHeaders: [
          'No',
          'Kode Barang',
          'Nama Barang / Jaringan',
          'Nomor Register',
          'Konstruksi',
          'Panjang (m)',
          'Lebar (m)',
          'Luas (m2)',
          'Letak / Lokasi',
          'Dokumen (Nomor & Tanggal)',
          'Status Tanah',
          'Asal Usul',
          'Kondisi Fisik',
          'Nilai Perolehan (Rp)',
          'Keterangan'
        ],
        previewHeaders: [
          'No', 'Kode Barang', 'Nama Jaringan', 'No. Reg', 'Konstruksi', 'Dimensi (P x L / Luas)', 'Lokasi', 'Dokumen', 'Status Tanah', 'Asal Usul', 'Kondisi', 'Nilai Perolehan (Rp)', 'Keterangan'
        ]
      };

    case 'E':
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) E - ASET TETAP LAINNYA',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Kode Barang', styles: { halign: 'center' } },
          { content: 'Nama Barang / Jenis BMD', styles: { halign: 'left' } },
          { content: 'No. Reg', styles: { halign: 'center' } },
          { content: 'Buku: Judul / Pencipta / Penerbit', styles: { halign: 'left' } },
          { content: 'Barang Seni: Asal / Bahan', styles: { halign: 'left' } },
          { content: 'Hewan / Tanaman', styles: { halign: 'left' } },
          { content: 'Jml', styles: { halign: 'center' } },
          { content: 'Thn', styles: { halign: 'center' } },
          { content: 'Asal Usul', styles: { halign: 'left' } },
          { content: 'Kond', styles: { halign: 'center' } },
          { content: 'Harga Satuan (Rp)', styles: { halign: 'right' } },
          { content: 'Total (Rp)', styles: { halign: 'right' } },
          { content: 'Penempatan / Ket', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } },
          { content: '13', styles: { halign: 'center' } },
          { content: '14', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 32 },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 40 },
          5: { cellWidth: 28 },
          6: { cellWidth: 20 },
          7: { cellWidth: 12, halign: 'center' },
          8: { cellWidth: 11, halign: 'center' },
          9: { cellWidth: 18 },
          10: { cellWidth: 10, halign: 'center' },
          11: { cellWidth: 24, halign: 'right' },
          12: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          13: { cellWidth: 30 }
        },
        columnStylesA4: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 28 },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 34 },
          5: { cellWidth: 24 },
          6: { cellWidth: 16 },
          7: { cellWidth: 11, halign: 'center' },
          8: { cellWidth: 10, halign: 'center' },
          9: { cellWidth: 16 },
          10: { cellWidth: 9, halign: 'center' },
          11: { cellWidth: 22, halign: 'right' },
          12: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
          13: { cellWidth: 24 }
        },
        csvHeaders: [
          'No',
          'Kode Barang',
          'Nama Barang / Jenis BMD',
          'Nomor Register',
          'Buku: Judul / Pencipta / Penerbit',
          'Tahun Terbit',
          'Barang Seni: Asal / Pencipta / Bahan',
          'Hewan / Ternak / Tanaman',
          'Jumlah',
          'Tahun Perolehan',
          'Asal Usul',
          'Kondisi Fisik',
          'Harga Satuan (Rp)',
          'Total Nilai (Rp)',
          'Penempatan / Keterangan'
        ],
        previewHeaders: [
          'No', 'Kode Barang', 'Nama Barang', 'No. Reg', 'Detail Buku / Pustaka', 'Seni / Hewan', 'Jml', 'Thn', 'Asal Usul', 'Kond', 'Harga (Rp)', 'Total (Rp)', 'Penempatan'
        ]
      };

    case 'F':
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) F - KONSTRUKSI DALAM PENGERJAAN',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Nama Barang / Bangunan (KDP)', styles: { halign: 'left' } },
          { content: 'Tingkat', styles: { halign: 'center' } },
          { content: 'Beton', styles: { halign: 'center' } },
          { content: 'Luas Rencana (m²)', styles: { halign: 'right' } },
          { content: 'Letak / Lokasi Alamat', styles: { halign: 'left' } },
          { content: 'Nomor Kontrak / SPK', styles: { halign: 'left' } },
          { content: 'Tgl SPK', styles: { halign: 'center' } },
          { content: 'Tgl Mulai', styles: { halign: 'center' } },
          { content: 'Nilai Kontrak (Rp)', styles: { halign: 'right' } },
          { content: 'Fisik (%)', styles: { halign: 'center' } },
          { content: 'Realisasi Saat Ini (Rp)', styles: { halign: 'right' } },
          { content: 'Keterangan', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } },
          { content: '13', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 42 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 20, halign: 'right' },
          5: { cellWidth: 35 },
          6: { cellWidth: 28 },
          7: { cellWidth: 18, halign: 'center' },
          8: { cellWidth: 18, halign: 'center' },
          9: { cellWidth: 28, halign: 'right' },
          10: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
          11: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
          12: { cellWidth: 24 }
        },
        columnStylesA4: {
          0: { cellWidth: 6, halign: 'center' },
          1: { cellWidth: 36 },
          2: { cellWidth: 13, halign: 'center' },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 18, halign: 'right' },
          5: { cellWidth: 30 },
          6: { cellWidth: 24 },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 16, halign: 'center' },
          9: { cellWidth: 25, halign: 'right' },
          10: { cellWidth: 13, halign: 'center', fontStyle: 'bold' },
          11: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
          12: { cellWidth: 21 }
        },
        csvHeaders: [
          'No',
          'Nama Bangunan / Proyek (KDP)',
          'Bertingkat (Ya/Tidak)',
          'Beton (Ya/Tidak)',
          'Luas Rencana (m2)',
          'Letak / Lokasi Alamat',
          'Nomor Dokumen SPK / Kontrak',
          'Tanggal SPK',
          'Tanggal Mulai Pelaksanaan',
          'Nilai Kontrak (Rp)',
          'Realisasi Fisik (%)',
          'Nilai Realisasi Perolehan Saat Ini (Rp)',
          'Keterangan'
        ],
        previewHeaders: [
          'No', 'Nama Bangunan / Proyek KDP', 'Konstruksi', 'Luas Rencana (m²)', 'Lokasi Alamat', 'Dokumen SPK / Kontrak', 'Tgl Mulai', 'Nilai Kontrak (Rp)', 'Progres (%)', 'Realisasi Saat Ini (Rp)', 'Keterangan'
        ]
      };

    default: // 'ALL' Gabungan
      return {
        title: 'KARTU INVENTARIS BARANG (KIB) - REKAPITULASI SEMUA BIDANG BMD',
        pdfHeaders: [[
          { content: 'No', styles: { halign: 'center' } },
          { content: 'Kode Barang', styles: { halign: 'center' } },
          { content: 'Nama Barang / Jenis BMD', styles: { halign: 'left' } },
          { content: 'No. Register', styles: { halign: 'center' } },
          { content: 'Merk / Tipe / Spesifikasi', styles: { halign: 'left' } },
          { content: 'Thn', styles: { halign: 'center' } },
          { content: 'Asal Usul / Sumber', styles: { halign: 'left' } },
          { content: 'Volume', styles: { halign: 'center' } },
          { content: 'Harga Satuan', styles: { halign: 'right' } },
          { content: 'Total Nilai (Rp)', styles: { halign: 'right' } },
          { content: 'Kond', styles: { halign: 'center' } },
          { content: 'Ruang / Keterangan', styles: { halign: 'left' } }
        ]],
        pdfNumbering: [
          { content: '1', styles: { halign: 'center' } },
          { content: '2', styles: { halign: 'center' } },
          { content: '3', styles: { halign: 'center' } },
          { content: '4', styles: { halign: 'center' } },
          { content: '5', styles: { halign: 'center' } },
          { content: '6', styles: { halign: 'center' } },
          { content: '7', styles: { halign: 'center' } },
          { content: '8', styles: { halign: 'center' } },
          { content: '9', styles: { halign: 'center' } },
          { content: '10', styles: { halign: 'center' } },
          { content: '11', styles: { halign: 'center' } },
          { content: '12', styles: { halign: 'center' } }
        ],
        columnStylesF4: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 42 },
          3: { cellWidth: 22, halign: 'center' },
          4: { cellWidth: 38 },
          5: { cellWidth: 11, halign: 'center' },
          6: { cellWidth: 25 },
          7: { cellWidth: 16, halign: 'center' },
          8: { cellWidth: 26, halign: 'right' },
          9: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
          10: { cellWidth: 12, halign: 'center' },
          11: { cellWidth: 50 }
        },
        columnStylesA4: {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 38 },
          3: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 34 },
          5: { cellWidth: 10, halign: 'center' },
          6: { cellWidth: 22 },
          7: { cellWidth: 15, halign: 'center' },
          8: { cellWidth: 23, halign: 'right' },
          9: { cellWidth: 25, halign: 'right', fontStyle: 'bold' },
          10: { cellWidth: 11, halign: 'center' },
          11: { cellWidth: 46 }
        },
        csvHeaders: [
          'No',
          'Kode Barang',
          'Nama Barang / Jenis BMD',
          'Nomor Register',
          'Merk / Type / Spesifikasi',
          'Tahun Perolehan',
          'Asal Usul / Sumber Dana',
          'Jumlah (Volume)',
          'Satuan',
          'Harga Perolehan Satuan (Rp)',
          'Total Nilai Perolehan (Rp)',
          'Kondisi Fisik',
          'Lokasi Penempatan / Keterangan'
        ],
        previewHeaders: [
          'No', 'Kode Barang', 'Nama Barang / Jenis BMD', 'No. Register', 'Merk / Spesifikasi', 'Thn', 'Asal Usul', 'Vol', 'Harga Satuan', 'Total Nilai', 'Kond', 'Ruang / Lokasi'
        ]
      };
  }
}

export function formatAsetKibRow(a: Aset, idx: number, kibType: string, isForPdf: boolean = true): string[] {
  const hargaSatuan = Number(a.hargaPerolehan) || 0;
  const totalHarga = hargaSatuan * (Number(a.jumlah) || 1);
  const regNo = a.serialNumber || `REG-${a.id.replace(/[^0-9]/g, '') || idx + 1}`;

  const formatRp = (num: number) => {
    if (num <= 0) return '-';
    return isForPdf ? `Rp ${num.toLocaleString('id-ID')}` : String(num);
  };

  switch (kibType) {
    case 'A': // Tanah
      return [
        String(idx + 1),
        a.nama || '-',
        a.kodeBarangBmd || a.id,
        regNo,
        a.luasTanahM2 ? `${a.luasTanahM2} m²` : '-',
        String(a.tahunPerolehan || '-'),
        a.letakAlamatTanah || a.ruangLokasi || '-',
        a.hakTanah || 'Hak Pakai',
        a.tanggalSertifikatTanah || '-',
        a.nomorSertifikatTanah || '-',
        a.penggunaanTanah || 'Pendidikan / Sekolah',
        a.asalUsulTanah || a.sumberDana || 'Pemerintah Provinsi Sultra',
        formatRp(totalHarga),
        a.catatan || '-'
      ];

    case 'B': // Peralatan dan Mesin
      return [
        String(idx + 1),
        a.kodeBarangBmd || a.id,
        a.nama || '-',
        regNo,
        `${a.merek || '-'}${a.spesifikasi ? ' / ' + a.spesifikasi : ''}`,
        a.ukuranCc || '-',
        a.bahanMaterial || '-',
        String(a.tahunPerolehan || '-'),
        a.nomorPabrik || a.nomorPolisi || a.nomorRangka || a.serialNumber || '-',
        a.sumberDana || 'BOS Reguler',
        a.kondisi === 'Baik' ? 'B' : a.kondisi === 'Rusak Ringan' ? 'RR' : 'RB',
        `${a.jumlah} ${a.satuan || 'Unit'}`,
        formatRp(hargaSatuan),
        formatRp(totalHarga),
        `${a.ruangLokasi}${a.catatan ? ' (' + a.catatan + ')' : ''}`
      ];

    case 'C': // Gedung dan Bangunan
      return [
        String(idx + 1),
        a.kodeBarangBmd || a.id,
        a.nama || '-',
        regNo,
        a.kondisi || 'Baik',
        a.kondisiBangunanTingkat || 'Tidak Bertingkat',
        a.konstruksiBeton || 'Beton',
        a.luasLantaiM2 ? `${a.luasLantaiM2} m²` : '-',
        a.lokasiGedung || 'Jl. Poros Amonggedo, Kec. Amonggedo',
        a.nomorDokumenGedung || '-',
        a.luasTanahM2 ? `${a.luasTanahM2} m²` : '-',
        a.statusTanahGedung || 'Milik Pemprov Sultra',
        a.sumberDana || 'APBD Provinsi',
        formatRp(totalHarga),
        a.catatan || '-'
      ];

    case 'D': // Jalan, Irigasi, Jaringan
      return [
        String(idx + 1),
        a.kodeBarangBmd || a.id,
        a.nama || '-',
        regNo,
        a.konstruksiJaringan || 'Aspal / Paving / Rabat',
        a.panjangM ? `${a.panjangM} m` : '-',
        a.lebarM ? `${a.lebarM} m` : '-',
        a.luasJaringanM2 ? `${a.luasJaringanM2} m²` : '-',
        a.lokasiJaringan || 'Kompleks SMA Negeri 17 Konawe',
        a.nomorDokumenJaringan || '-',
        a.statusTanahJaringan || 'Tanah Sekolah',
        a.sumberDana || 'APBD Provinsi / DAK',
        a.kondisi === 'Baik' ? 'B' : a.kondisi === 'Rusak Ringan' ? 'RR' : 'RB',
        formatRp(totalHarga),
        a.catatan || '-'
      ];

    case 'E': // Aset Tetap Lainnya
      return [
        String(idx + 1),
        a.kodeBarangBmd || a.id,
        a.nama || '-',
        regNo,
        a.judulBuku ? `${a.judulBuku}${a.penerbitBuku ? ' / ' + a.penerbitBuku : ''}` : (a.jenisAsetLainnya || '-'),
        a.asalDaerahKesenian ? `${a.asalDaerahKesenian} / ${a.bahanKesenian || '-'}` : '-',
        a.jenisAsetLainnya || '-',
        `${a.jumlah} ${a.satuan || 'Eks'}`,
        String(a.tahunPerolehan || '-'),
        a.sumberDana || 'BOS Reguler',
        a.kondisi === 'Baik' ? 'B' : a.kondisi === 'Rusak Ringan' ? 'RR' : 'RB',
        formatRp(hargaSatuan),
        formatRp(totalHarga),
        `${a.ruangLokasi}${a.catatan ? ' (' + a.catatan + ')' : ''}`
      ];

    case 'F': // KDP
      return [
        String(idx + 1),
        a.nama || '-',
        a.konstruksiKdp || 'Tidak Bertingkat',
        'Beton',
        a.luasKdpM2 ? `${a.luasKdpM2} m²` : '-',
        a.lokasiKdp || 'Kompleks SMA Negeri 17 Konawe',
        '-',
        '-',
        a.tanggalMulaiKdp || '-',
        a.nilaiKontrakKdp ? formatRp(a.nilaiKontrakKdp) : '-',
        `${a.progressFisikPersen || 0}%`,
        formatRp(totalHarga),
        a.catatan || '-'
      ];

    default: // 'ALL' Gabungan
      return [
        String(idx + 1),
        a.id,
        a.nama || '-',
        regNo,
        `${a.merek || '-'}${a.spesifikasi ? ' / ' + a.spesifikasi : ''}`,
        String(a.tahunPerolehan || '-'),
        a.sumberDana || 'BOS Reguler',
        `${a.jumlah} ${a.satuan}`,
        formatRp(hargaSatuan),
        formatRp(totalHarga),
        a.kondisi === 'Baik' ? 'B' : a.kondisi === 'Rusak Ringan' ? 'RR' : 'RB',
        `${a.ruangLokasi}${a.catatan ? ' (' + a.catatan + ')' : ''}`
      ];
  }
}

export interface KirTableConfig {
  title: string;
  pdfHeaders: Array<Array<{ content: string; rowSpan?: number; colSpan?: number; styles?: any }>>;
  pdfNumbering: Array<{ content: string; styles?: any }>;
  columnStyles: Record<number, any>;
  csvHeaders: string[];
}

export function getKirConfig(orientation: 'portrait' | 'landscape', paperType: 'F4' | 'A4'): KirTableConfig {
  const isLandscape = orientation === 'landscape';
  const isF4 = paperType === 'F4';

  const pdfHeaders = [
    [
      { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Kode Barang', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Nama Barang / Jenis BMD', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Nomor Register', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Merk / Tipe / Spesifikasi', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'No. Sertifikat / Pabrik / Seri', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Bahan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Thn', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Jumlah Barang', colSpan: 2, styles: { halign: 'center' } },
      { content: 'Harga (Rp)', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Keadaan Barang', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Keterangan / Mutasi', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ],
    [
      { content: 'Vol', styles: { halign: 'center' } },
      { content: 'Sat', styles: { halign: 'center' } },
      { content: 'Baik (B)', styles: { halign: 'center' } },
      { content: 'Kurang Baik (RR)', styles: { halign: 'center' } },
      { content: 'Rusak Berat (RB)', styles: { halign: 'center' } }
    ],
    [
      { content: '1', styles: { halign: 'center' } },
      { content: '2', styles: { halign: 'center' } },
      { content: '3', styles: { halign: 'center' } },
      { content: '4', styles: { halign: 'center' } },
      { content: '5', styles: { halign: 'center' } },
      { content: '6', styles: { halign: 'center' } },
      { content: '7', styles: { halign: 'center' } },
      { content: '8', styles: { halign: 'center' } },
      { content: '9', styles: { halign: 'center' } },
      { content: '10', styles: { halign: 'center' } },
      { content: '11', styles: { halign: 'center' } },
      { content: '12', styles: { halign: 'center' } },
      { content: '13', styles: { halign: 'center' } },
      { content: '14', styles: { halign: 'center' } },
      { content: '15', styles: { halign: 'center' } }
    ]
  ];

  let columnStyles: Record<number, any> = {};

  if (isLandscape) {
    if (isF4) {
      columnStyles = {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 36 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 },
        6: { cellWidth: 18 },
        7: { cellWidth: 11, halign: 'center' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 12, halign: 'center' },
        10: { cellWidth: 24, halign: 'right' },
        11: { cellWidth: 11, halign: 'center' },
        12: { cellWidth: 12, halign: 'center' },
        13: { cellWidth: 12, halign: 'center' },
        14: { cellWidth: 71 }
      };
    } else {
      columnStyles = {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 32 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 26 },
        5: { cellWidth: 18 },
        6: { cellWidth: 16 },
        7: { cellWidth: 10, halign: 'center' },
        8: { cellWidth: 9, halign: 'center' },
        9: { cellWidth: 11, halign: 'center' },
        10: { cellWidth: 22, halign: 'right' },
        11: { cellWidth: 10, halign: 'center' },
        12: { cellWidth: 11, halign: 'center' },
        13: { cellWidth: 11, halign: 'center' },
        14: { cellWidth: 62 }
      };
    }
  } else {
    // Portrait
    if (isF4) {
      columnStyles = {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 17, halign: 'center' },
        2: { cellWidth: 28 },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 22 },
        5: { cellWidth: 15 },
        6: { cellWidth: 14 },
        7: { cellWidth: 9, halign: 'center' },
        8: { cellWidth: 8, halign: 'center' },
        9: { cellWidth: 9, halign: 'center' },
        10: { cellWidth: 18, halign: 'right' },
        11: { cellWidth: 7, halign: 'center' },
        12: { cellWidth: 8, halign: 'center' },
        13: { cellWidth: 8, halign: 'center' },
        14: { cellWidth: 21 }
      };
    } else {
      columnStyles = {
        0: { cellWidth: 5, halign: 'center' },
        1: { cellWidth: 16, halign: 'center' },
        2: { cellWidth: 26 },
        3: { cellWidth: 13, halign: 'center' },
        4: { cellWidth: 20 },
        5: { cellWidth: 14 },
        6: { cellWidth: 13 },
        7: { cellWidth: 9, halign: 'center' },
        8: { cellWidth: 8, halign: 'center' },
        9: { cellWidth: 9, halign: 'center' },
        10: { cellWidth: 17, halign: 'right' },
        11: { cellWidth: 7, halign: 'center' },
        12: { cellWidth: 8, halign: 'center' },
        13: { cellWidth: 8, halign: 'center' },
        14: { cellWidth: 25 }
      };
    }
  }

  const csvHeaders = [
    'No',
    'Kode Barang',
    'Nama Barang / Jenis BMD',
    'Nomor Register',
    'Merk / Tipe / Spesifikasi',
    'No. Sertifikat / Pabrik / Chasis / Mesin',
    'Bahan',
    'Tahun Perolehan',
    'Jumlah (Volume)',
    'Satuan',
    'Harga Perolehan (Rp)',
    'Keadaan Barang: Baik (B)',
    'Keadaan Barang: Rusak Ringan (RR)',
    'Keadaan Barang: Rusak Berat (RB)',
    'Keterangan / Sumber Perolehan'
  ];

  return {
    title: 'KARTU INVENTARIS RUANGAN (KIR)',
    pdfHeaders,
    pdfNumbering: pdfHeaders[2],
    columnStyles,
    csvHeaders
  };
}

export function formatKirRow(
  a: Aset,
  idx: number,
  isForPdf: boolean = true,
  isBlank: boolean = false
): string[] {
  if (isBlank) {
    return [
      String(idx + 1),
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....',
      '.....'
    ];
  }

  const kode = a.kodeBarangBmd || a.id || '-';
  const regNo = a.nomorRegisterBmd || a.serialNumber || ('000000' + (idx + 1)).slice(-6);
  const merk = [a.merek, a.spesifikasi].filter(Boolean).join(' / ') || '-';
  const noPabrik = a.nomorPabrik || a.nomorPolisi || a.nomorRangka || a.serialNumber || '-';
  const bahan = a.bahanMaterial || (a.ukuranCc ? `Uk: ${a.ukuranCc}` : '-');
  const thn = String(a.tahunPerolehan || '-');
  const vol = String(a.jumlah || 1);
  const sat = a.satuan || 'Unit';
  const totalHarga = (a.hargaPerolehan || 0) * (a.jumlah || 1);
  const hargaStr = totalHarga > 0 
    ? (isForPdf ? `Rp ${totalHarga.toLocaleString('id-ID')}` : String(totalHarga))
    : '-';
  const b = a.kondisi === 'Baik' ? String(a.jumlah || 1) : '-';
  const rr = a.kondisi === 'Rusak Ringan' ? String(a.jumlah || 1) : '-';
  const rb = a.kondisi === 'Rusak Berat' ? String(a.jumlah || 1) : '-';
  const ket = [a.sumberDana || 'BOS Reguler', a.catatan].filter(Boolean).join(' - ');

  return [
    String(idx + 1),
    kode,
    a.nama || '-',
    regNo,
    merk,
    noPabrik,
    bahan,
    thn,
    vol,
    sat,
    hargaStr,
    b,
    rr,
    rb,
    ket
  ];
}
