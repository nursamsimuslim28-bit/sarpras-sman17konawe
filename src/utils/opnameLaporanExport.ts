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

interface CategoryColumn {
  key: keyof OpnameMasterItem;
  label: string;
  width: number;
}

const CATEGORY_COLUMNS: Record<KibKey, CategoryColumn[]> = {
  B: [
    { key: 'merk', label: 'Merk/Type', width: 18 },
    { key: 'bahan', label: 'Bahan', width: 14 }
  ],
  C: [
    { key: 'konstruksi', label: 'Konstruksi', width: 16 },
    { key: 'letakLokasi', label: 'Letak/Lokasi', width: 20 },
    { key: 'luasLantai', label: 'Luas Lantai (M2)', width: 14 }
  ],
  E: [
    { key: 'judulPencipta', label: 'Judul/Pencipta', width: 26 }
  ]
};

interface Tally {
  administratifJml: number;
  administratifNilai: number;
  sudahDiopnameJml: number;
  ditemukanJml: number;
  ditemukanNilai: number;
  tidakDitemukanJml: number;
  tidakDitemukanNilai: number;
  dikuasaiPegawaiJml: number;
  dikuasaiPegawaiNilai: number;
  digunakanUnitLainJml: number;
  digunakanUnitLainNilai: number;
  dikuasaiPihakKetigaJml: number;
  dikuasaiPihakKetigaNilai: number;
  kondisiBaik: number;
  kondisiRusakRingan: number;
  kondisiRusakBerat: number;
}

function emptyTally(): Tally {
  return {
    administratifJml: 0, administratifNilai: 0, sudahDiopnameJml: 0,
    ditemukanJml: 0, ditemukanNilai: 0,
    tidakDitemukanJml: 0, tidakDitemukanNilai: 0,
    dikuasaiPegawaiJml: 0, dikuasaiPegawaiNilai: 0,
    digunakanUnitLainJml: 0, digunakanUnitLainNilai: 0,
    dikuasaiPihakKetigaJml: 0, dikuasaiPihakKetigaNilai: 0,
    kondisiBaik: 0, kondisiRusakRingan: 0, kondisiRusakBerat: 0
  };
}

function classifyEntry(entry: OpnameEntry, harga: number, tally: Tally) {
  tally.sudahDiopnameJml += 1;

  if (entry.ditemukan === 'Tidak') {
    tally.tidakDitemukanJml += 1;
    tally.tidakDitemukanNilai += harga;
  } else {
    switch (entry.statusPenguasaan) {
      case 'Dikuasai Pegawai':
        tally.dikuasaiPegawaiJml += 1;
        tally.dikuasaiPegawaiNilai += harga;
        break;
      case 'Digunakan Unit Lain':
        tally.digunakanUnitLainJml += 1;
        tally.digunakanUnitLainNilai += harga;
        break;
      case 'Dikuasai Pihak Ketiga':
        tally.dikuasaiPihakKetigaJml += 1;
        tally.dikuasaiPihakKetigaNilai += harga;
        break;
      default:
        tally.ditemukanJml += 1;
        tally.ditemukanNilai += harga;
    }
  }

  if (entry.kondisi === 'Baik') tally.kondisiBaik += 1;
  else if (entry.kondisi === 'Rusak Ringan') tally.kondisiRusakRingan += 1;
  else if (entry.kondisi === 'Rusak Berat') tally.kondisiRusakBerat += 1;
}

function kondisiKode(kondisi: OpnameEntry['kondisi']): string {
  if (kondisi === 'Baik') return 'B';
  if (kondisi === 'Rusak Ringan') return 'KB';
  if (kondisi === 'Rusak Berat') return 'RB';
  return '-';
}

function fmtRupiah(n: number): number {
  return Math.round(n || 0);
}

// ============ EXCEL PER-KIB (KARTU INVENTARIS BARANG HASIL SENSUS) ============

