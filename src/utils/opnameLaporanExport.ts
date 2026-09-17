import ExcelJS from 'exceljs';
import { SULTRA_LOGO_BASE64 } from '../assets/logoBase64';
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

// Data harga dari provinsi tersimpan dalam satuan "ribuan Rp" (dikonfirmasi dari header resmi
// "Harga (ribuan Rp)" di file sumber rptrekapkib_b/c/e.xls) - kalikan 1000 supaya nilai Rupiah
// yang ditampilkan di laporan adalah harga sesungguhnya, bukan angka ribuan mentah.
function fmtRupiah(n: number): number {
  return Math.round((n || 0) * 1000);
}

function formatRp(n: number): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

// ============ KOLOM DEPAN (item detail) PER KIB - mengikuti urutan & label resmi ============

interface LeadingCol {
  label: string;
  width: number;
  get: (m: OpnameMasterItem, pengaturan: PengaturanSekolah, entry?: OpnameEntry) => string | number;
  isHarga?: boolean;
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
          {
            label: 'Pabrik (Nomor Seri)',
            width: 18,
            get: (_m, _p, entry) => {
              const units = entry?.fotoUnits || [];
              const seris = units.map(u => u.nomorSeri).filter((s): s is string => !!s);
              return seris.length > 0 ? seris.join('; ') : '-';
            }
          },
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
      { groupLabel: 'Harga', cols: [{ label: 'Harga (Rp)', width: 16, get: m => fmtRupiah(m.harga || 0), isHarga: true }] },
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
          { label: 'Nomor', width: 12, get: blank },
          { label: 'Luas (M2)', width: 12, get: blank }
        ]
      },
      { groupLabel: 'Status Tanah', cols: [{ label: 'Status Tanah', width: 12, get: blank }] },
      { groupLabel: 'Nomor Kode Tanah', cols: [{ label: 'Nomor Kode Tanah', width: 16, get: blank }] },
      { groupLabel: 'Asal Usul', cols: [{ label: 'Asal Usul', width: 20, get: m => m.asalUsul || '-' }] },
      { groupLabel: 'Harga Satuan', cols: [{ label: 'Harga Satuan', width: 14, get: blank }] },
      { groupLabel: 'Harga (Rp)', cols: [{ label: 'Harga (Rp)', width: 16, get: m => fmtRupiah(m.harga || 0), isHarga: true }] },
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
    { groupLabel: 'Harga (Rp)', cols: [{ label: 'Harga (Rp)', width: 16, get: m => fmtRupiah(m.harga || 0), isHarga: true }] },
    { groupLabel: 'KET.', cols: [{ label: 'KET.', width: 24, get: m => m.keterangan || '-' }] }
  ];
}

// ============ COVER SHEET ============

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};
const CENTER: Partial<ExcelJS.Alignment> = { horizontal: 'center', vertical: 'middle', wrapText: true };
const LEFT_MID: Partial<ExcelJS.Alignment> = { horizontal: 'left', vertical: 'middle' };

