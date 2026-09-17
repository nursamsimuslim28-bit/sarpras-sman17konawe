import * as XLSX from 'xlsx';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  UnderlineType,
  ShadingType
} from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { OpnameEntry, OpnameMasterItem, PengaturanSekolah } from '../types';

type KibKey = 'B' | 'C' | 'E';

const KIB_TITLE: Record<KibKey, string> = {
  B: 'KARTU INVENTARIS BARANG (KIB) B - PERALATAN DAN MESIN',
  C: 'KARTU INVENTARIS BARANG (KIB) C - GEDUNG DAN BANGUNAN',
  E: 'KARTU INVENTARIS BARANG (KIB) E - ASET TETAP LAINNYA'
};

// ============ HASIL SENSUS - struktur sama persis format resmi (6 kategori x Jml/Nilai/Tanpa Nilai) ============

type SensusStatusKey = 'ditemukan' | 'tidakDitemukan' | 'dikuasaiPegawai' | 'tidakDiketahui' | 'digunakanUnitLain' | 'dikuasaiPihakKetiga';

const SENSUS_CATEGORIES: { key: SensusStatusKey; label: string }[] = [
  { key: 'ditemukan', label: 'Aset Ditemukan' },
  { key: 'tidakDitemukan', label: 'Aset Tidak Ditemukan' },
  { key: 'dikuasaiPegawai', label: 'Aset Dikuasai Pegawai' },
  { key: 'tidakDiketahui', label: 'Tidak Diketahui' },
  { key: 'digunakanUnitLain', label: 'Digunakan SKPD/Unit Lain' },
  { key: 'dikuasaiPihakKetiga', label: 'Dikuasai Pihak Ke-3' }
];

const KONDISI_CODES: { code: 'B' | 'KB' | 'RB'; kondisi: OpnameEntry['kondisi'] }[] = [
  { code: 'B', kondisi: 'Baik' },
  { code: 'KB', kondisi: 'Rusak Ringan' },
  { code: 'RB', kondisi: 'Rusak Berat' }
];

interface StatusTally {
  jml: number;
  nilai: number;
  tanpaNilai: number;
}
function emptyStatusTally(): StatusTally {
  return { jml: 0, nilai: 0, tanpaNilai: 0 };
}

interface KondisiTally {
  jml: number;
  nilai: number;
}
function emptyKondisiTally(): KondisiTally {
  return { jml: 0, nilai: 0 };
}

interface Tally {
  administratifJml: number;
  administratifNilai: number;
  sudahDiopnameJml: number;
  status: Record<SensusStatusKey, StatusTally>;
  kondisi: Record<'B' | 'KB' | 'RB', KondisiTally>;
}

function emptyTally(): Tally {
  return {
    administratifJml: 0,
    administratifNilai: 0,
    sudahDiopnameJml: 0,
    status: {
      ditemukan: emptyStatusTally(),
      tidakDitemukan: emptyStatusTally(),
      dikuasaiPegawai: emptyStatusTally(),
      tidakDiketahui: emptyStatusTally(),
      digunakanUnitLain: emptyStatusTally(),
      dikuasaiPihakKetiga: emptyStatusTally()
    },
    kondisi: { B: emptyKondisiTally(), KB: emptyKondisiTally(), RB: emptyKondisiTally() }
  };
}

function statusKeyForEntry(entry: OpnameEntry): SensusStatusKey {
  if (entry.ditemukan === 'Tidak') return 'tidakDitemukan';
  switch (entry.statusPenguasaan) {
    case 'Dikuasai Pegawai': return 'dikuasaiPegawai';
    case 'Digunakan Unit Lain': return 'digunakanUnitLain';
    case 'Dikuasai Pihak Ketiga': return 'dikuasaiPihakKetiga';
    default: return 'ditemukan';
  }
}

function kondisiCodeForEntry(kondisi: OpnameEntry['kondisi']): 'B' | 'KB' | 'RB' | null {
  if (kondisi === 'Baik') return 'B';
  if (kondisi === 'Rusak Ringan') return 'KB';
  if (kondisi === 'Rusak Berat') return 'RB';
  return null;
}

function classifyEntry(entry: OpnameEntry, harga: number, tally: Tally) {
  tally.sudahDiopnameJml += 1;

  const statusKey = statusKeyForEntry(entry);
  const st = tally.status[statusKey];
  st.jml += 1;
  if (harga > 0) st.nilai += harga;
  else st.tanpaNilai += 1;

  const kCode = kondisiCodeForEntry(entry.kondisi);
  if (kCode) {
    tally.kondisi[kCode].jml += 1;
    tally.kondisi[kCode].nilai += harga;
  }
}

