import React, { useState } from 'react';
import { BarangHabisPakai, PengambilanBHP, PengaturanSekolah, KategoriBHP } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  ClipboardList, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  Check, 
  Search, 
  Filter, 
  AlertCircle, 
  Download, 
  Calendar, 
  User, 
  Info,
  Layers,
  MapPin,
  FileDown,
  ChevronRight,
  TrendingDown,
  UploadCloud,
  Eye,
  Paperclip,
  X,
  Lock,
  Camera,
  Loader2,
  FolderOpen
} from 'lucide-react';

import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../assets/logoBase64';

const compressImage = (file: File, maxWidth: number = 800, maxHeight: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(e.target?.result as string || '');
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string || '');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      resolve('');
    };
    reader.readAsDataURL(file);
  });
};

interface BhpTabProps {
  bhp: BarangHabisPakai[];
  pengambilanBhp: PengambilanBHP[];
  pengaturan: PengaturanSekolah;
  onSaveBhp: (item: BarangHabisPakai) => Promise<void>;
  onDeleteBhp: (id: string) => Promise<void>;
  onSavePengambilanBhp: (pengambilan: PengambilanBHP) => Promise<void>;
  userRole?: 'admin' | 'guest';
}

export default function BhpTab({
  bhp,
  pengambilanBhp,
  pengaturan,
  onSaveBhp,
  onDeleteBhp,
  onSavePengambilanBhp,
  userRole = 'guest'
}: BhpTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'stok' | 'log'>('stok');
  
  // Search and Filter States
  const [searchBhp, setSearchBhp] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('Semua');
  const [searchLog, setSearchLog] = useState('');
  
  // Month & Year Filter for Log and Monthly Report
  const currentYear = new Date().getFullYear().toString();
  const currentMonthIdx = new Date().getMonth();
  const monthsList = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const [selectedMonth, setSelectedMonth] = useState<string>(monthsList[currentMonthIdx]);
  const [selectedYear, setSelectedYear] = useState<string>(currentYear);

  // Modal states
  const [isBhpModalOpen, setIsBhpModalOpen] = useState(false);
  const [editingBhp, setEditingBhp] = useState<BarangHabisPakai | null>(null);
  const [selectedBhpToDelete, setSelectedBhpToDelete] = useState<BarangHabisPakai | null>(null);
  const [isDeletingBhp, setIsDeletingBhp] = useState(false);
  const [isSavingBhp, setIsSavingBhp] = useState(false);
  
  const [isAmbilModalOpen, setIsAmbilModalOpen] = useState(false);
  const [selectedBhpForAmbil, setSelectedBhpForAmbil] = useState<BarangHabisPakai | null>(null);
  const [isSavingAmbil, setIsSavingAmbil] = useState(false);
  
  // Template Modal States (Fleksibel Multi-Kolom Barang & Orientasi)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateMode, setTemplateMode] = useState<'single' | 'multi'>('multi');
  const [templateV2Barang, setTemplateV2Barang] = useState('');
  const [multiItemsList, setMultiItemsList] = useState<string[]>([
    'Kertas HVS A4',
    'Spidol Snowman',
    'Pulpen ATK',
    'Sapu & Kebersihan'
  ]);
  const [newItemInput, setNewItemInput] = useState('');
  const [templateOrientation, setTemplateOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [templateTotalRows, setTemplateTotalRows] = useState<number>(37);
  const [isPreviewPdfModalOpen, setIsPreviewPdfModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string>('');

  const handleAddMultiItem = () => {
    const trimmed = newItemInput.trim();
    if (trimmed && !multiItemsList.includes(trimmed)) {
      setMultiItemsList([...multiItemsList, trimmed]);
      setNewItemInput('');
    }
  };

  const handleRemoveMultiItem = (indexToRemove: number) => {
    setMultiItemsList(multiItemsList.filter((_, idx) => idx !== indexToRemove));
  };
  
  // File Upload and Proof Viewer States
  const [buktiFileBase64, setBuktiFileBase64] = useState<string>('');
  const [buktiFileName, setBuktiFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewingBuktiLog, setViewingBuktiLog] = useState<PengambilanBHP | null>(null);

  // Form states - BHP
  const [bhpForm, setBhpForm] = useState({
    id: '',
    nama: '',
    merek: '',
    kategori: 'Alat Tulis Kantor (ATK)' as KategoriBHP,
    stokAwal: 10,
    stokMinimum: 3,
    satuan: 'Rim',
    lokasiPenyimpanan: '',
    catatan: '',
    fotoUrl: ''
  });

  // Form states - Pengambilan
  const [ambilForm, setAmbilForm] = useState({
    namaPenerima: '',
    jabatanPenerima: 'Guru' as 'Guru' | 'Staf TU' | 'Lainnya',
    tanggalAmbil: new Date().toISOString().split('T')[0],
    jumlahDiambil: 1,
    keterangan: ''
  });

  const KATEGORI_LIST: KategoriBHP[] = [
    'Alat Tulis Kantor (ATK)',
    'Bahan Kebersihan & Sanitasi',
    'Kebutuhan Dapur & Konsumsi',
    'Alat Pertanian & Taman',
    'Kesehatan (UKS/Obat-obatan)',
    'Lainnya'
  ];

  // Filtered BHP
  const filteredBhp = bhp.filter(item => {
    const matchesSearch = item.nama.toLowerCase().includes(searchBhp.toLowerCase()) || 
                          item.merek.toLowerCase().includes(searchBhp.toLowerCase()) ||
                          item.id.toLowerCase().includes(searchBhp.toLowerCase());
    const matchesCategory = categoryFilter === 'Semua' || item.kategori === categoryFilter;
    
    let matchesStatus = true;
    const ratio = item.stokAwal > 0 ? (item.stokSekarang / item.stokAwal) : 0;
    const minThreshold = (item.stokMinimum !== undefined && item.stokMinimum > 0)
      ? item.stokMinimum
      : Math.max(2, Math.ceil(item.stokAwal * 0.25));

    if (stockStatusFilter === 'Aman') {
      matchesStatus = item.stokSekarang > minThreshold && ratio > 0.5;
    } else if (stockStatusFilter === 'Kritis') {
      matchesStatus = item.stokSekarang <= minThreshold;
    } else if (stockStatusFilter === 'Hampir Habis') {
      matchesStatus = item.stokSekarang > 0 && ratio <= 0.5;
    } else if (stockStatusFilter === 'Habis') {
      matchesStatus = item.stokSekarang === 0;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Filtered Logs
  const filteredLogs = pengambilanBhp.filter(log => {
    const matchesSearch = log.namaPenerima.toLowerCase().includes(searchLog.toLowerCase()) ||
                          log.namaBhp.toLowerCase().includes(searchLog.toLowerCase()) ||
                          log.keterangan.toLowerCase().includes(searchLog.toLowerCase());
    
    // Date checks
    const logDate = new Date(log.tanggalAmbil);
    const logMonthName = monthsList[logDate.getMonth()];
    const logYear = logDate.getFullYear().toString();
    
    const matchesMonth = selectedMonth === 'Semua' || logMonthName === selectedMonth;
    const matchesYear = logYear === selectedYear;

    return matchesSearch && matchesMonth && matchesYear;
  });

  // Open Add/Edit BHP Modal
  const openBhpModal = (item?: BarangHabisPakai) => {
    if (item) {
      setEditingBhp(item);
      setBhpForm({
        id: item.id,
        nama: item.nama,
        merek: item.merek,
        kategori: item.kategori,
        stokAwal: item.stokAwal,
        stokMinimum: item.stokMinimum ?? Math.max(1, Math.ceil(item.stokAwal * 0.25)),
        satuan: item.satuan,
        lokasiPenyimpanan: item.lokasiPenyimpanan,
        catatan: item.catatan || '',
        fotoUrl: item.fotoUrl || ''
      });
    } else {
      setEditingBhp(null);
      const maxSeq = bhp.reduce((max, b) => {
        const parts = b.id.split('-');
        const num = parseInt(parts[parts.length - 1] || '0', 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextId = `BHP-2026-${String(Math.max(bhp.length + 1, maxSeq + 1)).padStart(4, '0')}`;
      setBhpForm({
        id: nextId,
        nama: '',
        merek: '',
        kategori: 'Alat Tulis Kantor (ATK)',
        stokAwal: 10,
        stokMinimum: 3,
        satuan: 'Rim',
        lokasiPenyimpanan: '',
        catatan: '',
        fotoUrl: ''
      });
    }
    setIsBhpModalOpen(true);
  };

  // Save BHP Handler
  const handleBhpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingBhp) return;
    if (!bhpForm.nama || !bhpForm.satuan || !bhpForm.lokasiPenyimpanan) {
      alert('Mohon isi semua field wajib!');
      return;
    }

    // Required photo validation as per: "untuk data barang habis pakai, tetap harus ada foto barang saat inputnya"
    if (!bhpForm.fotoUrl) {
      alert('Mohon unggah atau masukkan foto barang habis pakai terlebih dahulu!');
      return;
    }

    setIsSavingBhp(true);
    try {
      const itemToSave: BarangHabisPakai = {
        id: bhpForm.id,
        nama: bhpForm.nama,
        merek: bhpForm.merek || '-',
        kategori: bhpForm.kategori,
        stokAwal: Number(bhpForm.stokAwal),
        stokSekarang: editingBhp ? Math.min(Number(bhpForm.stokAwal), editingBhp.stokSekarang + (Number(bhpForm.stokAwal) - editingBhp.stokAwal)) : Number(bhpForm.stokAwal),
        stokMinimum: Number(bhpForm.stokMinimum || 2),
        satuan: bhpForm.satuan,
        lokasiPenyimpanan: bhpForm.lokasiPenyimpanan,
        catatan: bhpForm.catatan,
        fotoUrl: bhpForm.fotoUrl
      };

      // If editing, adjust current stock proportionally or keep it updated
      if (editingBhp) {
        const stockDifference = Number(bhpForm.stokAwal) - editingBhp.stokAwal;
        itemToSave.stokSekarang = Math.max(0, editingBhp.stokSekarang + stockDifference);
      }

      await onSaveBhp(itemToSave);
      setIsBhpModalOpen(false);
    } catch (err) {
      alert('Gagal menyimpan data barang habis pakai.');
    } finally {
      setIsSavingBhp(false);
    }
  };

  // Delete BHP Handler
  const handleDeleteBhpClick = (item: BarangHabisPakai) => {
    setSelectedBhpToDelete(item);
  };

  // Download empty form template Versi 1 (Formulir Individu Harian)
  const downloadBlankTemplatePDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Draw Kop Logos directly from base64
    try {
      doc.addImage(SULTRA_LOGO_BASE64, 'PNG', 15, 12, 18, 18);
      doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', 177, 12, 18, 18);
    } catch (e) {
      console.warn('Error drawing Kop logos', e);
    }

    // 1. Kop Surat
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', 105, 18, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 24, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text((pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase(), 105, 31, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, 105, 37, { align: 'center' });
    
    // Line dividers
    doc.setLineWidth(0.8);
    doc.line(15, 40, 195, 40);
    doc.setLineWidth(0.2);
    doc.line(15, 41.5, 195, 41.5);

    // 2. Title
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('FORMULIR BUKTI PENGAMBILAN BARANG HABIS PAKAI (BHP)', 105, 52, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('times', 'normal');
    doc.text('Harap diisi dengan lengkap dan ditandatangani sebelum pengambilan barang.', 105, 58, { align: 'center' });

    // 3. Form fields (dotted lines for manual writing)
    const startX = 25;
    let currentY = 72;
    const labelWidth = 55;
    const valueWidth = 110;

    const fields = [
      'Hari / Tanggal Pengambilan',
      'Nama Penerima (Guru / Staf)',
      'NIP / NUPTK / No. ID',
      'Jabatan / Unit Kerja',
      'Nama Barang BHP yang Diambil',
      'Jumlah Barang',
      'Kebutuhan / Keperluan Penggunaan'
    ];

    fields.forEach((field) => {
      doc.setFont('times', 'bold');
      doc.text(field, startX, currentY);
      doc.text(':', startX + labelWidth, currentY);
      
      // Draw dotted line
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(startX + labelWidth + 4, currentY, startX + labelWidth + valueWidth, currentY);
      
      currentY += 15;
    });

    // Reset line style
    doc.setLineDashPattern([], 0);

    // 4. Notes section
    currentY += 10;
    doc.setFillColor(245, 245, 245);
    doc.rect(startX, currentY, 160, 25, 'F');
    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.text('Catatan untuk Penerima:', startX + 5, currentY + 6);
    doc.text('- Setelah ditandatangani, formulir ini wajib diserahkan kepada Petugas Sarpras.', startX + 5, currentY + 12);
    doc.text('- Formulir yang telah diserahkan akan diarsipkan dan difoto/diunggah ke sistem e-Sarpras.', startX + 5, currentY + 18);

    // 5. Signature areas
    currentY += 40;
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Penerima Barang,', startX + 15, currentY);
    doc.text('Petugas Sarpras / Penanggung Jawab,', startX + 105, currentY);

    const signY = currentY + 25;
    doc.setFont('times', 'bold');
    doc.text('( ______________________ )', startX + 10, signY);
    doc.text(`( ${pengaturan.namaPetugasSarpras} )`, startX + 105, signY);
    
    doc.setFont('times', 'normal');
    doc.text('NIP. ___________________', startX + 10, signY + 5);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, startX + 105, signY + 5);

    doc.save('FORMULIR_KOSONG_AMBIL_BHP_V1.pdf');
  };

  // Helper to generate jsPDF instance for Versi 2 Template (Formulir Pembagian Kolektif Guru & Staf)
  const generateBlankTemplateV2PDFDoc = (
    mode: 'single' | 'multi' = templateMode,
    customSingleName: string = templateV2Barang,
    itemsList: string[] = multiItemsList,
    orientation: 'portrait' | 'landscape' = templateOrientation,
    rowCount: number = templateTotalRows
  ) => {
    const isLandscape = orientation === 'landscape';
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;

    // Draw Kop Logos directly from base64
    const logoLeftX = 15;
    const logoRightX = pageWidth - 15 - 18;
    try {
      doc.addImage(SULTRA_LOGO_BASE64, 'PNG', logoLeftX, 12, 18, 18);
      doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', logoRightX, 12, 18, 18);
    } catch (e) {
      console.warn('Error drawing Kop logos V2', e);
    }

    // 1. Kop Surat
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', centerX, 18, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, 24, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text((pengaturan.namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase(), centerX, 31, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, centerX, 37, { align: 'center' });
    
    // Line dividers
    doc.setLineWidth(0.8);
    doc.line(15, 40, pageWidth - 15, 40);
    doc.setLineWidth(0.2);
    doc.line(15, 41.5, pageWidth - 15, 41.5);

    // 2. Title & Subtitle Versi 2
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('DAFTAR BUKTI PEMBAGIAN / PENGAMBILAN BARANG HABIS PAKAI (BHP)', centerX, 49, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.text('FORMAT KOLEKTIF PEMBAGIAN GURU & STAF (SEMESTER BARU)', centerX, 54, { align: 'center' });

    // Metadata Sub-header
    doc.setFontSize(9);
    doc.setFont('times', 'bold');
    doc.text('Semester / Tahun Pelajaran : .................... / ....................', 15, 62);
    doc.text(`Tanggal Pembagian / Distribusi : ....................`, isLandscape ? 180 : 120, 62);
    
    if (mode === 'single') {
      const singleItemTitle = customSingleName ? customSingleName.toUpperCase() : 'KERTAS HVS / SPIDOL / ATK / KEBERSIHAN';
      doc.text(`Nama Barang Habis Pakai : ${singleItemTitle}`, 15, 67);
    } else {
      const displayItems = itemsList.length > 0 ? itemsList.join(', ') : 'Kertas HVS, Spidol, Pulpen, Sapu';
      doc.text(`Rincian Jenis Barang Massal (${itemsList.length} Jenis): ${displayItems}`, 15, 67);
    }

    // 3. Setup Columns & Body Rows with Alternating Zig-Zag Signatures
    let headCols: string[] = [];
    let bodyRows: any[][] = [];
    let colStyles: Record<number, any> = {};

    if (mode === 'single') {
      headCols = ['NO', 'NAMA GURU / STAF', 'JUMLAH', 'TANGGAL PENGAMBILAN', 'TANDA TANGAN'];
      
      bodyRows = Array.from({ length: rowCount }, (_, idx) => {
        const num = idx + 1;
        // Zig-zag signature layout: odd left-aligned, even pushed significantly right
        const sigText = idx % 2 === 0 
          ? `${num}. ....................` 
          : `                         ${num}. ....................`;
        return [num, '', '', '', sigText];
      });

      if (isLandscape) {
        colStyles = {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 100 },
          2: { cellWidth: 30, halign: 'center' },
          3: { cellWidth: 40, halign: 'center' },
          4: { cellWidth: 85, halign: 'left' }
        };
      } else {
        colStyles = {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 68 },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 28, halign: 'center' },
          4: { cellWidth: 52, halign: 'left' }
        };
      }
    } else {
      // Multi-Item Columns Matrix
      const safeItems = itemsList.length > 0 ? itemsList : ['Kertas HVS A4', 'Spidol Boardmarker', 'Pulpen ATK', 'Sapu Kebersihan'];
      headCols = ['NO', 'NAMA GURU / STAF', ...safeItems.map(i => i.toUpperCase()), 'TANGGAL PENGAMBILAN', 'TANDA TANGAN'];

      bodyRows = Array.from({ length: rowCount }, (_, idx) => {
        const num = idx + 1;
        // Pushed even numbers further to the right side
        const sigText = idx % 2 === 0 
          ? `${num}. ....................` 
          : `                   ${num}. ....................`;
        return [
          num,
          '',
          ...safeItems.map(() => ''), // blank cells for quantity/check marks
          '',
          sigText
        ];
      });

      const printableWidth = pageWidth - 30; // 15mm margins left & right
      const noWidth = 10;
      const tglWidth = isLandscape ? 32 : 26;
      const ttdWidth = isLandscape ? 58 : 44;
      const namaWidth = isLandscape ? 52 : 38;
      
      const fixedWidthTotal = noWidth + namaWidth + tglWidth + ttdWidth;
      const remainingWidthForItems = Math.max(30, printableWidth - fixedWidthTotal);
      const perItemWidth = Math.max(12, remainingWidthForItems / safeItems.length);

      colStyles[0] = { cellWidth: noWidth, halign: 'center' };
      colStyles[1] = { cellWidth: namaWidth };
      
      safeItems.forEach((_, idx) => {
        colStyles[2 + idx] = { cellWidth: perItemWidth, halign: 'center' };
      });

      const tglColIdx = 2 + safeItems.length;
      const ttdColIdx = 3 + safeItems.length;
      colStyles[tglColIdx] = { cellWidth: tglWidth, halign: 'center' };
      colStyles[ttdColIdx] = { cellWidth: ttdWidth, halign: 'left' };
    }

    const ttdColIdxFinal = mode === 'single' ? 4 : (3 + (itemsList.length > 0 ? itemsList.length : 4));

    autoTable(doc, {
      startY: 71,
      head: [headCols],
      body: bodyRows,
      tableLineColor: [0, 0, 0],
      tableLineWidth: 0.5,
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === ttdColIdxFinal) {
          if (data.row.index % 2 === 1) { // Even numbers: row 1 (num 2), row 3 (num 4)
            const padLeft = isLandscape ? (mode === 'single' ? 42 : 28) : (mode === 'single' ? 25 : 20);
            data.cell.styles.cellPadding = { top: 1, bottom: 1, left: padLeft, right: 2 };
          } else {
            data.cell.styles.cellPadding = { top: 1, bottom: 1, left: 3, right: 2 };
          }
        }
      },
      styles: {
        font: 'times',
        fontSize: mode === 'multi' && itemsList.length > 5 ? 7.5 : 8.5,
        minCellHeight: 6.8,
        valign: 'middle',
        overflow: 'linebreak',
        lineColor: [0, 0, 0], // Sharp black lines for crisp printing
        lineWidth: 0.5,
        textColor: [0, 0, 0]
      },
      headStyles: {
        fillColor: [235, 235, 235], // Light gray header with solid black border
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        lineColor: [0, 0, 0],
        lineWidth: 0.5
      },
      bodyStyles: {
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
        textColor: [0, 0, 0]
      },
      columnStyles: colStyles,
      margin: { left: 15, right: 15 },
      theme: 'grid'
    });

    // 4. Signatures at bottom
    let finalY = (doc as any).lastAutoTable?.finalY || 240;
    const pageHeight = doc.internal.pageSize.getHeight();
    if (finalY > pageHeight - 42) {
      doc.addPage();
      finalY = 25;
    } else {
      finalY += 6;
    }

    const leftSignX = 20;
    const rightSignX = isLandscape ? 200 : 125;

    doc.setFont('times', 'normal');
    doc.setFontSize(9.5);
    doc.text('Mengetahui,', leftSignX, finalY);
    doc.text('Kepala Sekolah,', leftSignX, finalY + 5);

    // Document location date format: Amonggedo, ........................ 2026
    doc.text('Amonggedo, ........................ 2026', rightSignX, finalY);
    doc.text('Petugas / Penanggung Jawab Sarpras,', rightSignX, finalY + 5);

    const signY = finalY + 22;
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah, leftSignX, signY);
    doc.text(pengaturan.namaPetugasSarpras, rightSignX, signY);

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, leftSignX, signY + 4);
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, rightSignX, signY + 4);

    return doc;
  };

  // Download empty form template Versi 2 (Formulir Pembagian Kolektif Guru & Staf)
  const downloadBlankTemplateV2PDF = (
    mode: 'single' | 'multi' = templateMode,
    customSingleName: string = templateV2Barang,
    itemsList: string[] = multiItemsList,
    orientation: 'portrait' | 'landscape' = templateOrientation,
    rowCount: number = templateTotalRows
  ) => {
    const doc = generateBlankTemplateV2PDFDoc(mode, customSingleName, itemsList, orientation, rowCount);
    const modeSuffix = mode === 'multi' ? 'MULTI_KOLOM' : 'SINGLE_KOLOM';
    const filename = `TEMPLATE_BUKTI_AMBIL_V2_${modeSuffix}_${orientation.toUpperCase()}.pdf`;
    doc.save(filename);
  };

  // Preview PDF in modal before download
  const previewBlankTemplateV2PDF = (
    mode: 'single' | 'multi' = templateMode,
    customSingleName: string = templateV2Barang,
    itemsList: string[] = multiItemsList,
    orientation: 'portrait' | 'landscape' = templateOrientation,
    rowCount: number = templateTotalRows
  ) => {
    const doc = generateBlankTemplateV2PDFDoc(mode, customSingleName, itemsList, orientation, rowCount);
    const blobUrl = doc.output('bloburl');
    setPreviewPdfUrl(blobUrl.toString());
    setIsPreviewPdfModalOpen(true);
  };

  // Process uploaded files and convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const processUploadedFile = async (file: File) => {
    // Foto dari kamera HP (PNG/JPG) dikompres otomatis oleh sistem.
    // Jika berupa dokumen non-gambar (seperti PDF), berikan batas 15MB.
    if (!file.type.startsWith('image/') && file.size > 15 * 1024 * 1024) {
      alert('Ukuran file dokumen PDF maksimal adalah 15MB!');
      return;
    }
    setBuktiFileName(file.name);

    if (file.type.startsWith('image/')) {
      try {
        const compressed = await compressImage(file, 900, 900, 0.7);
        setBuktiFileBase64(compressed);
      } catch (err) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setBuktiFileBase64(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } else {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBuktiFileBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Open Ambil (Disbursement) Modal
  const openAmbilModal = (item: BarangHabisPakai) => {
    if (item.stokSekarang === 0) {
      alert('Stok barang sudah habis! Tidak dapat melakukan pengambilan.');
      return;
    }
    setSelectedBhpForAmbil(item);
    setBuktiFileBase64('');
    setBuktiFileName('');
    setAmbilForm({
      namaPenerima: '',
      jabatanPenerima: 'Guru',
      tanggalAmbil: new Date().toISOString().split('T')[0],
      jumlahDiambil: 1,
      keterangan: ''
    });
    setIsAmbilModalOpen(true);
  };

  // Submit Ambil Handler
  const handleAmbilSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingAmbil || !selectedBhpForAmbil) return;
    if (!ambilForm.namaPenerima || !ambilForm.keterangan) {
      alert('Mohon isi nama penerima dan alasan keperluan!');
      return;
    }
    if (ambilForm.jumlahDiambil <= 0) {
      alert('Jumlah pengambilan harus lebih dari 0!');
      return;
    }
    if (ambilForm.jumlahDiambil > selectedBhpForAmbil.stokSekarang) {
      alert(`Stok tidak mencukupi! Persediaan saat ini hanya ${selectedBhpForAmbil.stokSekarang} ${selectedBhpForAmbil.satuan}.`);
      return;
    }

    setIsSavingAmbil(true);
    try {
      const maxLogSeq = pengambilanBhp.reduce((max, log) => {
        const parts = log.id.split('-');
        const num = parseInt(parts[parts.length - 1] || '0', 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const nextLogId = `AMB-2026-${String(Math.max(pengambilanBhp.length + 1, maxLogSeq + 1)).padStart(4, '0')}`;
      const newLog: PengambilanBHP = {
        id: nextLogId,
        bhpId: selectedBhpForAmbil.id,
        namaBhp: selectedBhpForAmbil.nama,
        namaPenerima: ambilForm.namaPenerima,
        jabatanPenerima: ambilForm.jabatanPenerima,
        tanggalAmbil: ambilForm.tanggalAmbil,
        jumlahDiambil: Number(ambilForm.jumlahDiambil),
        satuan: selectedBhpForAmbil.satuan,
        keterangan: ambilForm.keterangan,
        buktiFisik: buktiFileBase64 || undefined
      };

      await onSavePengambilanBhp(newLog);
      setIsAmbilModalOpen(false);
      
      // Switch automatically to log tab after saving
      setActiveSubTab('log');
    } catch (err: any) {
      console.error('Error submitting pengambilan BHP:', err);
      alert('Gagal memproses transaksi pengambilan BHP: ' + (err?.message || 'Terjadi kesalahan.'));
    } finally {
      setIsSavingAmbil(false);
    }
  };

  // PDF Monthly Report Generation
  const exportMonthlyBhpPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Draw Kop Logos directly from base64
    try {
      doc.addImage(SULTRA_LOGO_BASE64, 'PNG', 15, 12, 18, 18);
      const schoolLogo = (pengaturan.logoUrl && pengaturan.logoUrl.startsWith('data:image')) ? pengaturan.logoUrl : SCHOOL_LOGO_BASE64;
      doc.addImage(schoolLogo, 'PNG', 177, 12, 18, 18);
    } catch (e) {
      console.warn('Error drawing Kop logos for BHP Rekap', e);
    }

    // 1. Kop Surat (Official Letterhead)
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', 105, 15, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 21, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(pengaturan.namaSekolah.toUpperCase(), 105, 28, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, 105, 34, { align: 'center' });
    
    // Letterhead Dividers
    doc.setLineWidth(0.8);
    doc.line(15, 37, 195, 37);
    doc.setLineWidth(0.2);
    doc.line(15, 38.5, 195, 38.5);

    // 2. Report Title
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`LAPORAN BULANAN PENGGUNAAN BARANG HABIS PAKAI (BHP)`, 105, 48, { align: 'center' });
    doc.text(`Periode Bulan: ${selectedMonth} ${selectedYear}`, 105, 54, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(8.5);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 15, 63);

    // 3. Stock Summary Table
    // We list all BHP items, and count how many were taken this month
    const summaryRows = bhp.map((item, idx) => {
      const takenInMonth = pengambilanBhp
        .filter(log => {
          const logDate = new Date(log.tanggalAmbil);
          const logMonthName = monthsList[logDate.getMonth()];
          const logYear = logDate.getFullYear().toString();
          return log.bhpId === item.id && logMonthName === selectedMonth && logYear === selectedYear;
        })
        .reduce((sum, curr) => sum + curr.jumlahDiambil, 0);

      return [
        idx + 1,
        item.id,
        item.nama,
        item.kategori,
        item.stokAwal,
        takenInMonth,
        item.stokSekarang,
        item.satuan,
        item.lokasiPenyimpanan
      ];
    });

    autoTable(doc, {
      startY: 67,
      head: [['No', 'Kode BHP', 'Nama Barang', 'Kategori', 'Stok Awal', 'Keluar', 'Sisa', 'Satuan', 'Penyimpanan']],
      body: summaryRows,
      styles: { font: 'times', fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229], halign: 'center' }, // Indigo-600
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 15, halign: 'center' },
        7: { cellWidth: 15, halign: 'center' }
      }
    });

    let currentY = (doc as any).lastAutoTable.finalY + 12;

    // 4. Detailed Disbursement Logs Table
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.text('RINCIAN LOG BUKTI PENGAMBILAN (BARANG KELUAR) BULAN INI', 15, currentY);

    const logRows = filteredLogs.map((log, idx) => [
      idx + 1,
      new Date(log.tanggalAmbil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      log.namaBhp,
      log.namaPenerima,
      log.jabatanPenerima,
      `${log.jumlahDiambil} ${log.satuan}`,
      log.keterangan
    ]);

    autoTable(doc, {
      startY: currentY + 4,
      head: [['No', 'Tgl Ambil', 'Nama Barang', 'Nama Penerima', 'Jabatan', 'Jumlah', 'Keperluan / Keterangan']],
      body: logRows.length > 0 ? logRows : [['-', '-', 'Tidak ada transaksi barang keluar untuk bulan ini.', '-', '-', '-', '-']],
      styles: { font: 'times', fontSize: 8 },
      headStyles: { fillColor: [30, 41, 59], halign: 'center' }, // Slate-800
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Check if we need to add a page for signatures
    if (currentY > 230) {
      doc.addPage();
      currentY = 25;
    }

    // 5. Official Signature Blocks (Tanda Tangan)
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Mengetahui,', 15, currentY);
    doc.text(`Kepala Sekolah ${pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}`, 15, currentY + 5);
    
    doc.text('Amonggedo, ....................................', 130, currentY);
    doc.text('Petugas Sarpras / Penanggung Jawab,', 130, currentY + 5);

    const signY = currentY + 22;
    
    // Draw Name of Headmaster
    doc.setFont('times', 'bold');
    doc.text(pengaturan.kepalaSekolah, 15, signY);
    doc.line(15, signY + 1, 85, signY + 1);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, 15, signY + 5);

    // Draw Name of Sarpras Officer
    doc.setFont('times', 'bold');
    doc.text(pengaturan.namaPetugasSarpras, 130, signY);
    doc.line(130, signY + 1, 190, signY + 1);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, 130, signY + 5);

    doc.save(`LAPORAN_BULANAN_BHP_${selectedMonth.toUpperCase()}_${selectedYear}.pdf`);
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Info Banner explaining BHP concept */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex gap-3.5">
          <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shrink-0">
            <Info size={22} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Barang Habis Pakai (BHP) &amp; Consumables
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">
              BHP merupakan persediaan sekolah yang habis digunakan harian (kertas, spidol, sabun, gas kompor, obat kebersihan). 
              Gunakan pencatatan ini saat guru atau staf mengambil barang jatah mengajar/operasional harian agar tercatat otomatis <strong>(bukan dipinjam)</strong>.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex-1 md:flex-none py-2 px-4 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition shadow-xs hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
            title="Unduh Formulir Bukti Ambil Kosong (Versi 1 Individu atau Versi 2 Kolektif Guru)"
          >
            <FileDown size={14} className="text-indigo-600" />
            Template Bukti Ambil (PDF)
          </button>
          
          <button
            onClick={() => openBhpModal()}
            className="flex-1 md:flex-none py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-sm hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus size={14} />
            BHP Baru
          </button>
        </div>
      </div>

      {/* Primary Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveSubTab('stok')}
          className={`px-5 py-3 text-xs font-bold tracking-wide border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'stok'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Package size={16} />
          Persediaan Stok BHP ({bhp.length})
        </button>
        <button
          onClick={() => setActiveSubTab('log')}
          className={`px-5 py-3 text-xs font-bold tracking-wide border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'log'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <ClipboardList size={16} />
          Log Pengambilan Guru/Staf ({pengambilanBhp.length})
        </button>
      </div>

      {/* Sub-Tab 1: PERSIDIAAN STOK BHP */}
      {activeSubTab === 'stok' && (
        <div className="space-y-5">
          
          {/* Controls Bar */}
          <div className="flex flex-col xl:flex-row gap-3">
            <div className="flex-1 relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Cari nama barang, merek, atau kode BHP..."
                value={searchBhp}
                onChange={(e) => setSearchBhp(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-xs"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-100 rounded-xl">
                <Filter size={14} className="text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kategori:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Kategori</option>
                  {KATEGORI_LIST.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 border border-slate-100 rounded-xl">
                <Layers size={14} className="text-slate-400" />
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kondisi Stok:</span>
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Semua">Semua Tingkat</option>
                  <option value="Aman">Stok Aman</option>
                  <option value="Kritis">Kritis / Batas Minimum (Restock)</option>
                  <option value="Hampir Habis">Hampir Habis (&le;50%)</option>
                  <option value="Habis">Habis (0)</option>
                </select>
              </div>
            </div>
          </div>

          {/* BHP Card Grid */}
          {filteredBhp.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredBhp.map((item) => {
                const ratio = item.stokAwal > 0 ? (item.stokSekarang / item.stokAwal) : 0;
                const minThreshold = (item.stokMinimum !== undefined && item.stokMinimum > 0)
                  ? item.stokMinimum
                  : Math.max(2, Math.ceil(item.stokAwal * 0.25));
                const isOutOfStock = item.stokSekarang === 0;
                const isCriticalStock = !isOutOfStock && item.stokSekarang <= minThreshold;
                const isLowStock = !isOutOfStock && !isCriticalStock && ratio <= 0.5;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-2xl border overflow-hidden shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200 ${
                      isOutOfStock ? 'border-rose-200 ring-1 ring-rose-300/30' :
                      isCriticalStock ? 'border-amber-200 ring-1 ring-amber-300/30' :
                      'border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {/* Card Image section */}
                    <div className="relative h-40 bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                      {item.fotoUrl ? (
                        <img
                          src={item.fotoUrl}
                          alt={item.nama}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-slate-400 flex flex-col items-center">
                          <Package size={32} className="opacity-30 mb-1" />
                          <span className="text-[10px] font-medium text-slate-400">Foto Tidak Tersedia</span>
                        </div>
                      )}

                      {/* Top Badges Row over image */}
                      <span className="absolute top-3 left-3 text-[9px] font-extrabold text-indigo-600 bg-white/90 px-2 py-1 rounded-lg tracking-wider uppercase shadow-xs">
                        {item.id}
                      </span>
                      
                      <span className={`absolute top-3 right-3 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs ${
                        isOutOfStock ? 'text-rose-600 bg-rose-50 border border-rose-200' :
                        isCriticalStock ? 'text-rose-700 bg-amber-50 border border-amber-200 animate-pulse' :
                        isLowStock ? 'text-amber-600 bg-white/90' :
                        'text-emerald-600 bg-white/90'
                      }`}>
                        {isOutOfStock ? 'Habis (0)' : isCriticalStock ? `Mencapai Min (${item.stokSekarang}/${minThreshold})` : isLowStock ? 'Hampir Habis' : 'Stok Aman'}
                      </span>

                      {/* Category Pill */}
                      <span className="absolute bottom-3 left-3 text-[9px] font-bold bg-slate-900/85 text-white px-2 py-0.5 rounded-md backdrop-blur-xs">
                        {item.kategori}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        {/* Item Details */}
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-800 line-clamp-1">{item.nama}</h3>
                          <p className="text-xs text-slate-400 mt-0.5 font-medium">Merek: {item.merek}</p>
                          
                          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-slate-500 font-semibold bg-slate-50 py-1 px-2.5 rounded-lg w-fit">
                            <MapPin size={11} className="text-slate-400" />
                            <span>{item.lokasiPenyimpanan}</span>
                          </div>
                        </div>

                      {/* Stock Progress Indicators */}
                      <div className="mt-5 space-y-2">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-slate-400 font-medium">
                            Tingkat Persediaan {item.stokMinimum !== undefined ? `(Min: ${item.stokMinimum})` : ''}
                          </span>
                          <span className={`font-bold ${isOutOfStock ? 'text-rose-600' : isCriticalStock ? 'text-rose-600' : 'text-slate-700'}`}>
                            {item.stokSekarang} / {item.stokAwal} <span className="text-[10px] text-slate-400 font-medium">{item.satuan}</span>
                          </span>
                        </div>
                        
                        {/* Custom visual progress bar */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOutOfStock ? 'w-0 bg-rose-500' :
                              isCriticalStock ? 'bg-rose-500' :
                              isLowStock ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                        
                        {isCriticalStock && (
                          <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1 mt-1">
                            <AlertCircle size={11} />
                            <span>Stok sudah di bawah batas minimum ({minThreshold} {item.satuan})!</span>
                          </p>
                        )}

                        {item.catatan && (
                          <p className="text-[10px] text-slate-400 italic line-clamp-1 mt-2">
                            * {item.catatan}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer Action Buttons */}
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2">
                      <button
                        onClick={() => openAmbilModal(item)}
                        disabled={isOutOfStock}
                        className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          isOutOfStock 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-200'
                        }`}
                        title="Catat pengambilan barang oleh Guru / Staf"
                      >
                        <TrendingDown size={13} />
                        Ambil Jatah
                      </button>
                      
                      {userRole === 'admin' && (
                        <>
                          <button
                            onClick={() => openBhpModal(item)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition cursor-pointer"
                            title="Edit detail barang"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => handleDeleteBhpClick(item)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Hapus barang dari sistem"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 py-12 text-center text-slate-400">
              <Package size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-bold">Tidak ada barang habis pakai ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter kategori Anda.</p>
            </div>
          )}

        </div>
      )}

      {/* Sub-Tab 2: LOG PENGAMBILAN GURU / STAF */}
      {activeSubTab === 'log' && (
        <div className="space-y-5">
          
          {/* Header Controls for Logs & PDF export */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Filter Date Row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <Calendar size={14} className="text-indigo-500" />
                <span>Bulan Pelaporan:</span>
              </div>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Semua">Semua Bulan</option>
                {monthsList.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            {/* Print button */}
            <button
              onClick={exportMonthlyBhpPDF}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-sm hover:scale-102 active:scale-98 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              title="Ekspor Laporan Bulanan BHP (PDF)"
            >
              <Download size={14} />
              Cetak Laporan Bulanan (PDF)
            </button>

          </div>

          {/* Search bar inside logs */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Cari nama penerima, nama barang, atau keterangan pengambilan..."
              value={searchLog}
              onChange={(e) => setSearchLog(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition shadow-xs"
            />
          </div>

          {/* Table list of logs */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-4 px-5 text-center w-12">No</th>
                    <th className="py-4 px-4 w-32">ID Log</th>
                    <th className="py-4 px-4 w-36">Tanggal Ambil</th>
                    <th className="py-4 px-4">Barang Habis Pakai</th>
                    <th className="py-4 px-4">Nama Penerima</th>
                    <th className="py-4 px-4">Jabatan</th>
                    <th className="py-4 px-4 text-center">Jumlah Diambil</th>
                    <th className="py-4 px-5">Keperluan / Catatan</th>
                    <th className="py-4 px-4 text-center w-28">Bukti Arsip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, idx) => (
                      <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-5 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-4 px-4 text-slate-400 font-semibold font-mono">{log.id}</td>
                        <td className="py-4 px-4">
                          {new Date(log.tanggalAmbil).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="py-4 px-4 font-bold text-slate-800">{log.namaBhp}</td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <User size={12} className="text-slate-400" />
                            <span className="font-bold text-slate-800">{log.namaPenerima}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.jabatanPenerima === 'Guru' ? 'bg-indigo-50 text-indigo-600' :
                            log.jabatanPenerima === 'Staf TU' ? 'bg-amber-50 text-amber-600' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {log.jabatanPenerima}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center font-bold text-rose-600">
                          - {log.jumlahDiambil} <span className="text-[10px] text-slate-400 font-medium">{log.satuan}</span>
                        </td>
                        <td className="py-4 px-5 text-slate-500 italic max-w-xs truncate" title={log.keterangan}>
                          {log.keterangan}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {log.buktiFisik ? (
                            <button
                              onClick={() => setViewingBuktiLog(log)}
                              className="inline-flex items-center gap-1 py-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded-lg transition cursor-pointer"
                              title="Lihat Bukti Pengambilan Fisik"
                            >
                              <Eye size={12} />
                              Lihat Bukti
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tidak ada</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 bg-white">
                        <ClipboardList size={32} className="mx-auto mb-3 text-slate-300" />
                        <p className="text-xs font-bold">Tidak ada log pengambilan untuk periode terpilih</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Semua pengambilan barang akan tercatat di log sirkulasi ini.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DELETE BHP */}
      <AnimatePresence>
        {selectedBhpToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative border border-slate-100"
            >
              <button
                onClick={() => setSelectedBhpToDelete(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-2 text-rose-600 font-extrabold text-base">
                <Trash2 size={22} />
                <h3>Hapus Barang Persediaan</h3>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 my-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Apakah Anda yakin ingin menghapus barang berikut dari persediaan BHP?
                </p>
                <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-rose-100 text-xs font-semibold text-slate-800 flex justify-between items-center">
                  <span>{selectedBhpToDelete.nama}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedBhpToDelete.id}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isDeletingBhp}
                  onClick={() => setSelectedBhpToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeletingBhp}
                  onClick={async () => {
                    const id = selectedBhpToDelete.id;
                    try {
                      setIsDeletingBhp(true);
                      await onDeleteBhp(id);
                      setSelectedBhpToDelete(null);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setIsDeletingBhp(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {isDeletingBhp ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span>Ya, Hapus Barang</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 1: ADD / EDIT BHP ITEM */}
      {isBhpModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  {editingBhp ? 'Edit Barang Habis Pakai' : 'Tambah Persediaan BHP Baru'}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Masukkan data inventaris habis pakai sekolah</p>
              </div>
              <span className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                {bhpForm.id}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleBhpSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Barang *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kertas HVS A4 80gsm, Spidol Boardmarker, dll."
                  value={bhpForm.nama}
                  onChange={(e) => setBhpForm({ ...bhpForm, nama: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Merek / Pabrikan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Snowman, SiDU, Sleek"
                    value={bhpForm.merek}
                    onChange={(e) => setBhpForm({ ...bhpForm, merek: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Satuan Persediaan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rim, Pcs, Botol, Tabung"
                    value={bhpForm.satuan}
                    onChange={(e) => setBhpForm({ ...bhpForm, satuan: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kategori Barang *</label>
                <select
                  value={bhpForm.kategori}
                  onChange={(e) => setBhpForm({ ...bhpForm, kategori: e.target.value as KategoriBHP })}
                  className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {KATEGORI_LIST.map((kat) => (
                    <option key={kat} value={kat}>{kat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stok Awal Semester *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={bhpForm.stokAwal}
                    onChange={(e) => setBhpForm({ ...bhpForm, stokAwal: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Batas Minimum *</span>
                    <span className="text-[9px] text-slate-400 font-normal">Peringatan restock</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={bhpForm.stokMinimum}
                    onChange={(e) => setBhpForm({ ...bhpForm, stokMinimum: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-rose-200 bg-rose-50/20 rounded-xl text-xs font-medium focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lokasi Penyimpanan Gudang *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Lemari Kaca Tata Usaha, Gudang Sarpras Belakang"
                  value={bhpForm.lokasiPenyimpanan}
                  onChange={(e) => setBhpForm({ ...bhpForm, lokasiPenyimpanan: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Foto Barang Habis Pakai Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Foto Barang BHP *</label>
                {bhpForm.fotoUrl ? (
                  <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                    <img
                      src={bhpForm.fotoUrl}
                      alt="Pratinjau Foto Barang"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setBhpForm(prev => ({ ...prev, fotoUrl: '' }))}
                      className="absolute top-3 right-3 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg transition cursor-pointer"
                      title="Hapus Foto"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col items-center justify-center text-center hover:bg-indigo-50/20 hover:border-indigo-200 transition">
                      <Camera size={28} className="text-slate-400 mb-2" />
                      <p className="text-xs font-bold text-slate-600">Ambil Foto atau Unggah Berkas</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Mendukung PNG, JPG, JPEG (Dikompres otomatis oleh sistem)</p>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 shadow-xs cursor-pointer transition flex items-center gap-1.5" title="Pilih foto dari Galeri / Folder HP">
                          <FolderOpen size={13} className="text-slate-500" />
                          <span>Pilih Galeri / Folder</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file);
                                  setBhpForm(prev => ({ ...prev, fotoUrl: compressed }));
                                } catch (err) {
                                  console.error('Error compressing photo:', err);
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>

                        <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-bold shadow-xs cursor-pointer transition flex items-center gap-1.5" title="Ambil foto dengan Kamera HP">
                          <Camera size={13} />
                          <span>Ambil Kamera</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const compressed = await compressImage(file);
                                  setBhpForm(prev => ({ ...prev, fotoUrl: compressed }));
                                } catch (err) {
                                  console.error('Error compressing photo:', err);
                                }
                              }
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-slate-100"></div>
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                        <span className="bg-white px-2 text-slate-300">Atau masukkan link gambar</span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Masukkan URL foto (e.g. https://images.unsplash.com/...)"
                      value={bhpForm.fotoUrl}
                      onChange={(e) => setBhpForm(prev => ({ ...prev, fotoUrl: e.target.value }))}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Tulis kegunaan khusus atau deskripsi ringkas..."
                  value={bhpForm.catatan}
                  onChange={(e) => setBhpForm(prev => ({ ...prev, catatan: e.target.value }))}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBhpModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} />
                  Simpan Barang
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CATAT PENGAMBILAN (BARANG KELUAR) */}
      {isAmbilModalOpen && selectedBhpForAmbil && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  Catat Pengambilan Barang
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Guru mengambil jatah/persediaan bahan habis pakai</p>
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg">
                BUKTI KELUAR
              </span>
            </div>

            {/* Body Form */}
            <form onSubmit={handleAmbilSubmit} className="p-6 space-y-4 flex-1 overflow-y-auto">
              
              {/* Target info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/60 space-y-1.5">
                <span className="text-[9px] font-extrabold text-indigo-600 bg-white border border-indigo-100/50 px-2 py-0.5 rounded-md tracking-wider">
                  {selectedBhpForAmbil.id}
                </span>
                <h4 className="font-extrabold text-xs text-slate-800">{selectedBhpForAmbil.nama}</h4>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/50 mt-1">
                  <span>Persediaan Saat Ini:</span>
                  <span className="font-bold text-slate-700">
                    {selectedBhpForAmbil.stokSekarang} {selectedBhpForAmbil.satuan}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Penerima *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Lengkap Guru / Staf Penerima..."
                  value={ambilForm.namaPenerima}
                  onChange={(e) => setAmbilForm({ ...ambilForm, namaPenerima: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jabatan Penerima *</label>
                  <select
                    value={ambilForm.jabatanPenerima}
                    onChange={(e) => setAmbilForm({ ...ambilForm, jabatanPenerima: e.target.value as any })}
                    className="w-full px-3.5 py-2 border border-slate-200 bg-white rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="Guru">Guru</option>
                    <option value="Staf TU">Staf TU</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Ambil *</label>
                  <input
                    type="date"
                    required
                    value={ambilForm.tanggalAmbil}
                    onChange={(e) => setAmbilForm({ ...ambilForm, tanggalAmbil: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jumlah Diambil *</label>
                  <span className="text-[10px] text-indigo-500 font-semibold italic">Satuan: {selectedBhpForAmbil.satuan}</span>
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedBhpForAmbil.stokSekarang}
                  value={ambilForm.jumlahDiambil}
                  onChange={(e) => setAmbilForm({ ...ambilForm, jumlahDiambil: Number(e.target.value) })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  * Stok sisa setelah diambil: <strong className="text-slate-600">{Math.max(0, selectedBhpForAmbil.stokSekarang - ambilForm.jumlahDiambil)}</strong> {selectedBhpForAmbil.satuan}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Keperluan / Keterangan *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Jatah Semester Ganjil Mapel Kimia, Untuk kebersihan Toilet..."
                  value={ambilForm.keterangan}
                  onChange={(e) => setAmbilForm({ ...ambilForm, keterangan: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Bukti Pengambilan / Upload section */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Unggah Bukti Fisik / Arsip (Foto/PDF) (Opsional)
                </label>
                
                {!buktiFileBase64 ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      isDragging 
                        ? 'border-indigo-500 bg-indigo-50/30' 
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <input
                      type="file"
                      id="bukti-fisik-upload"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="bukti-fisik-upload" className="cursor-pointer block">
                      <div className="flex flex-col items-center">
                        <UploadCloud size={24} className="text-indigo-400 mb-1.5" />
                        <span className="text-xs font-bold text-indigo-600">Klik untuk upload</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">atau drag-and-drop file gambar/PDF di sini</span>
                        <span className="text-[9px] text-slate-300 mt-1">Gambar dikompresi otomatis / PDF Maks. 15MB</span>
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/50">
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip size={14} className="text-indigo-500 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-700 truncate">{buktiFileName}</p>
                        <p className="text-[10px] text-slate-400">File siap disimpan</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setBuktiFileBase64('');
                        setBuktiFileName('');
                      }}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                      title="Hapus file"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAmbilModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAmbil}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-rose-400 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer min-w-[170px]"
                >
                  {isSavingAmbil ? (
                    <>
                      <Loader2 size={16} className="animate-spin shrink-0" />
                      <span>Memproses Data...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Ambil Barang (Keluar)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW PHYSICAL PROOF / BUKTI ARSIP */}
      {viewingBuktiLog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
                  Bukti Arsip Fisik Pengambilan
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  ID Transaksi: <span className="font-mono font-bold text-indigo-600">{viewingBuktiLog.id}</span> | {viewingBuktiLog.namaPenerima} ({viewingBuktiLog.jabatanPenerima})
                </p>
              </div>
              <button
                onClick={() => setViewingBuktiLog(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-50 min-h-[300px]">
              {viewingBuktiLog.buktiFisik ? (
                viewingBuktiLog.buktiFisik.startsWith('data:application/pdf') ? (
                  <div className="text-center p-8 space-y-4">
                    <FileText size={64} className="text-indigo-400 mx-auto" />
                    <div>
                      <p className="text-sm font-bold text-slate-700">Dokumen PDF Terlampir</p>
                      <p className="text-xs text-slate-400 mt-1">Browser dalam iframe/tab ini mendeteksi lampiran PDF.</p>
                    </div>
                    <a
                      href={viewingBuktiLog.buktiFisik}
                      download={`BUKTI_${viewingBuktiLog.id}.pdf`}
                      className="inline-flex items-center gap-1.5 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      <Download size={13} />
                      Unduh Dokumen PDF
                    </a>
                  </div>
                ) : (
                  <div className="relative max-w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white p-2">
                    <img
                      src={viewingBuktiLog.buktiFisik}
                      alt={`Bukti ${viewingBuktiLog.id}`}
                      referrerPolicy="no-referrer"
                      className="max-h-[55vh] object-contain mx-auto"
                    />
                    <div className="text-center mt-3">
                      <a
                        href={viewingBuktiLog.buktiFisik}
                        download={`BUKTI_${viewingBuktiLog.id}.png`}
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
                      >
                        <Download size={12} />
                        Unduh Gambar Asli
                      </a>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <AlertCircle size={32} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-bold">Tidak ada bukti berkas terunggah.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setViewingBuktiLog(null)}
                className="py-2 px-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Selection Template Bukti Ambil (Versi 1 vs Versi 2 Kolektif) */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <FileDown size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wide">
                    Pilih Template Bukti Pengambilan BHP (PDF)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Formulir fisik siap cetak untuk pengesahan tanda tangan guru &amp; staf
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              
              {/* Card 1: Versi 1 - Individu */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase rounded-md border border-indigo-200 tracking-wider">
                      Versi 1 - Individual (1 Lembar / Guru)
                    </span>
                    <h4 className="text-xs font-bold text-slate-800 mt-1">
                      Formulir Pengambilan Individu (Harian)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                      Digunakan untuk pengambilan perorangan oleh guru/staf.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      downloadBlankTemplatePDF();
                      setIsTemplateModalOpen(false);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                  >
                    <Download size={13} />
                    Cetak V1 (Individu)
                  </button>
                </div>
              </div>

              {/* Card 2: Versi 2 - Kolektif Pembagian Semesteran Guru (Fleksibel Multi-Kolom Barang) */}
              <div className="p-5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded-md border border-emerald-300 tracking-wider">
                      Versi 2 - Kolektif Semesteran (Fleksibel Multi-Kolom)
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-800 mt-1.5">
                    Formulir Pembagian Kolektif Guru &amp; Staf (Semester Baru)
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Daftar rekapitulasi tanda terima pembagian barang ke seluruh guru di awal semester. Anda dapat menambah, menghapus, atau menyesuaikan jenis barang massal sesuai kebutuhan sekolah.
                  </p>
                </div>

                {/* Switch Mode Format */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                    Pilih Format Tabel:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplateMode('multi')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                        templateMode === 'multi'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Layers size={16} className={templateMode === 'multi' ? 'text-white' : 'text-emerald-600'} />
                      <div>
                        <span className="block text-xs font-bold">Multi-Kolom Barang Massal</span>
                        <span className={`block text-[10px] ${templateMode === 'multi' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Rincian banyak jenis barang dalam 1 lembar
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemplateMode('single')}
                      className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex items-center gap-2 ${
                        templateMode === 'single'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <FileText size={16} className={templateMode === 'single' ? 'text-white' : 'text-emerald-600'} />
                      <div>
                        <span className="block text-xs font-bold">1 Kolom Barang (Standar)</span>
                        <span className={`block text-[10px] ${templateMode === 'single' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Format umum dengan 1 isian barang
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Konfigurasi untuk Multi-Kolom Barang */}
                {templateMode === 'multi' ? (
                  <div className="space-y-3 p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider">
                        Daftar Kolom Barang Massal ({multiItemsList.length} Barang):
                      </label>
                      <button
                        type="button"
                        onClick={() => setMultiItemsList(['Kertas HVS A4', 'Spidol Snowman', 'Pulpen ATK', 'Sapu & Kebersihan'])}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                      >
                        Reset Default
                      </button>
                    </div>

                    {/* Chips Kolom Barang */}
                    <div className="flex flex-wrap gap-1.5 min-h-[36px] p-2 bg-slate-50 rounded-xl border border-slate-200">
                      {multiItemsList.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-emerald-300 text-emerald-900 text-xs font-bold rounded-lg shadow-2xs"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => handleRemoveMultiItem(idx)}
                            className="p-0.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-md transition cursor-pointer"
                            title="Hapus kolom ini"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      {multiItemsList.length === 0 && (
                        <span className="text-xs text-rose-500 italic font-medium p-1">
                          Belum ada kolom barang. Silakan tambah barang di bawah.
                        </span>
                      )}
                    </div>

                    {/* Input Tambah Kolom Barang Custom */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Ketik nama barang baru (e.g. Penghapus, Tipe-X, Map Snelheck)..."
                        value={newItemInput}
                        onChange={(e) => setNewItemInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMultiItem();
                          }
                        }}
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddMultiItem}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                      >
                        <Plus size={14} />
                        Tambah Kolom
                      </button>
                    </div>

                    {/* Presets Cepat */}
                    <div className="pt-1">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        + Tambah Cepat barang favorit:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          'Kertas HVS F4',
                          'Penghapus Boardmarker',
                          'Tipe-X / Correction Tape',
                          'Stopmap Snelhecker',
                          'Buku Agenda Guru',
                          'Isi Staples'
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => {
                              if (!multiItemsList.includes(preset)) {
                                setMultiItemsList([...multiItemsList, preset]);
                              }
                            }}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 text-[10px] font-semibold rounded-md border border-slate-200 transition cursor-pointer"
                          >
                            + {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Single Item Mode Input */
                  <div className="space-y-1.5 p-3.5 bg-white rounded-2xl border border-emerald-200 shadow-2xs">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Isian Nama Barang Khusus (Opsional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Kertas HVS A4 80gr, Spidol Snowman Boardmarker, Pulpen..."
                      value={templateV2Barang}
                      onChange={(e) => setTemplateV2Barang(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Setting Orientasi & Jumlah Baris */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Orientasi */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Orientasi Kertas A4:
                    </label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTemplateOrientation('portrait')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          templateOrientation === 'portrait'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Potret (Portrait)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTemplateOrientation('landscape')}
                        className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          templateOrientation === 'landscape'
                            ? 'bg-slate-800 text-white border-slate-800'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Lanskap (Landscape)
                      </button>
                    </div>
                    {templateMode === 'multi' && multiItemsList.length >= 4 && templateOrientation === 'portrait' && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1">
                        * Disarankan memilih Lanskap jika barang &ge; 4 kolom agar tabel lebih lapang.
                      </p>
                    )}
                  </div>

                  {/* Jumlah Baris Kosong */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                        Jumlah Baris Kosong (Guru / Staf):
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-500">Tulis Jumlah:</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={templateTotalRows}
                          onChange={(e) => setTemplateTotalRows(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                        <span className="text-[10px] font-bold text-slate-500">baris</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[15, 20, 25, 30, 35, 40].map((rows) => (
                        <button
                          key={rows}
                          type="button"
                          onClick={() => setTemplateTotalRows(rows)}
                          className={`flex-1 min-w-[48px] py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            templateTotalRows === rows
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {rows}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pratinjau Struktur Kolom PDF */}
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="block text-[10px] font-extrabold text-emerald-900 uppercase tracking-wider">
                      Pratinjau Urutan Kolom PDF ({pengaturan.namaSekolah}):
                    </span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Tanda Tangan Zig-Zag & Garis Hitam
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 font-mono text-[9.5px] text-slate-700 font-bold">
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">1. NO</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">2. NAMA GURU / STAF</span>
                    {templateMode === 'multi' ? (
                      multiItemsList.map((item, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">
                          {idx + 3}. {item.toUpperCase()}
                        </span>
                      ))
                    ) : (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded border border-emerald-300">
                        3. JUMLAH
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {templateMode === 'multi' ? multiItemsList.length + 3 : 4}. TGL PENGAMBILAN
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">
                      {templateMode === 'multi' ? multiItemsList.length + 4 : 5}. TANDA TANGAN (ZIG-ZAG)
                    </span>
                  </div>
                  {templateMode === 'single' && (
                    <p className="text-[9.5px] text-slate-500 font-medium italic mt-2">
                      * Kolom &quot;Nama Barang&quot; telah dipindahkan ke Sub-Header PDF di atas tabel ({templateV2Barang ? `"${templateV2Barang.toUpperCase()}"` : 'sesuai isian'}) agar tabel lebih lapang.
                    </p>
                  )}
                </div>

                {/* Action Buttons: Preview & Download */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      previewBlankTemplateV2PDF(
                        templateMode,
                        templateV2Barang,
                        multiItemsList,
                        templateOrientation,
                        templateTotalRows
                      );
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-300"
                  >
                    <Eye size={15} />
                    Pratinjau PDF (Preview)
                  </button>
                  <button
                    onClick={() => {
                      downloadBlankTemplateV2PDF(
                        templateMode,
                        templateV2Barang,
                        multiItemsList,
                        templateOrientation,
                        templateTotalRows
                      );
                      setIsTemplateModalOpen(false);
                    }}
                    className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/30"
                  >
                    <Download size={15} />
                    Cetak / Download PDF
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal Pratinjau PDF Sebelum Cetak */}
      {isPreviewPdfModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-emerald-400" />
                <h3 className="font-bold text-sm">Pratinjau Cetak PDF Template Pembagian BHP</h3>
              </div>
              <button
                onClick={() => setIsPreviewPdfModalOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content - iframe preview */}
            <div className="p-3 bg-slate-100 flex-1 overflow-hidden min-h-[500px]">
              {previewPdfUrl ? (
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full min-h-[500px] rounded-xl border border-slate-300 shadow-inner bg-white"
                  title="Pratinjau Template PDF"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500 font-medium text-xs">
                  Memuat pratinjau PDF...
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 gap-3">
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Periksa tampilan tabel, garis, dan kolom tanda tangan zig-zag sebelum mengunduh.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsPreviewPdfModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    downloadBlankTemplateV2PDF(
                      templateMode,
                      templateV2Barang,
                      multiItemsList,
                      templateOrientation,
                      templateTotalRows
                    );
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  <Download size={15} />
                  Download PDF Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
