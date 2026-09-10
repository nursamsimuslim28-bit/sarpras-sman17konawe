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
import { saveAs } from 'file-saver';
import { 
  ProgramKerjaData, 
  RabSarprasData, 
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
import { PengaturanSekolah, Aset } from '../types';

const BULAN_LABELS = ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

// Helper to create official Kop Surat
function createKopSurat(pengaturan: PengaturanSekolah): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'PEMERINTAH PROVINSI SULAWESI TENGGARA',
          bold: true,
          size: 22, // 11pt
          font: 'Times New Roman'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
          bold: true,
          size: 24, // 12pt
          font: 'Times New Roman'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: (pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE').toUpperCase(),
          bold: true,
          size: 26, // 13pt
          font: 'Times New Roman'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Alamat: ${pengaturan.alamat || 'Jl. Poros Kendari-Kolaka No. 17, Amonggedo, Kec. Amonggedo, Kab. Konawe'} | NPSN: ${pengaturan.npsn || '69888999'}`,
          italics: true,
          size: 18, // 9pt
          font: 'Times New Roman'
        })
      ]
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        bottom: {
          color: '000000',
          space: 1,
          style: BorderStyle.DOUBLE,
          size: 16
        }
      },
      spacing: { after: 200 },
      children: []
    })
  ];
}

// Helper to create Legal Signatures
function createSignatureTable(
  pengaturan: PengaturanSekolah, 
  tanggalStr: string = 'Konawe, Juli 2026',
  leftRole: string = 'Wakasek Urusan Sarpras',
  leftName?: string,
  leftNip?: string
): Table {
  const w = leftName || pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.';
  const wNip = leftNip || (pengaturan.nipPetugasSarpras ? `NIP. ${pengaturan.nipPetugasSarpras}` : '-');
  const k = pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.';
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
              new Paragraph({
                children: [new TextRun({ text: 'Mengetahui / Menyetujui,', size: 20, font: 'Times New Roman' })]
              }),
              new Paragraph({
                children: [new TextRun({ text: leftRole + ',', bold: true, size: 20, font: 'Times New Roman' })]
              }),
              new Paragraph({ spacing: { after: 1200 }, children: [] }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: w,
                    bold: true,
                    underline: { type: UnderlineType.SINGLE },
                    size: 20,
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({
                children: [new TextRun({ text: wNip, size: 18, font: 'Times New Roman' })]
              })
            ]
          }),
          new TableCell({
            borders: noBorder,
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [new TextRun({ text: tanggalStr, size: 20, font: 'Times New Roman' })]
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Kepala Sekolah,', bold: true, size: 20, font: 'Times New Roman' })]
              }),
              new Paragraph({ spacing: { after: 1200 }, children: [] }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: k,
                    bold: true,
                    underline: { type: UnderlineType.SINGLE },
                    size: 20,
                    font: 'Times New Roman'
                  })
                ]
              }),
              new Paragraph({
                children: [new TextRun({ text: kNip, size: 18, font: 'Times New Roman' })]
              })
            ]
          })
        ]
      })
    ]
  });
}

const cellBorder = {
  top: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  left: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' },
  right: { style: BorderStyle.SINGLE, size: 4, color: '4B5563' }
};

// 1. EXPORT PROGRAM KERJA DOCX
export async function exportProgramKerjaDocx(pengaturan: PengaturanSekolah, data: ProgramKerjaData) {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          borders: cellBorder,
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })]
        }),
        new TableCell({
          borders: cellBorder,
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: 'Uraian Rencana Kegiatan Sarpras', bold: true, size: 18, font: 'Times New Roman' })] })]
        }),
        ...BULAN_LABELS.map(m => new TableCell({
          borders: cellBorder,
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m, bold: true, size: 16, font: 'Times New Roman' })] })]
        }))
      ]
    }),
    ...data.matriks.map((item, idx) => new TableRow({
      children: [
        new TableCell({
          borders: cellBorder,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })]
        }),
        new TableCell({
          borders: cellBorder,
          children: [new Paragraph({ children: [new TextRun({ text: item.kegiatan, size: 18, font: 'Times New Roman' })] })]
        }),
        ...item.jadwalBulan.map(active => new TableCell({
          borders: cellBorder,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: active ? 'V' : '', bold: true, size: 18, font: 'Times New Roman' })] })]
        }))
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: 'PROGRAM KERJA TAHUNAN SARANA DAN PRASARANA',
              bold: true,
              size: 24,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({
              text: `TAHUN PELAJARAN ${data.tahunPelajaran}`,
              bold: true,
              size: 22,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'A. LATAR BELAKANG', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: data.latarBelakang, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'B. DASAR HUKUM', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        ...data.dasarHukum.map((dh, i) => new Paragraph({
          children: [new TextRun({ text: `${i + 1}. ${dh}`, size: 20, font: 'Times New Roman' })]
        })),
        new Paragraph({
          spacing: { before: 150 },
          children: [
            new TextRun({ text: 'C. TUJUAN & SASARAN', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        ...data.tujuan.map((tj, i) => new Paragraph({
          children: [new TextRun({ text: `• ${tj}`, size: 20, font: 'Times New Roman' })]
        })),
        new Paragraph({
          spacing: { before: 150, after: 100 },
          children: [
            new TextRun({ text: 'D. MATRIKS JADWAL PELAKSANAAN KEGIATAN', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({
          spacing: { before: 200 },
          children: [
            new TextRun({ text: 'E. PENUTUP', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: data.penutup, size: 20, font: 'Times New Roman' })]
        }),
        createSignatureTable(pengaturan, `Konawe, ${data.tanggalPengesahan || 'Juli 2026'}`)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Program_Kerja_Sarpras_${pengaturan.namaSekolah || 'SMAN17'}_${data.tahunPelajaran.replace('/', '-')}.docx`);
}