function fmtRupiah(n: number): number {
  return Math.round(n || 0);
}

function formatRp(n: number): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

// ============ KOLOM DEPAN (item detail) PER KIB - mengikuti urutan & label resmi ============

interface LeadingCol {
  label: string;
  width: number;
  get: (m: OpnameMasterItem, pengaturan: PengaturanSekolah) => string | number;
}
interface LeadingGroup {
  groupLabel: string;
  cols: LeadingCol[]; // 1 kolom = standar (merge vertikal), >1 kolom = grup (merge horizontal di baris grup)
}

const blank = () => '-';

function leadingGroupsFor(kib: KibKey): LeadingGroup[] {
  if (kib === 'B') {
    return [
      { groupLabel: 'Nomor Urut', cols: [{ label: 'Nomor Urut', width: 6, get: m => m.no || '' }] },
      { groupLabel: 'Nama Barang/Jenis Aset', cols: [{ label: 'Nama Barang/Jenis Aset', width: 32, get: m => m.nama || '-' }] },
      { groupLabel: 'Nomor Register', cols: [{ label: 'Nomor Register', width: 14, get: m => m.register || '-' }] },
      { groupLabel: 'Merk/Type', cols: [{ label: 'Merk/Type', width: 18, get: m => m.merk || '-' }] },
      { groupLabel: 'Ukuran/CC', cols: [{ label: 'Ukuran/CC', width: 10, get: blank }] },
      { groupLabel: 'Bahan', cols: [{ label: 'Bahan', width: 14, get: m => m.bahan || '-' }] },
      { groupLabel: 'Tahun Pembelian', cols: [{ label: 'Tahun Pembelian', width: 10, get: m => m.tahun || '-' }] },
      {
        groupLabel: 'Nomor',
        cols: [
          { label: 'Rangka', width: 12, get: blank },
          { label: 'Mesin', width: 12, get: blank },
          { label: 'Polisi', width: 12, get: blank },
          { label: 'BPKB', width: 12, get: blank }
        ]
      },
      { groupLabel: 'Keadaan Barang (B/KB/RB)', cols: [{ label: 'Keadaan Barang (B/KB/RB)', width: 12, get: blank }] },
      { groupLabel: 'Asal Usul', cols: [{ label: 'Asal Usul', width: 20, get: m => m.asalUsul || '-' }] },
      { groupLabel: 'Penggunaan', cols: [{ label: 'Penggunaan', width: 14, get: blank }] },
      { groupLabel: 'Satuan', cols: [{ label: 'Satuan', width: 10, get: blank }] },
      { groupLabel: 'Harga', cols: [{ label: 'Harga (ribuan Rp)', width: 16, get: m => fmtRupiah(m.harga || 0) }] },
      { groupLabel: 'KET.', cols: [{ label: 'KET.', width: 24, get: m => m.keterangan || '-' }] }
    ];
  }
  if (kib === 'C') {
    return [
      { groupLabel: 'No. Simda', cols: [{ label: 'No. Simda', width: 6, get: m => m.no || '' }] },
      { groupLabel: 'OPD', cols: [{ label: 'OPD', width: 20, get: (_m, p) => p.namaSekolah || '-' }] },
      { groupLabel: 'Jenis Barang / Nama Barang', cols: [{ label: 'Jenis Barang / Nama Barang', width: 32, get: m => m.nama || '-' }] },
      { groupLabel: 'Register', cols: [{ label: 'Register', width: 14, get: m => m.register || '-' }] },
      {
        groupLabel: 'Konstruksi Bangunan',
        cols: [
          { label: 'Kondisi Bangunan (B/KB/RB)', width: 12, get: blank },
          { label: 'Bertingkat/Tidak', width: 12, get: blank },
          { label: 'Beton/Tidak', width: 12, get: blank },
          { label: 'Luas Lantai (M2)', width: 14, get: m => m.luasLantai || '-' }
        ]
      },
      { groupLabel: 'Letak/Lokasi Alamat', cols: [{ label: 'Letak/Lokasi Alamat', width: 20, get: m => m.letakLokasi || '-' }] },
      {
        groupLabel: 'Dokumen Gedung',
        cols: [
          { label: 'Tanggal', width: 12, get: blank },
          { label: 'Nomor', width: 12, get: blank }
        ]
      },
      { groupLabel: 'Status Tanah', cols: [{ label: 'Status Tanah', width: 12, get: blank }] },
      { groupLabel: 'Nomor Kode Tanah', cols: [{ label: 'Nomor Kode Tanah', width: 16, get: blank }] },
      { groupLabel: 'Asal Usul', cols: [{ label: 'Asal Usul', width: 20, get: m => m.asalUsul || '-' }] },
      { groupLabel: 'Harga Satuan', cols: [{ label: 'Harga Satuan', width: 14, get: blank }] },
      { groupLabel: 'Harga (ribuan Rp)', cols: [{ label: 'Harga (ribuan Rp)', width: 16, get: m => fmtRupiah(m.harga || 0) }] },
      { groupLabel: 'Keterangan', cols: [{ label: 'Keterangan', width: 24, get: m => m.keterangan || '-' }] }
    ];
  }
  // KIB E
  return [
    { groupLabel: 'Nomor Simda', cols: [{ label: 'Nomor Simda', width: 6, get: m => m.no || '' }] },
    { groupLabel: 'SKPD', cols: [{ label: 'SKPD', width: 20, get: (_m, p) => p.namaSekolah || '-' }] },
    { groupLabel: 'Nama Barang/Jenis Aset', cols: [{ label: 'Nama Barang/Jenis Aset', width: 32, get: m => m.nama || '-' }] },
    { groupLabel: 'Nomor Register', cols: [{ label: 'Nomor Register', width: 14, get: m => m.register || '-' }] },
    {
      groupLabel: 'Buku dan Alat Perpustakaan',
      cols: [
        { label: 'Judul', width: 26, get: m => m.judulPencipta || '-' },
        { label: 'Spesifikasi', width: 16, get: blank }
      ]
    },
    {
      groupLabel: 'Alat Bercorak Kebudayaan',
      cols: [
        { label: 'Asal Daerah', width: 14, get: blank },
        { label: 'Pencipta', width: 16, get: blank },
        { label: 'Bahan', width: 12, get: blank }
      ]
    },
    {
      groupLabel: 'Hewan/Ternak dan Tumbuhan',
      cols: [
        { label: 'Jenis', width: 12, get: blank },
        { label: 'Ukuran', width: 12, get: blank }
      ]
    },
    { groupLabel: 'Asal Usul', cols: [{ label: 'Asal Usul', width: 20, get: m => m.asalUsul || '-' }] },
    { groupLabel: 'Tahun Pembelian', cols: [{ label: 'Tahun Pembelian', width: 10, get: m => m.tahun || '-' }] },
    { groupLabel: 'Penggunaan', cols: [{ label: 'Penggunaan', width: 14, get: blank }] },
    { groupLabel: 'Harga (ribuan Rp)', cols: [{ label: 'Harga (ribuan Rp)', width: 16, get: m => fmtRupiah(m.harga || 0) }] },
    { groupLabel: 'KET.', cols: [{ label: 'KET.', width: 24, get: m => m.keterangan || '-' }] }
  ];
}

