import React, { useState } from 'react';
import { PengaturanSekolah } from '../../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Printer, 
  Download, 
  FileSpreadsheet, 
  CheckCircle2, 
  PrinterCheck, 
  Sliders,
  FileDown,
  FileText
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
}

type KibType = 'KIB_A' | 'KIB_B' | 'KIB_C' | 'KIB_D' | 'KIB_E' | 'KIB_F';

interface KibMeta {
  id: KibType;
  code: string;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  badgeBg: string;
  columns: string[];
  columnWidths?: Record<number, { halign?: 'left' | 'center' | 'right'; cellWidth?: number }>;
}

const KIB_CONFIGS: KibMeta[] = [
  {
    id: 'KIB_A',
    code: 'KIB A',
    title: 'Kartu Inventaris Barang A (Tanah)',
    subtitle: 'Blanko pendataan lahan, kapling, dan lapangan sekolah',
    description: 'Pencatatan fisik tanah lokasi sekolah, luas, sertifikat, hak kepemilikan, serta nilai perolehan.',
    color: 'border-emerald-500 bg-emerald-50/40 text-emerald-800',
    badgeBg: 'bg-emerald-600 text-white',
    columns: ['No', 'Kode Barang', 'Jenis / Nama Barang', 'Luas (m²)', 'Thn Pengadaan', 'Letak / Lokasi Alamat', 'Hak Tanah', 'No. Sertifikat / Tgl', 'Penggunaan', 'Asal Usul', 'Harga (Rp)', 'Keterangan'],
    columnWidths: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 22 },
      2: { cellWidth: 32 },
      3: { halign: 'right', cellWidth: 16 },
      4: { halign: 'center', cellWidth: 16 },
      5: { cellWidth: 34 },
      6: { halign: 'center', cellWidth: 18 },
      7: { cellWidth: 26 },
      8: { cellWidth: 24 },
      9: { cellWidth: 20 },
      10: { halign: 'right', cellWidth: 22 },
      11: { cellWidth: 25 }
    }
  },
  {
    id: 'KIB_B',
    code: 'KIB B',
    title: 'Kartu Inventaris Barang B (Peralatan & Mesin)',
    subtitle: 'Blanko pendataan komputer, mesin, alat olahraga, & perkakas',
    description: 'Pencatatan barang perabotan kantor, alat laboratorium, komputer, mesin, kendaraan, dan peralatan kerja.',
    color: 'border-blue-500 bg-blue-50/40 text-blue-800',
    badgeBg: 'bg-blue-600 text-white',
    columns: ['No', 'Kode Barang', 'Nama / Jenis Barang', 'Merk / Tipe', 'Ukuran / Bahan', 'Thn Beli', 'No. Pabrik/Mesin/Polisi', 'Asal Usul', 'Kondisi (B/RR/RB)', 'Harga (Rp)', 'Keterangan'],
    columnWidths: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28 },
      4: { cellWidth: 24 },
      5: { halign: 'center', cellWidth: 16 },
      6: { cellWidth: 32 },
      7: { cellWidth: 22 },
      8: { halign: 'center', cellWidth: 20 },
      9: { halign: 'right', cellWidth: 24 },
      10: { cellWidth: 28 }
    }
  },
  {
    id: 'KIB_C',
    code: 'KIB C',
    title: 'Kartu Inventaris Barang C (Gedung & Bangunan)',
    subtitle: 'Blanko pendataan bangunan gedung kelas, lab, & aula',
    description: 'Pencatatan gedung sekolah, ruang kelas, laboratorium, perpustakaan, rumah dinas, dan bangunan permanen.',
    color: 'border-amber-500 bg-amber-50/40 text-amber-800',
    badgeBg: 'bg-amber-600 text-white',
    columns: ['No', 'Kode Barang', 'Nama / Jenis Bangunan', 'Kondisi (B/KB/RB)', 'Konstruksi (Beton/Tingkat)', 'Luas Lantai (m²)', 'Lokasi Alamat', 'Dokumen Gedung (Tgl/No)', 'Status Tanah', 'Harga (Rp)', 'Keterangan'],
    columnWidths: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 36 },
      3: { halign: 'center', cellWidth: 20 },
      4: { cellWidth: 30 },
      5: { halign: 'right', cellWidth: 18 },
      6: { cellWidth: 32 },
      7: { cellWidth: 28 },
      8: { cellWidth: 22 },
      9: { halign: 'right', cellWidth: 24 },
      10: { cellWidth: 25 }
    }
  },
  {
    id: 'KIB_D',
    code: 'KIB D',
    title: 'Kartu Inventaris Barang D (Jalan, Irigasi & Jaringan)',
    subtitle: 'Blanko pendataan jalan setapak, pagar, saluran air, & jaringan listrik',
    description: 'Pencatatan jaringan pipa air, instalasi penerangan, pagar keliling, lapangan aspal, dan saluran drainase.',
    color: 'border-purple-500 bg-purple-50/40 text-purple-800',
    badgeBg: 'bg-purple-600 text-white',
    columns: ['No', 'Kode Barang', 'Jenis Jalan / Jaringan', 'Konstruksi', 'Panjang (m) / Luas (m²)', 'Lokasi', 'Dokumen Kepemilikan', 'Status Tanah', 'Kondisi (B/RR/RB)', 'Harga (Rp)', 'Keterangan'],
    columnWidths: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 36 },
      3: { cellWidth: 28 },
      4: { halign: 'right', cellWidth: 24 },
      5: { cellWidth: 32 },
      6: { cellWidth: 28 },
      7: { cellWidth: 22 },
      8: { halign: 'center', cellWidth: 20 },
      9: { halign: 'right', cellWidth: 24 },
      10: { cellWidth: 24 }
    }
  },
  {
    id: 'KIB_E',
    code: 'KIB E',
    title: 'Kartu Inventaris Barang E (Aset Tetap Lainnya)',
    subtitle: 'Blanko pendataan buku perpustakaan, alat peraga, & kesenian',
    description: 'Pencatatan buku perpustakaan, karya seni, barang budaya, alat musik daerah, dan alat peraga praktik.',
    color: 'border-rose-500 bg-rose-50/40 text-rose-800',
    badgeBg: 'bg-rose-600 text-white',
    columns: ['No', 'Kode Barang', 'Nama / Jenis Barang', 'Judul / Pencipta / Spesifikasi', 'Asal Usul', 'Thn Terbit/Buat', 'Jumlah (Unit)', 'Kondisi (B/RR/RB)', 'Harga (Rp)', 'Keterangan'],
    columnWidths: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 24 },
      2: { cellWidth: 36 },
      3: { cellWidth: 42 },
      4: { cellWidth: 24 },
      5: { halign: 'center', cellWidth: 18 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', cellWidth: 20 },
      8: { halign: 'right', cellWidth: 24 },
      9: { cellWidth: 28 }
    }
  },
  {
    id: 'KIB_F',
    code: 'KIB F',
    title: 'Kartu Inventaris Barang F (Konstruksi Dalam Pengerjaan)',
    subtitle: 'Blanko pendataan fisik bangunan / aset yang masih tahap pengerjaan',
    description: 'Pencatatan proyek fisik sarpras yang sedang berjalan (renovasi gedung, pembuatan pagar, atau instalasi).',
    color: 'border-indigo-500 bg-indigo-50/40 text-indigo-800',
    badgeBg: 'bg-indigo-600 text-white',
    columns: ['No', 'Nama / Jenis Bangunan Aset', 'Bangunan (Bertingkat/Beton)', 'Luas (m²)', 'Lokasi', 'Tgl Mulai', 'Nilai Kontrak (Rp)', 'Sumber Dana', 'Fisik (%)', 'Keterangan'],
    columnWidths: {
      0: { halign: 'center', cellWidth: 8 },
      1: { cellWidth: 42 },
      2: { cellWidth: 32 },
      3: { halign: 'right', cellWidth: 18 },
      4: { cellWidth: 34 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'right', cellWidth: 26 },
      7: { cellWidth: 24 },
      8: { halign: 'center', cellWidth: 16 },
      9: { cellWidth: 30 }
    }
  }
];