function buildKibWorkbook(
  kib: KibKey,
  pengaturan: PengaturanSekolah,
  masterList: OpnameMasterItem[],
  entries: OpnameEntry[],
  tally: Tally
): ArrayBuffer {
  const entryByRefId = new Map(entries.map(e => [e.refId, e]));
  const catCols = CATEGORY_COLUMNS[kib];

  const baseHeader = ['No.', 'Nama Barang / Jenis Aset', 'Nomor Register', 'Tahun'];
  const catHeader = catCols.map(c => c.label);
  const tailHeader = ['Asal Usul', 'Harga Perolehan (Rp)', 'Keterangan'];
  const sensusHeader = [
    'Ditemukan (Jml)', 'Ditemukan (Nilai Rp)',
    'Tidak Ditemukan (Jml)', 'Tidak Ditemukan (Nilai Rp)',
    'Dikuasai Pegawai (Jml)', 'Dikuasai Pegawai (Nilai Rp)',
    'Digunakan Unit Lain (Jml)', 'Digunakan Unit Lain (Nilai Rp)',
    'Dikuasai Pihak Ketiga (Jml)', 'Dikuasai Pihak Ketiga (Nilai Rp)',
    'Kondisi (B/KB/RB)', 'Kode Stiker', 'Tanggal Opname', 'Petugas'
  ];

  const rows: any[][] = [];
  rows.push([`PEMERINTAH PROVINSI SULAWESI TENGGARA`]);
  rows.push([`DINAS PENDIDIKAN DAN KEBUDAYAAN`]);
  rows.push([(pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase()]);
  rows.push([KIB_TITLE[kib]]);
  rows.push([`NPSN: ${pengaturan.npsn || '-'} | Alamat: ${pengaturan.alamat || '-'}`]);
  rows.push([`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`]);
  rows.push([]);

  const headerRowIdx = rows.length; // 0-based index of header row
  rows.push([...baseHeader, ...catHeader, ...tailHeader, ...sensusHeader]);

  masterList.forEach((m, idx) => {
    const entry = entryByRefId.get(m.id);
    const harga = fmtRupiah(m.harga || 0);
    const catVals = catCols.map(c => (m[c.key] as any) ?? '-');

    const sensusVals: any[] = ['', '', '', '', '', '', '', '', '', '', '', '', '', ''];
    if (entry) {
      if (entry.ditemukan === 'Tidak') {
        sensusVals[2] = 1; sensusVals[3] = harga;
      } else if (entry.statusPenguasaan === 'Dikuasai Pegawai') {
        sensusVals[4] = 1; sensusVals[5] = harga;
      } else if (entry.statusPenguasaan === 'Digunakan Unit Lain') {
        sensusVals[6] = 1; sensusVals[7] = harga;
      } else if (entry.statusPenguasaan === 'Dikuasai Pihak Ketiga') {
        sensusVals[8] = 1; sensusVals[9] = harga;
      } else {
        sensusVals[0] = 1; sensusVals[1] = harga;
      }
      sensusVals[10] = kondisiKode(entry.kondisi);
      sensusVals[11] = entry.kodeStiker || '-';
      sensusVals[12] = entry.tanggalOpname || '-';
      sensusVals[13] = entry.petugas || '-';
    } else {
      sensusVals[10] = 'BELUM DIOPNAME';
    }

    rows.push([
      m.no || idx + 1,
      m.nama || '-',
      m.register || '-',
      m.tahun || '-',
      ...catVals,
      m.asalUsul || '-',
      harga,
      m.keterangan || '-',
      ...sensusVals
    ]);
  });

  // Total row
  const totalRow = new Array(baseHeader.length + catCols.length + tailHeader.length).fill('');
  totalRow[0] = 'JUMLAH';
  totalRow.push(
    tally.ditemukanJml, tally.ditemukanNilai,
    tally.tidakDitemukanJml, tally.tidakDitemukanNilai,
    tally.dikuasaiPegawaiJml, tally.dikuasaiPegawaiNilai,
    tally.digunakanUnitLainJml, tally.digunakanUnitLainNilai,
    tally.dikuasaiPihakKetigaJml, tally.dikuasaiPihakKetigaNilai,
    '', '', '', ''
  );
  rows.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  const totalCols = baseHeader.length + catCols.length + tailHeader.length + sensusHeader.length;
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
    { s: { r: 4, c: 0 }, e: { r: 4, c: totalCols - 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: totalCols - 1 } }
  ];

  ws['!cols'] = [
    { wch: 5 }, { wch: 32 }, { wch: 16 }, { wch: 8 },
    ...catCols.map(c => ({ wch: c.width })),
    { wch: 20 }, { wch: 16 }, { wch: 22 },
    { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
    { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 14 },
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }
  ];

  void headerRowIdx;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `KIB ${kib} Hasil Sensus`);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}