// ============ COVER SHEET ============

function buildCoverSheet(pengaturan: PengaturanSekolah, kib: KibKey): XLSX.WorkSheet {
  const tahun = new Date().getFullYear();
  const rows: any[][] = [
    [], [], [], [], [], [], [], [],
    ['PEMERINTAH PROVINSI SULAWESI TENGGARA'],
    ['DINAS PENDIDIKAN DAN KEBUDAYAAN'],
    [(pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase()],
    [], [],
    [`LAPORAN HASIL INVENTARISASI DAN PENILAIAN BMD ${tahun}`],
    [`KARTU INVENTARIS BARANG (KIB) ${kib}`],
    [`SAMPAI DENGAN TANGGAL 31 DESEMBER ${tahun}`],
    [], [], [],
    [`NPSN: ${pengaturan.npsn || '-'}`],
    [`Alamat: ${pengaturan.alamat || '-'}`]
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!merges'] = rows.map((_r, idx) => ({ s: { r: idx, c: 0 }, e: { r: idx, c: 10 } }));
  ws['!cols'] = [{ wch: 14 }];
  return ws;
}

// ============ EXCEL PER-KIB (KARTU INVENTARIS BARANG HASIL SENSUS) - replika format resmi ============

function buildKibWorkbook(
  kib: KibKey,
  pengaturan: PengaturanSekolah,
  masterList: OpnameMasterItem[],
  entries: OpnameEntry[],
  tally: Tally
): ArrayBuffer {
  const entryByRefId = new Map(entries.map(e => [e.refId, e]));
  const leadingGroups = leadingGroupsFor(kib);
  const leadingColCount = leadingGroups.reduce((n, g) => n + g.cols.length, 0);
  const SENSUS_COL_COUNT = SENSUS_CATEGORIES.length * 3; // Jml, Nilai, Tanpa Nilai
  const KONDISI_COL_COUNT = KONDISI_CODES.length * 2; // kode, Nilai
  const totalCols = leadingColCount + SENSUS_COL_COUNT + KONDISI_COL_COUNT;

  const kopRows: any[][] = [
    ['PEMERINTAH PROVINSI SULAWESI TENGGARA'],
    ['DINAS PENDIDIKAN DAN KEBUDAYAAN'],
    [(pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase()],
    [KIB_TITLE[kib]],
    [`OPD : ${pengaturan.namaSekolah || '-'}`],
    [`PROVINSI : Sulawesi Tenggara`],
    [`ALAMAT : ${pengaturan.alamat || '-'}`],
    []
  ];

  const HEADER_ROWS = 4; // grup, sub-grup, nomor, jml/nilai/tanpaNilai
  const headerBase = kopRows.length; // baris awal blok header tabel (0-based)

  // Row 1 (grup): leading group labels (merge horizontal jika group.cols>1, vertikal 2 baris jika 1 kolom) + "Hasil Sensus" (merge horizontal semua kolom trailing)
  const row1: any[] = [];
  const row2: any[] = [];
  leadingGroups.forEach(g => {
    row1.push(g.groupLabel);
    for (let i = 1; i < g.cols.length; i++) row1.push('');
    if (g.cols.length > 1) {
      g.cols.forEach(c => row2.push(c.label));
    } else {
      row2.push(''); // akan di-merge vertikal dengan row1
    }
  });
  row1.push('Hasil Sensus');
  for (let i = 1; i < SENSUS_COL_COUNT + KONDISI_COL_COUNT; i++) row1.push('');
  SENSUS_CATEGORIES.forEach(cat => {
    row2.push(cat.label, '', '');
  });
  row2.push('Kondisi (B/KB/RB)');
  for (let i = 1; i < KONDISI_COL_COUNT; i++) row2.push('');

  // Row 3 (nomor urut kolom, hanya untuk leading columns)
  const row3: any[] = [];
  for (let i = 1; i <= leadingColCount; i++) row3.push(i);
  for (let i = 0; i < SENSUS_COL_COUNT + KONDISI_COL_COUNT; i++) row3.push('');

  // Row 4 (Jml/Nilai/Tanpa Nilai per kategori sensus, kode/Nilai per kondisi)
  const row4: any[] = [];
  for (let i = 0; i < leadingColCount; i++) row4.push('');
  SENSUS_CATEGORIES.forEach(() => row4.push('Jml', 'Nilai', 'Tanpa Nilai'));
  KONDISI_CODES.forEach(k => row4.push(k.code, 'Nilai'));

  const rows: any[][] = [...kopRows, row1, row2, row3, row4];

  masterList.forEach((m, idx) => {
    const entry = entryByRefId.get(m.id);
    const harga = fmtRupiah(m.harga || 0);

    const leadingVals: any[] = [];
    leadingGroups.forEach(g => g.cols.forEach(c => leadingVals.push(c.get(m, pengaturan) as any)));
    if (typeof leadingVals[0] !== 'number') leadingVals[0] = m.no || idx + 1;

    const sensusVals: any[] = new Array(SENSUS_COL_COUNT).fill('');
    const kondisiVals: any[] = new Array(KONDISI_COL_COUNT).fill('');

    if (entry) {
      const statusKey = statusKeyForEntry(entry);
      const catIdx = SENSUS_CATEGORIES.findIndex(c => c.key === statusKey);
      if (catIdx >= 0) {
        sensusVals[catIdx * 3] = 1;
        if (harga > 0) sensusVals[catIdx * 3 + 1] = harga;
        else sensusVals[catIdx * 3 + 2] = 1;
      }
      const kCode = kondisiCodeForEntry(entry.kondisi);
      if (kCode) {
        const kIdx = KONDISI_CODES.findIndex(k => k.code === kCode);
        kondisiVals[kIdx * 2] = 1;
        kondisiVals[kIdx * 2 + 1] = harga;
      }
    }

    rows.push([...leadingVals, ...sensusVals, ...kondisiVals]);
  });

  // Baris JUMLAH
  const totalRow: any[] = new Array(leadingColCount).fill('');
  totalRow[0] = 'JUMLAH';
  SENSUS_CATEGORIES.forEach(cat => {
    const st = tally.status[cat.key];
    totalRow.push(st.jml, st.nilai, st.tanpaNilai);
  });
  KONDISI_CODES.forEach(k => {
    const kt = tally.kondisi[k.code];
    totalRow.push(kt.jml, kt.nilai);
  });
  rows.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const merges: XLSX.Range[] = [];
  // Kop surat (baris 0-6) full-width merge
  for (let r = 0; r < kopRows.length - 1; r++) {
    merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
  }

  const r1i = headerBase, r2i = headerBase + 1, r3i = headerBase + 2, r4i = headerBase + 3;

  // Merge grup leading columns
  let c = 0;
  leadingGroups.forEach(g => {
    if (g.cols.length > 1) {
      merges.push({ s: { r: r1i, c }, e: { r: r1i, c: c + g.cols.length - 1 } });
    } else {
      merges.push({ s: { r: r1i, c }, e: { r: r2i, c } }); // merge vertikal
    }
    c += g.cols.length;
  });
  // Merge "Hasil Sensus" super header
  merges.push({ s: { r: r1i, c }, e: { r: r1i, c: totalCols - 1 } });

  // Merge tiap kategori sensus (3 kolom) di row2
  let sc = leadingColCount;
  SENSUS_CATEGORIES.forEach(() => {
    merges.push({ s: { r: r2i, c: sc }, e: { r: r2i, c: sc + 2 } });
    sc += 3;
  });
  // Merge "Kondisi (B/KB/RB)" - satu label membentang semua kolom kondisi
  merges.push({ s: { r: r2i, c: sc }, e: { r: r2i, c: sc + KONDISI_COL_COUNT - 1 } });
  sc += KONDISI_COL_COUNT;

  // Merge baris JUMLAH label (kolom leading selain kolom pertama)
  const jumlahRowIdx = rows.length - 1;
  if (leadingColCount > 1) {
    merges.push({ s: { r: jumlahRowIdx, c: 0 }, e: { r: jumlahRowIdx, c: leadingColCount - 1 } });
  }

  ws['!merges'] = merges;
  ws['!cols'] = [
    ...leadingGroups.flatMap(g => g.cols.map(col => ({ wch: col.width }))),
    ...Array.from({ length: SENSUS_COL_COUNT }, () => ({ wch: 10 })),
    ...Array.from({ length: KONDISI_COL_COUNT }, () => ({ wch: 8 }))
  ];

  void row3; void row4;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildCoverSheet(pengaturan, kib), 'cover');
  XLSX.utils.book_append_sheet(wb, ws, `KIB ${kib} Hasil Sensus`);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

// ============ SURAT LAPORAN NARATIF (DOCX) - 6 tabel terpisah sesuai format resmi ============

function kopSurat(pengaturan: PengaturanSekolah): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'PEMERINTAH PROVINSI SULAWESI TENGGARA', bold: true, size: 22, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'DINAS PENDIDIKAN DAN KEBUDAYAAN', bold: true, size: 24, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: (pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE').toUpperCase(), bold: true, size: 26, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Alamat: ${pengaturan.alamat || '-'} | NPSN: ${pengaturan.npsn || '-'}`, italics: true, size: 18, font: 'Times New Roman' })]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { color: '000000', space: 1, style: BorderStyle.DOUBLE, size: 16 } },
      spacing: { after: 300 },
      children: []
    })
  ];
}