// 2. EXPORT RAB SARPRAS DOCX
export async function exportRabDocx(pengaturan: PengaturanSekolah, data: RabSarprasData) {
  const formatRp = (v: number) => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

  const totalPemeliharaan = data.items
    .filter(i => i.jenisBelanja === 'Pemeliharaan')
    .reduce((sum, i) => sum + (i.volume * i.hargaSatuan), 0);

  const totalModal = data.items
    .filter(i => i.jenisBelanja === 'Modal')
    .reduce((sum, i) => sum + (i.volume * i.hargaSatuan), 0);

  const totalKeseluruhan = totalPemeliharaan + totalModal;

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Kode Rekening', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Uraian Belanja / Kegiatan', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jenis', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Vol', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Satuan', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Harga Satuan', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Total Anggaran', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Keterangan', bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    ...data.items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.kodeRekening, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.uraian, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.jenisBelanja, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.volume), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.satuan, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(item.hargaSatuan), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(item.volume * item.hargaSatuan), bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.keterangan || '-', size: 18, font: 'Times New Roman' })] })] })
      ]
    })),
    new TableRow({
      children: [
        new TableCell({ borders: cellBorder, columnSpan: 7, shading: { fill: 'F9FAFB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL BELANJA PEMELIHARAAN (Maks 20% BOS):', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, columnSpan: 2, shading: { fill: 'F9FAFB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(totalPemeliharaan), bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ borders: cellBorder, columnSpan: 7, shading: { fill: 'F9FAFB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL BELANJA MODAL SARPRAS:', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, columnSpan: 2, shading: { fill: 'F9FAFB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(totalModal), bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ borders: cellBorder, columnSpan: 7, shading: { fill: 'E5E7EB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'TOTAL KESELURUHAN ANGGARAN SARPRAS:', bold: true, size: 20, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, columnSpan: 2, shading: { fill: 'E5E7EB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(totalKeseluruhan), bold: true, size: 20, font: 'Times New Roman' })] })] })
      ]
    })
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'RENCANA ANGGARAN BIAYA (RAB) SARANA DAN PRASARANA', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `TAHUN ANGGARAN ${data.tahunAnggaran} | SUMBER DANA: ${data.sumberDana.toUpperCase()}`, bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, `Konawe, ${data.tanggalDisusun || 'Januari 2026'}`, 'Bendahara BOS / Pengurus Barang')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `RAB_Sarpras_${pengaturan.namaSekolah || 'SMAN17'}_${data.tahunAnggaran}.docx`);
}

