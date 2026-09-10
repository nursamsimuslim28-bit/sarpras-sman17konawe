import React, { useState } from 'react';
import { 
  AlatPeragaItem, 
  BukuPerpustakaanItem, 
  JadwalLabSlot 
} from '../../types/dokumenSarpras';
import { PengaturanSekolah } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { 
  exportAlatPeragaDocx, 
  exportBukuPerpusDocx, 
  exportJadwalLabDocx 
} from '../../utils/docxExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  Boxes, 
  BookOpen, 
  FlaskConical, 
  Plus, 
  Trash2, 
  FileText, 
  Edit3,
  Eye,
  RotateCcw
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  initialAlatPeraga?: AlatPeragaItem[];
  initialAlat?: AlatPeragaItem[];
  initialBuku: BukuPerpustakaanItem[];
  initialJadwalLab: JadwalLabSlot[];
}

export default function SarprasKhususDoc({ 
  pengaturan, 
  initialAlatPeraga,
  initialAlat, 
  initialBuku, 
  initialJadwalLab 
}: Props) {
  const [activeTab, setActiveTab] = useState<'alat_peraga' | 'buku_perpus' | 'jadwal_lab'>('alat_peraga');

  const defaultAlat = initialAlatPeraga || initialAlat || [];

  const [alatList, setAlatList] = useState<AlatPeragaItem[]>(() => {
    const saved = localStorage.getItem('dokumen_alat_peraga');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return defaultAlat;
  });

  const [bukuList, setBukuList] = useState<BukuPerpustakaanItem[]>(() => {
    const saved = localStorage.getItem('dokumen_buku_perpus');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialBuku;
  });

  const [jadwalLabList, setJadwalLabList] = useState<JadwalLabSlot[]>(() => {
    const saved = localStorage.getItem('dokumen_jadwal_lab');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialJadwalLab;
  });

  const [paperFormat, setPaperFormat] = useState<'F4' | 'A4'>('F4');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Modals / forms
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newAlat, setNewAlat] = useState<Partial<AlatPeragaItem>>({
    namaAlat: '',
    mataPelajaran: 'IPA / Biologi',
    jumlah: 1,
    satuan: 'Set',
    kondisi: 'Baik',
    ruangPenyimpanan: 'Lab Biologi',
    lokasiPenyimpanan: 'Lab Biologi',
    keterangan: ''
  });

  const [newBuku, setNewBuku] = useState<Partial<BukuPerpustakaanItem>>({
    judulBuku: '',
    penulisPengarang: '',
    pengarang: '',
    penerbit: 'Kemendikbud',
    penerbitTahun: 'Kemendikbud, 2024',
    kategori: 'Buku Pelajaran',
    jumlahEksemplar: 1,
    kondisi: 'Baik'
  });

  const saveAlat = (data: AlatPeragaItem[]) => {
    setAlatList(data);
    localStorage.setItem('dokumen_alat_peraga', JSON.stringify(data));
  };

  const saveBuku = (data: BukuPerpustakaanItem[]) => {
    setBukuList(data);
    localStorage.setItem('dokumen_buku_perpus', JSON.stringify(data));
  };

  const saveJadwalLab = (data: JadwalLabSlot[]) => {
    setJadwalLabList(data);
    localStorage.setItem('dokumen_jadwal_lab', JSON.stringify(data));
  };

  const handleReset = () => {
    if (activeTab === 'alat_peraga') {
      if (window.confirm('Kembalikan Daftar Alat Peraga ke template standar?')) saveAlat(defaultAlat);
    } else if (activeTab === 'buku_perpus') {
      if (window.confirm('Kembalikan Koleksi Perpustakaan ke template standar?')) saveBuku(initialBuku);
    } else {
      if (window.confirm('Kembalikan Jadwal Lab ke template standar?')) saveJadwalLab(initialJadwalLab);
    }
  };

  const handleAddAlat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlat.namaAlat) return;
    const item: AlatPeragaItem = {
      id: 'ap-' + Date.now(),
      namaAlat: newAlat.namaAlat,
      mataPelajaran: newAlat.mataPelajaran || 'Umum',
      jumlah: Number(newAlat.jumlah) || 1,
      satuan: newAlat.satuan || 'Set',
      kondisi: (newAlat.kondisi as any) || 'Baik',
      ruangPenyimpanan: newAlat.ruangPenyimpanan || 'Lab IPA',
      lokasiPenyimpanan: newAlat.ruangPenyimpanan || 'Lab IPA',
      keterangan: newAlat.keterangan || '-'
    };
    saveAlat([...alatList, item]);
    setIsAddOpen(false);
    setNewAlat({ namaAlat: '', mataPelajaran: 'IPA / Biologi', jumlah: 1, satuan: 'Set', kondisi: 'Baik', ruangPenyimpanan: 'Lab Biologi', lokasiPenyimpanan: 'Lab Biologi', keterangan: '' });
  };

  const handleAddBuku = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuku.judulBuku) return;
    const item: BukuPerpustakaanItem = {
      id: 'bk-' + Date.now(),
      judulBuku: newBuku.judulBuku,
      penulisPengarang: newBuku.penulisPengarang || newBuku.pengarang || '-',
      pengarang: newBuku.penulisPengarang || newBuku.pengarang || '-',
      penerbit: newBuku.penerbit || 'Kemendikbud',
      penerbitTahun: newBuku.penerbitTahun || '2024',
      kategori: newBuku.kategori || 'Buku Pelajaran',
      jumlahEksemplar: Number(newBuku.jumlahEksemplar) || 1,
      kondisi: (newBuku.kondisi as any) || 'Baik',
      keterangan: '-'
    };
    saveBuku([...bukuList, item]);
    setIsAddOpen(false);
    setNewBuku({ judulBuku: '', penulisPengarang: '', pengarang: '', penerbit: 'Kemendikbud', penerbitTahun: 'Kemendikbud, 2024', kategori: 'Buku Pelajaran', jumlahEksemplar: 1, kondisi: 'Baik' });
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      if (activeTab === 'alat_peraga') {
        await exportAlatPeragaDocx(pengaturan, alatList);
      } else if (activeTab === 'buku_perpus') {
        await exportBukuPerpusDocx(pengaturan, bukuList);
      } else {
        await exportJadwalLabDocx(pengaturan, jadwalLabList);
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

    if (activeTab === 'alat_peraga') {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('DAFTAR INVENTARIS ALAT PERAGA & MEDIA PEMBELAJARAN', centerX, currentY, { align: 'center' });
      doc.setFontSize(10);
      doc.text('STANDAR SARANA & PRASARANA (PERMENDIKBUD NO. 24 TAHUN 2007)', centerX, currentY + 5, { align: 'center' });

      const tableRows = alatList.map((item, idx) => [
        idx + 1,
        item.namaAlat,
        item.mataPelajaran || 'Umum',
        `${item.jumlah} ${item.satuan || 'Set'}`,
        item.kondisi,
        item.ruangPenyimpanan || item.lokasiPenyimpanan || 'Lab IPA',
        item.keterangan || '-'
      ]);

      autoTable(doc, {
        startY: currentY + 10,
        head: [[
          'No',
          'Nama Alat Peraga / Media',
          'Mata Pelajaran',
          'Jumlah',
          'Kondisi',
          'Ruang Penyimpanan',
          'Keterangan'
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
          1: { cellWidth: 50 },
          2: { cellWidth: 32 },
          3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 28, halign: 'center' },
          6: { cellWidth: isF4 ? 33 : 28 }
        }
      });
    } else if (activeTab === 'buku_perpus') {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('DAFTAR INVENTARIS BUKU KOLEKSI PERPUSTAKAAN SEKOLAH', centerX, currentY, { align: 'center' });
      doc.setFontSize(10);
      doc.text('STANDAR NASIONAL PERPUSTAKAAN (SNP) SEKOLAH MENENGAH ATAS', centerX, currentY + 5, { align: 'center' });

      const tableRows = bukuList.map((item, idx) => [
        idx + 1,
        item.judulBuku,
        item.penulisPengarang || item.pengarang || '-',
        item.penerbitTahun || item.penerbit || '-',
        item.kategori,
        item.jumlahEksemplar,
        item.kondisi
      ]);

      autoTable(doc, {
        startY: currentY + 10,
        head: [[
          'No',
          'Judul Buku Koleksi',
          'Penulis / Pengarang',
          'Penerbit & Tahun',
          'Kategori / Jenis',
          'Eks',
          'Kondisi'
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
          1: { cellWidth: 55 },
          2: { cellWidth: 35 },
          3: { cellWidth: 35 },
          4: { cellWidth: 26, halign: 'center' },
          5: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
          6: { cellWidth: isF4 ? 16 : 14, halign: 'center' }
        }
      });
    } else {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('JADWAL PENGGUNAAN LABORATORIUM KOMPUTER & IPA', centerX, currentY, { align: 'center' });
      doc.setFontSize(10);
      doc.text('SEMESTER GANJIL TAHUN PELAJARAN 2026/2027', centerX, currentY + 5, { align: 'center' });

      const tableRows = jadwalLabList.map((slot) => [
        slot.hari,
        slot.jam1 || '-',
        slot.jam2 || '-',
        slot.jam3 || '-',
        slot.jam4 || '-',
        slot.jam5 || '-',
        slot.jam6 || '-'
      ]);

      autoTable(doc, {
        startY: currentY + 10,
        head: [[
          'Hari',
          'Jam 1\n(07.30-08.15)',
          'Jam 2\n(08.15-09.00)',
          'Jam 3\n(09.15-10.00)',
          'Jam 4\n(10.00-10.45)',
          'Jam 5\n(11.00-11.45)',
          'Jam 6\n(11.45-12.30)'
        ]],
        body: tableRows,
        styles: {
          font: 'times',
          fontSize: 7.5,
          cellPadding: 1.5,
          lineWidth: 0.15,
          lineColor: [140, 140, 140],
          valign: 'middle',
          halign: 'center'
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 28 },
          2: { cellWidth: 28 },
          3: { cellWidth: 28 },
          4: { cellWidth: 28 },
          5: { cellWidth: 28 },
          6: { cellWidth: isF4 ? 30 : 26 }
        }
      });
    }

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    let signY = finalY;

    if (finalY > pageHeight - 50) {
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
    doc.text('Pengelola / Tim Sarpras', colRight, signY + 4);

    const signNameY = signY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.', colLeft, signNameY);
    doc.text(pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.', colRight, signNameY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, colLeft, signNameY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, colRight, signNameY + 4);

    doc.save(`Sarpras_Khusus_${activeTab}_${paperFormat}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Boxes className="text-indigo-600" size={20} />
              Sarpras Khusus (Alat Peraga, Perpustakaan, & Lab)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diedit langsung. Hasil download tersedia dalam format Microsoft Word (.docx) & PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Sub Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveTab('alat_peraga')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'alat_peraga' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Boxes size={13} />
              <span>Alat Peraga</span>
            </button>
            <button
              onClick={() => setActiveTab('buku_perpus')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'buku_perpus' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <BookOpen size={13} />
              <span>Buku Perpus</span>
            </button>
            <button
              onClick={() => setActiveTab('jadwal_lab')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'jadwal_lab' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <FlaskConical size={13} />
              <span>Jadwal Lab</span>
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

      {/* Action Add Button Header */}
      {activeTab !== 'jadwal_lab' && (
        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <p className="text-xs text-slate-600">
            {activeTab === 'alat_peraga' && `Total ${alatList.length} jenis alat peraga dan media pembelajaran tercatat.`}
            {activeTab === 'buku_perpus' && `Total ${bukuList.length} judul buku dengan total ${bukuList.reduce((s, b) => s + b.jumlahEksemplar, 0)} eksemplar terdaftar.`}
          </p>
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>
              {activeTab === 'alat_peraga' && 'Tambah Alat Peraga'}
              {activeTab === 'buku_perpus' && 'Tambah Buku Koleksi'}
            </span>
          </button>
        </div>
      )}

      {/* Modal Add Items */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            {activeTab === 'alat_peraga' && (
              <form onSubmit={handleAddAlat} className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 mb-2">Tambah Alat Peraga Baru</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Alat Peraga</label>
                  <input
                    type="text"
                    value={newAlat.namaAlat}
                    onChange={e => setNewAlat({ ...newAlat, namaAlat: e.target.value })}
                    placeholder="e.g. Model Torso Manusia / Kit Listrik"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Mata Pelajaran</label>
                    <input
                      type="text"
                      value={newAlat.mataPelajaran}
                      onChange={e => setNewAlat({ ...newAlat, mataPelajaran: e.target.value })}
                      placeholder="e.g. Biologi / Fisika / Geografi"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={newAlat.jumlah}
                        onChange={e => setNewAlat({ ...newAlat, jumlah: Number(e.target.value) || 1 })}
                        className="w-2/3 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                      <input
                        type="text"
                        value={newAlat.satuan}
                        onChange={e => setNewAlat({ ...newAlat, satuan: e.target.value })}
                        placeholder="Set"
                        className="w-1/3 text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kondisi</label>
                    <select
                      value={newAlat.kondisi}
                      onChange={e => setNewAlat({ ...newAlat, kondisi: e.target.value as any })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Baik">Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Ruang Simpan</label>
                    <input
                      type="text"
                      value={newAlat.ruangPenyimpanan}
                      onChange={e => setNewAlat({ ...newAlat, ruangPenyimpanan: e.target.value, lokasiPenyimpanan: e.target.value })}
                      placeholder="e.g. Lab IPA / Lab Komputer"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-xl">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Simpan</button>
                </div>
              </form>
            )}

            {activeTab === 'buku_perpus' && (
              <form onSubmit={handleAddBuku} className="space-y-3">
                <h3 className="text-base font-bold text-slate-900 mb-2">Tambah Buku Perpustakaan Baru</h3>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Judul Buku</label>
                  <input
                    type="text"
                    value={newBuku.judulBuku}
                    onChange={e => setNewBuku({ ...newBuku, judulBuku: e.target.value })}
                    placeholder="e.g. Matematika SMA Kelas XII Kurikulum Merdeka"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Penulis / Pengarang</label>
                    <input
                      type="text"
                      value={newBuku.penulisPengarang}
                      onChange={e => setNewBuku({ ...newBuku, penulisPengarang: e.target.value, pengarang: e.target.value })}
                      placeholder="e.g. Susanto dkk."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Penerbit & Tahun</label>
                    <input
                      type="text"
                      value={newBuku.penerbitTahun}
                      onChange={e => setNewBuku({ ...newBuku, penerbitTahun: e.target.value, penerbit: e.target.value })}
                      placeholder="e.g. Kemendikbudristek, 2024"
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
                    <select
                      value={newBuku.kategori}
                      onChange={e => setNewBuku({ ...newBuku, kategori: e.target.value })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Buku Pelajaran">Buku Pelajaran</option>
                      <option value="Referensi/Ensiklopedia">Referensi</option>
                      <option value="Fiksi">Fiksi / Novel</option>
                      <option value="Non-Fiksi">Non-Fiksi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Jumlah Eksemplar</label>
                    <input
                      type="number"
                      min="1"
                      value={newBuku.jumlahEksemplar}
                      onChange={e => setNewBuku({ ...newBuku, jumlahEksemplar: Number(e.target.value) || 1 })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Kondisi</label>
                    <select
                      value={newBuku.kondisi}
                      onChange={e => setNewBuku({ ...newBuku, kondisi: e.target.value as any })}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    >
                      <option value="Baik">Baik</option>
                      <option value="Rusak Ringan">Rusak Ringan</option>
                      <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button type="button" onClick={() => setIsAddOpen(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-xl">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Simpan</button>
                </div>
              </form>
            )}
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

          {activeTab === 'alat_peraga' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  DAFTAR INVENTARIS ALAT PERAGA & MEDIA PEMBELAJARAN
                </h2>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
                  STANDAR SARANA & PRASARANA (PERMENDIKBUD NO. 24 TAHUN 2007)
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Nama Alat Peraga / Media</th>
                      <th className="border border-slate-700 py-2 px-2 text-left w-36">Mata Pelajaran</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Jumlah</th>
                      <th className="border border-slate-700 py-2 px-2 w-24">Kondisi</th>
                      <th className="border border-slate-700 py-2 px-2 w-32">Ruang Simpan</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Keterangan</th>
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alatList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">{item.namaAlat}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{item.mataPelajaran || 'Umum'}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center font-bold text-indigo-700">{item.jumlah} {item.satuan || 'Set'}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.kondisi === 'Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.kondisi}
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.ruangPenyimpanan || item.lokasiPenyimpanan}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-600">{item.keterangan || '-'}</td>
                        <td className="border border-slate-200 py-1 px-1 text-center print:hidden">
                          <button
                            onClick={() => saveAlat(alatList.filter(a => a.id !== item.id))}
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

          {activeTab === 'buku_perpus' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  DAFTAR INVENTARIS BUKU KOLEKSI PERPUSTAKAAN SEKOLAH
                </h2>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
                  STANDAR NASIONAL PERPUSTAKAAN (SNP) SEKOLAH MENENGAH ATAS
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Judul Buku Koleksi</th>
                      <th className="border border-slate-700 py-2 px-2 text-left w-36">Penulis / Pengarang</th>
                      <th className="border border-slate-700 py-2 px-2 text-left w-36">Penerbit & Tahun</th>
                      <th className="border border-slate-700 py-2 px-2 w-32">Kategori</th>
                      <th className="border border-slate-700 py-2 px-2 w-16">Eks</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">Kondisi</th>
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bukuList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">{item.judulBuku}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{item.penulisPengarang || item.pengarang}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{item.penerbitTahun || item.penerbit}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.kategori}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center font-bold text-indigo-700">{item.jumlahEksemplar}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                            {item.kondisi}
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1 px-1 text-center print:hidden">
                          <button
                            onClick={() => saveBuku(bukuList.filter(b => b.id !== item.id))}
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

          {activeTab === 'jadwal_lab' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  JADWAL PENGGUNAAN LABORATORIUM KOMPUTER & IPA
                </h2>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
                  SEMESTER GANJIL TAHUN PELAJARAN 2026/2027
                </h3>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-2 w-20">Hari</th>
                      <th className="border border-slate-700 py-2 px-2">Jam 1 (07.30-08.15)</th>
                      <th className="border border-slate-700 py-2 px-2">Jam 2 (08.15-09.00)</th>
                      <th className="border border-slate-700 py-2 px-2">Jam 3 (09.15-10.00)</th>
                      <th className="border border-slate-700 py-2 px-2">Jam 4 (10.00-10.45)</th>
                      <th className="border border-slate-700 py-2 px-2">Jam 5 (11.00-11.45)</th>
                      <th className="border border-slate-700 py-2 px-2">Jam 6 (11.45-12.30)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jadwalLabList.map((slot, sIdx) => (
                      <tr key={slot.hari} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-2 px-2 text-center font-bold bg-slate-50 text-slate-800">{slot.hari}</td>
                        {(['jam1', 'jam2', 'jam3', 'jam4', 'jam5', 'jam6'] as const).map(jKey => (
                          <td key={jKey} className="border border-slate-200 py-1.5 px-2 text-center">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={slot[jKey]}
                                onChange={e => {
                                  const updated = [...jadwalLabList];
                                  updated[sIdx] = { ...updated[sIdx], [jKey]: e.target.value };
                                  saveJadwalLab(updated);
                                }}
                                className="w-full text-[10px] p-1 bg-amber-50/60 border border-amber-300 rounded text-center"
                              />
                            ) : (
                              <span className={slot[jKey] ? 'font-medium text-slate-900' : 'text-slate-400'}>
                                {slot[jKey] || '-'}
                              </span>
                            )}
                          </td>
                        ))}
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
              <p className="font-bold text-slate-800">Pengelola / Tim Sarpras</p>
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
