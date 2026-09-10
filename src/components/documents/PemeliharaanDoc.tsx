import React, { useState } from 'react';
import { JadwalPemeliharaanItem, RiwayatPemeliharaanItem } from '../../types/dokumenSarpras';
import { PengaturanSekolah } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { exportJadwalPemeliharaanDocx, exportRiwayatPemeliharaanDocx } from '../../utils/docxExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  Calendar, 
  Wrench, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle, 
  FileSpreadsheet,
  FileText,
  Edit3,
  Eye,
  RotateCcw
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  initialJadwal: JadwalPemeliharaanItem[];
  initialRiwayat: RiwayatPemeliharaanItem[];
}

const BULAN_LABELS = ['Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];

export default function PemeliharaanDoc({ pengaturan, initialJadwal, initialRiwayat }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<'jadwal' | 'riwayat'>('jadwal');
  
  const [jadwalList, setJadwalList] = useState<JadwalPemeliharaanItem[]>(() => {
    const saved = localStorage.getItem('dokumen_jadwal_pemeliharaan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialJadwal;
  });

  const [riwayatList, setRiwayatList] = useState<RiwayatPemeliharaanItem[]>(() => {
    const saved = localStorage.getItem('dokumen_riwayat_pemeliharaan');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialRiwayat;
  });

  const [paperFormat, setPaperFormat] = useState<'F4' | 'A4'>('F4');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // New Riwayat modal state
  const [isAddRiwayatOpen, setIsAddRiwayatOpen] = useState(false);
  const [newRiwayat, setNewRiwayat] = useState<Partial<RiwayatPemeliharaanItem>>({
    tanggal: new Date().toISOString().split('T')[0],
    namaBarang: '',
    kerusakanAwal: '',
    tindakan: '',
    pelaksana: 'Swakelola',
    biaya: 0,
    hasilAkhir: 'Baik',
    ruangLokasi: ''
  });

  // New Jadwal input state
  const [newJadwalItem, setNewJadwalItem] = useState('');
  const [newJadwalFrekuensi, setNewJadwalFrekuensi] = useState('Bulanan');

  const saveJadwal = (updated: JadwalPemeliharaanItem[]) => {
    setJadwalList(updated);
    localStorage.setItem('dokumen_jadwal_pemeliharaan', JSON.stringify(updated));
  };

  const saveRiwayat = (updated: RiwayatPemeliharaanItem[]) => {
    setRiwayatList(updated);
    localStorage.setItem('dokumen_riwayat_pemeliharaan', JSON.stringify(updated));
  };

  const handleReset = () => {
    if (activeSubTab === 'jadwal') {
      if (window.confirm('Kembalikan Jadwal Pemeliharaan ke template standar?')) {
        saveJadwal(initialJadwal);
      }
    } else {
      if (window.confirm('Kembalikan Riwayat Pemeliharaan ke template standar?')) {
        saveRiwayat(initialRiwayat);
      }
    }
  };

  const toggleMonth = (itemId: string, monthIdx: number) => {
    const updated = jadwalList.map(item => {
      if (item.id === itemId) {
        const newJadwal = [...item.jadwalBulan];
        newJadwal[monthIdx] = !newJadwal[monthIdx];
        return { ...item, jadwalBulan: newJadwal };
      }
      return item;
    });
    saveJadwal(updated);
  };

  const handleAddJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJadwalItem.trim()) return;

    const newItem: JadwalPemeliharaanItem = {
      id: 'jdw-' + Date.now(),
      no: jadwalList.length + 1,
      kegiatan: newJadwalItem.trim(),
      frekuensi: newJadwalFrekuensi,
      jadwalBulan: Array(12).fill(false)
    };

    saveJadwal([...jadwalList, newItem]);
    setNewJadwalItem('');
  };

  const handleDeleteJadwal = (id: string) => {
    const filtered = jadwalList.filter(i => i.id !== id).map((item, idx) => ({
      ...item,
      no: idx + 1
    }));
    saveJadwal(filtered);
  };

  const handleAddRiwayat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiwayat.namaBarang) return;

    const item: RiwayatPemeliharaanItem = {
      id: 'rw-' + Date.now(),
      tanggal: newRiwayat.tanggal || new Date().toISOString().split('T')[0],
      namaBarang: newRiwayat.namaBarang,
      kerusakanAwal: newRiwayat.kerusakanAwal || '-',
      tindakan: newRiwayat.tindakan || '-',
      pelaksana: newRiwayat.pelaksana || 'Swakelola',
      biaya: Number(newRiwayat.biaya) || 0,
      hasilAkhir: (newRiwayat.hasilAkhir as any) || 'Baik',
      ruangLokasi: newRiwayat.ruangLokasi || 'Laboratorium / Kelas'
    };

    saveRiwayat([...riwayatList, item]);
    setIsAddRiwayatOpen(false);
    setNewRiwayat({
      tanggal: new Date().toISOString().split('T')[0],
      namaBarang: '',
      kerusakanAwal: '',
      tindakan: '',
      pelaksana: 'Swakelola',
      biaya: 0,
      hasilAkhir: 'Baik',
      ruangLokasi: ''
    });
  };

  const handleDeleteRiwayat = (id: string) => {
    saveRiwayat(riwayatList.filter(i => i.id !== id));
  };

  const formatRp = (val: number) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      if (activeSubTab === 'jadwal') {
        await exportJadwalPemeliharaanDocx(pengaturan, jadwalList);
      } else {
        await exportRiwayatPemeliharaanDocx(pengaturan, riwayatList);
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

    if (activeSubTab === 'jadwal') {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('JADWAL PEMELIHARAAN RUTIN SARANA DAN PRASARANA', centerX, 37, { align: 'center' });
      doc.setFontSize(10);
      doc.text('TAHUN PELAJARAN 2026/2027', centerX, 42, { align: 'center' });
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text('Matriks Pemeliharaan Berkala Fasilitas Pendidikan & Gedung Sekolah', centerX, 46.5, { align: 'center' });

      const tableRows = jadwalList.map(item => [
        item.no,
        item.kegiatan,
        item.frekuensi,
        ...item.jadwalBulan.map(active => (active ? '•' : ''))
      ]);

      autoTable(doc, {
        startY: 50,
        head: [[
          'No',
          'Item Sarana & Prasarana',
          'Frekuensi',
          'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'
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
          1: { cellWidth: isF4 ? 68 : 62 },
          2: { cellWidth: 20, halign: 'center', fontSize: 6.5 },
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
          13: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' },
          14: { cellWidth: 7.5, halign: 'center', fontStyle: 'bold' }
        }
      });
    } else {
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('KARTU RIWAYAT PEMELIHARAAN & LOG PERBAIKAN ASET', centerX, 37, { align: 'center' });
      doc.setFontSize(10);
      doc.text('TAHUN PELAJARAN 2026/2027', centerX, 42, { align: 'center' });
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text('Bukti Operasional Pemeliharaan Sarpras Sesuai SOP Kedinasan', centerX, 46.5, { align: 'center' });

      const tableRows = riwayatList.map((item, idx) => [
        idx + 1,
        item.tanggal,
        `${item.namaBarang}\n(${item.ruangLokasi})`,
        item.kerusakanAwal,
        item.tindakan,
        item.pelaksana,
        formatRp(item.biaya),
        item.hasilAkhir
      ]);

      autoTable(doc, {
        startY: 50,
        head: [[
          'No',
          'Tanggal',
          'Nama Barang & Lokasi',
          'Kerusakan Awal',
          'Tindakan Servis',
          'Pelaksana',
          'Biaya (Rp)',
          'Kondisi Akhir'
        ]],
        body: tableRows,
        styles: {
          font: 'times',
          fontSize: 7.5,
          cellPadding: 1.8,
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
          1: { cellWidth: 18, halign: 'center', fontSize: 7 },
          2: { cellWidth: 38 },
          3: { cellWidth: 36 },
          4: { cellWidth: 36 },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 20, halign: 'right' },
          7: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }
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
    doc.text('Wakasek Sarana Prasarana', colRight, signY + 4);

    const signNameY = signY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.', colLeft, signNameY);
    doc.text(pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.', colRight, signNameY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, colLeft, signNameY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, colRight, signNameY + 4);

    doc.save(`Pemeliharaan_Sarpras_${activeSubTab}_${paperFormat}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <Wrench className="text-amber-600" size={20} />
              Jadwal & Kartu Riwayat Pemeliharaan Sarpras
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diedit langsung secara interaktif. Tersedia ekspor file DOCX (Word) dan PDF resmi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Sub Tab Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setActiveSubTab('jadwal')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'jadwal' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Calendar size={13} />
              <span>Jadwal Pemeliharaan</span>
            </button>
            <button
              onClick={() => setActiveSubTab('riwayat')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'riwayat' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'
              }`}
            >
              <Clock size={13} />
              <span>Kartu Riwayat Servis</span>
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
            <span>{isEditMode ? 'Pratinjau' : 'Edit Langsung'}</span>
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

      {/* Action to Add New Item */}
      {activeSubTab === 'jadwal' ? (
        <form onSubmit={handleAddJadwal} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newJadwalItem}
            onChange={e => setNewJadwalItem(e.target.value)}
            placeholder="Tambah item sarana / sarpras baru untuk pemeliharaan..."
            className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-xl"
            required
          />
          <select
            value={newJadwalFrekuensi}
            onChange={e => setNewJadwalFrekuensi(e.target.value)}
            className="text-xs p-2.5 bg-white border border-slate-300 rounded-xl w-full sm:w-44"
          >
            <option value="Harian/Mingguan">Harian/Mingguan</option>
            <option value="Bulanan">Bulanan</option>
            <option value="Triwulan">Triwulan</option>
            <option value="Semester">Semester</option>
            <option value="Tahunan">Tahunan</option>
            <option value="Kondisional">Kondisional</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Jadwal</span>
          </button>
        </form>
      ) : (
        <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <p className="text-xs text-slate-600">
            Total {riwayatList.length} catatan servis tercatat dengan total biaya perbaikan: <span className="font-bold text-slate-900">{formatRp(riwayatList.reduce((s, i) => s + i.biaya, 0))}</span>
          </p>
          <button
            onClick={() => setIsAddRiwayatOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Catat Servis Baru</span>
          </button>
        </div>
      )}

      {/* Modal Catat Servis Baru */}
      {isAddRiwayatOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tambah Log Servis / Pemeliharaan Aset</h3>
            <form onSubmit={handleAddRiwayat} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Servis</label>
                  <input
                    type="date"
                    value={newRiwayat.tanggal}
                    onChange={e => setNewRiwayat({ ...newRiwayat, tanggal: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ruang / Lokasi</label>
                  <input
                    type="text"
                    value={newRiwayat.ruangLokasi}
                    onChange={e => setNewRiwayat({ ...newRiwayat, ruangLokasi: e.target.value })}
                    placeholder="e.g. Lab Komputer / Kelas XII"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Barang / Aset</label>
                <input
                  type="text"
                  value={newRiwayat.namaBarang}
                  onChange={e => setNewRiwayat({ ...newRiwayat, namaBarang: e.target.value })}
                  placeholder="e.g. AC Split 1.5 PK Daikin / PC Server Lab"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Uraian Kerusakan Awal</label>
                <input
                  type="text"
                  value={newRiwayat.kerusakanAwal}
                  onChange={e => setNewRiwayat({ ...newRiwayat, kerusakanAwal: e.target.value })}
                  placeholder="e.g. Tidak dingin, hembusan angin lemah"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tindakan / Solusi Servis</label>
                <input
                  type="text"
                  value={newRiwayat.tindakan}
                  onChange={e => setNewRiwayat({ ...newRiwayat, tindakan: e.target.value })}
                  placeholder="e.g. Cuci evaporator, isi freon R32, ganti kapasitor"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Pelaksana</label>
                  <select
                    value={newRiwayat.pelaksana}
                    onChange={e => setNewRiwayat({ ...newRiwayat, pelaksana: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Swakelola">Swakelola</option>
                    <option value="Teknisi Luar">Teknisi Luar</option>
                    <option value="Vendor Resmi">Vendor Resmi</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Biaya (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newRiwayat.biaya}
                    onChange={e => setNewRiwayat({ ...newRiwayat, biaya: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Hasil Akhir</label>
                  <select
                    value={newRiwayat.hasilAkhir}
                    onChange={e => setNewRiwayat({ ...newRiwayat, hasilAkhir: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Baik">Baik</option>
                    <option value="Kurang Baik">Kurang Baik</option>
                    <option value="Perlu Penggantian">Perlu Penggantian</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddRiwayatOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                >
                  Simpan Catatan
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

          {activeSubTab === 'jadwal' ? (
            <div>
              {/* Judul Jadwal */}
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  JADWAL PEMELIHARAAN RUTIN SARANA DAN PRASARANA
                </h2>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
                  TAHUN PELAJARAN 2026/2027
                </h3>
                <p className="text-xs text-slate-600 italic font-serif mt-0.5">
                  Matriks Pemeliharaan Berkala Fasilitas Pendidikan & Gedung Sekolah
                </p>
              </div>

              {/* Table Jadwal */}
              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Item Fasilitas / Sarana Prasarana</th>
                      <th className="border border-slate-700 py-2 px-2 w-28">Frekuensi</th>
                      {BULAN_LABELS.map((bln, idx) => (
                        <th key={idx} className="border border-slate-700 py-2 px-1 w-8 text-center">{bln}</th>
                      ))}
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jadwalList.map((item) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{item.no}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.kegiatan}
                              onChange={e => {
                                const updated = jadwalList.map(j => j.id === item.id ? { ...j, kegiatan: e.target.value } : j);
                                saveJadwal(updated);
                              }}
                              className="w-full p-1 border border-slate-200 rounded text-[11px]"
                            />
                          ) : (
                            item.kegiatan
                          )}
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={item.frekuensi}
                              onChange={e => {
                                const updated = jadwalList.map(j => j.id === item.id ? { ...j, frekuensi: e.target.value } : j);
                                saveJadwal(updated);
                              }}
                              className="w-full p-1 border border-slate-200 rounded text-center text-[10px]"
                            />
                          ) : (
                            item.frekuensi
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
                            onClick={() => handleDeleteJadwal(item.id)}
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
          ) : (
            <div>
              {/* Judul Riwayat */}
              <div className="text-center mb-6">
                <h2 className="text-base font-black text-slate-900 tracking-wider uppercase font-serif">
                  KARTU RIWAYAT PEMELIHARAAN & LOG PERBAIKAN ASET
                </h2>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
                  TAHUN PELAJARAN 2026/2027
                </h3>
                <p className="text-xs text-slate-600 italic font-serif mt-0.5">
                  Bukti Operasional Pemeliharaan Sarpras Sesuai SOP Kedinasan
                </p>
              </div>

              {/* Table Riwayat */}
              <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
                <table className="w-full border-collapse text-[10px] font-serif">
                  <thead>
                    <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                      <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">Tanggal</th>
                      <th className="border border-slate-700 py-2 px-3 text-left">Nama Barang & Lokasi</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Kerusakan Awal</th>
                      <th className="border border-slate-700 py-2 px-2 text-left">Tindakan Servis</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">Pelaksana</th>
                      <th className="border border-slate-700 py-2 px-2 text-right w-24">Biaya (Rp)</th>
                      <th className="border border-slate-700 py-2 px-2 w-20">Hasil Akhir</th>
                      <th className="border border-slate-700 py-2 px-1 w-10 print:hidden font-sans">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riwayatList.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-indigo-50/20">
                        <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-700">{item.tanggal}</td>
                        <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">
                          <div>{item.namaBarang}</div>
                          <div className="text-[9px] text-slate-500">{item.ruangLokasi}</div>
                        </td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{item.kerusakanAwal}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{item.tindakan}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">{item.pelaksana}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-right font-medium text-slate-900">{formatRp(item.biaya)}</td>
                        <td className="border border-slate-200 py-1.5 px-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            item.hasilAkhir === 'Baik' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.hasilAkhir}
                          </span>
                        </td>
                        <td className="border border-slate-200 py-1 px-1 text-center print:hidden">
                          <button
                            onClick={() => handleDeleteRiwayat(item.id)}
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
                      <td colSpan={6} className="border border-slate-300 py-2 px-3 text-right text-slate-800">
                        TOTAL BIAYA PEMELIHARAAN TERCATAT:
                      </td>
                      <td className="border border-slate-300 py-2 px-2 text-right text-indigo-700 font-serif font-bold">
                        {formatRp(riwayatList.reduce((s, i) => s + i.biaya, 0))}
                      </td>
                      <td colSpan={2} className="border border-slate-300 py-2 px-2 text-center text-slate-500">-</td>
                    </tr>
                  </tfoot>
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
              <p className="text-slate-600">Amonggedo, Juli 2026</p>
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
