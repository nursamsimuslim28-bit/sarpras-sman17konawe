import React, { useState } from 'react';
import { 
  BapPemeriksaanItem, 
  SuratUsulanPenghapusanData, 
  BaPenghapusanItem 
} from '../../types/dokumenSarpras';
import { PengaturanSekolah } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { 
  exportBapPemeriksaanDocx, 
  exportSuratUsulanDocx, 
  exportBaPenghapusanDocx 
} from '../../utils/docxExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  ShieldAlert, 
  FileCheck2, 
  Send, 
  Flame, 
  Plus, 
  Trash2, 
  FileText, 
  Edit3,
  Eye,
  RotateCcw
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  initialBap: BapPemeriksaanItem[];
  initialSurat: SuratUsulanPenghapusanData;
  initialBaHapus: BaPenghapusanItem[];
}

export default function PenghapusanBmdDoc({ 
  pengaturan, 
  initialBap, 
  initialSurat, 
  initialBaHapus 
}: Props) {
  const [activeStep, setActiveStep] = useState<'bap' | 'usulan' | 'ba_pemusnahan'>('bap');

  const [bapList, setBapList] = useState<BapPemeriksaanItem[]>(() => {
    const saved = localStorage.getItem('dokumen_bap_pemeriksaan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialBap;
  });

  const [suratData, setSuratData] = useState<SuratUsulanPenghapusanData>(() => {
    const saved = localStorage.getItem('dokumen_surat_usulan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialSurat;
  });

  const [baHapusList, setBaHapusList] = useState<BaPenghapusanItem[]>(() => {
    const saved = localStorage.getItem('dokumen_ba_penghapusan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialBaHapus;
  });

  const [nomorBap, setNomorBap] = useState('005/BAP-BMD/SMA.17/2026');
  const [nomorBaMusnah, setNomorBaMusnah] = useState('045/BA-MUSNAH/SMA.17/2026');
  const [paperFormat, setPaperFormat] = useState<'F4' | 'A4'>('F4');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Modal tambah BAP item
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<BapPemeriksaanItem>>({
    kodeBarang: '2.05.01.05.001',
    namaBarang: '',
    tahunPerolehan: 2016,
    jumlah: 1,
    kondisi: 'RB',
    alasanKerusakan: 'Rusak Berat total & tidak efisien diperbaiki',
    usulanTindakLanjut: 'Diusulkan Pemusnahan / Penghapusan dari BMD'
  });

  const saveBap = (data: BapPemeriksaanItem[]) => {
    setBapList(data);
    localStorage.setItem('dokumen_bap_pemeriksaan', JSON.stringify(data));
  };

  const saveSurat = (data: SuratUsulanPenghapusanData) => {
    setSuratData(data);
    localStorage.setItem('dokumen_surat_usulan', JSON.stringify(data));
  };

  const saveBaHapus = (data: BaPenghapusanItem[]) => {
    setBaHapusList(data);
    localStorage.setItem('dokumen_ba_penghapusan', JSON.stringify(data));
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan Dokumen Penghapusan BMD ke format bawaan?')) {
      saveBap(initialBap);
      saveSurat(initialSurat);
      saveBaHapus(initialBaHapus);
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.namaBarang) return;

    const bapItem: BapPemeriksaanItem = {
      id: 'bap-' + Date.now(),
      kodeBarang: newItem.kodeBarang || '2.05.01.05.001',
      namaBarang: newItem.namaBarang,
      tahunPerolehan: Number(newItem.tahunPerolehan) || 2016,
      jumlah: Number(newItem.jumlah) || 1,
      kondisi: 'RB',
      alasanKerusakan: newItem.alasanKerusakan || 'Rusak Berat total & tidak ekonomis diperbaiki',
      usulanTindakLanjut: newItem.usulanTindakLanjut || 'Diusulkan Pemusnahan Fisik'
    };

    const baHapusItem: BaPenghapusanItem = {
      id: 'bah-' + Date.now(),
      kodeBarang: bapItem.kodeBarang,
      namaBarang: bapItem.namaBarang,
      jumlah: bapItem.jumlah,
      kondisi: 'RB',
      caraPenghapusan: 'Pemusnahan Fisik (Dibakar/Dihancurkan)'
    };

    saveBap([...bapList, bapItem]);
    saveBaHapus([...baHapusList, baHapusItem]);

    setIsAddOpen(false);
    setNewItem({
      kodeBarang: '2.05.01.05.001',
      namaBarang: '',
      tahunPerolehan: 2016,
      jumlah: 1,
      kondisi: 'RB',
      alasanKerusakan: 'Rusak Berat total & tidak efisien diperbaiki',
      usulanTindakLanjut: 'Diusulkan Pemusnahan / Penghapusan dari BMD'
    });
  };

  const handleDeleteItem = (id: string) => {
    saveBap(bapList.filter(i => i.id !== id));
    saveBaHapus(baHapusList.filter(i => i.id !== id));
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      if (activeStep === 'bap') {
        await exportBapPemeriksaanDocx(pengaturan, bapList, nomorBap);
      } else if (activeStep === 'usulan') {
        await exportSuratUsulanDocx(pengaturan, suratData, bapList);
      } else {
        await exportBaPenghapusanDocx(pengaturan, baHapusList, nomorBaMusnah);
      }
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

    let currentY = 38;

    if (activeStep === 'bap') {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('BERITA ACARA PEMERIKSAAN FISIK BARANG MILIK DAERAH (BMD)', centerX, currentY, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Nomor: ${nomorBap}`, centerX, currentY + 5, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const introText = 'Pada hari ini telah dilakukan pemeriksaan fisik menyeluruh terhadap Barang Milik Daerah (BMD) kondisi Rusak Berat yang sudah tidak efisien secara teknis maupun ekonomis untuk diperbaiki:';
      doc.text(doc.splitTextToSize(introText, pageWidth - (marginX * 2)), marginX, currentY + 12);

      const tableRows = bapList.map((item, idx) => [
        idx + 1,
        item.kodeBarang,
        item.namaBarang,
        item.tahunPerolehan,
        item.jumlah,
        'RB',
        item.alasanKerusakan,
        item.usulanTindakLanjut
      ]);

      autoTable(doc, {
        startY: currentY + 19,
        head: [[
          'No',
          'Kode Barang',
          'Nama Barang',
          'Tahun',
          'Jml',
          'Kondisi',
          'Alasan Kerusakan',
          'Usulan Tindak Lanjut'
        ]],
        body: tableRows,
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
          1: { cellWidth: 26 },
          2: { cellWidth: 42 },
          3: { cellWidth: 12, halign: 'center' },
          4: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: 38 },
          7: { cellWidth: isF4 ? 38 : 32 }
        }
      });
    } else if (activeStep === 'usulan') {
      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Konawe, ${suratData.tanggalSurat || '2026'}`, pageWidth - marginX - 45, currentY);

      doc.text(`Nomor    : ${suratData.nomorSurat}`, marginX, currentY);
      doc.text(`Lampiran : ${suratData.lampiran}`, marginX, currentY + 5);
      doc.text(`Perihal    : ${suratData.perihal}`, marginX, currentY + 10);

      currentY += 20;
      doc.text('Kepada Yth.', marginX, currentY);
      doc.setFont('times', 'bold');
      doc.text(suratData.tujuanSurat, marginX, currentY + 5);
      doc.setFont('times', 'normal');
      doc.text('di -', marginX, currentY + 10);
      doc.text(`    ${suratData.kotaTujuan}`, marginX, currentY + 15);

      currentY += 25;
      const body1 = `Dengan hormat, sehubungan dengan hasil pemeriksaan berkala kondisi Barang Milik Daerah (BMD) pada satuan pendidikan ${pengaturan.namaSekolah}, dengan ini kami sampaikan usulan penghapusan dan pemusnahan BMD dalam kondisi Rusak Berat (RB) sebanyak ${bapList.reduce((s, i) => s + i.jumlah, 0)} unit barang sebagaimana rincian Berita Acara Pemeriksaan terlampir.`;
      doc.text(doc.splitTextToSize(body1, pageWidth - (marginX * 2)), marginX, currentY);

      currentY += 20;
      const body2 = suratData.catatanTambahan || 'Barang-barang yang diusulkan telah melalui verifikasi fisik oleh Tim Pemeriksa Sekolah dan dinyatakan rusak berat serta tidak ekonomis lagi untuk dipelihara.';
      doc.text(doc.splitTextToSize(body2, pageWidth - (marginX * 2)), marginX, currentY);

      currentY += 15;
      const closing = 'Demikian surat permohonan ini kami sampaikan, atas perhatian dan persetujuan Bapak Kepala Dinas diucapkan terima kasih.';
      doc.text(doc.splitTextToSize(closing, pageWidth - (marginX * 2)), marginX, currentY);
    } else {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('BERITA ACARA PEMUSNAHAN / PENGHAPUSAN BMD', centerX, currentY, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Nomor: ${nomorBaMusnah}`, centerX, currentY + 5, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      const introText = 'Berdasarkan Surat Keputusan dan Persetujuan Penghapusan BMD, telah dilaksanakan tindakan pemusnahan/penghapusan fisik barang milik daerah sebagai berikut:';
      doc.text(doc.splitTextToSize(introText, pageWidth - (marginX * 2)), marginX, currentY + 12);

      const tableRows = baHapusList.map((item, idx) => [
        idx + 1,
        item.kodeBarang,
        item.namaBarang,
        item.jumlah,
        'RB',
        item.caraPenghapusan
      ]);

      autoTable(doc, {
        startY: currentY + 19,
        head: [[
          'No',
          'Kode Barang',
          'Nama Barang / Jenis BMD',
          'Jumlah',
          'Kondisi',
          'Metode Eksekusi Penghapusan'
        ]],
        body: tableRows,
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
          1: { cellWidth: 32 },
          2: { cellWidth: 65 },
          3: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          5: { cellWidth: isF4 ? 50 : 44 }
        }
      });
    }

    const lastTableY = (doc as any).lastAutoTable?.finalY;
    let signY = lastTableY ? lastTableY + 10 : currentY + 30;

    if (signY > pageHeight - 50) {
      doc.addPage();
      drawBorders();
      signY = 25;
    }

    const colLeft = marginX + 10;
    const colRight = pageWidth - marginX - 60;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Mengetahui,', colLeft, signY);
    doc.text('Kepala Sekolah', colLeft, signY + 4);

    doc.text('Konawe, 2026', colRight, signY);
    doc.text(activeStep === 'usulan' ? 'Pengurus Barang / Sarpras' : 'Tim Pemeriksa / Saksi', colRight, signY + 4);

    const signNameY = signY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.', colLeft, signNameY);
    doc.text(pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.', colRight, signNameY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, colLeft, signNameY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, colRight, signNameY + 4);

    doc.save(`Penghapusan_BMD_${activeStep}_${paperFormat}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="text-indigo-600" size={20} />
              Dokumen Penghapusan BMD 3-Tahap (Permendagri 47/2021)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diedit langsung. Hasil download tersedia dalam format Microsoft Word (.docx) & PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Step Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveStep('bap')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeStep === 'bap' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <FileCheck2 size={13} />
              <span>1. BAP Fisik</span>
            </button>
            <button
              onClick={() => setActiveStep('usulan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeStep === 'usulan' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Send size={13} />
              <span>2. Surat Usulan</span>
            </button>
            <button
              onClick={() => setActiveStep('ba_pemusnahan')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeStep === 'ba_pemusnahan' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Flame size={13} />
              <span>3. BA Pemusnahan</span>
            </button>
          </div>

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
            <span>{isEditMode ? 'Lihat Pratinjau' : 'Edit Data Langsung'}</span>
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

      {/* Edit Mode Inputs */}
      {isEditMode && (
        <div className="bg-amber-50/70 border border-amber-200 p-5 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide flex items-center gap-2">
              <Edit3 size={16} className="text-amber-600" />
              Pengaturan Dokumen Penghapusan
            </h3>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Tambah Barang Rusak Berat</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-amber-900 mb-1">Nomor BAP Pemeriksaan</label>
              <input
                type="text"
                value={nomorBap}
                onChange={e => setNomorBap(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-900 mb-1">Nomor Surat Usulan Kadis</label>
              <input
                type="text"
                value={suratData.nomorSurat}
                onChange={e => saveSurat({ ...suratData, nomorSurat: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-amber-900 mb-1">Nomor BA Pemusnahan/Hapus</label>
              <input
                type="text"
                value={nomorBaMusnah}
                onChange={e => setNomorBaMusnah(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Barang Rusak Berat */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <form onSubmit={handleAddItem} className="space-y-3">
              <h3 className="text-base font-bold text-slate-900 mb-2">Tambah Usulan Barang Rusak Berat (RB)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kode Barang</label>
                  <input
                    type="text"
                    value={newItem.kodeBarang}
                    onChange={e => setNewItem({ ...newItem, kodeBarang: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    placeholder="e.g. 2.05.01.05.001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Perolehan</label>
                  <input
                    type="number"
                    value={newItem.tahunPerolehan}
                    onChange={e => setNewItem({ ...newItem, tahunPerolehan: Number(e.target.value) || 2016 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Barang / Jenis BMD</label>
                <input
                  type="text"
                  value={newItem.namaBarang}
                  onChange={e => setNewItem({ ...newItem, namaBarang: e.target.value })}
                  placeholder="e.g. Komputer PC Desktop Wearnes"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.jumlah}
                    onChange={e => setNewItem({ ...newItem, jumlah: Number(e.target.value) || 1 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Kondisi</label>
                  <input
                    type="text"
                    value="RB (Rusak Berat)"
                    disabled
                    className="w-full text-xs p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-rose-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Alasan Kerusakan</label>
                <input
                  type="text"
                  value={newItem.alasanKerusakan}
                  onChange={e => setNewItem({ ...newItem, alasanKerusakan: e.target.value })}
                  placeholder="e.g. Motherboard mati total & tidak efisien diperbaiki"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Usulan Tindak Lanjut</label>
                <input
                  type="text"
                  value={newItem.usulanTindakLanjut}
                  onChange={e => setNewItem({ ...newItem, usulanTindakLanjut: e.target.value })}
                  placeholder="e.g. Diusulkan Pemusnahan Fisik"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-xl">Batal</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Simpan</button>
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

          {activeStep === 'bap' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  BERITA ACARA PEMERIKSAAN FISIK BARANG MILIK DAERAH (BMD)
                </h2>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide font-serif">
                  Nomor: {nomorBap}
                </h3>
              </div>

              <p className="text-xs font-serif text-slate-800 mb-4 leading-relaxed text-justify">
                Pada hari ini telah dilakukan pemeriksaan fisik menyeluruh terhadap Barang Milik Daerah (BMD) kondisi Rusak Berat yang sudah tidak efisien secara teknis maupun ekonomis untuk diperbaiki pada satuan pendidikan {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}:
              </p>

              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-2 text-left w-32">Kode Barang</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Nama Barang</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Tahun</th>
                      <th className="border border-slate-700 py-2 px-2 w-12">Jumlah</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Kondisi</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Alasan Kerusakan</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Usulan Tindak Lanjut</th>
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bapList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700 font-mono">{item.kodeBarang}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">{item.namaBarang}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.tahunPerolehan}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center font-bold text-indigo-700">{item.jumlah} Unit</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                            RB
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-600">{item.alasanKerusakan}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-600">{item.usulanTindakLanjut}</td>
                        <td className="border border-slate-200 py-1 px-1 text-center print:hidden">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition cursor-pointer"
                            title="Hapus baris"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeStep === 'usulan' && (
            <div className="font-serif text-xs space-y-4 px-4 text-slate-800">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p>Nomor&nbsp;&nbsp;&nbsp;&nbsp;: <span className="font-mono">{suratData.nomorSurat}</span></p>
                  <p>Lampiran : {suratData.lampiran}</p>
                  <p>Perihal&nbsp;&nbsp;&nbsp;&nbsp;: <span className="font-bold">{suratData.perihal}</span></p>
                </div>
                <div>
                  <p>Konawe, {suratData.tanggalSurat || '05 September 2026'}</p>
                </div>
              </div>

              <div className="pt-2">
                <p>Kepada Yth.</p>
                <p className="font-bold">{suratData.tujuanSurat}</p>
                <p>di -</p>
                <p className="pl-4">{suratData.kotaTujuan}</p>
              </div>

              <p className="leading-relaxed text-justify pt-2">
                Dengan hormat, sehubungan dengan hasil pemeriksaan berkala kondisi Barang Milik Daerah (BMD) pada satuan pendidikan {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}, dengan ini kami sampaikan usulan penghapusan dan pemusnahan BMD dalam kondisi Rusak Berat (RB) sebanyak {bapList.reduce((s, i) => s + i.jumlah, 0)} unit barang sebagaimana rincian Berita Acara Pemeriksaan terlampir.
              </p>

              <p className="leading-relaxed text-justify">
                {suratData.catatanTambahan || 'Barang-barang yang diusulkan telah melalui verifikasi fisik oleh Tim Pemeriksa Sekolah dan dinyatakan rusak berat serta tidak ekonomis lagi untuk dipelihara.'}
              </p>

              <p className="leading-relaxed text-justify">
                Demikian surat permohonan ini kami sampaikan, atas perhatian dan persetujuan Bapak Kepala Dinas diucapkan terima kasih.
              </p>
            </div>
          )}

          {activeStep === 'ba_pemusnahan' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  BERITA ACARA PEMUSNAHAN / PENGHAPUSAN BMD
                </h2>
                <h3 className="text-xs font-bold text-slate-800 tracking-wide font-serif">
                  Nomor: {nomorBaMusnah}
                </h3>
              </div>

              <p className="text-xs font-serif text-slate-800 mb-4 leading-relaxed text-justify">
                Berdasarkan Surat Keputusan dan Persetujuan Penghapusan BMD, telah dilaksanakan tindakan pemusnahan/penghapusan fisik barang milik daerah sebagai berikut:
              </p>

              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-2 text-left w-36">Kode Barang</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Nama Barang / Jenis BMD</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Jumlah</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Kondisi</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Metode Eksekusi Penghapusan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baHapusList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700 font-mono">{item.kodeBarang}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">{item.namaBarang}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center font-bold text-indigo-700">{item.jumlah} Unit</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-800">
                            RB
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700 font-medium">{item.caraPenghapusan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
              <p className="font-bold text-slate-800">{activeStep === 'usulan' ? 'Pengurus Barang / Sarpras' : 'Tim Pemeriksa / Saksi'}</p>
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