function p(text: string, opts: { bold?: boolean; italics?: boolean; size?: number; spacingAfter?: number; alignment?: any } = {}): Paragraph {
  return new Paragraph({
    alignment: opts.alignment,
    spacing: { after: opts.spacingAfter ?? 120 },
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 22, font: 'Times New Roman' })]
  });
}

const tCellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' }
};

function headCell(text: string): TableCell {
  return new TableCell({
    borders: tCellBorder,
    shading: { type: ShadingType.SOLID, color: 'E5E7EB', fill: 'E5E7EB' },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 17, font: 'Times New Roman' })] })]
  });
}

function dataCell(text: string, align: any = AlignmentType.CENTER): TableCell {
  return new TableCell({
    borders: tCellBorder,
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, size: 17, font: 'Times New Roman' })] })]
  });
}

function statusJmlTotal(t: Tally): number {
  return (['ditemukan', 'dikuasaiPegawai', 'digunakanUnitLain', 'dikuasaiPihakKetiga'] as SensusStatusKey[])
    .reduce((sum, k) => sum + t.status[k].jml, 0);
}
function statusNilaiTotal(t: Tally): number {
  return (['ditemukan', 'dikuasaiPegawai', 'digunakanUnitLain', 'dikuasaiPihakKetiga'] as SensusStatusKey[])
    .reduce((sum, k) => sum + t.status[k].nilai, 0);
}