// 3. EXPORT JADWAL PEMELIHARAAN DOCX
export async function exportJadwalPemeliharaanDocx(pengaturan: PengaturanSekolah, items: JadwalPemeliharaanItem[]) {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Item Fasilitas / Sarana Prasarana', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Frekuensi', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        ...BULAN_LABELS.map(m => new TableCell({
          borders: cellBorder,
          shading: { fill: 'F3F4F6', type: ShadingType.CLEAR },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: m, bold: true, size: 16, font: 'Times New Roman' })] })]
        }))
      ]
    }),
    ...items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.kegiatan, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.frekuensi, size: 18, font: 'Times New Roman' })] })] }),
        ...item.jadwalBulan.map(active => new TableCell({
          borders: cellBorder,
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: active ? 'V' : '', bold: true, size: 18, font: 'Times New Roman' })] })]
        }))
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'JADWAL PEMELIHARAAN RUTIN SARANA DAN PRASARANA', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'TAHUN PELAJARAN 2026/2027', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, Juli 2026')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Jadwal_Pemeliharaan_Sarpras_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

// 4. EXPORT RIWAYAT PEMELIHARAAN DOCX
export async function exportRiwayatPemeliharaanDocx(pengaturan: PengaturanSekolah, items: RiwayatPemeliharaanItem[]) {
  const formatRp = (v: number) => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Tanggal', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Barang & Lokasi', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Kerusakan Awal', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Tindakan Servis', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Pelaksana', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Biaya (Rp)', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kondisi Akhir', bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    ...items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.tanggal, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: `${item.namaBarang} (${item.ruangLokasi})`, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.kerusakanAwal, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.tindakan, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.pelaksana, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(item.biaya), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.hasilAkhir, bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'KARTU RIWAYAT PEMELIHARAAN & LOG PERBAIKAN ASET', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'BUKTI OPERASIONAL & PERTANGGUNGJAWABAN SERVIS', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, 2026')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Riwayat_Pemeliharaan_Sarpras_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

// 5. EXPORT LAPORAN BERKALA DOCX
export async function exportLaporanBerkalaDocx(pengaturan: PengaturanSekolah, data: LaporanBerkalaData, asets: Aset[]) {
  const formatRp = (v: number) => 'Rp ' + Number(v || 0).toLocaleString('id-ID');

  const totalBaik = asets.filter(a => a.kondisi === 'Baik').length;
  const totalRusakRingan = asets.filter(a => a.kondisi === 'Rusak Ringan').length;
  const totalRusakBerat = asets.filter(a => a.kondisi === 'Rusak Berat').length;
  const totalSemua = asets.length || 1;

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'LAPORAN BERKALA SARANA DAN PRASARANA', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `PERIODE: ${data.periodeLaporan.toUpperCase()} | TP: ${data.tahunPelajaran}`, bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          children: [new TextRun({ text: 'I. PENDAHULUAN & RINGKASAN', bold: true, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: data.ringkasanKegiatan, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          children: [new TextRun({ text: 'II. STATUS KONDISI ASET DAN SARANA PRASARANA', bold: true, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `• Kondisi Baik: ${totalBaik} Unit (${((totalBaik/totalSemua)*100).toFixed(1)}%)`, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `• Rusak Ringan: ${totalRusakRingan} Unit (${((totalRusakRingan/totalSemua)*100).toFixed(1)}%)`, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({ text: `• Rusak Berat: ${totalRusakBerat} Unit (${((totalRusakBerat/totalSemua)*100).toFixed(1)}%)`, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          children: [new TextRun({ text: 'III. REALISASI ANGGARAN SARPRAS', bold: true, size: 20, font: 'Times New Roman' })]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              tableHeader: true,
              children: [
                new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
                new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Uraian Alokasi Belanja', bold: true, size: 18, font: 'Times New Roman' })] })] }),
                new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Anggaran (Rp)', bold: true, size: 18, font: 'Times New Roman' })] })] }),
                new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Realisasi (Rp)', bold: true, size: 18, font: 'Times New Roman' })] })] })
              ]
            }),
            ...data.realisasiAnggaran.map((r, i) => new TableRow({
              children: [
                new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: String(i + 1), size: 18, font: 'Times New Roman' })] })] }),
                new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: r.uraian, size: 18, font: 'Times New Roman' })] })] }),
                new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(r.anggaranDiajukan), size: 18, font: 'Times New Roman' })] })] }),
                new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: formatRp(r.realisasi), bold: true, size: 18, font: 'Times New Roman' })] })] })
              ]
            }))
          ]
        }),
        new Paragraph({
          spacing: { before: 150 },
          children: [new TextRun({ text: 'IV. KENDALA & EVALUASI', bold: true, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [new TextRun({ text: data.kendala, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          children: [new TextRun({ text: 'V. RENCANA TINDAK LANJUT', bold: true, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          spacing: { after: 300 },
          children: [new TextRun({ text: data.rencanaTindakLanjut, size: 20, font: 'Times New Roman' })]
        }),
        createSignatureTable(pengaturan, 'Konawe, 2026')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Laporan_Berkala_Sarpras_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

// 6. EXPORT BAP PEMERIKSAAN FISIK BMD DOCX
export async function exportBapPemeriksaanDocx(pengaturan: PengaturanSekolah, items: BapPemeriksaanItem[], nomorBap: string = '005/BAP-BMD/SMA.17/2026') {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Kode Barang', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Barang / Jenis BMD', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Tahun', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jumlah', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kondisi', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Alasan Kerusakan', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Usulan Tindak Lanjut', bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    ...items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.kodeBarang, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.namaBarang, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.tahunPerolehan), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.jumlah), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RB (Rusak Berat)', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.alasanKerusakan, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.usulanTindakLanjut, size: 18, font: 'Times New Roman' })] })] })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'BERITA ACARA PEMERIKSAAN FISIK BARANG MILIK DAERAH (BMD)', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `Nomor: ${nomorBap}`, bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: 'Pada hari ini telah dilakukan pemeriksaan fisik menyeluruh terhadap Barang Milik Daerah (BMD) kondisi Rusak Berat yang sudah tidak efisien secara teknis dan ekonomis:',
              size: 20,
              font: 'Times New Roman'
            })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, 2026', 'Tim Pemeriksa / Pengurus Barang')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `BAP_Pemeriksaan_BMD_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

