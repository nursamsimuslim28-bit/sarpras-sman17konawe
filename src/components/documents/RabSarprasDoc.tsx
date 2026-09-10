import React, { useState } from 'react';
import { RabSarprasData, RabItem } from '../../types/dokumenSarpras';
import { PengaturanSekolah } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { exportRabDocx } from '../../utils/docxExport';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Download, 
  Plus, 
  Trash2, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign, 
  FileText, 
  Printer,
  Edit3,
  RotateCcw,
  Eye,
  Check
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  initialData: RabSarprasData;
}

export default function RabSarprasDoc({ pengaturan, initialData }: Props) {
  const [rabData, setRabData] = useState<RabSarprasData>(() => {
    const saved = localStorage.getItem('dokumen_rab_sarpras');
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
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  const [paguInput, setPaguInput] = useState(rabData.paguTotalBos.toString());
  const [tahunInput, setTahunInput] = useState(rabData.tahunAnggaran);
  const [sumberInput, setSumberInput] = useState(rabData.sumberDana);
  const [tanggalInput, setTanggalInput] = useState(rabData.tanggalDisusun || 'Januari 2026');

  const [newItem, setNewItem] = useState<Partial<RabItem>>({
    kodeRekening: '5.1.02.03.02.0112',
    uraian: '',
    jenisBelanja: 'Pemeliharaan',
    volume: 1,
    satuan: 'Paket',
    hargaSatuan: 0,
    keterangan: ''
  });

  const saveToStorage = (updated: RabSarprasData) => {
    setRabData(updated);
    localStorage.setItem('dokumen_rab_sarpras', JSON.stringify(updated));
  };

  const handleReset = () => {
    if (window.confirm('Kembalikan Rencana Anggaran Biaya (RAB) ke template standar bawaan?')) {
      saveToStorage(initialData);
      setPaguInput(initialData.paguTotalBos.toString());
      setTahunInput(initialData.tahunAnggaran);
      setSumberInput(initialData.sumberDana);
      setTanggalInput(initialData.tanggalDisusun || 'Januari 2026');
    }
  };

  const totalPemeliharaan = rabData.items
    .filter(i => i.jenisBelanja === 'Pemeliharaan')
    .reduce((sum, i) => sum + (i.volume * i.hargaSatuan), 0);

  const totalModal = rabData.items
    .filter(i => i.jenisBelanja === 'Modal')
    .reduce((sum, i) => sum + (i.volume * i.hargaSatuan), 0);

  const totalKeseluruhan = totalPemeliharaan + totalModal;

  // Persentase Belanja Pemeliharaan dari BOS Reguler (Maksimal 20% sesuai Permendikdasmen No. 8/2026)
  const persenPemeliharaan = rabData.paguTotalBos > 0 
    ? ((totalPemeliharaan / rabData.paguTotalBos) * 100).toFixed(2)
    : '0';
  const isOverLimit = Number(persenPemeliharaan) > 20;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.uraian) return;

    const item: RabItem = {
      id: 'rab-' + Date.now(),
      kodeRekening: newItem.kodeRekening || '5.1.02.03.02.0001',
      uraian: newItem.uraian,
      jenisBelanja: (newItem.jenisBelanja as any) || 'Pemeliharaan',
      volume: Number(newItem.volume) || 1,
      satuan: newItem.satuan || 'Paket',
      hargaSatuan: Number(newItem.hargaSatuan) || 0,
      keterangan: newItem.keterangan || '-'
    };

    const updated = {
      ...rabData,
      items: [...rabData.items, item]
    };
    saveToStorage(updated);
    setIsAddItemOpen(false);
    setNewItem({
      kodeRekening: '5.1.02.03.02.0112',
      uraian: '',
      jenisBelanja: 'Pemeliharaan',
      volume: 1,
      satuan: 'Paket',
      hargaSatuan: 0,
      keterangan: ''
    });
  };

  const handleDeleteItem = (id: string) => {
    const updated = {
      ...rabData,
      items: rabData.items.filter(i => i.id !== id)
    };
    saveToStorage(updated);
  };

  const handleUpdateItemField = (id: string, field: keyof RabItem, value: any) => {
    const updated = {
      ...rabData,
      items: rabData.items.map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    };
    saveToStorage(updated);
  };

  const handleSaveHeaders = () => {
    const updated = {
      ...rabData,
      paguTotalBos: Number(paguInput) || 0,
      tahunAnggaran: tahunInput,
      sumberDana: sumberInput,
      tanggalDisusun: tanggalInput
    };
    saveToStorage(updated);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportRabDocx(pengaturan, rabData);
    } catch (e) {
      console.error(e);
      alert('Gagal mengekspor file DOCX');
    } finally {
      setIsExportingDocx(false);
    }
  };

  const formatRp = (val: number) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
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
    doc.text('RENCANA ANGGARAN BIAYA (RAB) SARANA DAN PRASARANA', centerX, 37, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`TAHUN ANGGARAN ${rabData.tahunAnggaran} | SUMBER DANA: ${rabData.sumberDana.toUpperCase()}`, centerX, 42, { align: 'center' });
    doc.setFont('times', 'italic');
    doc.setFontSize(8);
    doc.text(`Standar ARKAS / Permendikdasmen No. 8 Thn 2026 (Pagu BOS: ${formatRp(rabData.paguTotalBos)})`, centerX, 46.5, { align: 'center' });

    // Table
    const tableBody = rabData.items.map((item, idx) => [
      idx + 1,
      item.kodeRekening,
      item.uraian,
      item.jenisBelanja,
      item.volume,
      item.satuan,
      formatRp(item.hargaSatuan),
      formatRp(item.volume * item.hargaSatuan),
      item.keterangan || '-'
    ]);

    // Summary Rows
    const summaryRows = [
      [
        { content: 'TOTAL BELANJA PEMELIHARAAN SARPRAS (Cap Max 20% BOS Reguler)', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' as any } },
        { content: formatRp(totalPemeliharaan), styles: { fontStyle: 'bold', halign: 'right' as any } },
        { content: `${persenPemeliharaan}% dari BOS`, styles: { fontStyle: 'bold', halign: 'center' as any } }
      ],
      [
        { content: 'TOTAL BELANJA MODAL SARPRAS', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' as any } },
        { content: formatRp(totalModal), styles: { fontStyle: 'bold', halign: 'right' as any } },
        { content: '-', styles: { halign: 'center' as any } }
      ],
      [
        { content: 'TOTAL KESELURUHAN ALOKASI ANGGARAN SARPRAS', colSpan: 7, styles: { fontStyle: 'bold', halign: 'right' as any, fillColor: [240, 240, 240] } },
        { content: formatRp(totalKeseluruhan), styles: { fontStyle: 'bold', halign: 'right' as any, fillColor: [240, 240, 240] } },
        { content: 'ARKAS', styles: { fontStyle: 'bold', halign: 'center' as any, fillColor: [240, 240, 240] } }
      ]
    ];

    autoTable(doc, {
      startY: 50,
      head: [[
        'No',
        'Kode Rekening',
        'Uraian Rincian Belanja',
        'Jenis',
        'Vol',
        'Satuan',
        'Harga Satuan',
        'Total Anggaran',
        'Keterangan'
      ]],
      body: [...tableBody, ...summaryRows] as any,
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
        1: { cellWidth: 26, fontSize: 6.5 },
        2: { cellWidth: isF4 ? 54 : 50 },
        3: { cellWidth: 18, halign: 'center', fontSize: 7 },
        4: { cellWidth: 8, halign: 'center' },
        5: { cellWidth: 12, halign: 'center' },
        6: { cellWidth: 20, halign: 'right' },
        7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
        8: { cellWidth: isF4 ? 20 : 18, fontSize: 7 }
      }
    });

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
    doc.text('Menyetujui,', colLeft, signY);
    doc.text('Kepala Sekolah', colLeft, signY + 4);

    doc.text(`Konawe, ${rabData.tanggalDisusun || 'Januari 2026'}`, colRight, signY);
    doc.text('Bendahara BOS / Tim Sarpras', colRight, signY + 4);

    const signNameY = signY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah || 'Drs. H. Syamsuddin, M.Pd.', colLeft, signNameY);
    doc.text(pengaturan.namaPetugasSarpras || 'Hj. Sitti Rahma, S.Pd., M.Pd.', colRight, signNameY);

    doc.setFont('times', 'normal');
    doc.setFontSize(8.5);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, colLeft, signNameY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, colRight, signNameY + 4);

    doc.save(`RAB_Sarpras_${pengaturan.namaSekolah}_${rabData.tahunAnggaran}_${paperFormat}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="text-emerald-600" size={20} />
              RAB & Anggaran Sarpras (ARKAS)
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
              TA {rabData.tahunAnggaran}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dapat diedit langsung. Mendukung ekspor instan Microsoft Word (.docx) & PDF standar kedinasan.
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
            <span>{isEditMode ? 'Lihat Pratinjau' : 'Edit Data Langsung'}</span>
          </button>

          <button
            onClick={() => setIsAddItemOpen(true)}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Tambah Item</span>
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
            title="Reset ke Template Bawaan"
          >
            <RotateCcw size={15} />
          </button>

          {/* Paper Format */}
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

      {/* Compliance / 20% Rule Alert Banner */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
        isOverLimit 
          ? 'bg-rose-50 border-rose-200 text-rose-800' 
          : 'bg-emerald-50 border-emerald-200 text-emerald-800'
      }`}>
        <div className="flex items-center gap-3">
          {isOverLimit ? <AlertTriangle size={22} className="text-rose-600 shrink-0" /> : <CheckCircle size={22} className="text-emerald-600 shrink-0" />}
          <div>
            <p className="text-xs font-bold">
              {isOverLimit 
                ? `Peringatan: Belanja Pemeliharaan (${persenPemeliharaan}%) Melebihi Batas Maksimal 20% BOS Reguler!`
                : `Sesuai Regulasi: Belanja Pemeliharaan Sarpras ${persenPemeliharaan}% (Batas Aman Maksimal 20% BOS Reguler)`}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">
              Pagu BOS Reguler: {formatRp(rabData.paguTotalBos)} | Alokasi Pemeliharaan: {formatRp(totalPemeliharaan)} (Maks. {formatRp(rabData.paguTotalBos * 0.2)})
            </p>
          </div>
        </div>
      </div>

      {/* Edit Form Panel */}
      {isEditMode && (
        <div className="bg-amber-50/70 border border-amber-200 p-6 rounded-3xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
              <Edit3 size={16} className="text-amber-700" />
              Pengaturan Identitas & Pagu Anggaran RAB
            </h3>
            <span className="text-[11px] text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full font-medium">
              Live Update
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pagu Total BOS (Rp)</label>
              <input
                type="number"
                value={paguInput}
                onChange={e => {
                  setPaguInput(e.target.value);
                  saveToStorage({ ...rabData, paguTotalBos: Number(e.target.value) || 0 });
                }}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Anggaran</label>
              <input
                type="text"
                value={tahunInput}
                onChange={e => {
                  setTahunInput(e.target.value);
                  saveToStorage({ ...rabData, tahunAnggaran: e.target.value });
                }}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Sumber Dana</label>
              <input
                type="text"
                value={sumberInput}
                onChange={e => {
                  setSumberInput(e.target.value);
                  saveToStorage({ ...rabData, sumberDana: e.target.value });
                }}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Disusun</label>
              <input
                type="text"
                value={tanggalInput}
                onChange={e => {
                  setTanggalInput(e.target.value);
                  saveToStorage({ ...rabData, tanggalDisusun: e.target.value });
                }}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Item */}
      {isAddItemOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tambah Item Anggaran Sarpras Baru</h3>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kode Rekening (ARKAS)</label>
                <input
                  type="text"
                  value={newItem.kodeRekening}
                  onChange={e => setNewItem({ ...newItem, kodeRekening: e.target.value })}
                  placeholder="e.g. 5.1.02.03.02.0112"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Uraian Rincian Belanja</label>
                <input
                  type="text"
                  value={newItem.uraian}
                  onChange={e => setNewItem({ ...newItem, uraian: e.target.value })}
                  placeholder="e.g. Servis dan Pembersihan Rutin AC Ruang Lab Komputer"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Belanja</label>
                  <select
                    value={newItem.jenisBelanja}
                    onChange={e => setNewItem({ ...newItem, jenisBelanja: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="Pemeliharaan">Belanja Pemeliharaan (Maks 20% BOS)</option>
                    <option value="Modal">Belanja Modal Sarpras</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    value={newItem.satuan}
                    onChange={e => setNewItem({ ...newItem, satuan: e.target.value })}
                    placeholder="e.g. Unit / Paket / Titik"
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Volume</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.volume}
                    onChange={e => setNewItem({ ...newItem, volume: Number(e.target.value) || 1 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Harga Satuan (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.hargaSatuan}
                    onChange={e => setNewItem({ ...newItem, hargaSatuan: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan / Urgensi</label>
                <input
                  type="text"
                  value={newItem.keterangan}
                  onChange={e => setNewItem({ ...newItem, keterangan: e.target.value })}
                  placeholder="e.g. Prioritas semester 1, untuk kenyamanan KBM"
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                >
                  Simpan Item
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
              RENCANA ANGGARAN BIAYA (RAB) SARANA DAN PRASARANA
            </h2>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
              TAHUN ANGGARAN {rabData.tahunAnggaran} | SUMBER DANA: {rabData.sumberDana.toUpperCase()}
            </h3>
            <p className="text-xs text-slate-600 italic font-serif mt-0.5">
              Standar ARKAS / Permendikdasmen No. 8 Thn 2026 (Pagu BOS: {formatRp(rabData.paguTotalBos)})
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white mb-4">
            <table className="w-full border-collapse text-[10px] font-serif">
              <thead>
                <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                  <th className="border border-slate-700 py-2 px-1 w-8">No</th>
                  <th className="border border-slate-700 py-2 px-2 w-32">Kode Rekening</th>
                  <th className="border border-slate-700 py-2 px-3 text-left">Uraian Rincian Belanja</th>
                  <th className="border border-slate-700 py-2 px-2 w-24">Jenis</th>
                  <th className="border border-slate-700 py-2 px-1 w-10">Vol</th>
                  <th className="border border-slate-700 py-2 px-2 w-14">Satuan</th>
                  <th className="border border-slate-700 py-2 px-2 text-right w-24">Harga Satuan</th>
                  <th className="border border-slate-700 py-2 px-2 text-right w-28">Total Anggaran</th>
                  <th className="border border-slate-700 py-2 px-2 text-left">Keterangan</th>
                  <th className="border border-slate-700 py-2 px-1 w-12 print:hidden font-sans">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rabData.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-indigo-50/20">
                    <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-200 py-1.5 px-2 font-mono text-[9px] text-slate-600">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.kodeRekening}
                          onChange={e => handleUpdateItemField(item.id, 'kodeRekening', e.target.value)}
                          className="w-full p-0.5 border border-slate-300 rounded text-[9px]"
                        />
                      ) : (
                        item.kodeRekening
                      )}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-3 font-medium text-slate-900">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.uraian}
                          onChange={e => handleUpdateItemField(item.id, 'uraian', e.target.value)}
                          className="w-full p-0.5 border border-slate-300 rounded text-[10px]"
                        />
                      ) : (
                        item.uraian
                      )}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-2 text-center">
                      {isEditMode ? (
                        <select
                          value={item.jenisBelanja}
                          onChange={e => handleUpdateItemField(item.id, 'jenisBelanja', e.target.value)}
                          className="w-full p-0.5 border border-slate-300 rounded text-[9px]"
                        >
                          <option value="Pemeliharaan">Pemeliharaan</option>
                          <option value="Modal">Modal</option>
                        </select>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          item.jenisBelanja === 'Pemeliharaan' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.jenisBelanja}
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-1 text-center">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={item.volume}
                          onChange={e => handleUpdateItemField(item.id, 'volume', Number(e.target.value) || 1)}
                          className="w-10 p-0.5 border border-slate-300 rounded text-center text-[10px]"
                        />
                      ) : (
                        item.volume
                      )}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-2 text-center text-slate-600">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.satuan}
                          onChange={e => handleUpdateItemField(item.id, 'satuan', e.target.value)}
                          className="w-14 p-0.5 border border-slate-300 rounded text-center text-[10px]"
                        />
                      ) : (
                        item.satuan
                      )}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-2 text-right">
                      {isEditMode ? (
                        <input
                          type="number"
                          value={item.hargaSatuan}
                          onChange={e => handleUpdateItemField(item.id, 'hargaSatuan', Number(e.target.value) || 0)}
                          className="w-20 p-0.5 border border-slate-300 rounded text-right text-[10px]"
                        />
                      ) : (
                        formatRp(item.hargaSatuan)
                      )}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-2 text-right font-bold text-slate-900">
                      {formatRp(item.volume * item.hargaSatuan)}
                    </td>
                    <td className="border border-slate-200 py-1.5 px-2 text-slate-600">
                      {isEditMode ? (
                        <input
                          type="text"
                          value={item.keterangan || ''}
                          onChange={e => handleUpdateItemField(item.id, 'keterangan', e.target.value)}
                          className="w-full p-0.5 border border-slate-300 rounded text-[10px]"
                        />
                      ) : (
                        item.keterangan || '-'
                      )}
                    </td>
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
              <tfoot>
                <tr className="bg-slate-100 font-bold font-sans">
                  <td colSpan={7} className="border border-slate-300 py-2 px-3 text-right text-slate-800">
                    TOTAL BELANJA PEMELIHARAAN (Maks 20% BOS):
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-right text-amber-700 font-serif font-bold">
                    {formatRp(totalPemeliharaan)}
                  </td>
                  <td colSpan={2} className="border border-slate-300 py-2 px-2 text-center text-xs text-slate-600">
                    {persenPemeliharaan}% dari BOS
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold font-sans">
                  <td colSpan={7} className="border border-slate-300 py-2 px-3 text-right text-slate-800">
                    TOTAL BELANJA MODAL SARPRAS:
                  </td>
                  <td className="border border-slate-300 py-2 px-2 text-right text-blue-700 font-serif font-bold">
                    {formatRp(totalModal)}
                  </td>
                  <td colSpan={2} className="border border-slate-300 py-2 px-2 text-center text-slate-500">-</td>
                </tr>
                <tr className="bg-slate-800 text-white font-bold font-sans">
                  <td colSpan={7} className="border border-slate-700 py-2 px-3 text-right tracking-wider">
                    TOTAL KESELURUHAN ALOKASI ANGGARAN SARPRAS:
                  </td>
                  <td className="border border-slate-700 py-2 px-2 text-right text-emerald-300 font-serif font-bold text-xs">
                    {formatRp(totalKeseluruhan)}
                  </td>
                  <td colSpan={2} className="border border-slate-700 py-2 px-2 text-center text-slate-300">
                    ARKAS
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Legalitas Tanda Tangan */}
          <div className="flex justify-between items-start mt-8 pt-4 font-serif text-xs px-8">
            <div className="text-left space-y-1">
              <p className="text-slate-600">Menyetujui,</p>
              <p className="font-bold text-slate-800">Kepala {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}</p>
              <div className="h-14"></div>
              <p className="font-bold underline text-slate-900 text-sm tracking-wide">{pengaturan.kepalaSekolah}</p>
              <p className="text-slate-600 text-[10px]">NIP. {pengaturan.nipKepalaSekolah || '....................................................'}</p>
            </div>

            <div className="text-right space-y-1">
              <p className="text-slate-600">Amonggedo, {rabData.tanggalDisusun || 'Januari 2026'}</p>
              <p className="font-bold text-slate-800">Bendahara BOS / Tim Sarpras</p>
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