function colLetter(n: number): string {
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function xref(sheetName: string, col: number, row: number): string {
  return `'${sheetName}'!${colLetter(col)}${row}`;
}

interface KibSheetInfo {
  sheetName: string;
  dataStartRow: number;
  dataEndRow: number;
  jumlahRow: number;
  namaCol: number;
  hargaCol: number;
  sensusColStart: number;
  kondisiColStart: number;
}

function addLogo(wb: ExcelJS.Workbook, ws: ExcelJS.Worksheet) {
  try {
    const imgId = wb.addImage({ base64: SULTRA_LOGO_BASE64, extension: 'png' });
    ws.addImage(imgId, { tl: { col: 0.15, row: 0.15 }, ext: { width: 64, height: 64 } });
  } catch (e) {
    // logo opsional - jangan gagalkan seluruh export jika gambar bermasalah
  }
}

function addCoverSheet(wb: ExcelJS.Workbook, pengaturan: PengaturanSekolah, kib: KibKey) {
  const ws = wb.addWorksheet('cover');
  ws.getColumn(1).width = 14;
  for (let c = 2; c <= 10; c++) ws.getColumn(c).width = 12;
  const tahun = new Date().getFullYear();

  addLogo(wb, ws);

  const titleRow = (r: number, text: string, size = 12, bold = true) => {
    ws.mergeCells(r, 1, r, 10);
    const cell = ws.getCell(r, 1);
    cell.value = text;
    cell.font = { bold, size, name: 'Arial' };
    cell.alignment = CENTER;
  };

  titleRow(9, 'PEMERINTAH PROVINSI SULAWESI TENGGARA', 13);
  titleRow(10, 'DINAS PENDIDIKAN DAN KEBUDAYAAN', 12);
  titleRow(11, (pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase(), 12);
  titleRow(13, `LAPORAN HASIL INVENTARISASI DAN PENILAIAN BMD ${tahun}`, 14);
  titleRow(14, `KARTU INVENTARIS BARANG (KIB) ${kib}`, 12, false);
  titleRow(15, `SAMPAI DENGAN TANGGAL 31 DESEMBER ${tahun}`, 11, false);
  titleRow(18, `NPSN: ${pengaturan.npsn || '-'}`, 10, false);
  titleRow(19, `Alamat: ${pengaturan.alamat || '-'}`, 10, false);
}

// ============ EXCEL PER-KIB (KARTU INVENTARIS BARANG HASIL SENSUS) - replika format resmi ============

function addKibWorksheet(
  wb: ExcelJS.Workbook,
  kib: KibKey,
  pengaturan: PengaturanSekolah,
  masterList: OpnameMasterItem[],
  entries: OpnameEntry[],
  tally: Tally
): KibSheetInfo {
  const entryByRefId = new Map(entries.map(e => [e.refId, e]));
  const leadingGroups = leadingGroupsFor(kib);
  const leadingColCount = leadingGroups.reduce((n, g) => n + g.cols.length, 0);
  const SENSUS_COL_COUNT = SENSUS_CATEGORIES.length * 3; // Jml, Nilai, Tanpa Nilai
  const KONDISI_COL_COUNT = KONDISI_CODES.length * 2; // kode, Nilai
  const totalCols = leadingColCount + SENSUS_COL_COUNT + KONDISI_COL_COUNT;

  // Cari posisi kolom Nama & Harga (untuk formula COUNT/SUM di sheet turunan)
  let namaCol = 2, hargaCol = leadingColCount;
  {
    let ci = 1;
    leadingGroups.forEach(g => g.cols.forEach(col => {
      if (col.label.toLowerCase().includes('nama') || col.label.toLowerCase().includes('jenis barang')) namaCol = ci;
      if (col.isHarga) hargaCol = ci;
      ci++;
    }));
  }

  const ws = wb.addWorksheet(`KIB ${kib} Hasil Sensus`);
  addLogo(wb, ws);

  const kopLines = [
    { text: 'PEMERINTAH PROVINSI SULAWESI TENGGARA', size: 13, bold: true, center: true },
    { text: 'DINAS PENDIDIKAN DAN KEBUDAYAAN', size: 12, bold: true, center: true },
    { text: (pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase(), size: 12, bold: true, center: true },
    { text: KIB_TITLE[kib], size: 11, bold: true, center: true },
    { text: '', size: 10, bold: false, center: false },
    { text: `OPD           : ${pengaturan.namaSekolah || '-'}`, size: 10, bold: false, center: false },
    { text: `PROVINSI      : Sulawesi Tenggara`, size: 10, bold: false, center: false },
    { text: `ALAMAT        : ${pengaturan.alamat || '-'}`, size: 10, bold: false, center: false },
    { text: '', size: 10, bold: false, center: false }
  ];
  kopLines.forEach((line, idx) => {
    const r = idx + 1;
    ws.mergeCells(r, 1, r, totalCols);
    const cell = ws.getCell(r, 1);
    cell.value = line.text;
    cell.font = { bold: line.bold, size: line.size, name: 'Arial' };
    cell.alignment = line.center ? CENTER : LEFT_MID;
  });

  const headerBase = kopLines.length + 1; // baris pertama header tabel (1-based)
  const r1 = headerBase, r2 = headerBase + 1, r3 = headerBase + 2, r4 = headerBase + 3;

  // ---- Baris grup (r1) & sub-grup (r2) untuk kolom depan ----
  let c = 1;
  leadingGroups.forEach(g => {
    const span = g.cols.length;
    if (span > 1) {
      ws.mergeCells(r1, c, r1, c + span - 1);
      g.cols.forEach((col, i) => {
        const cell = ws.getCell(r2, c + i);
        cell.value = col.label;
      });
    } else {
      ws.mergeCells(r1, c, r2, c);
    }
    const groupCell = ws.getCell(r1, c);
    groupCell.value = g.groupLabel;
    c += span;
  });

  // ---- "Hasil Sensus" super header ----
  ws.mergeCells(r1, c, r1, totalCols);
  ws.getCell(r1, c).value = 'Hasil Sensus';
  let sc = c;
  SENSUS_CATEGORIES.forEach(cat => {
    ws.mergeCells(r2, sc, r2, sc + 2);
    ws.getCell(r2, sc).value = cat.label;
    sc += 3;
  });
  ws.mergeCells(r2, sc, r2, sc + KONDISI_COL_COUNT - 1);
  ws.getCell(r2, sc).value = 'Kondisi (B/KB/RB)';

  // ---- Baris nomor urut resmi (r3) ----
  for (let i = 0; i < leadingColCount; i++) ws.getCell(r3, i + 1).value = i + 1;

  // ---- Baris Jml/Nilai/Tanpa Nilai & kode kondisi (r4) ----
  let c4 = leadingColCount + 1;
  SENSUS_CATEGORIES.forEach(() => {
    ws.getCell(r4, c4).value = 'Jml';
    ws.getCell(r4, c4 + 1).value = 'Nilai';
    ws.getCell(r4, c4 + 2).value = 'Tanpa Nilai';
    c4 += 3;
  });
  KONDISI_CODES.forEach(k => {
    ws.getCell(r4, c4).value = k.code;
    ws.getCell(r4, c4 + 1).value = 'Nilai';
    c4 += 2;
  });

  // Styling header (r1-r4)
  for (let r = r1; r <= r4; r++) {
    for (let cc = 1; cc <= totalCols; cc++) {
      const cell = ws.getCell(r, cc);
      cell.border = THIN_BORDER;
      cell.alignment = CENTER;
      cell.font = { bold: true, size: 9, name: 'Arial' };
    }
  }

  // ---- Baris data ----
  const dataStartRow = r4 + 1;
  let rowIdx = dataStartRow;
  masterList.forEach((m, idx) => {
    const entry = entryByRefId.get(m.id);
    const harga = fmtRupiah(m.harga || 0);

    const leadingVals: any[] = [];
    leadingGroups.forEach(g => g.cols.forEach(col => leadingVals.push(col.get(m, pengaturan, entry) as any)));
    if (typeof leadingVals[0] !== 'number') leadingVals[0] = m.no || idx + 1;

    const sensusVals: any[] = new Array(SENSUS_COL_COUNT).fill('');
    const kondisiVals: any[] = new Array(KONDISI_COL_COUNT).fill('');

    if (entry) {
      const statusKey = statusKeyForEntry(entry);
      const catIdx = SENSUS_CATEGORIES.findIndex(cat => cat.key === statusKey);
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

    const rowVals = [...leadingVals, ...sensusVals, ...kondisiVals];
    const row = ws.getRow(rowIdx);
    rowVals.forEach((v, i) => { row.getCell(i + 1).value = v as any; });
    for (let cc = 1; cc <= totalCols; cc++) {
      const cell = row.getCell(cc);
      cell.border = THIN_BORDER;
      cell.font = { size: 9, name: 'Arial' };
      cell.alignment = cc <= leadingColCount ? { vertical: 'middle', wrapText: true } : { horizontal: 'center', vertical: 'middle' };
    }
    rowIdx++;
  });

  // ---- Baris JUMLAH (rumus SUM langsung dari baris data - bukan angka statis) ----
  const totalRowIdx = rowIdx;
  const dataEndRow = rowIdx - 1;
  ws.mergeCells(totalRowIdx, 1, totalRowIdx, Math.max(1, leadingColCount));
  ws.getCell(totalRowIdx, 1).value = 'JUMLAH';
  let tc = leadingColCount + 1;
  SENSUS_CATEGORIES.forEach(cat => {
    const st = tally.status[cat.key];
    ws.getCell(totalRowIdx, tc).value = { formula: `SUM(${colLetter(tc)}${dataStartRow}:${colLetter(tc)}${dataEndRow})`, result: st.jml } as ExcelJS.CellFormulaValue;
    ws.getCell(totalRowIdx, tc + 1).value = { formula: `SUM(${colLetter(tc + 1)}${dataStartRow}:${colLetter(tc + 1)}${dataEndRow})`, result: st.nilai } as ExcelJS.CellFormulaValue;
    ws.getCell(totalRowIdx, tc + 2).value = { formula: `SUM(${colLetter(tc + 2)}${dataStartRow}:${colLetter(tc + 2)}${dataEndRow})`, result: st.tanpaNilai } as ExcelJS.CellFormulaValue;
    tc += 3;
  });
  KONDISI_CODES.forEach(k => {
    const kt = tally.kondisi[k.code];
    ws.getCell(totalRowIdx, tc).value = { formula: `SUM(${colLetter(tc)}${dataStartRow}:${colLetter(tc)}${dataEndRow})`, result: kt.jml } as ExcelJS.CellFormulaValue;
    ws.getCell(totalRowIdx, tc + 1).value = { formula: `SUM(${colLetter(tc + 1)}${dataStartRow}:${colLetter(tc + 1)}${dataEndRow})`, result: kt.nilai } as ExcelJS.CellFormulaValue;
    tc += 2;
  });
  for (let cc = 1; cc <= totalCols; cc++) {
    const cell = ws.getCell(totalRowIdx, cc);
    cell.border = THIN_BORDER;
    cell.font = { bold: true, size: 9, name: 'Arial' };
    cell.alignment = CENTER;
  }

  // ---- Lebar kolom ----
  let colIdx = 1;
  leadingGroups.forEach(g => g.cols.forEach(col => { ws.getColumn(colIdx).width = col.width; colIdx++; }));
  for (let i = 0; i < SENSUS_COL_COUNT; i++) { ws.getColumn(colIdx).width = 9; colIdx++; }
  for (let i = 0; i < KONDISI_COL_COUNT; i++) { ws.getColumn(colIdx).width = 7; colIdx++; }

  ws.views = [{ state: 'frozen', xSplit: leadingColCount, ySplit: r4 }];

  return {
    sheetName: ws.name,
    dataStartRow,
    dataEndRow,
    jumlahRow: totalRowIdx,
    namaCol,
    hargaCol,
    sensusColStart: leadingColCount + 1,
    kondisiColStart: leadingColCount + 1 + SENSUS_COL_COUNT
  };
}

// ============ SHEET TURUNAN (rekap sensus / jgan diganggu rumusnya / UNTUK LAPORAN) ============
// Sheet-sheet ini TIDAK berisi angka statis - semua rumus Excel merujuk balik ke sheet utama,
// persis seperti sistem asli: kalau baris data di sheet utama diedit, semua sheet turunan ikut
// terhitung ulang otomatis.

function labelCell(ws: ExcelJS.Worksheet, row: number, col: number, text: string, bold = false): void {
  const cell = ws.getCell(row, col);
  cell.value = text;
  cell.font = { bold, size: 10, name: 'Arial' };
}

function formulaCell(ws: ExcelJS.Worksheet, row: number, col: number, formula: string, result: number, bold = false): void {
  const cell = ws.getCell(row, col);
  // Sertakan hasil hitungan (result) bersama rumusnya, supaya angka tetap tampil benar
  // walau file dibuka di viewer yang tidak otomatis menghitung ulang rumus (mis. preview cepat).
  cell.value = { formula, result } as ExcelJS.CellFormulaValue;
  cell.font = { bold, size: 10, name: 'Arial' };
  cell.numFmt = '#,##0';
}

function borderRange(ws: ExcelJS.Worksheet, r1: number, c1: number, r2: number, c2: number): void {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      ws.getCell(r, c).border = THIN_BORDER;
    }
  }
}

function addRekapSensusSheet(wb: ExcelJS.Workbook, kib: KibKey, info: KibSheetInfo, tally: Tally): { sheetName: string } {
  const ws = wb.addWorksheet('rekap sensus');
  const M = info.sheetName;

  labelCell(ws, 1, 1, `REKAP SENSUS - KIB ${kib}`, true);

  const headers = ['Uraian', 'Jml Administratif', 'Nilai Administratif', 'Jml Ditemukan', 'Nilai Ditemukan', 'Jml Tidak Ditemukan', 'Nilai Tidak Ditemukan'];
  headers.forEach((h, i) => labelCell(ws, 3, i + 1, h, true));

  labelCell(ws, 4, 1, `Data KIB ${kib}`);
  formulaCell(ws, 4, 2, `COUNTA(${xref(M, info.namaCol, info.dataStartRow)}:${colLetter(info.namaCol)}${info.dataEndRow})`, tally.administratifJml);
  formulaCell(ws, 4, 3, `SUM(${xref(M, info.hargaCol, info.dataStartRow)}:${colLetter(info.hargaCol)}${info.dataEndRow})`, tally.administratifNilai);
  // Ditemukan = kategori pertama (index 0) pada blok Hasil Sensus
  formulaCell(ws, 4, 4, xref(M, info.sensusColStart, info.jumlahRow), tally.status.ditemukan.jml);
  formulaCell(ws, 4, 5, xref(M, info.sensusColStart + 1, info.jumlahRow), tally.status.ditemukan.nilai);
  // Tidak Ditemukan = kategori kedua (index 1)
  formulaCell(ws, 4, 6, xref(M, info.sensusColStart + 3, info.jumlahRow), tally.status.tidakDitemukan.jml);
  formulaCell(ws, 4, 7, xref(M, info.sensusColStart + 4, info.jumlahRow), tally.status.tidakDitemukan.nilai);
  borderRange(ws, 3, 1, 4, 7);

  labelCell(ws, 7, 1, 'Kondisi Fisik', true);
  ['Uraian', 'Jml', 'Nilai'].forEach((h, i) => labelCell(ws, 8, i + 1, h, true));
  const kondisiLabels: Record<'B' | 'KB' | 'RB', string> = { B: 'Baik', KB: 'Rusak Ringan', RB: 'Rusak Berat' };
  KONDISI_CODES.forEach((k, i) => {
    const r = 9 + i;
    labelCell(ws, r, 1, kondisiLabels[k.code]);
    const kcol = info.kondisiColStart + i * 2;
    const kt = tally.kondisi[k.code];
    formulaCell(ws, r, 2, xref(M, kcol, info.jumlahRow), kt.jml);
    formulaCell(ws, r, 3, xref(M, kcol + 1, info.jumlahRow), kt.nilai);
  });
  borderRange(ws, 8, 1, 11, 3);

  ws.getColumn(1).width = 22;
  for (let c = 2; c <= 7; c++) ws.getColumn(c).width = 16;

  return { sheetName: ws.name };
}

function addJganSheet(wb: ExcelJS.Workbook, kib: KibKey, rekap: { sheetName: string }, tally: Tally): { sheetName: string } {
  const ws = wb.addWorksheet('jgan diganggu rumusnya');
  const R = rekap.sheetName;

  labelCell(ws, 1, 1, `Data Aset Tetap KIB ${kib} - Hasil Sensus (rujukan ke sheet "rekap sensus")`, true);
  ['Uraian', 'Jml', 'Nilai'].forEach((h, i) => labelCell(ws, 3, i + 1, h, true));
  labelCell(ws, 4, 1, 'Aset Ditemukan');
  formulaCell(ws, 4, 2, xref(R, 4, 4), tally.status.ditemukan.jml);
  formulaCell(ws, 4, 3, xref(R, 5, 4), tally.status.ditemukan.nilai);
  labelCell(ws, 5, 1, 'Aset Tidak Ditemukan');
  formulaCell(ws, 5, 2, xref(R, 6, 4), tally.status.tidakDitemukan.jml);
  formulaCell(ws, 5, 3, xref(R, 7, 4), tally.status.tidakDitemukan.nilai);
  borderRange(ws, 3, 1, 5, 3);

  labelCell(ws, 8, 1, 'Data Administratif vs Sensus', true);
  ['Uraian', 'Jml', 'Nilai'].forEach((h, i) => labelCell(ws, 9, i + 1, h, true));
  labelCell(ws, 10, 1, 'Administratif');
  formulaCell(ws, 10, 2, xref(R, 2, 4), tally.administratifJml);
  formulaCell(ws, 10, 3, xref(R, 3, 4), tally.administratifNilai);
  labelCell(ws, 11, 1, 'Sudah Diopname (Ditemukan)');
  formulaCell(ws, 11, 2, xref(R, 4, 4), tally.status.ditemukan.jml);
  formulaCell(ws, 11, 3, xref(R, 5, 4), tally.status.ditemukan.nilai);
  borderRange(ws, 9, 1, 11, 3);

  labelCell(ws, 14, 1, 'Kondisi', true);
  ['Kondisi', 'Jml', 'Nilai'].forEach((h, i) => labelCell(ws, 15, i + 1, h, true));
  (['B', 'KB', 'RB'] as const).forEach((code, i) => {
    const r = 16 + i;
    const label = code === 'B' ? 'Baik' : code === 'KB' ? 'Rusak Ringan' : 'Rusak Berat';
    const kt = tally.kondisi[code];
    labelCell(ws, r, 1, label);
    formulaCell(ws, r, 2, xref(R, 2, 9 + i), kt.jml);
    formulaCell(ws, r, 3, xref(R, 3, 9 + i), kt.nilai);
  });
  borderRange(ws, 15, 1, 18, 3);

  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 16;

  return { sheetName: ws.name };
}

function addUntukLaporanSheet(wb: ExcelJS.Workbook, jgan: { sheetName: string }, tally: Tally): void {
  const ws = wb.addWorksheet('UNTUK LAPORAN');
  const J = jgan.sheetName;

  const table = (startRow: number, title: string, rows: { label: string; jmlRef: string; jmlResult: number; nilaiRef: string; nilaiResult: number }[]) => {
    labelCell(ws, startRow, 1, title, true);
    ['Uraian', 'Jml', 'Nilai'].forEach((h, i) => labelCell(ws, startRow + 1, i + 1, h, true));
    rows.forEach((row, i) => {
      const r = startRow + 2 + i;
      labelCell(ws, r, 1, row.label);
      formulaCell(ws, r, 2, row.jmlRef, row.jmlResult);
      formulaCell(ws, r, 3, row.nilaiRef, row.nilaiResult);
    });
    borderRange(ws, startRow + 1, 1, startRow + 1 + rows.length, 3);
    return startRow + 3 + rows.length;
  };

  let r = 1;
  r = table(r, 'Tabel 1) Jumlah BMD Menurut Administrasi', [{ label: 'Administratif', jmlRef: xref(J, 2, 10), jmlResult: tally.administratifJml, nilaiRef: xref(J, 3, 10), nilaiResult: tally.administratifNilai }]);
  r = table(r, 'Tabel 2) Hasil Inventarisasi Fisik', [{ label: 'Ditemukan', jmlRef: xref(J, 2, 4), jmlResult: tally.status.ditemukan.jml, nilaiRef: xref(J, 3, 4), nilaiResult: tally.status.ditemukan.nilai }]);
  r = table(r, 'Tabel 3) BMD Tidak Ditemukan', [{ label: 'Tidak Ditemukan', jmlRef: xref(J, 2, 5), jmlResult: tally.status.tidakDitemukan.jml, nilaiRef: xref(J, 3, 5), nilaiResult: tally.status.tidakDitemukan.nilai }]);
  r = table(r, 'Tabel 4) Kondisi Baik', [{ label: 'Baik', jmlRef: xref(J, 2, 16), jmlResult: tally.kondisi.B.jml, nilaiRef: xref(J, 3, 16), nilaiResult: tally.kondisi.B.nilai }]);
  r = table(r, 'Tabel 5) Kondisi Rusak Ringan', [{ label: 'Rusak Ringan', jmlRef: xref(J, 2, 17), jmlResult: tally.kondisi.KB.jml, nilaiRef: xref(J, 3, 17), nilaiResult: tally.kondisi.KB.nilai }]);
  table(r, 'Tabel 6) Kondisi Rusak Berat', [{ label: 'Rusak Berat', jmlRef: xref(J, 2, 18), jmlResult: tally.kondisi.RB.jml, nilaiRef: xref(J, 3, 18), nilaiResult: tally.kondisi.RB.nilai }]);

  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 14;
  ws.getColumn(3).width = 16;
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

function writeFotoPair(folder: JSZip, foto1: string | undefined, foto2: string | undefined) {
  [foto1, foto2].forEach((foto, i) => {
    if (!foto) return;
    const match = foto.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) return;
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    folder.file(`foto_${i + 1}.${ext}`, match[2], { base64: true });
  });
}

function addFotoToZip(zip: JSZip, kib: KibKey, masterList: OpnameMasterItem[], entries: OpnameEntry[]) {
  const entryByRefId = new Map(entries.map(e => [e.refId, e]));
  masterList.forEach((m, idx) => {
    const entry = entryByRefId.get(m.id);
    if (!entry) return;

    // Unit fisik: pakai fotoUnits kalau ada, fallback ke foto1/foto2 lama (data sebelum fitur multi-unit)
    const units = entry.fotoUnits && entry.fotoUnits.length > 0
      ? entry.fotoUnits
      : (entry.foto1 || entry.foto2) ? [{ foto1: entry.foto1, foto2: entry.foto2 }] : [];
    if (units.length === 0) return;

    const seq = m.no || String(idx + 1);
    const baseFolder = zip.folder(`KIB_${kib}`)!.folder(`Foto_KIB_${kib}`)!.folder(`${kib}-${seq}`)!;

    if (units.length === 1) {
      // 1 unit fisik - foto langsung di folder KIB_X-<no>, tanpa sub-folder pecahan
      writeFotoPair(baseFolder, units[0].foto1, units[0].foto2);
    } else {
      // Lebih dari 1 unit fisik yang diwakili baris data ini - pecah jadi sub-folder
      // KIB_X-<no>.1, KIB_X-<no>.2, dst, masing-masing dengan pasangan fotonya sendiri.
      units.forEach((u, i) => {
        if (!u.foto1 && !u.foto2) return;
        const unitFolder = baseFolder.folder(`${kib}-${seq}.${i + 1}`)!;
        writeFotoPair(unitFolder, u.foto1, u.foto2);
      });
    }
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

    const wb = new ExcelJS.Workbook();
    addCoverSheet(wb, pengaturan, kib);
    const kibInfo = addKibWorksheet(wb, kib, pengaturan, masterList, entries, tally);
    const rekap = addRekapSensusSheet(wb, kib, kibInfo, tally);
    const jgan = addJganSheet(wb, kib, rekap, tally);
    addUntukLaporanSheet(wb, jgan, tally);
    const xlsxBuffer = await wb.xlsx.writeBuffer();
    zip.folder(`KIB_${kib}`)!.file(`KIB_${kib}.xlsx`, xlsxBuffer);

    addFotoToZip(zip, kib, masterList, entries);
  }

  const docxBlob = await buildLaporanNaratifDocx(pengaturan, tallies);
  zip.file(`Laporan_Hasil_Sensus_BMD_${(pengaturan.namaSekolah || 'Sekolah').replace(/\s+/g, '_')}.docx`, docxBlob);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const tanggal = new Date().toISOString().split('T')[0];
  saveAs(zipBlob, `Laporan_Opname_BMD_${(pengaturan.namaSekolah || 'Sekolah').replace(/\s+/g, '_')}_${tanggal}.zip`);
}
