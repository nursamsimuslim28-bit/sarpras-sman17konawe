import React, { useState } from 'react';
import { LaporanBerkalaData } from '../../types/dokumenSarpras';
import { Aset, PengaturanSekolah } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { exportLaporanBerkalaDocx } from '../../utils/docxExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Printer,
  Edit3,
  Eye,
  RotateCcw
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  initialData: LaporanBerkalaData;
  asets: Aset[];
}

export default function LaporanBerkalaDoc({ pengaturan, initialData, asets }: Props) {
  const [laporan, setLaporan] = useState<LaporanBerkalaData>(() => {
    const saved = localStorage.getItem('dokumen_laporan_berkala_sarpras');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialData;
  });

  const [paperFormat, setPaperFormat] = useState<'F4' | 'A4'>('F4');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [newRealisasi, setNewRealisasi] = useState({ uraian: '', anggaranDiajukan: 0, realisasi: 0 });

  const saveToStorage = (updated: LaporanBerkalaData) => {
    setLaporan(updated);
    localStorage.setItem('dokumen_laporan_berkala_sarpras', JSON.stringify(updated));
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan Laporan Berkala ke format standar bawaan?')) {
      saveToStorage(initialData);
    }
  };

  // Hitung rekap riil kondisi dari aset yang terdaftar di aplikasi
  const computeRekapKondisi = () => {
    const kategoriMap: Record<string, { total: number; baik: number; rr: number; rb: number; satuan: string }> = {
      'Meja & Kursi Siswa': { total: 0, baik: 0, rr: 0, rb: 0, satuan: 'Set/Unit' },
      'Perangkat TIK & Komputer': { total: 0, baik: 0, rr: 0, rb: 0, satuan: 'Unit' },
      'Media Pembelajaran & Lab': { total: 0, baik: 0, rr: 0, rb: 0, satuan: 'Set/Unit' },
      'Sarana Ruang Kelas & Guru': { total: 0, baik: 0, rr: 0, rb: 0, satuan: 'Unit' },
      'Fasilitas Penunjang / Sanitasi': { total: 0, baik: 0, rr: 0, rb: 0, satuan: 'Unit' }
    };

    asets.forEach(aset => {
      let cat = 'Sarana Ruang Kelas & Guru';
      const namaLower = aset.nama.toLowerCase();
      if (namaLower.includes('meja') || namaLower.includes('kursi')) {
        cat = 'Meja & Kursi Siswa';
      } else if (namaLower.includes('komputer') || namaLower.includes('laptop') || namaLower.includes('printer') || namaLower.includes('proyektor') || namaLower.includes('pc')) {
        cat = 'Perangkat TIK & Komputer';
      } else if (namaLower.includes('torso') || namaLower.includes('mikroskop') || namaLower.includes('kit') || namaLower.includes('globe') || namaLower.includes('alat')) {
        cat = 'Media Pembelajaran & Lab';
      } else if (namaLower.includes('toilet') || namaLower.includes('apar') || namaLower.includes('tandon') || namaLower.includes('pompa')) {
        cat = 'Fasilitas Penunjang / Sanitasi';
      }

      kategoriMap[cat].total += aset.jumlah;
      if (aset.kondisi === 'Baik') {
        kategoriMap[cat].baik += aset.jumlah;
      } else if (aset.kondisi === 'Rusak Ringan') {
        kategoriMap[cat].rr += aset.jumlah;
      } else {
        kategoriMap[cat].rb += aset.jumlah;
      }
    });

    return Object.entries(kategoriMap).map(([kategori, data], idx) => ({
      no: idx + 1,
      kategori,
      total: data.total || 0,
      baik: data.baik || 0,
      rr: data.rr || 0,
      rb: data.rb || 0,
      satuan: data.satuan,
      keterangan: data.rb > 0 ? `${data.rb} unit diusulkan hapus/servis` : 'Kondisi terpantau aman'
    }));
  };

  const rekapKondisi = computeRekapKondisi();

  const totalAnggaran = laporan.realisasiAnggaran.reduce((sum, i) => sum + i.anggaranDiajukan, 0);
  const totalRealisasi = laporan.realisasiAnggaran.reduce((sum, i) => sum + i.realisasi, 0);
  const totalSisa = totalAnggaran - totalRealisasi;

  const handleAddRealisasi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRealisasi.uraian.trim()) return;

    const item = {
      id: 'rel-' + Date.now(),
      uraian: newRealisasi.uraian.trim(),
      anggaranDiajukan: Number(newRealisasi.anggaranDiajukan) || 0,
      realisasi: Number(newRealisasi.realisasi) || 0
    };

    saveToStorage({
      ...laporan,
      realisasiAnggaran: [...laporan.realisasiAnggaran, item]
    });
    setNewRealisasi({ uraian: '', anggaranDiajukan: 0, realisasi: 0 });
  };

  const handleDeleteRealisasi = (id: string) => {
    saveToStorage({
      ...laporan,
      realisasiAnggaran: laporan.realisasiAnggaran.filter(i => i.id !== id)
    });
  };

  const formatRp = (val: number) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportLaporanBerkalaDocx(pengaturan, laporan, asets);
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor file DOCX');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportPDF = () => {
    const isF4 = paperFormat === 'F4';
    const paperDim: [number, number] = isF4 ? [215, 330] : [210, 297];
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: paperDim
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;
    const marginX = isF4 ? 14 : 12;

    const drawBorders = () => {
      doc.setLineWidth(0.7);
      doc.rect(6, 6, pageWidth - 12, pageHeight - 12);
      doc.setLineWidth(0.2);
      doc.rect(7.5, 7.5, pageWidth - 15, pageHeight - 15);
    };

    drawBorders();

    // Logos
    try {
      doc.addImage(SULTRA_LOGO_BASE64, 'PNG', marginX + 1, 10, 15, 15);
      const schoolLogo = (pengaturan.logoUrl && pengaturan.logoUrl.startsWith('data:image')) ? pengaturan.logoUrl : SCHOOL_LOGO_BASE64;
      doc.addImage(schoolLogo, 'PNG', pageWidth - marginX - 16, 10, 15, 15);
    } catch (e) {
      console.warn('Error drawing logos', e);
    }

    // Kop Surat
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', centerX, 14, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, 18.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text(pengaturan.namaSekolah.toUpperCase(), centerX, 24, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, centerX, 28, { align: 'center' });

    doc.setLineWidth(0.6);
    doc.line(marginX, 30.5, pageWidth - marginX, 30.5);
    doc.setLineWidth(0.2);
    doc.line(marginX, 31.5, pageWidth - marginX, 31.5);

    // Judul Dokumen
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('LAPORAN BERKALA EVALUASI SARANA DAN PRASARANA', centerX, 37, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`PERIODE: ${laporan.periodeLaporan.toUpperCase()} | TP: ${laporan.tahunPelajaran}`, centerX, 42, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.text('Format Resmi 5-Bagian Standar Dinas Pendidikan & Kebudayaan Prov. Sultra', centerX, 46.5, { align: 'center' });

    let currentY = 51;

    // I. Pendahuluan
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('I. Pendahuluan & Ringkasan Umum', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const splitRingkasan = doc.splitTextToSize(laporan.ringkasanKegiatan, pageWidth - (marginX * 2));
    doc.text(splitRingkasan, marginX, currentY);
    currentY += splitRingkasan.length * 4 + 4;

    // II. Rekap Kondisi Riil Sarpras
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('II. Rekapitulasi Kondisi Sarana dan Prasarana Saat Ini', marginX, currentY);

    const tableKondisiRows = rekapKondisi.map(item => [
      item.no,
      item.kategori,
      item.total,
      item.baik,
      item.rr,
      item.rb,
      item.satuan,
      item.keterangan
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [[
        'No',
        'Kelompok Sarpras',
        'Total',
        'Baik',
        'Rusak Ringan',
        'Rusak Berat',
        'Satuan',
        'Keterangan & Rekomendasi'
      ]],
      body: tableKondisiRows,
      styles: {
        font: 'times',
        fontSize: 7.5,
        cellPadding: 1.5,
        lineWidth: 0.15,
        lineColor: [140, 140, 140],
        valign: 'middle'
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 42 },
        2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 16, halign: 'center' },
        7: { cellWidth: isF4 ? 62 : 55, fontSize: 7 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // III. Realisasi Anggaran
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('III. Realisasi Penggunaan Anggaran Sarpras', marginX, currentY);

    const tableAnggaranRows = laporan.realisasiAnggaran.map((item, idx) => [
      idx + 1,
      item.uraian,
      formatRp(item.anggaranDiajukan),
      formatRp(item.realisasi),
      formatRp(item.anggaranDiajukan - item.realisasi)
    ]);

    const summaryAnggaran = [
      [
        { content: 'TOTAL KESELURUHAN', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right' as any, fillColor: [240, 240, 240] } },
        { content: formatRp(totalAnggaran), styles: { fontStyle: 'bold', halign: 'right' as any, fillColor: [240, 240, 240] } },
        { content: formatRp(totalRealisasi), styles: { fontStyle: 'bold', halign: 'right' as any, fillColor: [240, 240, 240] } },
        { content: formatRp(totalSisa), styles: { fontStyle: 'bold', halign: 'right' as any, fillColor: [240, 240, 240] } }
      ]
    ];

    autoTable(doc, {
      startY: currentY + 3,
      head: [[
        'No',
        'Uraian Alokasi Belanja',
        'Pagu Diajukan (Rp)',
        'Realisasi (Rp)',
        'Sisa / Selisih (Rp)'
      ]],
      body: [...tableAnggaranRows, ...summaryAnggaran] as any,
      styles: {
        font: 'times',
        fontSize: 7.5,
        cellPadding: 1.5,
        lineWidth: 0.15,
        lineColor: [140, 140, 140],
        valign: 'middle'
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: isF4 ? 80 : 70 },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 5;

    // IV. Kendala & V. Rencana Tindak Lanjut
    if (currentY > pageHeight - 65) {
      doc.addPage();
      drawBorders();
      currentY = 25;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('IV. Kendala & Masalah yang Dihadapi', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const splitKendala = doc.splitTextToSize(laporan.kendala, pageWidth - (marginX * 2));
    doc.text(splitKendala, marginX, currentY);
    currentY += splitKendala.length * 4 + 4;

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('V. Rencana Tindak Lanjut & Rekomendasi', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const splitRencana = doc.splitTextToSize(laporan.rencanaTindakLanjut, pageWidth - (marginX * 2));
    doc.text(splitRencana, marginX, currentY);
    currentY += splitRencana.length * 4 + 8;

    if (currentY > pageHeight - 45) {
      doc.addPage();
      drawBorders();
      currentY = 25;
    }

    // Signatures
    const colLeft = marginX + 10;
    const colRight = pageWidth - marginX - 60;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Mengetahui,', colLeft, currentY);
    doc.text('Kepala Sekolah', colLeft, currentY + 4);

    doc.text('Konawe, 2026', colRight, currentY);
    doc.text('Wakasek Sarana Prasarana', colRight, currentY + 4);

    const signNameY = currentY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.', colLeft, signNameY);
    doc.text(pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.', colRight, signNameY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, colLeft, signNameY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, colRight, signNameY + 4);

    doc.save(`Laporan_Berkala_Sarpras_${paperFormat}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-indigo-600" size={20} />
              Laporan Berkala Evaluasi Sarpras (5 Bagian Resmi)
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
              {laporan.periodeLaporan}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diedit langsung. Hasil download tersedia dalam format Microsoft Word (.docx) & PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Toggle Edit Mode */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              isEditMode 
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm' 
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300'
            }`}
          >
            {isEditMode ? <Eye size={14} /> : <Edit3 size={14} />}
            <span>{isEditMode ? 'Lihat Pratinjau' : 'Edit Laporan Langsung'}</span>
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Reset ke Template Bawaan"
          >
            <RotateCcw size={15} />
          </button>

          {/* Paper format */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setPaperFormat('F4')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                paperFormat === 'F4' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              F4
            </button>
            <button
              onClick={() => setPaperFormat('A4')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                paperFormat === 'A4' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              A4
            </button>
          </div>

          {/* Download DOCX */}
          <button
            onClick={handleExportDocx}
            disabled={isExportingDocx}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
          >
            <FileText size={15} />
            <span>{isExportingDocx ? 'Membuat DOCX...' : 'Download DOCX'}</span>
          </button>

          {/* Download PDF */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download size={15} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Edit Form Panel */}
      {isEditMode && (
        <div className="bg-amber-50/70 border border-amber-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Edit3 size={16} className="text-amber-700" />
              Pengeditan Teks & Narasi Laporan Berkala
            </h3>
            <span className="text-[11px] text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full font-medium">
              Otomatis Tersimpan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Periode Laporan</label>
              <input
                type="text"
                value={laporan.periodeLaporan}
                onChange={e => saveToStorage({ ...laporan, periodeLaporan: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
              <input
                type="text"
                value={laporan.tahunPelajaran}
                onChange={e => saveToStorage({ ...laporan, tahunPelajaran: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">I. Pendahuluan & Ringkasan Umum</label>
            <textarea
              rows={3}
              value={laporan.ringkasanKegiatan}
              onChange={e => saveToStorage({ ...laporan, ringkasanKegiatan: e.target.value })}
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">IV. Kendala & Masalah</label>
            <textarea
              rows={2}
              value={laporan.kendala}
              onChange={e => saveToStorage({ ...laporan, kendala: e.target.value })}
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">V. Rencana Tindak Lanjut</label>
            <textarea
              rows={2}
              value={laporan.rencanaTindakLanjut}
              onChange={e => saveToStorage({ ...laporan, rencanaTindakLanjut: e.target.value })}
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl leading-relaxed"
            />
          </div>

          {/* Form Realisasi Tambahan */}
          <div className="border-t border-amber-200/80 pt-4">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Tambah Item Realisasi Anggaran</h4>
            <form onSubmit={handleAddRealisasi} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                type="text"
                value={newRealisasi.uraian}
                onChange={e => setNewRealisasi({ ...newRealisasi, uraian: e.target.value })}
                placeholder="Uraian belanja..."
                className="sm:col-span-2 text-xs p-2 bg-white border border-slate-300 rounded-xl"
              />
              <input
                type="number"
                value={newRealisasi.anggaranDiajukan || ''}
                onChange={e => setNewRealisasi({ ...newRealisasi, anggaranDiajukan: Number(e.target.value) || 0 })}
                placeholder="Pagu Diajukan (Rp)"
                className="text-xs p-2 bg-white border border-slate-300 rounded-xl"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={newRealisasi.realisasi || ''}
                  onChange={e => setNewRealisasi({ ...newRealisasi, realisasi: Number(e.target.value) || 0 })}
                  placeholder="Realisasi (Rp)"
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
                />
                <button
                  type="submit"
                  className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                >
                  Tambah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Preview Document */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-lg overflow-x-auto">
        <div className="min-w-[860px] border-4 border-double border-slate-800 p-6 rounded-2xl bg-slate-50/40">
          {/* Kop Surat */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-5">
            <div className="w-14 h-14 flex items-center justify-center p-1 bg-white rounded-lg border border-slate-200">
              <img src={SULTRA_LOGO_BASE64} alt="Pemprov Sultra" className="w-full h-full object-contain" />
            </div>
            <div className="text-center font-serif flex-1 px-4">
              <p className="text-xs font-bold tracking-wider text-slate-800 uppercase">Pemerintah Provinsi Sulawesi Tenggara</p>
              <p className="text-[11px] font-bold text-slate-800 uppercase">Dinas Pendidikan dan Kebudayaan</p>
              <h2 className="text-base font-black text-slate-900 tracking-wide uppercase">{pengaturan.namaSekolah}</h2>
              <p className="text-[10px] text-slate-600 font-sans mt-0.5">
                NPSN: {pengaturan.npsn} | Alamat: {pengaturan.alamat}
              </p>
            </div>
            <div className="w-14 h-14 flex items-center justify-center p-1 bg-white rounded-lg border border-slate-200">
              <img src={pengaturan.logoUrl || SCHOOL_LOGO_BASE64} alt="Logo Sekolah" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Judul Dokumen */}
          <div className="text-center mb-6">
            <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
              LAPORAN BERKALA EVALUASI SARANA DAN PRASARANA
            </h2>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
              PERIODE: {laporan.periodeLaporan.toUpperCase()} | TP: {laporan.tahunPelajaran}
            </h3>
            <p className="text-xs text-slate-600 italic font-serif mt-0.5">
              Format Resmi 5-Bagian Standar Dinas Pendidikan & Kebudayaan Prov. Sultra
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-4 text-xs font-serif text-slate-800 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">I. Pendahuluan & Ringkasan Umum</h4>
              <p className="text-slate-700 text-justify">{laporan.ringkasanKegiatan}</p>
            </div>

            {/* II. Rekap Kondisi Riil */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                II. Rekapitulasi Kondisi Sarana dan Prasarana Saat Ini
              </h4>
              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-2">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Kelompok Sarpras</th>
                      <th className="border border-slate-700 py-2 px-2 w-14">Total</th>
                      <th className="border border-slate-700 py-2 px-2 w-14">Baik</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">Rusak Ringan</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">Rusak Berat</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Satuan</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Keterangan & Rekomendasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekapKondisi.map((item) => (
                      <tr key={item.no} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{item.no}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">{item.kategori}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center font-bold text-indigo-700">{item.total}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-emerald-700 font-bold">{item.baik}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-amber-700 font-bold">{item.rr}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-rose-700 font-bold">{item.rb}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.satuan}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-600">{item.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* III. Realisasi Anggaran */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                III. Realisasi Penggunaan Anggaran Sarpras
              </h4>
              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-2">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Uraian Alokasi Belanja</th>
                      <th className="border border-slate-700 py-2 px-2 text-right w-32">Pagu Diajukan</th>
                      <th className="border border-slate-700 py-2 px-2 text-right w-32">Realisasi</th>
                      <th className="border border-slate-700 py-2 px-2 text-right w-32">Sisa / Selisih</th>
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {laporan.realisasiAnggaran.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">{item.uraian}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-right font-mono">{formatRp(item.anggaranDiajukan)}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-right font-mono text-emerald-700 font-bold">{formatRp(item.realisasi)}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-right font-mono text-slate-600">
                          {formatRp(item.anggaranDiajukan - item.realisasi)}
                        </td>
                        <td className="border border-slate-200 py-1 px-1 text-center print:hidden">
                          <button
                            onClick={() => handleDeleteRealisasi(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Hapus baris"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold font-sans">
                      <td colSpan={2} className="border border-slate-300 py-2 px-3 text-right text-slate-800">
                        TOTAL KESELURUHAN REALISASI:
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right text-slate-800 font-serif font-bold">
                        {formatRp(totalAnggaran)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right text-emerald-700 font-serif font-bold">
                        {formatRp(totalRealisasi)}
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right text-slate-600 font-serif">
                        {formatRp(totalSisa)}
                      </td>
                      <td className="border border-slate-300 py-2 px-1 print:hidden"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* IV. Kendala */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">IV. Kendala & Masalah yang Dihadapi</h4>
              <p className="text-slate-700 text-justify">{laporan.kendala}</p>
            </div>

            {/* V. Rencana Tindak Lanjut */}
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">V. Rencana Tindak Lanjut & Rekomendasi</h4>
              <p className="text-slate-700 text-justify">{laporan.rencanaTindakLanjut}</p>
            </div>
          </div>

          {/* Legalitas Tanda Tangan */}
          <div className="flex justify-between items-start mt-8 pt-4 font-serif text-xs px-8">
            <div className="text-left space-y-1">
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-bold text-slate-800">Kepala {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-slate-900 text-sm tracking-wide">{pengaturan.kepalaSekolah}</p>
              <p className="text-slate-600 text-[10px]">NIP. {pengaturan.nipKepalaSekolah || '....................................................'}</p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-slate-600">Amonggedo, 2026</p>
              <p className="font-bold text-slate-800">Wakasek Sarana dan Prasarana</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-slate-900 text-sm tracking-wide">{pengaturan.namaPetugasSarpras}</p>
              <p className="text-slate-600 text-[10px]">NIP. {pengaturan.nipPetugasSarpras || '....................................................'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