export default function BlankoKibDoc({ pengaturan }: Props) {
  const [selectedKib, setSelectedKib] = useState<KibType>('KIB_A');
  const [rowCount, setRowCount] = useState<number>(20);
  const [catatanLokasi, setCatatanLokasi] = useState<string>('Konawe');

  const currentConfig = KIB_CONFIGS.find(x => x.id === selectedKib) || KIB_CONFIGS[0];

  // Helper: Draw Header & Identity on PDF
  const drawPageHeader = (doc: jsPDF, kibMeta: KibMeta) => {
    // Kop Surat
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', 148, 11, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 148, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text((pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE').toUpperCase(), 148, 20, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pengaturan.alamat || 'Jl. Poros Amonggedo - Meluhu'} | NPSN: ${pengaturan.npsn || '40404643'}`, 148, 24.5, { align: 'center' });
    doc.setLineWidth(0.6);
    doc.line(14, 27, 283, 27);

    // Title
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`BLANKO FORMULIR ${kibMeta.title.toUpperCase()}`, 148, 33, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Format Standar Permendagri No. 47/2021 & SIMDA BMD • Kode Formulir: ${kibMeta.code}`, 148, 37, { align: 'center' });

    // Metadata Sekolah
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('PROVINSI', 14, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(': SULAWESI TENGGARA', 42, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('KABUPATEN/KOTA', 14, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(': KONAWE', 42, 46);

    doc.setFont('helvetica', 'bold');
    doc.text('UNIT KERJA', 185, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE'}`, 215, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('TAHUN ANGGARAN', 185, 46);
    doc.setFont('helvetica', 'normal');
    doc.text(`: ${new Date().getFullYear()}`, 215, 46);
  };

  // Helper: Draw Legal Signatures
  const drawSignatures = (doc: jsPDF, finalY: number, todayStr: string) => {
    // If table leaves less than 35mm, add new page for signature
    let sigY = finalY + 8;
    if (sigY > 165) {
      doc.addPage('a4', 'landscape');
      sigY = 25;
    }

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');

    // Kolom Kiri: Mengetahui Kepala Sekolah
    doc.text('Mengetahui,', 25, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Kepala Sekolah', 25, sigY + 4);
    doc.text(pengaturan.kepalaSekolah || 'Hapri, S.Pd., M.Pd', 25, sigY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, 25, sigY + 24);

    // Kolom Tengah: Pengurus Barang Sekolah
    doc.text('Mengetahui,', 125, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Pengurus Barang Sekolah', 125, sigY + 4);
    doc.text(pengaturan.namaPetugasSarpras || 'Nursamsi Muslim Widuri, S.Pd.', 125, sigY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, 125, sigY + 24);

    // Kolom Kanan: Petugas Pendata / Wakasek Sarpras
    doc.text(`${catatanLokasi}, ${todayStr}`, 215, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Wakasek Sarana Prasarana / Pendata', 215, sigY + 4);
    doc.text('( ........................................................... )', 215, sigY + 20);
    doc.setFont('helvetica', 'normal');
    doc.text('NIP. .....................................................', 215, sigY + 24);
  };

  // 1. PDF Generator for Single Blanko KIB
  const generateSinglePDF = (kibMeta: KibMeta, rows: number) => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    drawPageHeader(doc, kibMeta);

    // Generate Blank Rows
    const tableBody: (string | number)[][] = [];
    for (let i = 1; i <= rows; i++) {
      const rowData: string[] = [String(i)];
      for (let c = 1; c < kibMeta.columns.length; c++) {
        rowData.push('');
      }
      tableBody.push(rowData);
    }

    autoTable(doc, {
      startY: 49,
      head: [kibMeta.columns],
      body: tableBody,
      styles: { 
        fontSize: 6.5, 
        cellPadding: 2.5, 
        minCellHeight: 7.5, // Ruang lega untuk dicatat manual dengan pulpen
        valign: 'middle',
        lineColor: [180, 180, 180],
        lineWidth: 0.2
      },
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255], 
        fontStyle: 'bold', 
        halign: 'center',
        valign: 'middle'
      },
      columnStyles: (kibMeta.columnWidths as any) || { 0: { halign: 'center', cellWidth: 8 } }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    drawSignatures(doc, finalY, todayStr);

    doc.save(`Blanko_Kosong_${kibMeta.code.replace(/\s+/g, '_')}_${pengaturan.namaSekolah.replace(/\s+/g, '_')}.pdf`);
  };

  // 2. PDF Generator for ALL KIB A-F Bundle (Paket Lengkap Sekaligus)
  const generateAllKibBundlePDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    KIB_CONFIGS.forEach((kibMeta, index) => {
      if (index > 0) {
        doc.addPage('a4', 'landscape');
      }

      drawPageHeader(doc, kibMeta);

      const tableBody: (string | number)[][] = [];
      for (let i = 1; i <= rowCount; i++) {
        const rowData: string[] = [String(i)];
        for (let c = 1; c < kibMeta.columns.length; c++) {
          rowData.push('');
        }
        tableBody.push(rowData);
      }

      autoTable(doc, {
        startY: 49,
        head: [kibMeta.columns],
        body: tableBody,
        styles: { 
          fontSize: 6.5, 
          cellPadding: 2.5, 
          minCellHeight: 7.5,
          valign: 'middle',
          lineColor: [180, 180, 180],
          lineWidth: 0.2
        },
        headStyles: { 
          fillColor: [30, 41, 59], 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: (kibMeta.columnWidths as any) || { 0: { halign: 'center', cellWidth: 8 } }
      });

      const finalY = (doc as any).lastAutoTable.finalY;
      drawSignatures(doc, finalY, todayStr);
    });

    doc.save(`Paket_Lengkap_Blanko_KIB_A_sampai_F_${pengaturan.namaSekolah.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Control */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-2xl border border-indigo-500/20">
            <PrinterCheck size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">Cetak Blanko Kosong KIB A - KIB F</h2>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">
                Standar BMD Permendagri 47/2021
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Format formulir kosong siap cetak untuk pendataan dan verifikasi fisik barang di lapangan sebelum dientri ke aplikasi.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => generateSinglePDF(currentConfig, rowCount)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Cetak {currentConfig.code} (PDF)</span>
          </button>

          <button
            onClick={generateAllKibBundlePDF}
            className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <FileDown size={16} />
            <span>Cetak Semua KIB A-F Sekaligus</span>
          </button>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Sliders size={16} className="text-indigo-600" />
          <span>Pengaturan Cetak Formulir:</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Jumlah Baris Kosong:</span>
            <select
              value={rowCount}
              onChange={e => setRowCount(Number(e.target.value))}
              className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={10}>10 Baris Barcode / Barang</option>
              <option value={15}>15 Baris Barcode / Barang</option>
              <option value={20}>20 Baris Barcode / Barang</option>
              <option value={25}>25 Baris Barcode / Barang</option>
              <option value={30}>30 Baris Barcode / Barang</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Kota Tempat TTD:</span>
            <input
              type="text"
              value={catatanLokasi}
              onChange={e => setCatatanLokasi(e.target.value)}
              placeholder="e.g. Konawe"
              className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-slate-800 w-32 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* KIB Selector Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {KIB_CONFIGS.map(item => {
          const isSelected = item.id === selectedKib;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedKib(item.id)}
              className={`p-3.5 rounded-2xl border text-left transition relative cursor-pointer ${
                isSelected 
                  ? `${item.color} ring-2 ring-indigo-500/30 shadow-md font-bold` 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg ${item.badgeBg}`}>
                  {item.code}
                </span>
                {isSelected && <CheckCircle2 size={16} className="text-indigo-600" />}
              </div>
              <p className="text-xs font-black line-clamp-1 mt-1">{item.title.split('(')[1]?.replace(')', '') || item.code}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Live Preview Paper Box */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 md:p-8 space-y-6 overflow-x-auto">
        {/* Kop Surat Preview */}
        <div className="border-b-2 border-slate-800 pb-4 text-center space-y-0.5">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">PEMERINTAH PROVINSI SULAWESI TENGGARA</p>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">DINAS PENDIDIKAN DAN KEBUDAYAAN</p>
          <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">{pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE'}</h3>
          <p className="text-[10px] text-slate-500">{pengaturan.alamat || 'Jl. Poros Amonggedo - Meluhu'} | NPSN: {pengaturan.npsn || '40404643'}</p>
        </div>

        {/* Title Header */}
        <div className="text-center space-y-0.5">
          <h4 className="text-sm font-black text-slate-800 uppercase tracking-wide">
            BLANKO FORMULIR {currentConfig.title.toUpperCase()}
          </h4>
          <p className="text-[10px] font-mono text-slate-400">Kode Formulir: {currentConfig.code} • PENDATAAN FISIK SARPRAS SEKOLAH</p>
        </div>

        {/* Identitas Header */}
        <div className="flex justify-between text-xs text-slate-700 font-semibold px-1">
          <div>
            <p><span className="w-24 inline-block text-slate-400">PROVINSI</span>: SULAWESI TENGGARA</p>
            <p><span className="w-24 inline-block text-slate-400">KABUPATEN/KOTA</span>: KONAWE</p>
          </div>
          <div>
            <p><span className="w-28 inline-block text-slate-400">UNIT KERJA</span>: {pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE'}</p>
            <p><span className="w-28 inline-block text-slate-400">TAHUN ANGGARAN</span>: {new Date().getFullYear()}</p>
          </div>
        </div>

        {/* Blanko Table Grid */}
        <div className="border border-slate-300 rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-800 text-white font-bold divide-x divide-slate-700">
                {currentConfig.columns.map((col, idx) => (
                  <th key={idx} className="p-2 text-center align-middle whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {Array.from({ length: Math.min(rowCount, 8) }).map((_, rIdx) => (
                <tr key={rIdx} className="divide-x divide-slate-200 h-9 bg-white">
                  <td className="p-2 text-center font-bold text-slate-400 bg-slate-50">{rIdx + 1}</td>
                  {currentConfig.columns.slice(1).map((_, cIdx) => (
                    <td key={cIdx} className="p-2 text-slate-300 italic text-[9px] min-w-[60px]">
                      ...................
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rowCount > 8 && (
            <div className="bg-slate-50 p-2 text-center text-[11px] font-bold text-slate-500 border-t border-slate-200">
              + Menampilkan preview 8 dari total {rowCount} baris kosong pada lembar formulir PDF
            </div>
          )}
        </div>

        {/* Signature Preview */}
        <div className="grid grid-cols-3 text-center text-xs text-slate-700 pt-6">
          <div>
            <p className="font-medium">Mengetahui,</p>
            <p className="font-bold">Kepala Sekolah</p>
            <div className="h-16"></div>
            <p className="font-extrabold text-slate-900">{pengaturan.kepalaSekolah || 'Hapri, S.Pd., M.Pd'}</p>
            <p className="text-[10px] text-slate-500">NIP. {pengaturan.nipKepalaSekolah || '-'}</p>
          </div>

          <div>
            <p className="font-medium">Mengetahui,</p>
            <p className="font-bold">Pengurus Barang Sekolah</p>
            <div className="h-16"></div>
            <p className="font-extrabold text-slate-900">{pengaturan.namaPetugasSarpras || 'Nursamsi Muslim Widuri, S.Pd.'}</p>
            <p className="text-[10px] text-slate-500">NIP. {pengaturan.nipPetugasSarpras || '-'}</p>
          </div>

          <div>
            <p className="font-medium">{catatanLokasi}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold">Wakasek Sarana Prasarana / Pendata</p>
            <div className="h-16"></div>
            <p className="font-extrabold text-slate-900">( ........................................................... )</p>
            <p className="text-[10px] text-slate-500">NIP. .....................................................</p>
          </div>
        </div>
      </div>
    </div>
  );
}