function sectionTitle(text: string): Paragraph {
  return p(text, { bold: true, spacingAfter: 100 });
}

// Tabel 1: Jumlah BMD Menurut Administrasi
function buildTabelAdministratif(tallies: Record<KibKey, Tally>): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [headCell('Jenis KIB'), headCell('Jumlah Item'), headCell('Nilai (Rp)')] })
  ];
  let totJml = 0, totNilai = 0;
  (['B', 'C', 'E'] as KibKey[]).forEach(kib => {
    const t = tallies[kib];
    totJml += t.administratifJml;
    totNilai += t.administratifNilai;
    rows.push(new TableRow({ children: [dataCell(`KIB ${kib}`), dataCell(String(t.administratifJml)), dataCell(formatRp(t.administratifNilai), AlignmentType.RIGHT)] }));
  });
  rows.push(new TableRow({ children: [dataCell('JUMLAH', AlignmentType.LEFT), dataCell(String(totJml)), dataCell(formatRp(totNilai), AlignmentType.RIGHT)] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// Tabel 2: Hasil Inventarisasi Fisik yang Dilakukan
function buildTabelInventarisasiFisik(tallies: Record<KibKey, Tally>): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        headCell('Jenis KIB'), headCell('Jml Item\nTercatat'), headCell('Nilai Tercatat'),
        headCell('Jml Item\nSudah Diopname'), headCell('Nilai\nSudah Diopname')
      ]
    })
  ];
  let acc = { adm: 0, admNilai: 0, opn: 0, opnNilai: 0 };
  (['B', 'C', 'E'] as KibKey[]).forEach(kib => {
    const t = tallies[kib];
    const opnNilai = statusNilaiTotal(t) + t.status.tidakDitemukan.nilai;
    acc.adm += t.administratifJml; acc.admNilai += t.administratifNilai;
    acc.opn += t.sudahDiopnameJml; acc.opnNilai += opnNilai;
    rows.push(new TableRow({
      children: [
        dataCell(`KIB ${kib}`), dataCell(String(t.administratifJml)), dataCell(formatRp(t.administratifNilai), AlignmentType.RIGHT),
        dataCell(String(t.sudahDiopnameJml)), dataCell(formatRp(opnNilai), AlignmentType.RIGHT)
      ]
    }));
  });
  rows.push(new TableRow({
    children: [
      dataCell('JUMLAH', AlignmentType.LEFT), dataCell(String(acc.adm)), dataCell(formatRp(acc.admNilai), AlignmentType.RIGHT),
      dataCell(String(acc.opn)), dataCell(formatRp(acc.opnNilai), AlignmentType.RIGHT)
    ]
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// Tabel 3: BMD Tidak Ditemukan
function buildTabelTidakDitemukan(tallies: Record<KibKey, Tally>): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [headCell('Jenis KIB'), headCell('Jml\nAdministratif'), headCell('Jml\nTidak Ditemukan'), headCell('Nilai\nTidak Ditemukan')]
    })
  ];
  let acc = { adm: 0, td: 0, tdNilai: 0 };
  (['B', 'C', 'E'] as KibKey[]).forEach(kib => {
    const t = tallies[kib];
    acc.adm += t.administratifJml; acc.td += t.status.tidakDitemukan.jml; acc.tdNilai += t.status.tidakDitemukan.nilai;
    rows.push(new TableRow({
      children: [dataCell(`KIB ${kib}`), dataCell(String(t.administratifJml)), dataCell(String(t.status.tidakDitemukan.jml)), dataCell(formatRp(t.status.tidakDitemukan.nilai), AlignmentType.RIGHT)]
    }));
  });
  rows.push(new TableRow({
    children: [dataCell('JUMLAH', AlignmentType.LEFT), dataCell(String(acc.adm)), dataCell(String(acc.td)), dataCell(formatRp(acc.tdNilai), AlignmentType.RIGHT)]
  }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// Tabel 4/5/6: BMD Kondisi Baik / Rusak Ringan / Rusak Berat
function buildTabelKondisi(tallies: Record<KibKey, Tally>, code: 'B' | 'KB' | 'RB'): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [headCell('Jenis KIB'), headCell('Jumlah/Volume Fisik'), headCell('Nilai (Rp)')] })
  ];
  let totJml = 0, totNilai = 0;
  (['B', 'C', 'E'] as KibKey[]).forEach(kib => {
    const kt = tallies[kib].kondisi[code];
    totJml += kt.jml; totNilai += kt.nilai;
    rows.push(new TableRow({ children: [dataCell(`KIB ${kib}`), dataCell(String(kt.jml)), dataCell(formatRp(kt.nilai), AlignmentType.RIGHT)] }));
  });
  rows.push(new TableRow({ children: [dataCell('JUMLAH', AlignmentType.LEFT), dataCell(String(totJml)), dataCell(formatRp(totNilai), AlignmentType.RIGHT)] }));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function buildSignature(pengaturan: PengaturanSekolah, tanggalStr: string): Table {
  const w = pengaturan.namaPetugasSarpras || 'Petugas Sarpras';
  const wNip = pengaturan.nipPetugasSarpras ? `NIP. ${pengaturan.nipPetugasSarpras}` : '-';
  const k = pengaturan.kepalaSekolah || 'Kepala Sekolah';
  const kNip = pengaturan.nipKepalaSekolah ? `NIP. ${pengaturan.nipKepalaSekolah}` : '-';

  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              p('Mengetahui / Menyetujui,', { size: 20 }),
              p('Wakasek Urusan Sarpras,', { bold: true, size: 20 }),
              new Paragraph({ spacing: { after: 1200 }, children: [] }),
              new Paragraph({ children: [new TextRun({ text: w, bold: true, underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Times New Roman' })] }),
              p(wNip, { size: 18 })
            ]
          }),
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              p(tanggalStr, { size: 20 }),
              p('Kepala Sekolah,', { bold: true, size: 20 }),
              new Paragraph({ spacing: { after: 1200 }, children: [] }),
              new Paragraph({ children: [new TextRun({ text: k, bold: true, underline: { type: UnderlineType.SINGLE }, size: 20, font: 'Times New Roman' })] }),
              p(kNip, { size: 18 })
            ]
          })
        ]
      })
    ]
  });
}