// 7. EXPORT SURAT USULAN PENGHAPUSAN DOCX
export async function exportSuratUsulanDocx(pengaturan: PengaturanSekolah, surat: SuratUsulanPenghapusanData, bapItems: BapPemeriksaanItem[]) {
  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: `Konawe, ${surat.tanggalSurat || '2026'}`, size: 20, font: 'Times New Roman' })]
        }),
        new Paragraph({
          children: [
            new TextRun({ text: `Nomor   : ${surat.nomorSurat}\nLampiran: ${surat.lampiran}\nPerihal : ${surat.perihal}`, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({ spacing: { after: 200 }, children: [] }),
        new Paragraph({
          children: [
            new TextRun({ text: `Kepada Yth.\n${surat.tujuanSurat}\ndi -\n    ${surat.kotaTujuan}`, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({ spacing: { after: 150 }, children: [] }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Dengan hormat, sehubungan dengan hasil pemeriksaan berkala kondisi Barang Milik Daerah (BMD) pada satuan pendidikan ${pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}, dengan ini kami mengusulkan penghapusan dan pemusnahan BMD dalam kondisi Rusak Berat sebanyak ${bapItems.reduce((s, i) => s + i.jumlah, 0)} unit barang.`,
              size: 20,
              font: 'Times New Roman'
            })
          ]
        }),
        new Paragraph({
          spacing: { before: 150, after: 300 },
          children: [
            new TextRun({
              text: 'Demikian surat permohonan ini kami sampaikan, atas perhatian dan persetujuan Bapak Kepala Dinas diucapkan terima kasih.',
              size: 20,
              font: 'Times New Roman'
            })
          ]
        }),
        createSignatureTable(pengaturan, `Konawe, ${surat.tanggalSurat || '2026'}`)
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Surat_Usulan_Penghapusan_BMD_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

// 8. EXPORT BA PENGHAPUSAN / PEMUSNAHAN DOCX
export async function exportBaPenghapusanDocx(pengaturan: PengaturanSekolah, items: BaPenghapusanItem[], nomorBa: string = '045/BA-MUSNAH/SMA.17/2026') {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Kode Barang', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Barang / Jenis BMD', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jumlah', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kondisi', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Metode Eksekusi Penghapusan', bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    ...items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.kodeBarang, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.namaBarang, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.jumlah), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'RB', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.caraPenghapusan, size: 18, font: 'Times New Roman' })] })] })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'BERITA ACARA PEMUSNAHAN / PENGHAPUSAN BMD', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `Nomor: ${nomorBa}`, bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          spacing: { after: 150 },
          children: [
            new TextRun({
              text: 'Berdasarkan Surat Keputusan dan Persetujuan Penghapusan, telah dilaksanakan tindakan pemusnahan/penghapusan fisik barang milik daerah sebagai berikut:',
              size: 20,
              font: 'Times New Roman'
            })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, 2026', 'Saksi Tim Penghapusan')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `BA_Penghapusan_Pemusnahan_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

// 9. EXPORT SARPRAS KHUSUS (ALAT PERAGA, BUKU, JADWAL LAB) DOCX
export async function exportAlatPeragaDocx(pengaturan: PengaturanSekolah, items: AlatPeragaItem[]) {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Nama Alat Peraga / Praktik', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jumlah', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Satuan', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kondisi', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Lokasi Penyimpanan', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Keterangan', bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    ...items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.namaAlat, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.jumlah), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.satuan, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.kondisi, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.lokasiPenyimpanan, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.keterangan || '-', size: 18, font: 'Times New Roman' })] })] })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'DAFTAR INVENTARIS ALAT PERAGA DAN MEDIA PEMBELAJARAN', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'STANDAR SARPRAS PEMBELAJARAN & LABORATORIUM', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, 2026', 'Kepala Laboratorium / Sarpras')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Inventaris_Alat_Peraga_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

export async function exportBukuPerpusDocx(pengaturan: PengaturanSekolah, items: BukuPerpustakaanItem[]) {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'No', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Judul Buku', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Pengarang / Penerbit', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kategori', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Eks', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Kondisi', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: 'Keterangan', bold: true, size: 18, font: 'Times New Roman' })] })] })
      ]
    }),
    ...items.map((item, idx) => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(idx + 1), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.judulBuku, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: `${item.pengarang} / ${item.penerbit}`, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.kategori, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(item.jumlahEksemplar), size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: item.kondisi, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ children: [new TextRun({ text: item.keterangan || '-', size: 18, font: 'Times New Roman' })] })] })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'DAFTAR INVENTARIS BUKU PERPUSTAKAAN SEKOLAH', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'KATALOG KOLEKSI SUMBER BELAJAR & BUKU REFERENSI', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, 2026', 'Kepala Perpustakaan')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Koleksi_Buku_Perpustakaan_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}

