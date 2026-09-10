import React, { useState } from 'react';
import { ProgramKerjaData, ProgramKerjaItem } from '../../types/dokumenSarpras';
import { PengaturanSekolah } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { exportProgramKerjaDocx } from '../../utils/docxExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  Calendar, 
  Check, 
  FileText, 
  Plus, 
  Trash2, 
  RotateCcw,
  Printer,
  Edit3,
  Eye,
  FileCode,
  Save,
  CheckCircle2
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  initialData: ProgramKerjaData;
}

const BULAN_LABELS = ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

export default function ProgramKerjaDoc({ pengaturan, initialData }: Props) {
  const [progja, setProgja] = useState<ProgramKerjaData>(() => {
    const saved = localStorage.getItem('dokumen_progja_sarpras');
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
  const [newKegiatan, setNewKegiatan] = useState('');
  const [newDasarHukum, setNewDasarHukum] = useState('');
  const [newTujuan, setNewTujuan] = useState('');
  const [newSasaran, setNewSasaran] = useState('');
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const saveToStorage = (updated: ProgramKerjaData) => {
    setProgja(updated);
    localStorage.setItem('dokumen_progja_sarpras', JSON.stringify(updated));
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan Program Kerja ke template standar baku?')) {
      saveToStorage(initialData);
    }
  };

  const toggleMonth = (itemId: string, monthIdx: number) => {
    const updated = {
      ...progja,
      matriks: progja.matriks.map(item => {
        if (item.id === itemId) {
          const newJadwal = [...item.jadwalBulan];
          newJadwal[monthIdx] = !newJadwal[monthIdx];
          return { ...item, jadwalBulan: newJadwal };
        }
        return item;
      })
    };
    saveToStorage(updated);
  };

  const handleAddKegiatan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKegiatan.trim()) return;

    const newItem: ProgramKerjaItem = {
      id: 'pk-' + Date.now(),
      no: progja.matriks.length + 1,
      kegiatan: newKegiatan.trim(),
      jadwalBulan: Array(12).fill(false)
    };

    const updated = {
      ...progja,
      matriks: [...progja.matriks, newItem]
    };
    saveToStorage(updated);
    setNewKegiatan('');
  };

  const handleUpdateKegiatanText = (id: string, text: string) => {
    const updated = {
      ...progja,
      matriks: progja.matriks.map(i => i.id === id ? { ...i, kegiatan: text } : i)
    };
    saveToStorage(updated);
  };

  const handleDeleteKegiatan = (id: string) => {
    const filtered = progja.matriks.filter(i => i.id !== id).map((item, idx) => ({
      ...item,
      no: idx + 1
    }));
    saveToStorage({ ...progja, matriks: filtered });
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportProgramKerjaDocx(pengaturan, progja);
    } catch (error) {
      console.error('Export DOCX error:', error);
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

    // Title
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('PROGRAM KERJA TAHUNAN', centerX, 37, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text('WAKIL KEPALA SEKOLAH BIDANG SARANA DAN PRASARANA', centerX, 42, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(`Tahun Pelajaran ${progja.tahunPelajaran}`, centerX, 46.5, { align: 'center' });

    let currentY = 52;

    // Bagian A. Latar Belakang
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('A. Latar Belakang', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const splitLB = doc.splitTextToSize(progja.latarBelakang, pageWidth - (marginX * 2));
    doc.text(splitLB, marginX, currentY);
    currentY += splitLB.length * 4 + 2;

    // Bagian B. Dasar Hukum
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('B. Dasar Hukum', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    progja.dasarHukum.forEach(dh => {
      const splitDh = doc.splitTextToSize(`• ${dh}`, pageWidth - (marginX * 2) - 4);
      doc.text(splitDh, marginX + 3, currentY);
      currentY += splitDh.length * 3.8;
    });
    currentY += 2;

    // Bagian C. Tujuan
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('C. Tujuan', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    progja.tujuan.forEach(tj => {
      const splitTj = doc.splitTextToSize(`• ${tj}`, pageWidth - (marginX * 2) - 4);
      doc.text(splitTj, marginX + 3, currentY);
      currentY += splitTj.length * 3.8;
    });
    currentY += 2;

    // Bagian D. Sasaran
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('D. Sasaran', marginX, currentY);
    currentY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    progja.sasaran.forEach(ss => {
      const splitSs = doc.splitTextToSize(`• ${ss}`, pageWidth - (marginX * 2) - 4);
      doc.text(splitSs, marginX + 3, currentY);
      currentY += splitSs.length * 3.8;
    });
    currentY += 3;

    // Bagian E. Matriks Kegiatan
    if (currentY > 170) {
      doc.addPage();
      drawBorders();
      currentY = 20;
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('E. Matriks Kegiatan', marginX, currentY);
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.text('Tanda • menunjukkan bulan pelaksanaan kegiatan. Tahun pelajaran dimulai Juli dan berakhir Juni.', marginX, currentY + 4);

    const tableRows = progja.matriks.map(item => [
      item.no,
      item.kegiatan,
      ...item.jadwalBulan.map(active => (active ? '•' : ''))
    ]);

    autoTable(doc, {
      startY: currentY + 6,
      head: [[
        'No',
        'Kegiatan',
        'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'
      ]],
      body: tableRows,
      styles: {
        font: 'times',
        fontSize: 7.5,
        cellPadding: 1.5,
        lineWidth: 0.15,
        lineColor: [120, 120, 120],
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
        1: { cellWidth: isF4 ? 86 : 80 },
        2: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        4: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        6: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        7: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        8: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        9: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        10: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        11: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        12: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
        13: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 6;
    let signY = finalY;

    if (finalY > pageHeight - 55) {
      doc.addPage();
      drawBorders();
      signY = 25;
    }

    // Penutup
    doc.setFont('times', 'bold');
    doc.setFontSize(9.5);
    doc.text('F. Penutup', marginX, signY);
    signY += 4.5;
    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    const splitPenutup = doc.splitTextToSize(progja.penutup, pageWidth - (marginX * 2));
    doc.text(splitPenutup, marginX, signY);
    signY += splitPenutup.length * 4 + 6;

    if (signY > pageHeight - 45) {
      doc.addPage();
      drawBorders();
      signY = 25;
    }

    // Legalitas Tanda Tangan
    const colLeft = marginX + 10;
    const colRight = pageWidth - marginX - 60;

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('Mengetahui,', colLeft, signY);
    doc.text('Kepala Sekolah', colLeft, signY + 4);

    doc.text(`Konawe, ${progja.tanggalPengesahan || 'Juli 2026'}`, colRight, signY);
    doc.text('Wakasek Sarana Prasarana', colRight, signY + 4);

    const signNameY = signY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.', colLeft, signNameY);
    doc.text(pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.', colRight, signNameY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, colLeft, signNameY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, colRight, signNameY + 4);

    doc.save(`Program_Kerja_Sarpras_${pengaturan.namaSekolah}_${paperFormat}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="text-indigo-600" size={20} />
              Program Kerja Tahunan Sarpras
            </h2>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full">
              TP {progja.tahunPelajaran}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diedit langsung secara live. Hasil download tersedia dalam format Microsoft Word (.docx) & PDF kedinasan.
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
            <span>{isEditMode ? 'Lihat Pratinjau' : 'Edit Dokumen Langsung'}</span>
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
              F4 (Folio)
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

      {/* Editor Panel if Edit Mode active */}
      {isEditMode && (
        <div className="bg-amber-50/70 border border-amber-200 p-6 rounded-3xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit3 className="text-amber-700" size={18} />
              <h3 className="text-sm font-bold text-amber-950">Formulir Pengeditan Program Kerja Langsung</h3>
            </div>
            <span className="text-[11px] text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full font-medium">
              Otomatis Tersimpan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Pelajaran</label>
              <input
                type="text"
                value={progja.tahunPelajaran}
                onChange={e => saveToStorage({ ...progja, tahunPelajaran: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Pengesahan</label>
              <input
                type="text"
                value={progja.tanggalPengesahan || 'Juli 2026'}
                onChange={e => saveToStorage({ ...progja, tanggalPengesahan: e.target.value })}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
          </div>

          {/* Latar Belakang */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">A. Latar Belakang</label>
            <textarea
              rows={3}
              value={progja.latarBelakang}
              onChange={e => saveToStorage({ ...progja, latarBelakang: e.target.value })}
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
            />
          </div>

          {/* Dasar Hukum */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">B. Dasar Hukum</label>
            <div className="space-y-1.5 mb-2">
              {progja.dasarHukum.map((dh, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={dh}
                    onChange={e => {
                      const updated = [...progja.dasarHukum];
                      updated[idx] = e.target.value;
                      saveToStorage({ ...progja, dasarHukum: updated });
                    }}
                    className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      const updated = progja.dasarHukum.filter((_, i) => i !== idx);
                      saveToStorage({ ...progja, dasarHukum: updated });
                    }}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDasarHukum}
                onChange={e => setNewDasarHukum(e.target.value)}
                placeholder="Tambah dasar hukum baru..."
                className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  if (newDasarHukum.trim()) {
                    saveToStorage({ ...progja, dasarHukum: [...progja.dasarHukum, newDasarHukum.trim()] });
                    setNewDasarHukum('');
                  }
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
              >
                Tambah
              </button>
            </div>
          </div>

          {/* Tujuan & Sasaran */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">C. Tujuan</label>
              <div className="space-y-1.5 mb-2">
                {progja.tujuan.map((tj, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={tj}
                      onChange={e => {
                        const updated = [...progja.tujuan];
                        updated[idx] = e.target.value;
                        saveToStorage({ ...progja, tujuan: updated });
                      }}
                      className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                    <button
                      onClick={() => {
                        const updated = progja.tujuan.filter((_, i) => i !== idx);
                        saveToStorage({ ...progja, tujuan: updated });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTujuan}
                  onChange={e => setNewTujuan(e.target.value)}
                  placeholder="Tambah butir tujuan..."
                  className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTujuan.trim()) {
                      saveToStorage({ ...progja, tujuan: [...progja.tujuan, newTujuan.trim()] });
                      setNewTujuan('');
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
                >
                  Tambah
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">D. Sasaran</label>
              <div className="space-y-1.5 mb-2">
                {progja.sasaran.map((ss, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ss}
                      onChange={e => {
                        const updated = [...progja.sasaran];
                        updated[idx] = e.target.value;
                        saveToStorage({ ...progja, sasaran: updated });
                      }}
                      className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg"
                    />
                    <button
                      onClick={() => {
                        const updated = progja.sasaran.filter((_, i) => i !== idx);
                        saveToStorage({ ...progja, sasaran: updated });
                      }}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSasaran}
                  onChange={e => setNewSasaran(e.target.value)}
                  placeholder="Tambah butir sasaran..."
                  className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newSasaran.trim()) {
                      saveToStorage({ ...progja, sasaran: [...progja.sasaran, newSasaran.trim()] });
                      setNewSasaran('');
                    }
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>

          {/* Penutup */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">E. Penutup</label>
            <textarea
              rows={2}
              value={progja.penutup}
              onChange={e => saveToStorage({ ...progja, penutup: e.target.value })}
              className="w-full text-xs p-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500/30 leading-relaxed"
            />
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

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
              PROGRAM KERJA TAHUNAN
            </h2>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
              WAKIL KEPALA SEKOLAH BIDANG SARANA DAN PRASARANA
            </h3>
            <p className="text-xs text-slate-600 italic font-serif mt-0.5">
              Tahun Pelajaran {progja.tahunPelajaran}
            </p>
          </div>

          {/* Narrative sections */}
          <div className="space-y-4 text-xs font-serif text-slate-800 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">A. Latar Belakang</h4>
              <p className="text-slate-700 text-justify">{progja.latarBelakang}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">B. Dasar Hukum</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {progja.dasarHukum.map((dh, i) => (
                  <li key={i}>{dh}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">C. Tujuan</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {progja.tujuan.map((tj, i) => (
                  <li key={i}>{tj}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">D. Sasaran</h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {progja.sasaran.map((ss, i) => (
                  <li key={i}>{ss}</li>
                ))}
              </ul>
            </div>

            {/* Matriks Kegiatan */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-bold text-slate-900 text-sm">E. Matriks Jadwal Kegiatan Sarpras</h4>
                <p className="text-[11px] text-slate-500 italic">
                  Klik bulatan bulan untuk mengaktifkan/menonaktifkan jadwal
                </p>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-2">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Uraian Rencana Kegiatan Sarpras</th>
                      {BULAN_LABELS.map((bln, idx) => (
                        <th key={idx} className="border border-slate-700 py-2 px-1 w-8 text-center">{bln}</th>
                      ))}
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {progja.matriks.map((item) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{item.no}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.kegiatan}
                              onChange={e => handleUpdateKegiatanText(item.id, e.target.value)}
                              className="w-full p-1 bg-white border border-slate-200 rounded text-[11px]"
                            />
                          ) : (
                            item.kegiatan
                          )}
                        </td>
                        {item.jadwalBulan.map((isActive, mIdx) => (
                          <td 
                            key={mIdx} 
                            onClick={() => toggleMonth(item.id, mIdx)}
                            className="border border-slate-200 py-1.5 px-1 text-center cursor-pointer hover:bg-indigo-100/60 transition"
                            title={`Ubah jadwal bulan ${BULAN_LABELS[mIdx]}`}
                          >
                            {isActive ? (
                              <span className="inline-block w-3.5 h-3.5 bg-indigo-600 text-white rounded-full text-[9px] leading-3.5 text-center font-bold shadow-xs">
                                •
                              </span>
                            ) : (
                              <span className="text-slate-200 text-xs">-</span>
                            )}
                          </td>
                        ))}
                        <td className="border border-slate-200 py-1 px-1 text-center print:hidden">
                          <button
                            onClick={() => handleDeleteKegiatan(item.id)}
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

              {/* Add kegiatan input */}
              <form onSubmit={handleAddKegiatan} className="flex gap-2 print:hidden mb-4">
                <input
                  type="text"
                  value={newKegiatan}
                  onChange={e => setNewKegiatan(e.target.value)}
                  placeholder="Tambah uraian kegiatan program kerja baru..."
                  className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-sans"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Tambah Kegiatan</span>
                </button>
              </form>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">F. Penutup</h4>
              <p className="text-slate-700 text-justify">{progja.penutup}</p>
            </div>
          </div>

          {/* Legalitas */}
          <div className="flex justify-between items-start mt-8 pt-4 font-serif text-xs px-8">
            <div className="text-left space-y-1">
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-bold text-slate-800">Kepala {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-slate-900 text-sm tracking-wide">{pengaturan.kepalaSekolah}</p>
              <p className="text-slate-600 text-[10px]">NIP. {pengaturan.nipKepalaSekolah || '....................................................'}</p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-slate-600">Amonggedo, {progja.tanggalPengesahan || 'Juli 2026'}</p>
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