// ============ SURAT LAPORAN NARATIF (DOCX) ============

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
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 18, font: 'Times New Roman' })] })]
  });
}

function dataCell(text: string, align: any = AlignmentType.CENTER): TableCell {
  return new TableCell({
    borders: tCellBorder,
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, size: 18, font: 'Times New Roman' })] })]
  });
}

function formatRp(n: number): string {
  return 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
}

function buildRekapTable(tallies: Record<KibKey, Tally>): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        headCell('Jenis KIB'), headCell('Jml Item\nAdministratif'), headCell('Nilai Administratif'),
        headCell('Jml Sudah\nDiopname'), headCell('Jml Ditemukan'), headCell('Jml Tidak\nDitemukan'),
        headCell('Kondisi Baik'), headCell('Rusak\nRingan'), headCell('Rusak\nBerat')
      ]
    })
  ];

  (['B', 'C', 'E'] as KibKey[]).forEach(kib => {
    const t = tallies[kib];
    rows.push(new TableRow({
      children: [
        dataCell(`KIB ${kib}`),
        dataCell(String(t.administratifJml)),
        dataCell(formatRp(t.administratifNilai), AlignmentType.RIGHT),
        dataCell(String(t.sudahDiopnameJml)),
        dataCell(String(t.ditemukanJml + t.dikuasaiPegawaiJml + t.digunakanUnitLainJml + t.dikuasaiPihakKetigaJml)),
        dataCell(String(t.tidakDitemukanJml)),
        dataCell(String(t.kondisiBaik)),
        dataCell(String(t.kondisiRusakRingan)),
        dataCell(String(t.kondisiRusakBerat))
      ]
    }));
  });

  const grand = (['B', 'C', 'E'] as KibKey[]).reduce((acc, kib) => {
    const t = tallies[kib];
    acc.administratifJml += t.administratifJml;
    acc.administratifNilai += t.administratifNilai;
    acc.sudahDiopnameJml += t.sudahDiopnameJml;
    acc.ditemukan += t.ditemukanJml + t.dikuasaiPegawaiJml + t.digunakanUnitLainJml + t.dikuasaiPihakKetigaJml;
    acc.tidakDitemukan += t.tidakDitemukanJml;
    acc.baik += t.kondisiBaik;
    acc.rr += t.kondisiRusakRingan;
    acc.rb += t.kondisiRusakBerat;
    return acc;
  }, { administratifJml: 0, administratifNilai: 0, sudahDiopnameJml: 0, ditemukan: 0, tidakDitemukan: 0, baik: 0, rr: 0, rb: 0 });

  rows.push(new TableRow({
    children: [
      dataCell('JUMLAH', AlignmentType.LEFT),
      dataCell(String(grand.administratifJml)),
      dataCell(formatRp(grand.administratifNilai), AlignmentType.RIGHT),
      dataCell(String(grand.sudahDiopnameJml)),
      dataCell(String(grand.ditemukan)),
      dataCell(String(grand.tidakDitemukan)),
      dataCell(String(grand.baik)),
      dataCell(String(grand.rr)),
      dataCell(String(grand.rb))
    ]
  }));

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

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...kopSurat(pengaturan),
          p('LAPORAN HASIL SENSUS / OPNAME FISIK BARANG MILIK DAERAH (BMD)', { bold: true, alignment: AlignmentType.CENTER, spacingAfter: 60 }),
          p(`Tahun ${new Date().getFullYear()}`, { alignment: AlignmentType.CENTER, spacingAfter: 300 }),

          p('Nomor', {}),
          p('Lampiran : 1 (satu) set', {}),
          p('Perihal   : Laporan Hasil Sensus / Opname Fisik Barang Milik Daerah (BMD)', { spacingAfter: 300 }),

          p('Yth. Kepala Dinas Pendidikan dan Kebudayaan', {}),
          p('Provinsi Sulawesi Tenggara', {}),
          p('di -', {}),
          p('    Kendari', { spacingAfter: 300 }),

          p(`Dengan ini kami sampaikan Laporan Hasil Sensus/Opname Fisik atas Barang Milik Daerah (BMD) ${pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}, dengan rincian sebagai berikut:`, { spacingAfter: 200 }),

          buildRekapTable(tallies),

          new Paragraph({ spacing: { after: 200 }, children: [] }),
          p('Catatan / Lain-lain:', { bold: true, spacingAfter: 100 }),
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