async function buildLaporanNaratifDocx(pengaturan: PengaturanSekolah, tallies: Record<KibKey, Tally>): Promise<Blob> {
  const tanggalStr = `${(pengaturan.alamat || 'Konawe').split(',')[0].split(' ').pop() || 'Konawe'}, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  const tahun = new Date().getFullYear();

  const grandJmlAdm = (['B', 'C', 'E'] as KibKey[]).reduce((s, k) => s + tallies[k].administratifJml, 0);
  const grandNilaiAdm = (['B', 'C', 'E'] as KibKey[]).reduce((s, k) => s + tallies[k].administratifNilai, 0);
  const grandTidakDitemukan = (['B', 'C', 'E'] as KibKey[]).reduce((s, k) => s + tallies[k].status.tidakDitemukan.jml, 0);
  const grandNilaiTidakDitemukan = (['B', 'C', 'E'] as KibKey[]).reduce((s, k) => s + tallies[k].status.tidakDitemukan.nilai, 0);
  const grandBaik = (['B', 'C', 'E'] as KibKey[]).reduce((s, k) => s + tallies[k].kondisi.B.jml, 0);
  const grandRB = (['B', 'C', 'E'] as KibKey[]).reduce((s, k) => s + tallies[k].kondisi.RB.jml, 0);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...kopSurat(pengaturan),
          p('LAPORAN HASIL INVENTARISASI BMD', { bold: true, alignment: AlignmentType.CENTER, spacingAfter: 60 }),
          p(`${tanggalStr}`, { alignment: AlignmentType.CENTER, spacingAfter: 20 }),
          p('Nomor    : -', {}),
          p('Lampiran : 1 (satu) set', {}),
          p('Perihal  : Laporan Hasil Inventarisasi Barang Milik Daerah (BMD)', { spacingAfter: 300 }),

          p('Yth. Kepala Dinas Pendidikan dan Kebudayaan', {}),
          p('Provinsi Sulawesi Tenggara', {}),
          p('di -', {}),
          p('    Kendari', { spacingAfter: 300 }),

          p(`Dengan ini kami sampaikan laporan Hasil Inventarisasi atas BMD ${pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}, yang inventarisasinya (opname fisik) dilaksanakan pada Tahun ${tahun}, dengan informasi sebagai berikut:`, { spacingAfter: 200 }),

          p(`1. Jumlah BMD yang ada menurut administrasi/Daftar BMD sebanyak ${grandJmlAdm} item dengan nilai seluruhnya ${formatRp(grandNilaiAdm)}, dengan rincian sebagai berikut:`, { spacingAfter: 150 }),
          buildTabelAdministratif(tallies),

          new Paragraph({ spacing: { after: 250 }, children: [] }),
          sectionTitle('2. Inventarisasi Fisik yang Dilakukan'),
          buildTabelInventarisasiFisik(tallies),

          new Paragraph({ spacing: { after: 250 }, children: [] }),
          sectionTitle(`3. Dari hasil inventarisasi fisik, terdapat BMD yang tidak ditemukan sebanyak ${grandTidakDitemukan} item dengan nilai ${formatRp(grandNilaiTidakDitemukan)}, dengan rincian sebagai berikut:`),
          buildTabelTidakDitemukan(tallies),

          new Paragraph({ spacing: { after: 250 }, children: [] }),
          sectionTitle(`4. Terdapat BMD dengan kondisi Baik sebanyak ${grandBaik} item, dengan rincian sebagai berikut:`),
          buildTabelKondisi(tallies, 'B'),

          new Paragraph({ spacing: { after: 250 }, children: [] }),
          sectionTitle('5. Terdapat BMD dengan kondisi Rusak Ringan, dengan rincian sebagai berikut:'),
          buildTabelKondisi(tallies, 'KB'),

          new Paragraph({ spacing: { after: 250 }, children: [] }),
          sectionTitle(`6. Terdapat BMD dengan kondisi Rusak Berat sebanyak ${grandRB} item, dengan rincian sebagai berikut:`),
          buildTabelKondisi(tallies, 'RB'),

          new Paragraph({ spacing: { after: 250 }, children: [] }),
          p('7. Lain-lain:', { bold: true, spacingAfter: 100 }),
          p('(Isi catatan tambahan di sini bila ada, misalnya aset yang perlu diusulkan penghapusan atau kondisi khusus lainnya.)', { italics: true, spacingAfter: 300 }),

          p('Demikian laporan ini kami sampaikan, untuk dipergunakan seperlunya.', { spacingAfter: 400 }),

          buildSignature(pengaturan, tanggalStr)
        ]
      }
    ]
  });

  return Packer.toBlob(doc);
}

// ============ FOTO -> ZIP ============

function addFotoToZip(zip: JSZip, kib: KibKey, masterList: OpnameMasterItem[], entries: OpnameEntry[]) {
  const entryByRefId = new Map(entries.map(e => [e.refId, e]));
  masterList.forEach((m, idx) => {
    const entry = entryByRefId.get(m.id);
    if (!entry || (!entry.foto1 && !entry.foto2)) return;

    const seq = m.no || String(idx + 1);
    const folder = zip.folder(`KIB_${kib}`)!.folder(`Foto_KIB_${kib}`)!.folder(`${kib}-${seq}`)!;

    [entry.foto1, entry.foto2].forEach((foto, i) => {
      if (!foto) return;
      const match = foto.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return;
      const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
      folder.file(`foto_${i + 1}.${ext}`, match[2], { base64: true });
    });
  });
}

// ============ MAIN EXPORT ============

export async function exportLaporanOpnameZip(
  pengaturan: PengaturanSekolah,
  opnameMasterList: OpnameMasterItem[],
  opnameEntries: OpnameEntry[]
): Promise<void> {
  const zip = new JSZip();
  const tallies: Record<KibKey, Tally> = { B: emptyTally(), C: emptyTally(), E: emptyTally() };

  for (const kib of ['B', 'C', 'E'] as KibKey[]) {
    const masterList = opnameMasterList.filter(m => m.kib === kib);
    const entries = opnameEntries.filter(e => e.kib === kib);
    const tally = tallies[kib];

    masterList.forEach(m => {
      tally.administratifJml += 1;
      tally.administratifNilai += fmtRupiah(m.harga || 0);
    });
    entries.forEach(e => {
      const master = masterList.find(m => m.id === e.refId);
      classifyEntry(e, fmtRupiah(master?.harga || 0), tally);
    });

    if (masterList.length === 0) continue;

    const xlsxBuffer = buildKibWorkbook(kib, pengaturan, masterList, entries, tally);
    zip.folder(`KIB_${kib}`)!.file(`KIB_${kib}.xlsx`, xlsxBuffer);

    addFotoToZip(zip, kib, masterList, entries);
  }

  const docxBlob = await buildLaporanNaratifDocx(pengaturan, tallies);
  zip.file(`Laporan_Hasil_Sensus_BMD_${(pengaturan.namaSekolah || 'Sekolah').replace(/\s+/g, '_')}.docx`, docxBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const tanggal = new Date().toISOString().split('T')[0];
  saveAs(zipBlob, `Laporan_Opname_BMD_${(pengaturan.namaSekolah || 'Sekolah').replace(/\s+/g, '_')}_${tanggal}.zip`);
}