export async function exportJadwalLabDocx(pengaturan: PengaturanSekolah, items: JadwalLabSlot[]) {
  const tableRows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Hari', bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jam 1 (07.30-08.15)', bold: true, size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jam 2 (08.15-09.00)', bold: true, size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jam 3 (09.15-10.00)', bold: true, size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jam 4 (10.00-10.45)', bold: true, size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jam 5 (11.00-11.45)', bold: true, size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, shading: { fill: 'F3F4F6', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Jam 6 (11.45-12.30)', bold: true, size: 16, font: 'Times New Roman' })] })] })
      ]
    }),
    ...items.map(slot => new TableRow({
      children: [
        new TableCell({ borders: cellBorder, shading: { fill: 'F9FAFB', type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.hari, bold: true, size: 18, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.jam1 || '-', size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.jam2 || '-', size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.jam3 || '-', size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.jam4 || '-', size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.jam5 || '-', size: 16, font: 'Times New Roman' })] })] }),
        new TableCell({ borders: cellBorder, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: slot.jam6 || '-', size: 16, font: 'Times New Roman' })] })] })
      ]
    }))
  ];

  const doc = new Document({
    sections: [{
      children: [
        ...createKopSurat(pengaturan),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'JADWAL PENGGUNAAN LABORATORIUM KOMPUTER & IPA', bold: true, size: 24, font: 'Times New Roman' })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: 'SEMESTER GANJIL TAHUN PELAJARAN 2026/2027', bold: true, size: 20, font: 'Times New Roman' })
          ]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 300 }, children: [] }),
        createSignatureTable(pengaturan, 'Konawe, 2026', 'Kepala Laboratorium Komputer/IPA')
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Jadwal_Penggunaan_Lab_${pengaturan.namaSekolah || 'SMAN17'}.docx`);
}
