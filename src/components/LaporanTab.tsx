import React, { useState, useEffect } from 'react';
import { Aset, LogPemusnahan, PengaturanSekolah, AuditLog, AUTHORIZED_USERS, MasterRuang } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Printer, FileSpreadsheet, Download, Info, CheckCircle, Database, Calendar, Trash2, Archive, Plus, RotateCcw, AlertTriangle, Eye, Check, ShieldCheck, UserCheck, Search, History, Filter, X, BookOpen, Building2, Layers, MapPin } from 'lucide-react';

import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../assets/logoBase64';
import { getKibConfig, formatAsetKibRow, getKirConfig, formatKirRow } from '../utils/kibReportHelper';
import BlankoKibDoc from './documents/BlankoKibDoc';

interface MonthlyBackup {
  id: string;
  nama: string;
  tanggal: string;
  bulan: string;
  tahun: string;
  totalAset: number;
  totalJumlah: number;
  asetsData: string; // JSON string of Aset[]
}

interface LaporanTabProps {
  asets: Aset[];
  pemusnahans: LogPemusnahan[];
  pengaturan: PengaturanSekolah;
  auditLogs?: AuditLog[];
  activeOperator?: string;
  masterRuangs?: MasterRuang[];
}

export default function LaporanTab({ asets, pemusnahans, pengaturan, auditLogs = [], activeOperator = 'Nursamsi Muslim Widuri, S.Pd.', masterRuangs = [] }: LaporanTabProps) {
  const [reportType, setReportType] = useState<'buku_induk' | 'inventaris_aktif' | 'penghapusan_aset' | 'kir' | 'kib' | 'audit_trail'>('buku_induk');
  const [selectedKibType, setSelectedKibType] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'ALL'>('B');
  const [showBlankoModal, setShowBlankoModal] = useState<boolean>(false);

  // KIB Date Range & Filter states
  const [kibStartDate, setKibStartDate] = useState<string>('');
  const [kibEndDate, setKibEndDate] = useState<string>('');
  const [kibPreset, setKibPreset] = useState<'semua' | 'bulan_ini' | 'triwulan' | 'semester_1' | 'semester_2' | 'tahun_ini' | 'kustom'>('semua');
  const [kibPaperType, setKibPaperType] = useState<'F4' | 'A4'>('F4');
  const [kibSearch, setKibSearch] = useState<string>('');
  const [kibFilterKondisi, setKibFilterKondisi] = useState<string>('Semua');
  const [kibFilterSumber, setKibFilterSumber] = useState<string>('Semua');

  // Helper date parsing for aset
  const parseAsetDate = (aset: Aset): Date | null => {
    if (aset.tanggalRegister) {
      // Check if format is YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}/.test(aset.tanggalRegister)) {
        const d = new Date(aset.tanggalRegister);
        if (!isNaN(d.getTime())) return d;
      }
      // Check if format is DD/MM/YYYY
      const parts = aset.tanggalRegister.split('/');
      if (parts.length === 3) {
        const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
        if (!isNaN(d.getTime())) return d;
      }
      const genericD = new Date(aset.tanggalRegister);
      if (!isNaN(genericD.getTime())) return genericD;
    }
    if (aset.tahunPerolehan) {
      return new Date(aset.tahunPerolehan, 0, 1);
    }
    return null;
  };

  const handleKibPresetChange = (preset: 'semua' | 'bulan_ini' | 'triwulan' | 'semester_1' | 'semester_2' | 'tahun_ini' | 'kustom') => {
    setKibPreset(preset);
    const now = new Date();
    const curYear = now.getFullYear();

    if (preset === 'semua') {
      setKibStartDate('');
      setKibEndDate('');
    } else if (preset === 'bulan_ini') {
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(curYear, now.getMonth() + 1, 0).getDate();
      setKibStartDate(`${curYear}-${month}-01`);
      setKibEndDate(`${curYear}-${month}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'triwulan') {
      const quarter = Math.floor(now.getMonth() / 3);
      const startMonth = String(quarter * 3 + 1).padStart(2, '0');
      const endMonth = quarter * 3 + 3;
      const lastDay = new Date(curYear, endMonth, 0).getDate();
      setKibStartDate(`${curYear}-${startMonth}-01`);
      setKibEndDate(`${curYear}-${String(endMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'semester_1') {
      setKibStartDate(`${curYear}-01-01`);
      setKibEndDate(`${curYear}-06-30`);
    } else if (preset === 'semester_2') {
      setKibStartDate(`${curYear}-07-01`);
      setKibEndDate(`${curYear}-12-31`);
    } else if (preset === 'tahun_ini') {
      setKibStartDate(`${curYear}-01-01`);
      setKibEndDate(`${curYear}-12-31`);
    }
  };

  // Buku Induk Barang Inventaris (BIBI) states
  const [bibiPaperType, setBibiPaperType] = useState<'F4' | 'A4'>('F4');
  const [bibiFilterTahun, setBibiFilterTahun] = useState<string>('Semua');
  const [bibiFilterSumber, setBibiFilterSumber] = useState<string>('Semua');
  const [bibiSearch, setBibiSearch] = useState<string>('');
  
  // Audit Trail filters
  const [filterOperator, setFilterOperator] = useState<string>('Semua');
  const [filterAction, setFilterAction] = useState<string>('Semua');
  const [searchAuditQuery, setSearchAuditQuery] = useState<string>('');
  
  const [selectedRuang, setSelectedRuang] = useState<string>('Ruang Kelas');
  const [kodeRuangan, setKodeRuangan] = useState<string>('KLS-01');
  const [penanggungJawabRuang, setPenanggungJawabRuang] = useState<string>('Nursamsi Muslim Widuri, S.Pd.');
  const [nipPenanggungJawab, setNipPenanggungJawab] = useState<string>('198708012025211059');
  const [kirOrientation, setKirOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [kirPaperType, setKirPaperType] = useState<'F4' | 'A4'>('F4');

  // Sinkronisasi Ruangan dengan MasterRuang dan KIB C (Gedung)
  const availableRuangNames = React.useMemo(() => {
    if (masterRuangs && masterRuangs.length > 0) {
      return masterRuangs.map(r => r.nama);
    }
    const fromAsets = Array.from(new Set(asets.map(a => a.ruangLokasi).filter(Boolean)));
    return fromAsets.length > 0 ? fromAsets : ['Ruang Kelas', 'Laboratorium Komputer', 'Ruang Guru', 'Perpustakaan'];
  }, [masterRuangs, asets]);

  const activeMasterRuang = masterRuangs?.find(r => r.nama === selectedRuang);
  const relatedGedungKibC = activeMasterRuang?.idGedungKibC 
    ? asets.find(a => a.id === activeMasterRuang.idGedungKibC) 
    : null;

  useEffect(() => {
    if (activeMasterRuang) {
      if (activeMasterRuang.id) setKodeRuangan(activeMasterRuang.id);
      if (activeMasterRuang.penanggungJawab) setPenanggungJawabRuang(activeMasterRuang.penanggungJawab);
      if (activeMasterRuang.nipPj) setNipPenanggungJawab(activeMasterRuang.nipPj);
    }
  }, [selectedRuang, activeMasterRuang]);

  // Cetak template kosong KIR state
  const [isCetakKosong, setIsCetakKosong] = useState<boolean>(false);
  const [selectedBackupToDelete, setSelectedBackupToDelete] = useState<MonthlyBackup | null>(null);

  // Backup states
  const [backups, setBackups] = useState<MonthlyBackup[]>(() => {
    const saved = localStorage.getItem('esarpras_monthly_backups');
    return saved ? JSON.parse(saved) : [];
  });
  const [backupBulan, setBackupBulan] = useState<string>('Juli');
  const [backupTahun, setBackupTahun] = useState<string>('2026');
  const [overrideAssets, setOverrideAssets] = useState<Aset[] | null>(null);
  const [activeBackupName, setActiveBackupName] = useState<string | null>(null);
  const [isBackupSuccess, setIsBackupSuccess] = useState<boolean>(false);

  // Sync back-ups to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('esarpras_monthly_backups', JSON.stringify(backups));
  }, [backups]);

  const currentAssets = overrideAssets || asets;
  const activeAsets = currentAssets.filter(a => a.kondisi !== 'Dihapuskan');
  const roomAsets = activeAsets.filter(a => a.ruangLokasi === selectedRuang);

  const kibAsets = activeAsets.filter(a => {
    // 1. Filter Kategori KIB
    if (selectedKibType === 'A') {
      if (a.kategori !== 'KIB A (Tanah)') return false;
    } else if (selectedKibType === 'B') {
      if (a.kategori !== 'KIB B (Peralatan dan Mesin)' && a.kategori !== 'Sarana (Peralatan Belajar)' && a.kategori !== 'Sarana (Bahan Pembelajaran)') return false;
    } else if (selectedKibType === 'C') {
      if (a.kategori !== 'KIB C (Gedung dan Bangunan)' && a.kategori !== 'Prasarana (Bangunan/Fasilitas)') return false;
    } else if (selectedKibType === 'D') {
      if (a.kategori !== 'KIB D (Jalan, Irigasi, dan Jaringan)') return false;
    } else if (selectedKibType === 'E') {
      if (a.kategori !== 'KIB E (Aset Tetap Lainnya)' && a.kategori !== 'Perlengkapan (Mebel/Meja/Kursi)') return false;
    } else if (selectedKibType === 'F') {
      if (a.kategori !== 'KIB F (Konstruksi dalam Pengerjaan)') return false;
    }
    // Jika 'ALL', sertakan seluruh aset aktif

    // 2. Filter Rentang Tanggal (Date Range)
    if (kibStartDate || kibEndDate) {
      const itemDate = parseAsetDate(a);
      if (itemDate) {
        if (kibStartDate) {
          const start = new Date(kibStartDate);
          start.setHours(0, 0, 0, 0);
          if (itemDate < start) return false;
        }
        if (kibEndDate) {
          const end = new Date(kibEndDate);
          end.setHours(23, 59, 59, 999);
          if (itemDate > end) return false;
        }
      }
    }

    // 3. Filter Kondisi Fisik
    if (kibFilterKondisi !== 'Semua' && a.kondisi !== kibFilterKondisi) return false;

    // 4. Filter Sumber Dana
    if (kibFilterSumber !== 'Semua' && a.sumberDana !== kibFilterSumber) return false;

    // 5. Pencarian Kata Kunci
    if (kibSearch.trim()) {
      const q = kibSearch.toLowerCase();
      const match = a.nama.toLowerCase().includes(q) ||
                    a.id.toLowerCase().includes(q) ||
                    (a.merek && a.merek.toLowerCase().includes(q)) ||
                    (a.spesifikasi && a.spesifikasi.toLowerCase().includes(q)) ||
                    a.ruangLokasi.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const totalUnitKib = kibAsets.reduce((sum, a) => sum + (Number(a.jumlah) || 0), 0);
  const totalNilaiKib = kibAsets.reduce((sum, a) => sum + ((Number(a.hargaPerolehan) || 0) * (Number(a.jumlah) || 1)), 0);

  const exportKibCSV = () => {
    const kibConf = getKibConfig(selectedKibType);
    const headers = kibConf.csvHeaders;
    const rows = kibAsets.map((a, idx) => {
      const rowData = formatAsetKibRow(a, idx, selectedKibType, false);
      return rowData.map(val => `"${(val || '').replace(/"/g, '""')}"`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const rangeLabel = kibStartDate || kibEndDate ? `_${kibStartDate || 'Awal'}_sd_${kibEndDate || 'Akhir'}` : '';
    link.setAttribute('download', `KIB_${selectedKibType}_${(pengaturan.namaSekolah || 'SMA_Negeri_17_Konawe').replace(/\s+/g, '_')}${rangeLabel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportKirCSV = () => {
    const kirConf = getKirConfig('landscape', kirPaperType);
    const headers = kirConf.csvHeaders;
    const rows = roomAsets.map((a, idx) => {
      const rowData = formatKirRow(a, idx, false, false);
      return rowData.map(val => `"${(val || '').replace(/"/g, '""')}"`);
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KIR_${selectedRuang.replace(/\s+/g, '_')}_${(pengaturan.namaSekolah || 'SMA_Negeri_17_Konawe').replace(/\s+/g, '_')}_Permendagri47_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Buku Induk Barang Inventaris (BIBI) data calculations
  const bibiYears = Array.from(new Set(activeAsets.map(a => a.tahunPerolehan).filter(Boolean))).sort((a, b) => Number(b) - Number(a));
  const bibiSources = Array.from(new Set(activeAsets.map(a => a.sumberDana).filter(Boolean)));

  const bibiAsets = activeAsets.filter(a => {
    if (bibiFilterTahun !== 'Semua' && String(a.tahunPerolehan) !== bibiFilterTahun) return false;
    if (bibiFilterSumber !== 'Semua' && a.sumberDana !== bibiFilterSumber) return false;
    if (bibiSearch.trim()) {
      const q = bibiSearch.toLowerCase();
      const match = a.nama.toLowerCase().includes(q) ||
                    a.id.toLowerCase().includes(q) ||
                    (a.merek && a.merek.toLowerCase().includes(q)) ||
                    (a.spesifikasi && a.spesifikasi.toLowerCase().includes(q)) ||
                    a.ruangLokasi.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalUnitBibi = bibiAsets.reduce((sum, a) => sum + (Number(a.jumlah) || 0), 0);
  const totalNilaiBibi = bibiAsets.reduce((sum, a) => sum + ((Number(a.hargaPerolehan) || 0) * (Number(a.jumlah) || 1)), 0);

  const exportBibiCSV = () => {
    const headers = [
      'No',
      'Tanggal Pembukuan',
      'Kode Barang',
      'Nama Barang / Jenis',
      'Merk / Spesifikasi / Ukuran',
      'Jumlah (Kuantitas)',
      'Satuan',
      'Tahun Perolehan',
      'Bukti Dokumen Perolehan',
      'Asal Usul (Sumber Dana)',
      'Keadaan Barang (Kondisi)',
      'Harga Perolehan Satuan (Rp)',
      'Total Nilai Perolehan (Rp)',
      'Lokasi Ruangan / Keterangan'
    ];

    const rows = bibiAsets.map((a, idx) => {
      const hargaSatuan = Number(a.hargaPerolehan) || 0;
      const totalHarga = hargaSatuan * (Number(a.jumlah) || 1);
      return [
        idx + 1,
        `"${a.tanggalRegister || '-'}"`,
        `"${a.id}"`,
        `"${(a.nama || '').replace(/"/g, '""')}"`,
        `"${(`${a.merek || '-'}${a.spesifikasi ? ' / ' + a.spesifikasi : ''}`).replace(/"/g, '""')}"`,
        a.jumlah,
        `"${a.satuan}"`,
        a.tahunPerolehan,
        `"${(a.nomorBuktiPerolehan || 'BAST / Faktur').replace(/"/g, '""')}"`,
        `"${(a.sumberDana || 'BOS Reguler').replace(/"/g, '""')}"`,
        `"${a.kondisi}"`,
        hargaSatuan,
        totalHarga,
        `"${(`${a.ruangLokasi}${a.serialNumber ? ' (SN: ' + a.serialNumber + ')' : ''}`).replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Buku_Induk_Barang_Inventaris_BIBI_${(pengaturan.namaSekolah || 'SMA_Negeri_17_Konawe').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const STANDARD_RUANGS = [
    'Ruang Kelas',
    'Ruang Perpustakaan',
    'Ruang Laboratorium',
    'Ruang Pimpinan / Administrasi',
    'Ruang Guru',
    'Tempat Beribadah',
    'Ruang Konseling / UKS',
    'Toilet',
    'Tempat Bermain / Olahraga',
    'Ruang Sirkulasi'
  ];

  const handleCreateBackup = () => {
    const backupName = `${backupBulan} ${backupTahun}`;
    const duplicate = backups.find(b => b.nama.toLowerCase() === backupName.toLowerCase());
    
    if (duplicate) {
      alert(`Backup untuk ${backupName} sudah ada! Silakan hapus backup lama terlebih dahulu jika ingin memperbarui.`);
      return;
    }

    const totalAsetCount = asets.length;
    const totalQty = asets.reduce((acc, curr) => acc + (Number(curr.jumlah) || 0), 0);

    const newBackup: MonthlyBackup = {
      id: 'BK-' + Date.now().toString(36).toUpperCase(),
      nama: backupName,
      tanggal: new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      bulan: backupBulan,
      tahun: backupTahun,
      totalAset: totalAsetCount,
      totalJumlah: totalQty,
      asetsData: JSON.stringify(asets)
    };

    setBackups(prev => [newBackup, ...prev]);
    setIsBackupSuccess(true);
    setTimeout(() => setIsBackupSuccess(false), 3000);
  };

  const handleDeleteBackup = (backup: MonthlyBackup) => {
    setSelectedBackupToDelete(backup);
  };

  const handleLoadBackup = (backup: MonthlyBackup) => {
    try {
      const loadedAssets = JSON.parse(backup.asetsData);
      setOverrideAssets(loadedAssets);
      setActiveBackupName(backup.nama);
    } catch (e) {
      alert('Gagal memuat data backup!');
    }
  };

  const handleResetOverride = () => {
    setOverrideAssets(null);
    setActiveBackupName(null);
  };

  const handleExportPDF = async () => {
    const isBibi = reportType === 'buku_induk';
    const isKIR = reportType === 'kir';
    const isKIB = reportType === 'kib';
    const isAktif = reportType === 'inventaris_aktif';
    const orientation = (isBibi || isKIB) ? 'landscape' : isKIR ? kirOrientation : 'portrait';

    let paperFormat: string | [number, number] = 'a4';
    if (isBibi && bibiPaperType === 'F4') {
      paperFormat = [215, 330];
    } else if (isKIB && kibPaperType === 'F4') {
      paperFormat = [215, 330];
    } else if (isKIR && kirPaperType === 'F4') {
      paperFormat = [215, 330];
    }

    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: paperFormat
    });

    if (isBibi) {
      const isF4 = bibiPaperType === 'F4';
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const centerX = pageWidth / 2;
      const marginX = isF4 ? 10 : 8;

      // 1. Double Border Resmi
      const borderOuterW = pageWidth - 12;
      const borderOuterH = pageHeight - 12;
      const borderInnerW = pageWidth - 15;
      const borderInnerH = pageHeight - 15;

      doc.setLineWidth(0.7);
      doc.rect(6, 6, borderOuterW, borderOuterH);
      doc.setLineWidth(0.2);
      doc.rect(7.5, 7.5, borderInnerW, borderInnerH);

      // Draw Logos
      try {
        doc.addImage(SULTRA_LOGO_BASE64, 'PNG', marginX + 3, 11, 16, 16);
        doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', pageWidth - marginX - 19, 11, 16, 16);
      } catch (e) {
        console.warn('Error drawing logos', e);
      }

      // 2. Kop Surat Resmi
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', centerX, 14, { align: 'center' });
      doc.setFontSize(11);
      doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, 19, { align: 'center' });
      doc.setFontSize(14);
      doc.text(pengaturan.namaSekolah.toUpperCase(), centerX, 25, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, centerX, 29.5, { align: 'center' });

      // Garis ganda pembatas kop surat
      doc.setLineWidth(0.6);
      doc.line(marginX, 32, pageWidth - marginX, 32);
      doc.setLineWidth(0.2);
      doc.line(marginX, 33, pageWidth - marginX, 33);

      // 3. Judul Dokumen Buku Induk (Sesuai Regulasi)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('BUKU INDUK BARANG INVENTARIS (BIBI)', centerX, 39, { align: 'center' });
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text('Berdasarkan Pedoman Tata Kelola Sarana dan Prasarana Persekolahan & Permendagri No. 47 Tahun 2021', centerX, 43, { align: 'center' });

      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      const subInfo = `Tahun Pembukuan: ${bibiFilterTahun !== 'Semua' ? bibiFilterTahun : 'Kumulatif (Semua Tahun)'} | Sumber Dana: ${bibiFilterSumber} | Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      doc.text(subInfo, centerX, 47, { align: 'center' });

      // 4. Tabel 13 Kolom Baku
      const tableRows = bibiAsets.map((aset, idx) => {
        const kondisiCode = aset.kondisi === 'Baik' ? 'B' : aset.kondisi === 'Rusak Ringan' ? 'KB' : 'RB';
        const formattedHarga = aset.hargaPerolehan ? Number(aset.hargaPerolehan).toLocaleString('id-ID') : '-';
        return [
          idx + 1,
          aset.tanggalRegister || '-',
          aset.id,
          aset.nama,
          `${aset.merek || '-'}${aset.spesifikasi ? ' / ' + aset.spesifikasi : ''}`,
          aset.jumlah,
          aset.satuan,
          aset.tahunPerolehan,
          aset.nomorBuktiPerolehan || 'BAST / Faktur',
          aset.sumberDana || 'BOS Reguler',
          kondisiCode,
          formattedHarga,
          `${aset.ruangLokasi}${aset.serialNumber ? ' (SN: ' + aset.serialNumber + ')' : ''}`
        ];
      });

      const totalUnit = bibiAsets.reduce((sum, a) => sum + (Number(a.jumlah) || 0), 0);
      const totalNilai = bibiAsets.reduce((sum, a) => sum + ((Number(a.hargaPerolehan) || 0) * (Number(a.jumlah) || 1)), 0);

      autoTable(doc, {
        startY: 50,
        head: [[
          'No',
          'Tgl Buku',
          'Kode Barang',
          'Nama / Jenis Barang',
          'Merk / Tipe / Ukuran',
          'Jml',
          'Sat',
          'Thn',
          'Bukti Dokumen',
          'Asal Usul (Dana)',
          'Kondisi',
          'Harga Satuan (Rp)',
          'Ruang / Keterangan'
        ]],
        body: tableRows.length > 0 ? tableRows : [['-', '-', '-', 'Tidak ada data barang inventaris.', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
        foot: tableRows.length > 0 ? [[
          '',
          '',
          '',
          'JUMLAH / TOTAL KESELURUHAN',
          '',
          totalUnit,
          '',
          '',
          '',
          '',
          '',
          totalNilai > 0 ? totalNilai.toLocaleString('id-ID') : '-',
          `${bibiAsets.length} Item Barang`
        ]] : undefined,
        styles: {
          font: 'times',
          fontSize: isF4 ? 7.5 : 7,
          cellPadding: 1.5,
          lineWidth: 0.15,
          lineColor: [100, 100, 100],
          valign: 'middle'
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: isF4 ? 7.5 : 7
        },
        footStyles: {
          fillColor: [241, 245, 249],
          textColor: [15, 23, 42],
          fontStyle: 'bold',
          fontSize: isF4 ? 7.5 : 7
        },
        columnStyles: isF4 ? {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 19, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 45 },
          4: { cellWidth: 36 },
          5: { cellWidth: 9, halign: 'center' },
          6: { cellWidth: 13, halign: 'center' },
          7: { cellWidth: 11, halign: 'center' },
          8: { cellWidth: 28 },
          9: { cellWidth: 24 },
          10: { cellWidth: 13, halign: 'center' },
          11: { cellWidth: 28, halign: 'right' },
          12: { cellWidth: 51 }
        } : {
          0: { cellWidth: 7, halign: 'center' },
          1: { cellWidth: 17, halign: 'center' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 40 },
          4: { cellWidth: 32 },
          5: { cellWidth: 9, halign: 'center' },
          6: { cellWidth: 12, halign: 'center' },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 25 },
          9: { cellWidth: 22 },
          10: { cellWidth: 12, halign: 'center' },
          11: { cellWidth: 25, halign: 'right' },
          12: { cellWidth: 47 }
        },
        margin: { left: marginX, right: marginX },
        didDrawPage: (data) => {
          if (doc.getNumberOfPages() > 1) {
            doc.setLineWidth(0.7);
            doc.rect(6, 6, borderOuterW, borderOuterH);
            doc.setLineWidth(0.2);
            doc.rect(7.5, 7.5, borderInnerW, borderInnerH);
          }
        }
      });

      // 5. Signatures Block
      const finalY = (doc as any).lastAutoTable.finalY;
      const pageBottomLimitY = isF4 ? 178 : 172;
      const defaultSignY = isF4 ? 170 : 164;

      let signY = Math.max(finalY + 8, defaultSignY - 25);
      if (finalY + 34 > pageBottomLimitY) {
        doc.addPage();
        doc.setLineWidth(0.7);
        doc.rect(6, 6, borderOuterW, borderOuterH);
        doc.setLineWidth(0.2);
        doc.rect(7.5, 7.5, borderInnerW, borderInnerH);
        signY = 30;
      }

      const colLeftX = marginX + 15;
      const colRightX = pageWidth - marginX - 85;

      doc.setFont('times', 'normal');
      doc.setFontSize(9);

      // Kiri: Kepala Sekolah
      doc.text('Mengetahui,', colLeftX, signY);
      doc.setFont('times', 'bold');
      doc.text(`Kepala ${pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}`, colLeftX, signY + 4.5);
      doc.text(pengaturan.kepalaSekolah, colLeftX, signY + 23);
      doc.line(colLeftX, signY + 24, colLeftX + 65, signY + 24);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '....................................................'}`, colLeftX, signY + 28);

      // Kanan: Wakasek / Petugas Sarpras
      doc.text(`Amonggedo, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, colRightX, signY);
      doc.setFont('times', 'bold');
      doc.text('Wakasek Sarana dan Prasarana / Pengurus Barang', colRightX, signY + 4.5);
      doc.text(pengaturan.namaPetugasSarpras, colRightX, signY + 23);
      doc.line(colRightX, signY + 24, colRightX + 65, signY + 24);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '....................................................'}`, colRightX, signY + 28);

      const fileName = `Buku_Induk_Barang_Inventaris_BIBI_${(pengaturan.namaSekolah || 'SMA_Negeri_17_Konawe').replace(/\s+/g, '_')}_${bibiPaperType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      return;
    }

    if (isKIB) {
      const isF4 = kibPaperType === 'F4';
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = isF4 ? 10 : 8;

      // 1. Double Border Resmi
      const borderOuterW = pageWidth - 12;
      const borderOuterH = pageHeight - 12;
      const borderInnerW = pageWidth - 15;
      const borderInnerH = pageHeight - 15;

      doc.setLineWidth(0.7);
      doc.rect(6, 6, borderOuterW, borderOuterH);
      doc.setLineWidth(0.2);
      doc.rect(7.5, 7.5, borderInnerW, borderInnerH);

      // Draw Logos
      try {
        doc.addImage(SULTRA_LOGO_BASE64, 'PNG', marginX + 4, 10, 16, 16);
        doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', pageWidth - marginX - 20, 10, 16, 16);
      } catch (e) {
        console.warn('Error drawing KIB logos', e);
      }

      // 2. Kop Surat Kedinasan
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', pageWidth / 2, 13, { align: 'center' });
      doc.setFontSize(12);
      doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', pageWidth / 2, 18, { align: 'center' });
      doc.setFontSize(14);
      doc.text((pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE').toUpperCase(), pageWidth / 2, 23.5, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, pageWidth / 2, 28, { align: 'center' });

      // Garis Kop Ganda
      doc.setLineWidth(0.6);
      doc.line(marginX + 2, 30.5, pageWidth - marginX - 2, 30.5);
      doc.setLineWidth(0.2);
      doc.line(marginX + 2, 31.5, pageWidth - marginX - 2, 31.5);

      // 3. Title KIB & Configuration
      const kibConf = getKibConfig(selectedKibType);
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text(kibConf.title, pageWidth / 2, 36.5, { align: 'center' });

      doc.setFont('times', 'italic');
      doc.setFontSize(7.5);
      doc.text('Berdasarkan Permendagri No. 47 Tahun 2021 tentang Tata Cara Pelaksanaan Pembukuan, Inventarisasi, dan Pelaporan BMD', pageWidth / 2, 40.5, { align: 'center' });

      // Periode Rentang Tanggal
      let periodeStr = 'Periode Perolehan: Kumulatif (Semua Tanggal)';
      if (kibStartDate || kibEndDate) {
        const startStr = kibStartDate ? new Date(kibStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Awal Pembukuan';
        const endStr = kibEndDate ? new Date(kibEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sekarang';
        periodeStr = `Periode Perolehan: ${startStr} s/d ${endStr}`;
      }
      doc.setFont('times', 'bold');
      doc.setFontSize(8);
      doc.text(periodeStr, pageWidth / 2, 44.5, { align: 'center' });

      // 4. Table data per KIB Configuration (Permendagri 47/2021)
      const tableRows = kibAsets.map((aset, idx) => {
        return formatAsetKibRow(aset, idx, selectedKibType, true);
      });

      const colCount = kibConf.pdfHeaders[0].length;
      const emptyRow = new Array(colCount).fill('-');
      emptyRow[1] = 'Tidak ada data aset KIB yang terdaftar pada rentang tanggal/kategori ini.';

      const bodyData = tableRows.length > 0 ? tableRows : [emptyRow];

      // Add Summary Footer Row
      if (tableRows.length > 0) {
        const summaryRow = new Array(colCount).fill('');
        summaryRow[1] = 'JUMLAH TOTAL REKAPITULASI KIB';
        
        let volIdx = 7;
        let totalIdx = 9;
        if (selectedKibType === 'A') { volIdx = 4; totalIdx = 12; }
        else if (selectedKibType === 'B') { volIdx = 11; totalIdx = 13; }
        else if (selectedKibType === 'C') { volIdx = 7; totalIdx = 13; }
        else if (selectedKibType === 'D') { volIdx = 7; totalIdx = 13; }
        else if (selectedKibType === 'E') { volIdx = 7; totalIdx = 12; }
        else if (selectedKibType === 'F') { volIdx = 4; totalIdx = 11; }

        if (volIdx < colCount) summaryRow[volIdx] = `${totalUnitKib} Unit`;
        if (totalIdx < colCount) summaryRow[totalIdx] = `Rp ${totalNilaiKib.toLocaleString('id-ID')}`;
        bodyData.push(summaryRow);
      }

      autoTable(doc, {
        startY: 47.5,
        head: [
          kibConf.pdfHeaders[0],
          kibConf.pdfNumbering
        ],
        body: bodyData,
        styles: {
          font: 'times',
          fontSize: isF4 ? 6.5 : 6,
          cellPadding: { top: 1.2, bottom: 1.2, left: 0.8, right: 0.8 },
          lineColor: [180, 180, 180],
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: isF4 ? 6.5 : 6
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: isF4 ? kibConf.columnStylesF4 : kibConf.columnStylesA4,
        margin: { left: marginX, right: marginX },
        didDrawPage: (data) => {
          if (doc.getNumberOfPages() > 1) {
            doc.setLineWidth(0.7);
            doc.rect(6, 6, borderOuterW, borderOuterH);
            doc.setLineWidth(0.2);
            doc.rect(7.5, 7.5, borderInnerW, borderInnerH);
          }
        }
      });

      // 5. Signatures Block
      const finalY = (doc as any).lastAutoTable.finalY;
      const pageBottomLimitY = isF4 ? 178 : 172;
      const defaultSignY = isF4 ? 170 : 164;

      let signY = Math.max(finalY + 8, defaultSignY - 25);
      if (finalY + 34 > pageBottomLimitY) {
        doc.addPage();
        doc.setLineWidth(0.7);
        doc.rect(6, 6, borderOuterW, borderOuterH);
        doc.setLineWidth(0.2);
        doc.rect(7.5, 7.5, borderInnerW, borderInnerH);
        signY = 30;
      }

      const colLeftX = marginX + 15;
      const colRightX = pageWidth - marginX - 85;

      doc.setFont('times', 'normal');
      doc.setFontSize(9);

      // Kiri: Kepala Sekolah
      doc.text('Mengetahui,', colLeftX, signY);
      doc.setFont('times', 'bold');
      doc.text(`Kepala ${pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}`, colLeftX, signY + 4.5);
      doc.text(pengaturan.kepalaSekolah, colLeftX, signY + 23);
      doc.line(colLeftX, signY + 24, colLeftX + 65, signY + 24);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '....................................................'}`, colLeftX, signY + 28);

      // Kanan: Wakasek / Petugas Sarpras
      doc.text(`Amonggedo, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, colRightX, signY);
      doc.setFont('times', 'bold');
      doc.text('Wakasek Sarana dan Prasarana / Pengurus Barang', colRightX, signY + 4.5);
      doc.text(pengaturan.namaPetugasSarpras, colRightX, signY + 23);
      doc.line(colRightX, signY + 24, colRightX + 65, signY + 24);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '....................................................'}`, colRightX, signY + 28);

      const rangeTag = kibStartDate || kibEndDate ? `_${kibStartDate || 'Awal'}_sd_${kibEndDate || 'Akhir'}` : '';
      const fileName = `KIB_${selectedKibType}_${(pengaturan.namaSekolah || 'SMA_Negeri_17_Konawe').replace(/\s+/g, '_')}${rangeTag}_${kibPaperType}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      return;
    }

    if (isKIR) {
      const isPortrait = kirOrientation === 'portrait';
      const isF4 = kirPaperType === 'F4';

      // Signature date string as requested: "Amonggedo, .................................... 2026"
      const dateSignatureString = isCetakKosong 
        ? 'Amonggedo, .................................... 2026'
        : `Amonggedo, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`;

      if (isPortrait) {
        // --- PORTRAIT MODE ---
        // F4: 215mm x 330mm, A4: 210mm x 297mm
        const pageWidth = isF4 ? 215 : 210;
        const pageHeight = isF4 ? 330 : 297;
        const centerX = pageWidth / 2;
        const marginX = isF4 ? 12 : 11;
        const rightMargin = isF4 ? 12 : 11;

        // 1. Double Border
        const borderOuterW = pageWidth - 12;
        const borderOuterH = pageHeight - 12;
        const borderInnerW = pageWidth - 15;
        const borderInnerH = pageHeight - 15;

        doc.setLineWidth(0.7);
        doc.rect(6, 6, borderOuterW, borderOuterH);
        doc.setLineWidth(0.2);
        doc.rect(7.5, 7.5, borderInnerW, borderInnerH);

        // Draw Logos
        try {
          doc.addImage(SULTRA_LOGO_BASE64, 'PNG', marginX + 1, 11, 15, 15);
          doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', pageWidth - marginX - 16, 11, 15, 15);
        } catch (e) {
          console.warn('Error drawing KIR logos', e);
        }

        // 2. Kop Surat & Title
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', centerX, 14, { align: 'center' });
        doc.setFontSize(12);
        doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, 19, { align: 'center' });
        doc.setFontSize(13);
        doc.text(pengaturan.namaSekolah.toUpperCase(), centerX, 25, { align: 'center' });
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, centerX, 29.5, { align: 'center' });
        
        doc.setLineWidth(0.5);
        doc.line(marginX, 31.5, pageWidth - marginX, 31.5);

        // Document Title
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text('KARTU INVENTARIS RUANGAN (KIR)', centerX, 37, { align: 'center' });
        doc.setFont('times', 'italic');
        doc.setFontSize(7.5);
        doc.text(`Format Resmi Inventaris Ruangan Permendagri No. 47/2021 (${isF4 ? 'Kertas F4 / Folio' : 'Kertas A4'})`, centerX, 41, { align: 'center' });

        // 3. Metadata block
        doc.setFont('times', 'bold');
        doc.setFontSize(8.5);
        doc.text('NAMA RUANG', marginX, 47);
        doc.text('KODE RUANG', marginX, 51.5);
        doc.text('PENANGGUNG JAWAB', marginX, 56);
        doc.text('NIP PENANGGUNG JAWAB', marginX, 60.5);

        const colonX = marginX + 40;
        doc.setFont('times', 'normal');
        doc.text(`:  ${isCetakKosong ? '........................................................' : selectedRuang}`, colonX, 47);
        doc.text(`:  ${isCetakKosong ? '........................................................' : kodeRuangan}`, colonX, 51.5);
        doc.text(`:  ${isCetakKosong ? '........................................................' : (penanggungJawabRuang || '........................................................')}`, colonX, 56);
        doc.text(`:  ${isCetakKosong ? '........................................................' : (nipPenanggungJawab || '........................................................')}`, colonX, 60.5);

        const yearLabelX = isF4 ? 138 : 134;
        const yearValX = isF4 ? 168 : 162;
        doc.setFont('times', 'bold');
        doc.text('TAHUN AJARAN', yearLabelX, 47);
        doc.setFont('times', 'normal');
        doc.text(':  2026/2027', yearValX, 47);

        if (relatedGedungKibC && !isCetakKosong) {
          doc.setFont('times', 'bold');
          doc.text('GEDUNG (KIB C)', yearLabelX, 51.5);
          doc.setFont('times', 'normal');
          doc.text(`:  ${relatedGedungKibC.nama.length > 20 ? relatedGedungKibC.nama.substring(0, 18) + '...' : relatedGedungKibC.nama}`, yearValX, 51.5);

          doc.setFont('times', 'bold');
          doc.text('LANTAI / LUAS', yearLabelX, 56);
          doc.setFont('times', 'normal');
          doc.text(`:  Lantai ${activeMasterRuang?.lantai || 1}${activeMasterRuang?.luasM2 ? ` (${activeMasterRuang.luasM2} m²)` : ''}`, yearValX, 56);
        }

        // 4. Room Assets Table (15 Kolom Regulasi Permendagri No. 47 Tahun 2021)
        let tableRows: any[] = [];
        const blankRowCount = isF4 ? 20 : 16;
        const blankCellHeight = isF4 ? 9.0 : 8.5;
        const kirConfig = getKirConfig('portrait', kirPaperType);

        if (isCetakKosong) {
          tableRows = Array.from({ length: blankRowCount }, (_, idx) => 
            formatKirRow({} as any, idx, true, true)
          );
        } else {
          tableRows = roomAsets.map((aset, idx) => 
            formatKirRow(aset, idx, true, false)
          );
        }

        autoTable(doc, {
          startY: 64.5,
          head: kirConfig.pdfHeaders,
          body: tableRows.length > 0 ? tableRows : [['-', '-', 'Tidak ada aset terdaftar di ruangan ini.', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
          styles: { font: 'times', fontSize: 6.5, minCellHeight: isCetakKosong ? blankCellHeight : 0, valign: 'middle', cellPadding: 1 },
          headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 6.5, cellPadding: 1 },
          columnStyles: kirConfig.columnStyles,
          margin: { left: marginX, right: marginX }
        });

        // 5. Signatures
        const finalY = (doc as any).lastAutoTable.finalY;
        const pageBottomLimitY = isF4 ? 318 : 285;
        const defaultSignY = isF4 ? 284 : 252;

        let signY = isCetakKosong ? defaultSignY : Math.max(finalY + 9, defaultSignY - 30);
        if (finalY + 34 > pageBottomLimitY && !isCetakKosong) {
          doc.addPage();
          doc.setLineWidth(0.7);
          doc.rect(6, 6, borderOuterW, borderOuterH);
          doc.setLineWidth(0.2);
          doc.rect(7.5, 7.5, borderInnerW, borderInnerH);
          signY = 25;
        }

        doc.setFont('times', 'normal');
        doc.setFontSize(8.5);
        
        const signLeftX = marginX + 2;
        const signMidX = centerX - 26;
        const signRightX = pageWidth - marginX - 58;

        // Left: Principal
        doc.text('Mengetahui,', signLeftX, signY);
        doc.text('Kepala Sekolah,', signLeftX, signY + 4);
        doc.text(pengaturan.kepalaSekolah, signLeftX, signY + 23);
        doc.setFont('times', 'bold');
        doc.line(signLeftX, signY + 24, signLeftX + 54, signY + 24);
        doc.setFont('times', 'normal');
        doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, signLeftX, signY + 28);

        // Center: Room Supervisor
        doc.text('Setuju / Mengetahui,', signMidX, signY);
        doc.text('Penanggung Jawab Ruang,', signMidX, signY + 4);
        doc.text(isCetakKosong ? '...................................................' : (penanggungJawabRuang || '...................................................'), signMidX, signY + 23);
        doc.setFont('times', 'bold');
        doc.line(signMidX, signY + 24, signMidX + 54, signY + 24);
        doc.setFont('times', 'normal');
        doc.text(`NIP. ${isCetakKosong ? '...............................................' : (nipPenanggungJawab || '...............................................')}`, signMidX, signY + 28);

        // Right: Sarpras Officer with date
        doc.text(dateSignatureString, signRightX, signY);
        doc.text('Wakasek Sarpras,', signRightX, signY + 4);
        doc.text(pengaturan.namaPetugasSarpras, signRightX, signY + 23);
        doc.setFont('times', 'bold');
        doc.line(signRightX, signY + 24, signRightX + 54, signY + 24);
        doc.setFont('times', 'normal');
        doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, signRightX, signY + 28);

        doc.save(`KIR_${isCetakKosong ? 'Blanko_Kosong' : selectedRuang.replace(/\s+/g, '_')}_Portrait_${kirPaperType}_2026.pdf`);
        return;
      }

      // --- LANDSCAPE MODE ---
      // F4: 330mm x 215mm, A4: 297mm x 210mm
      const pageWidth = isF4 ? 330 : 297;
      const pageHeight = isF4 ? 215 : 210;
      const centerX = pageWidth / 2;
      const marginX = isF4 ? 14 : 14;

      // 1. Double Border
      const borderOuterW = pageWidth - 12;
      const borderOuterH = pageHeight - 12;
      const borderInnerW = pageWidth - 15;
      const borderInnerH = pageHeight - 15;

      doc.setLineWidth(0.7);
      doc.rect(6, 6, borderOuterW, borderOuterH);
      doc.setLineWidth(0.2);
      doc.rect(7.5, 7.5, borderInnerW, borderInnerH);

      // Draw Logos
      try {
        doc.addImage(SULTRA_LOGO_BASE64, 'PNG', marginX + 1, 10, 15, 15);
        doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', pageWidth - marginX - 16, 10, 15, 15);
      } catch (e) {
        console.warn('Error drawing KIR logos', e);
      }

      // 2. Kop Surat & Title
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', centerX, 14, { align: 'center' });
      doc.setFontSize(12);
      doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, 19, { align: 'center' });
      doc.setFontSize(14);
      doc.text(pengaturan.namaSekolah.toUpperCase(), centerX, 25, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, centerX, 29.5, { align: 'center' });
      
      doc.setLineWidth(0.5);
      doc.line(marginX, 31.5, pageWidth - marginX, 31.5);

      // Document Title
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.text('KARTU INVENTARIS RUANGAN (KIR)', centerX, 37, { align: 'center' });

      // 3. Metadata block
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.text('NAMA RUANG', marginX, 43);
      doc.text('KODE RUANG', marginX, 47.5);
      doc.text('PENANGGUNG JAWAB', marginX, 52);
      doc.text('NIP PENANGGUNG JAWAB', marginX, 56.5);

      const colonX = marginX + 45;
      doc.setFont('times', 'normal');
      doc.text(`:  ${isCetakKosong ? '....................................................................' : selectedRuang}`, colonX, 43);
      doc.text(`:  ${isCetakKosong ? '....................................................................' : kodeRuangan}`, colonX, 47.5);
      doc.text(`:  ${isCetakKosong ? '....................................................................' : (penanggungJawabRuang || '....................................................................')}`, colonX, 52);
      doc.text(`:  ${isCetakKosong ? '....................................................................' : (nipPenanggungJawab || '....................................................................')}`, colonX, 56.5);

      const yearLabelX = isF4 ? 235 : 210;
      const yearValX = isF4 ? 268 : 242;
      doc.setFont('times', 'bold');
      doc.text('TAHUN AJARAN', yearLabelX, 43);
      doc.setFont('times', 'normal');
      doc.text(':  2026/2027', yearValX, 43);

      if (relatedGedungKibC && !isCetakKosong) {
        doc.setFont('times', 'bold');
        doc.text('GEDUNG (KIB C)', yearLabelX, 47.5);
        doc.setFont('times', 'normal');
        doc.text(`:  ${relatedGedungKibC.nama}`, yearValX, 47.5);

        doc.setFont('times', 'bold');
        doc.text('LANTAI / LUAS', yearLabelX, 52);
        doc.setFont('times', 'normal');
        doc.text(`:  Lantai ${activeMasterRuang?.lantai || 1}${activeMasterRuang?.luasM2 ? ` (${activeMasterRuang.luasM2} m²)` : ''}`, yearValX, 52);
      }

      // 4. Room Assets Table (15 Kolom Regulasi Permendagri No. 47 Tahun 2021)
      let tableRows: any[] = [];
      const blankRowCount = isF4 ? 9 : 8;
      const blankCellHeight = 8.0;
      const kirConfig = getKirConfig('landscape', kirPaperType);

      if (isCetakKosong) {
        tableRows = Array.from({ length: blankRowCount }, (_, idx) => 
          formatKirRow({} as any, idx, true, true)
        );
      } else {
        tableRows = roomAsets.map((aset, idx) => 
          formatKirRow(aset, idx, true, false)
        );
      }

      autoTable(doc, {
        startY: 60,
        head: kirConfig.pdfHeaders,
        body: tableRows.length > 0 ? tableRows : [['-', '-', 'Tidak ada aset terdaftar di ruangan ini.', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']],
        styles: { font: 'times', fontSize: 7.5, minCellHeight: isCetakKosong ? blankCellHeight : 0, valign: 'middle', cellPadding: 1.5 },
        headStyles: { fillColor: [30, 41, 59], halign: 'center', fontSize: 7.5, cellPadding: 1.5 },
        columnStyles: kirConfig.columnStyles,
        margin: { left: marginX, right: marginX }
      });

      // 5. Signatures
      const finalY = (doc as any).lastAutoTable.finalY;
      const pageBottomLimitY = isF4 ? 204 : 198;
      const defaultSignY = isF4 ? 172 : 166;

      let signY = isCetakKosong ? defaultSignY : Math.max(finalY + 8, defaultSignY - 25);
      if (finalY + 32 > pageBottomLimitY && !isCetakKosong) {
        doc.addPage();
        doc.setLineWidth(0.7);
        doc.rect(6, 6, borderOuterW, borderOuterH);
        doc.setLineWidth(0.2);
        doc.rect(7.5, 7.5, borderInnerW, borderInnerH);
        signY = 25;
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      
      const signLeftX = marginX + 4;
      const signMidX = centerX - 30;
      const signRightX = pageWidth - marginX - 65;

      // Left: Principal
      doc.text('Mengetahui,', signLeftX, signY);
      doc.text('Kepala Sekolah,', signLeftX, signY + 4);
      doc.text(pengaturan.kepalaSekolah, signLeftX, signY + 22);
      doc.setFont('times', 'bold');
      doc.line(signLeftX, signY + 23, signLeftX + 60, signY + 23);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, signLeftX, signY + 27);

      // Center: Room Supervisor
      doc.text('Setuju / Mengetahui,', signMidX, signY);
      doc.text('Penanggung Jawab Ruangan,', signMidX, signY + 4);
      doc.text(isCetakKosong ? '........................................................' : (penanggungJawabRuang || '........................................................'), signMidX, signY + 22);
      doc.setFont('times', 'bold');
      doc.line(signMidX, signY + 23, signMidX + 60, signY + 23);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${isCetakKosong ? '....................................................' : (nipPenanggungJawab || '....................................................')}`, signMidX, signY + 27);

      // Right: Sarpras Officer
      doc.text(dateSignatureString, signRightX, signY);
      doc.text('Wakasek Sarpras,', signRightX, signY + 4);
      doc.text(pengaturan.namaPetugasSarpras, signRightX, signY + 22);
      doc.setFont('times', 'bold');
      doc.line(signRightX, signY + 23, signRightX + 60, signY + 23);
      doc.setFont('times', 'normal');
      doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, signRightX, signY + 27);

      doc.save(`KIR_${isCetakKosong ? 'Blanko_Kosong' : selectedRuang.replace(/\s+/g, '_')}_Landscape_${kirPaperType}_2026.pdf`);
      return;
    }

    // 1. Kop Surat (Official Indonesian School Letterhead)
    // Draw Logos
    try {
      doc.addImage(SULTRA_LOGO_BASE64, 'PNG', 15, 14, 18, 18);
      doc.addImage(SCHOOL_LOGO_BASE64, 'PNG', 177, 14, 18, 18);
    } catch (e) {
      console.warn('Error drawing Kop logos', e);
    }

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', 105, 15, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 21, { align: 'center' });
    
    doc.setFontSize(16);
    doc.text(pengaturan.namaSekolah.toUpperCase(), 105, 28, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, 105, 34, { align: 'center' });
    
    // Draw Letterhead dividing double line
    doc.setLineWidth(0.8);
    doc.line(15, 37, 195, 37);
    doc.setLineWidth(0.2);
    doc.line(15, 38.5, 195, 38.5);

    // 2. Report Title
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    const titleText = isAktif 
      ? 'LAPORAN REKAPITULASI INVENTARISASI SARANA DAN PRASARANA (AKTIF)'
      : 'BERITA ACARA & LOG MUTASI PENGHAPUSAN/PEMUSNAHAN SARPRAS SEKOLAH';
    doc.text(titleText, 105, 48, { align: 'center' });

    doc.setFont('times', 'italic');
    doc.setFontSize(9);
    doc.text(`Dicetak tanggal: ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 105, 53, { align: 'center' });

    // 3. Main Data Table using autoTable
    if (isAktif) {
      const tableRows = activeAsets.map((aset, idx) => [
        idx + 1,
        aset.id,
        aset.nama,
        aset.kategori.replace(' (Peralatan Belajar)', '').replace(' (Bahan Pembelajaran)', ''),
        aset.ruangLokasi,
        `${aset.jumlah} ${aset.satuan}`,
        aset.kondisi,
        aset.sumberDana,
        aset.tahunPerolehan
      ]);

      autoTable(doc, {
        startY: 58,
        head: [['No', 'Kode Aset', 'Nama Barang', 'Kategori', 'Ruangan', 'Jumlah', 'Kondisi', 'Sumber', 'Tahun']],
        body: tableRows,
        styles: { font: 'times', fontSize: 8.5 },
        headStyles: { fillColor: [79, 70, 229], halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' },
          6: { cellWidth: 20, halign: 'center' },
          8: { cellWidth: 12, halign: 'center' }
        }
      });
    } else {
      const tableRows = pemusnahans.map((log, idx) => [
        idx + 1,
        log.id,
        log.asetId,
        log.namaAset,
        log.tanggalPemusnahan,
        log.metode,
        `${log.jumlah} Unit`,
        log.alasan,
        log.noSkPenghapusan
      ]);

      autoTable(doc, {
        startY: 58,
        head: [['No', 'ID Musnah', 'Kode Aset', 'Nama Barang', 'Tanggal', 'Metode', 'Jumlah', 'Alasan/Justifikasi', 'No. SK Penghapusan']],
        body: tableRows,
        styles: { font: 'times', fontSize: 8 },
        headStyles: { fillColor: [225, 29, 72], halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 12, halign: 'center' }
        }
      });
    }

    // 4. Dual Signatures (Principal & Officer)
    // Calculate vertical position after table
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const limitY = 240; // Ensure signature doesn't overflow page
    
    let signY = finalY;
    if (finalY > limitY) {
      doc.addPage();
      signY = 25;
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.text('Mengetahui,', 30, signY);
    doc.text('Kepala Sekolah', 30, signY + 5);
    doc.text(pengaturan.kepalaSekolah, 30, signY + 30);
    doc.setFont('times', 'bold');
    doc.line(30, signY + 31, 85, signY + 31);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, 30, signY + 35);

    doc.text('Amonggedo, ' + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }), 130, signY);
    doc.text('Wakasek Sarpras', 130, signY + 5);
    doc.text(pengaturan.namaPetugasSarpras, 130, signY + 30);
    doc.setFont('times', 'bold');
    doc.line(130, signY + 31, 185, signY + 31);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, 130, signY + 35);

    // Save report file
    const fileSuffix = reportType === 'inventaris_aktif' ? 'rekap_aktif' : 'pemusnahan_aset';
    doc.save(`ESARPRAS_LAPORAN_${fileSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesOperator = filterOperator === 'Semua' || log.operator === filterOperator;
    const matchesAction = filterAction === 'Semua' || log.action === filterAction;
    const matchesSearch = searchAuditQuery === '' || 
      log.target.toLowerCase().includes(searchAuditQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchAuditQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchAuditQuery.toLowerCase()) ||
      log.operator.toLowerCase().includes(searchAuditQuery.toLowerCase());
    return matchesOperator && matchesAction && matchesSearch;
  });

  const exportAuditLogPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Draw Logos
      try {
        doc.addImage(SULTRA_LOGO_BASE64, 'PNG', 15, 12, 18, 18);
        const schoolLogo = (pengaturan.logoUrl && pengaturan.logoUrl.startsWith('data:image')) ? pengaturan.logoUrl : SCHOOL_LOGO_BASE64;
        doc.addImage(schoolLogo, 'PNG', 177, 12, 18, 18);
      } catch (e) {
        console.warn('Error drawing Audit Log Kop logos', e);
      }

      // Kop Surat
      doc.setFont('times', 'bold');
      doc.setFontSize(14);
      doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', 105, 15, { align: 'center' });
      doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 105, 20, { align: 'center' });
      doc.setFontSize(15);
      doc.text(pengaturan.namaSekolah.toUpperCase(), 105, 26, { align: 'center' });
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text(`NPSN: ${pengaturan.npsn} | Alamat: ${pengaturan.alamat}`, 105, 31, { align: 'center' });
      doc.setLineWidth(0.8);
      doc.line(15, 34, 195, 34);
      doc.setLineWidth(0.2);
      doc.line(15, 35.5, 195, 35.5);

      // Title
      doc.setFont('times', 'bold');
      doc.setFontSize(11);
      doc.text('LAPORAN AUDIT TRAIL & RIWAYAT AKTIVITAS OPERATOR', 105, 41, { align: 'center' });
      doc.setFont('times', 'italic');
      doc.setFontSize(8);
      doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Petugas Aktif: ${activeOperator}`, 105, 45, { align: 'center' });

      const tableRows = filteredAuditLogs.map((log, idx) => [
        idx + 1,
        log.id,
        log.timestamp,
        log.operator,
        log.action,
        log.target,
        log.details
      ]);

      autoTable(doc, {
        startY: 50,
        head: [['No', 'ID Log', 'Waktu', 'Operator', 'Aksi', 'Target Aset/BHP', 'Detail Keterangan']],
        body: tableRows.length > 0 ? tableRows : [['-', '-', '-', '-', '-', 'Tidak ada riwayat audit.', '-']],
        styles: { font: 'times', fontSize: 8 },
        headStyles: { fillColor: [16, 185, 129], halign: 'center' },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 22, halign: 'center' },
          2: { cellWidth: 28, halign: 'center' },
          3: { cellWidth: 35 },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 35 }
        },
        margin: { left: 15, right: 15 }
      });

      doc.save(`Audit_Trail_Sarpras_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Gagal mengeksport PDF Audit Trail:', e);
      alert('Gagal mengeksport PDF Audit Trail.');
    }
  };

  const exportAuditLogCSV = () => {
    const headers = ['ID Log', 'Waktu', 'Operator', 'Aksi', 'Target Aset/BHP', 'Detail Keterangan'];
    const rows = filteredAuditLogs.map(log => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.operator}"`,
      `"${log.action}"`,
      `"${log.target.replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Trail_Sarpras_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="laporan-tab">
      
      {activeBackupName && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-amber-50/80 border border-amber-200 rounded-2xl shadow-sm text-amber-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-md shadow-amber-600/15">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs font-bold">Melihat Snapshot Backup Historis: <span className="underline font-extrabold">{activeBackupName}</span></p>
              <p className="text-[10px] text-amber-700 mt-0.5">Semua preview dan berkas ekspor laporan KIB / KIR di bawah ini sedang merujuk pada kondisi aset periode lalu.</p>
            </div>
          </div>
          <button
            onClick={handleResetOverride}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-bold rounded-lg text-[10px] flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw size={12} />
            Kembali ke Data Aktif
          </button>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Dokumen & Pelaporan Resmi</h2>
            <p className="text-xs text-slate-500">Unduh berkas pelaporan legalitas Sarpras sekolah untuk verifikasi instansi</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Selector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Model Berkas</h3>
            
            <div className="space-y-2">
              <button
                onClick={() => setReportType('buku_induk')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  reportType === 'buku_induk'
                    ? 'border-indigo-300 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/15'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'buku_induk' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
                  <BookOpen size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-bold">Buku Induk Barang Inventaris (BIBI)</h4>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded border border-indigo-200">Format Resmi</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Register induk resmi 13 kolom sesuai Pedoman Sarpras & Permendagri 47/2021.</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('inventaris_aktif')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  reportType === 'inventaris_aktif'
                    ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/10'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'inventaris_aktif' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Rekapitulasi Sarpras Aktif</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Daftar inventaris sarana belajar & prasarana yang layak pakai.</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('penghapusan_aset')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  reportType === 'penghapusan_aset'
                    ? 'border-rose-200 bg-rose-50/30 text-rose-900 ring-2 ring-rose-500/10'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'penghapusan_aset' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Log Pemusnahan Aset</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Berita acara formal penghapusan inventaris sekolah dari database.</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('kir')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  reportType === 'kir'
                    ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/10'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'kir' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">KIR (Kartu Identitas Ruangan)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Daftar inventaris per ruangan untuk dipasang pada pintu/tembok ruangan.</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('kib')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  reportType === 'kib'
                    ? 'border-indigo-200 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/10'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'kib' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <FileSpreadsheet size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">KIB (Kartu Inventaris Barang)</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Laporan Buku Inventaris Daerah per Klasifikasi Aset (Permendagri 47/2021).</p>
                </div>
              </button>

              <button
                onClick={() => setReportType('audit_trail')}
                className={`w-full p-4 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  reportType === 'audit_trail'
                    ? 'border-emerald-200 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/10'
                    : 'border-slate-100 hover:border-slate-200 text-slate-600'
                }`}
              >
                <div className={`p-2 rounded-lg ${reportType === 'audit_trail' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold">Jejak Audit & Aktivitas Operator</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Riwayat lengkap aktivitas Nursamsi Muslim Widuri, Alwing, dan Apriadi.</p>
                </div>
              </button>
            </div>

            {/* Buku Induk Barang Inventaris (BIBI) Sub-form */}
            {reportType === 'buku_induk' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pengaturan Cetak Buku Induk</p>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded">13 Kolom Baku</span>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ukuran Kertas Dokumen</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBibiPaperType('F4')}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        bibiPaperType === 'F4'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FileText size={14} />
                      <span>F4 / Folio (Standar)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBibiPaperType('A4')}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        bibiPaperType === 'A4'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FileText size={14} />
                      <span>A4 Landscape</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Tahun Perolehan</label>
                  <select
                    value={bibiFilterTahun}
                    onChange={(e) => setBibiFilterTahun(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Semua">Semua Tahun (Kumulatif Lengkap)</option>
                    {bibiYears.map(yr => (
                      <option key={yr} value={String(yr)}>Tahun {yr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter Sumber Dana</label>
                  <select
                    value={bibiFilterSumber}
                    onChange={(e) => setBibiFilterSumber(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Semua">Semua Sumber Dana</option>
                    {bibiSources.map(sd => (
                      <option key={sd} value={sd}>{sd}</option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-extrabold text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                    <Info size={11} />
                    <span>Format Regulasi Resmi</span>
                  </p>
                  <p className="text-[9px] text-indigo-900 leading-normal">
                    Format Buku Induk mencakup 13 kolom baku (No, Tgl Buku, Kode Barang, Nama Barang, Merk/Tipe, Jumlah, Satuan, Tahun, Bukti Dokumen, Asal Usul, Kondisi, Harga Satuan, Ruang/Ket) lengkap dengan Kop Dinas Provinsi & pengesahan Kepala Sekolah.
                  </p>
                </div>
              </motion.div>
            )}

            {/* KIB Configuration Sub-form */}
            {reportType === 'kib' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Klasifikasi KIB (BMD)</p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowBlankoModal(true)}
                      className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 text-[9px] font-extrabold rounded-md flex items-center gap-1 cursor-pointer transition shadow-2xs"
                      title="Cetak Blanko Formulir Kosong KIB A sampai F untuk dicatat manual di lapangan"
                    >
                      <Printer size={11} className="text-amber-700" />
                      <span>Cetak Blanko Kosong (A-F)</span>
                    </button>
                    <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200">
                      Permendagri 47/2021
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('A')}
                    className={`p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'A'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    KIB A
                    <span className="block text-[7.5px] font-normal text-slate-400">Tanah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('B')}
                    className={`p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'B'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    KIB B
                    <span className="block text-[7.5px] font-normal text-slate-400">Peralatan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('C')}
                    className={`p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'C'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    KIB C
                    <span className="block text-[7.5px] font-normal text-slate-400">Gedung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('D')}
                    className={`p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'D'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    KIB D
                    <span className="block text-[7.5px] font-normal text-slate-400">Jaringan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('E')}
                    className={`p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'E'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    KIB E
                    <span className="block text-[7.5px] font-normal text-slate-400">Lainnya</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('F')}
                    className={`p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'F'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    KIB F
                    <span className="block text-[7.5px] font-normal text-slate-400">KDP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedKibType('ALL')}
                    colSpan={2}
                    className={`col-span-2 p-1.5 text-center rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedKibType === 'ALL'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    Semua Bidang KIB
                    <span className="block text-[7.5px] font-normal text-slate-400">Rekapitulasi Total</span>
                  </button>
                </div>

                {/* Filter Rentang Tanggal */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                      <Calendar size={12} className="text-indigo-600" />
                      Rentang Tanggal Perolehan
                    </label>
                    {(kibStartDate || kibEndDate) && (
                      <button
                        type="button"
                        onClick={() => handleKibPresetChange('semua')}
                        className="text-[9px] text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
                      >
                        Reset Tanggal
                      </button>
                    )}
                  </div>

                  {/* Preset Buttons */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => handleKibPresetChange('semua')}
                      className={`px-1.5 py-1 text-[9px] font-semibold rounded border cursor-pointer transition ${
                        kibPreset === 'semua' && !kibStartDate && !kibEndDate
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Semua Periode
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKibPresetChange('bulan_ini')}
                      className={`px-1.5 py-1 text-[9px] font-semibold rounded border cursor-pointer transition ${
                        kibPreset === 'bulan_ini'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKibPresetChange('triwulan')}
                      className={`px-1.5 py-1 text-[9px] font-semibold rounded border cursor-pointer transition ${
                        kibPreset === 'triwulan'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Triwulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKibPresetChange('semester_1')}
                      className={`px-1.5 py-1 text-[9px] font-semibold rounded border cursor-pointer transition ${
                        kibPreset === 'semester_1'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Semester 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKibPresetChange('semester_2')}
                      className={`px-1.5 py-1 text-[9px] font-semibold rounded border cursor-pointer transition ${
                        kibPreset === 'semester_2'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Semester 2
                    </button>
                    <button
                      type="button"
                      onClick={() => handleKibPresetChange('tahun_ini')}
                      className={`px-1.5 py-1 text-[9px] font-semibold rounded border cursor-pointer transition ${
                        kibPreset === 'tahun_ini'
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Tahun Berjalan
                    </button>
                  </div>

                  {/* Manual Date Input Pickers */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="block text-[8.5px] font-semibold text-slate-500 mb-0.5">Dari Tanggal</span>
                      <input
                        type="date"
                        value={kibStartDate}
                        onChange={(e) => {
                          setKibStartDate(e.target.value);
                          setKibPreset('kustom');
                        }}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[8.5px] font-semibold text-slate-500 mb-0.5">Sampai Tanggal</span>
                      <input
                        type="date"
                        value={kibEndDate}
                        onChange={(e) => {
                          setKibEndDate(e.target.value);
                          setKibPreset('kustom');
                        }}
                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Filter Kondisi & Sumber Dana */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Kondisi Fisik</label>
                    <select
                      value={kibFilterKondisi}
                      onChange={(e) => setKibFilterKondisi(e.target.value)}
                      className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="Semua">Semua Kondisi</option>
                      <option value="Baik">Baik (B)</option>
                      <option value="Rusak Ringan">Rusak Ringan (RR)</option>
                      <option value="Rusak Berat">Rusak Berat (RB)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 mb-1">Ukuran Kertas</label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setKibPaperType('F4')}
                        className={`p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition text-center ${
                          kibPaperType === 'F4'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        F4 (Folio)
                      </button>
                      <button
                        type="button"
                        onClick={() => setKibPaperType('A4')}
                        className={`p-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition text-center ${
                          kibPaperType === 'A4'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        A4
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="p-2 bg-indigo-50/70 rounded-lg border border-indigo-100 text-[10px] text-indigo-950 leading-relaxed">
                  <div className="font-bold flex items-center justify-between mb-0.5">
                    <span>Aset Terpilih: {kibAsets.length} Item ({totalUnitKib} Unit)</span>
                    <span className="text-emerald-700 font-extrabold">Rp {totalNilaiKib.toLocaleString('id-ID')}</span>
                  </div>
                  <p className="text-[9px] text-indigo-800">
                    {selectedKibType === 'A' && "KIB A: Tanah pekarangan & lapangan."}
                    {selectedKibType === 'B' && "KIB B: Peralatan belajar, komputer/TIK, proyektor, genset & mesin."}
                    {selectedKibType === 'C' && "KIB C: Gedung sekolah, laboratorium, ruang kelas & prasarana."}
                    {selectedKibType === 'D' && "KIB D: Jalan lingkungan, paving block, pagar & jaringan instalasi."}
                    {selectedKibType === 'E' && "KIB E: Mebel meja kursi, buku perpustakaan & alat peraga seni."}
                    {selectedKibType === 'F' && "KIB F: Bangunan gedung dalam tahap pengerjaan (KDP)."}
                    {selectedKibType === 'ALL' && "KIB Gabungan: Rekapitulasi seluruh kelompok aset A s/d F."}
                  </p>
                </div>
              </motion.div>
            )}

            {/* KIR Configuration Sub-form */}
            {reportType === 'kir' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 bg-slate-50 rounded-xl border border-slate-150 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Konfigurasi Kartu Inventaris Ruangan (KIR)</p>
                  <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">Permendagri 47/2021</span>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Pilih Ruangan</label>
                  <select
                    value={selectedRuang}
                    onChange={(e) => setSelectedRuang(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    {availableRuangNames.map((ruang) => (
                      <option key={ruang} value={ruang}>{ruang}</option>
                    ))}
                  </select>
                </div>

                {relatedGedungKibC && (
                  <div className="p-2.5 bg-blue-50/80 border border-blue-200/80 rounded-lg space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[10px]">
                      <Building2 size={12} className="text-blue-700" />
                      <span>Terhubung ke Gedung KIB C</span>
                    </div>
                    <p className="text-[9px] text-blue-800 leading-tight">
                      <strong>Gedung:</strong> {relatedGedungKibC.nama} <br />
                      <strong>Lantai:</strong> Lantai {activeMasterRuang?.lantai || 1} {activeMasterRuang?.luasM2 ? `• Luas: ${activeMasterRuang.luasM2} m²` : ''}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Kode Ruangan</label>
                  <input
                    type="text"
                    value={kodeRuangan}
                    onChange={(e) => setKodeRuangan(e.target.value)}
                    placeholder="Contoh: LAB-01"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Penanggung Jawab Ruangan (PJ)</label>
                  <input
                    type="text"
                    value={penanggungJawabRuang}
                    onChange={(e) => setPenanggungJawabRuang(e.target.value)}
                    placeholder="Nama Penanggung Jawab Ruangan"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">NIP Penanggung Jawab Ruangan</label>
                  <input
                    type="text"
                    value={nipPenanggungJawab}
                    onChange={(e) => setNipPenanggungJawab(e.target.value)}
                    placeholder="NIP Penanggung Jawab"
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Ukuran Kertas</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKirPaperType('F4')}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        kirPaperType === 'F4'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FileSpreadsheet size={14} />
                      <span>F4 / Folio (215x330mm)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKirPaperType('A4')}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        kirPaperType === 'A4'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FileText size={14} />
                      <span>A4 (210x297mm)</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Orientasi Kertas Dokumen</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKirOrientation('portrait')}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        kirOrientation === 'portrait'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FileText size={14} />
                      <span>Portrait (Tegak)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setKirOrientation('landscape')}
                      className={`p-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition ${
                        kirOrientation === 'landscape'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <FileText size={14} className="rotate-90" />
                      <span>Landscape (Mendatar)</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 mt-1">
                  <input
                    type="checkbox"
                    id="cetak_kosong"
                    checked={isCetakKosong}
                    onChange={(e) => setIsCetakKosong(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="cetak_kosong" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    Cetak Blanko Kosong (1 Halaman Penuh F4)
                  </label>
                </div>

                {isCetakKosong ? (
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl space-y-1">
                    <p className="text-[10px] font-extrabold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                      <Info size={11} />
                      <span>Mode Blanko Penuh 1 Halaman {kirPaperType}</span>
                    </p>
                    <p className="text-[9px] text-blue-700 leading-normal">
                      Menghasilkan lembar blanko presisi yang memenuhi 1 halaman kertas {kirPaperType === 'F4' ? 'F4 / Folio (215 x 330 mm)' : 'A4'} dari kop surat sampai tanda tangan dengan tanggal bertuliskan <strong>"Amonggedo, .................................... 2026"</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1.5">
                    <p className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Penanggung Jawab Kosong</span>
                    </p>
                    <p className="text-[10px] text-amber-700 leading-normal">
                      Nama & NIP Penanggung Jawab Ruangan otomatis dikosongkan (berupa garis putus-putus tipis) agar Wali Kelas, Kepala Perpustakaan, atau Kepala Laboratorium dapat mengisi dan menandatanganinya secara manual setelah dicetak.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            <button
              onClick={handleExportPDF}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-indigo-600/10 cursor-pointer"
            >
              <Download size={14} />
              {reportType === 'buku_induk' 
                ? 'Unduh PDF Buku Induk (BIBI)' 
                : reportType === 'kib' 
                ? `Unduh PDF KIB ${selectedKibType} (${kibPaperType})` 
                : reportType === 'kir'
                ? `Unduh PDF KIR ${selectedRuang} (${kirPaperType})`
                : 'Unduh Versi PDF Resmi'}
            </button>

            {reportType === 'buku_induk' && (
              <button
                type="button"
                onClick={exportBibiCSV}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Unduh Excel / CSV Buku Induk
              </button>
            )}

            {reportType === 'kib' && (
              <button
                type="button"
                onClick={exportKibCSV}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Unduh Excel / CSV KIB {selectedKibType}
              </button>
            )}

            {reportType === 'kir' && (
              <button
                type="button"
                onClick={exportKirCSV}
                className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                Unduh Excel / CSV KIR Permendagri 47
              </button>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-100 text-slate-600 text-xs rounded-2xl leading-relaxed flex gap-2.5 items-start">
            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Ketentuan Format Berkas</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Laporan ini disusun secara otomatis menyesuaikan format surat kementerian dalam format ukuran kertas A4, margin standar, dan Times New Roman sebagai font legal dokumen.
              </p>
            </div>
          </div>
        </div>

        {/* Right: PDF Layout Preview / Audit Trail */}
        <div className="lg:col-span-8">
          <motion.div
            layoutId="preview_card"
            className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-lg min-h-[500px] flex flex-col justify-between overflow-x-auto"
          >
            {reportType === 'buku_induk' ? (
              /* Live Preview of Landscape Buku Induk Barang Inventaris (BIBI) */
              <div className="flex flex-col justify-between h-full border-4 border-double border-slate-800 p-6 rounded-2xl min-w-[920px] bg-slate-50/50">
                <div>
                  {/* Kop Surat SMA Negeri 17 Konawe */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-4">
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
                      <img src={SCHOOL_LOGO_BASE64} alt="Logo Sekolah" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="text-center mb-4">
                    <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase font-serif">BUKU INDUK BARANG INVENTARIS (BIBI)</h2>
                    <p className="text-[11px] text-slate-600 italic mt-0.5">
                      Berdasarkan Pedoman Tata Kelola Sarana dan Prasarana Persekolahan & Permendagri No. 47 Tahun 2021
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-slate-600 font-medium">
                      <span className="bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                        Tahun Pembukuan: {bibiFilterTahun !== 'Semua' ? bibiFilterTahun : 'Kumulatif (Semua Tahun)'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        Sumber Dana: {bibiFilterSumber}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Format Kertas: {bibiPaperType} Landscape
                      </span>
                    </div>
                  </div>

                  {/* Filter Search within table */}
                  <div className="flex items-center justify-between gap-3 mb-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 flex-1">
                      <Search size={14} className="text-slate-400 ml-1" />
                      <input
                        type="text"
                        value={bibiSearch}
                        onChange={(e) => setBibiSearch(e.target.value)}
                        placeholder="Cari nama barang, kode aset, merek, atau ruang penempatan..."
                        className="w-full text-xs bg-transparent focus:outline-none placeholder:text-slate-400"
                      />
                      {bibiSearch && (
                        <button
                          type="button"
                          onClick={() => setBibiSearch('')}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-slate-700 shrink-0">
                      Menampilkan <span className="text-indigo-600">{bibiAsets.length}</span> item ({totalUnitBibi} Unit)
                    </div>
                  </div>

                  {/* 13-column Table */}
                  <div className="overflow-x-auto border border-slate-300 rounded-lg bg-white">
                    <table className="w-full border-collapse text-[10px] font-serif">
                      <thead>
                        <tr className="bg-slate-800 text-white font-sans text-center font-bold">
                          <th className="border border-slate-700 py-1.5 px-1 w-7">No</th>
                          <th className="border border-slate-700 py-1.5 px-1.5">Tgl Buku</th>
                          <th className="border border-slate-700 py-1.5 px-2">Kode Barang</th>
                          <th className="border border-slate-700 py-1.5 px-2 text-left">Nama / Jenis Barang</th>
                          <th className="border border-slate-700 py-1.5 px-2 text-left">Merk / Spesifikasi</th>
                          <th className="border border-slate-700 py-1.5 px-1">Jml</th>
                          <th className="border border-slate-700 py-1.5 px-1">Sat</th>
                          <th className="border border-slate-700 py-1.5 px-1">Thn</th>
                          <th className="border border-slate-700 py-1.5 px-2 text-left">Bukti Dokumen</th>
                          <th className="border border-slate-700 py-1.5 px-2 text-left">Asal Usul</th>
                          <th className="border border-slate-700 py-1.5 px-1">Kond</th>
                          <th className="border border-slate-700 py-1.5 px-2 text-right">Harga Satuan (Rp)</th>
                          <th className="border border-slate-700 py-1.5 px-2 text-left">Ruang / Keterangan</th>
                        </tr>
                        <tr className="bg-slate-200 text-slate-700 font-sans text-[9px] text-center font-semibold">
                          <td className="border border-slate-300 py-0.5">1</td>
                          <td className="border border-slate-300 py-0.5">2</td>
                          <td className="border border-slate-300 py-0.5">3</td>
                          <td className="border border-slate-300 py-0.5">4</td>
                          <td className="border border-slate-300 py-0.5">5</td>
                          <td className="border border-slate-300 py-0.5">6</td>
                          <td className="border border-slate-300 py-0.5">7</td>
                          <td className="border border-slate-300 py-0.5">8</td>
                          <td className="border border-slate-300 py-0.5">9</td>
                          <td className="border border-slate-300 py-0.5">10</td>
                          <td className="border border-slate-300 py-0.5">11</td>
                          <td className="border border-slate-300 py-0.5">12</td>
                          <td className="border border-slate-300 py-0.5">13</td>
                        </tr>
                      </thead>
                      <tbody>
                        {bibiAsets.length === 0 ? (
                          <tr>
                            <td colSpan={13} className="text-center py-6 text-slate-400 italic">
                              Tidak ada data aset inventaris yang cocok dengan filter yang dipilih.
                            </td>
                          </tr>
                        ) : (
                          bibiAsets.map((aset, idx) => {
                            const kondisiCode = aset.kondisi === 'Baik' ? 'B' : aset.kondisi === 'Rusak Ringan' ? 'KB' : 'RB';
                            return (
                              <tr key={aset.id} className={idx % 2 === 0 ? 'bg-white hover:bg-indigo-50/20' : 'bg-slate-50/60 hover:bg-indigo-50/20'}>
                                <td className="border border-slate-200 py-1.5 px-1 text-center">{idx + 1}</td>
                                <td className="border border-slate-200 py-1.5 px-1.5 text-center font-sans">{aset.tanggalRegister || '-'}</td>
                                <td className="border border-slate-200 py-1.5 px-2 text-center font-mono font-bold text-slate-800">{aset.id}</td>
                                <td className="border border-slate-200 py-1.5 px-2 font-medium text-slate-900">{aset.nama}</td>
                                <td className="border border-slate-200 py-1.5 px-2 text-slate-700">
                                  {aset.merek || '-'} {aset.spesifikasi ? `(${aset.spesifikasi})` : ''}
                                </td>
                                <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">{aset.jumlah}</td>
                                <td className="border border-slate-200 py-1.5 px-1 text-center text-slate-600">{aset.satuan}</td>
                                <td className="border border-slate-200 py-1.5 px-1 text-center font-sans">{aset.tahunPerolehan}</td>
                                <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{aset.nomorBuktiPerolehan || 'BAST / Faktur'}</td>
                                <td className="border border-slate-200 py-1.5 px-2 text-slate-700">{aset.sumberDana || 'BOS Reguler'}</td>
                                <td className="border border-slate-200 py-1.5 px-1 text-center font-bold">
                                  <span className={`px-1 py-0.5 rounded text-[9px] ${
                                    kondisiCode === 'B' ? 'bg-emerald-100 text-emerald-800' :
                                    kondisiCode === 'KB' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {kondisiCode}
                                  </span>
                                </td>
                                <td className="border border-slate-200 py-1.5 px-2 text-right font-mono text-slate-800">
                                  {aset.hargaPerolehan ? Number(aset.hargaPerolehan).toLocaleString('id-ID') : '-'}
                                </td>
                                <td className="border border-slate-200 py-1.5 px-2 text-slate-700">
                                  {aset.ruangLokasi}
                                  {aset.serialNumber && <span className="text-[9px] text-slate-400 block font-mono">SN: {aset.serialNumber}</span>}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                      {bibiAsets.length > 0 && (
                        <tfoot>
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                            <td colSpan={5} className="border border-slate-200 py-2 px-3 text-right uppercase tracking-wider font-sans">
                              Jumlah / Total Keseluruhan:
                            </td>
                            <td className="border border-slate-200 py-2 px-1 text-center text-indigo-700 text-xs font-black">
                              {totalUnitBibi}
                            </td>
                            <td colSpan={5} className="border border-slate-200 py-2 px-2 text-center text-slate-500 font-normal">
                              Unit Barang
                            </td>
                            <td className="border border-slate-200 py-2 px-2 text-right font-mono text-indigo-900 font-black">
                              {totalNilaiBibi > 0 ? `Rp ${totalNilaiBibi.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="border border-slate-200 py-2 px-2 text-slate-600 font-sans text-[9px]">
                              {bibiAsets.length} Item Register
                            </td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-start mt-8 pt-4 font-serif text-xs px-6">
                  <div className="text-left space-y-1">
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-bold text-slate-800">Kepala {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}</p>
                    <div className="h-14"></div>
                    <p className="font-bold underline text-slate-900 text-sm tracking-wide">{pengaturan.kepalaSekolah}</p>
                    <p className="text-slate-600 text-[10px]">NIP. {pengaturan.nipKepalaSekolah || '....................................................'}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <p className="text-slate-600">Amonggedo, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="font-bold text-slate-800">Wakasek Sarana dan Prasarana / Pengurus Barang</p>
                    <div className="h-14"></div>
                    <p className="font-bold underline text-slate-900 text-sm tracking-wide">{pengaturan.namaPetugasSarpras}</p>
                    <p className="text-slate-600 text-[10px]">NIP. {pengaturan.nipPetugasSarpras || '....................................................'}</p>
                  </div>
                </div>
              </div>
            ) : reportType === 'audit_trail' ? (
              <div className="space-y-6 w-full">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                      <ShieldCheck className="text-emerald-600" size={20} />
                      Jejak Audit & Aktivitas Operator
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pencatatan riwayat perubahan data oleh Operator Resmi ({AUTHORIZED_USERS.join(', ')})
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportAuditLogCSV}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download size={14} />
                      Ekspor CSV
                    </button>
                    <button
                      onClick={exportAuditLogPDF}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
                    >
                      <FileText size={14} />
                      Cetak PDF Audit
                    </button>
                  </div>
                </div>

                {/* Filters Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Operator</label>
                    <select
                      value={filterOperator}
                      onChange={(e) => setFilterOperator(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Semua">Semua Operator ({AUTHORIZED_USERS.length} User)</option>
                      {AUTHORIZED_USERS.map((user) => (
                        <option key={user} value={user}>{user}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Filter Jenis Aksi</label>
                    <select
                      value={filterAction}
                      onChange={(e) => setFilterAction(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Semua">Semua Jenis Aksi</option>
                      <option value="TAMBAH_ASET">Tambah Aset</option>
                      <option value="EDIT_ASET">Edit Aset</option>
                      <option value="HAPUS_ASET">Hapus Aset</option>
                      <option value="PINJAM_ASET">Peminjaman Aset</option>
                      <option value="KEMBALI_ASET">Pengembalian Aset</option>
                      <option value="PEMUSNAHAN_ASET">Pemusnahan Aset</option>
                      <option value="TAMBAH_BHP">Tambah BHP</option>
                      <option value="AMBIL_BHP">Pengambilan BHP</option>
                      <option value="UBAH_PENGATURAN">Ubah Pengaturan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cari Keterangan / Target</label>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ketik nama aset / kata kunci..."
                        value={searchAuditQuery}
                        onChange={(e) => setSearchAuditQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Audit Trail Table */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-900 text-white font-bold sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-3 w-10 text-center">No</th>
                          <th className="px-3 py-3 w-32">Waktu (WITA)</th>
                          <th className="px-3 py-3 w-44">Operator</th>
                          <th className="px-3 py-3 w-28 text-center">Aksi</th>
                          <th className="px-3 py-3 w-40">Target</th>
                          <th className="px-3 py-3">Detail Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {filteredAuditLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                              Belum ada catatan aktivitas audit yang sesuai.
                            </td>
                          </tr>
                        ) : (
                          filteredAuditLogs.map((log, index) => {
                            const isAdd = log.action.includes('TAMBAH');
                            const isDelete = log.action.includes('HAPUS') || log.action.includes('PEMUSNAHAN');
                            const isPinjam = log.action.includes('PINJAM') || log.action.includes('AMBIL');
                            const isKembali = log.action.includes('KEMBALI');

                            const badgeStyle = isAdd
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isDelete
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isPinjam
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isKembali
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200';

                            return (
                              <tr key={log.id} className="hover:bg-slate-50/80 transition">
                                <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[10px]">{index + 1}</td>
                                <td className="px-3 py-2.5 font-mono text-[10px] text-slate-600 whitespace-nowrap">{log.timestamp}</td>
                                <td className="px-3 py-2.5 font-extrabold text-slate-800 flex items-center gap-1.5">
                                  <UserCheck size={13} className="text-indigo-600 shrink-0" />
                                  <span className="truncate max-w-[140px]" title={log.operator}>{log.operator}</span>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wider ${badgeStyle}`}>
                                    {log.action.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="px-3 py-2.5 font-bold text-slate-700 text-[11px]">{log.target}</td>
                                <td className="px-3 py-2.5 text-slate-600 text-[11px] leading-tight">{log.details}</td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : reportType === 'kib' ? (
              /* Live Preview of Landscape KIB Permendagri 47/2021 */
              <div className="flex flex-col justify-between h-full border-4 border-double border-slate-800 p-6 rounded-2xl min-w-[920px] bg-slate-50/50">
                <div>
                  {/* Kop Surat SMA Negeri 17 Konawe */}
                  <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3 mb-4">
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
                      <img src={SCHOOL_LOGO_BASE64} alt="Logo Sekolah" className="w-full h-full object-contain" />
                    </div>
                  </div>

                  {/* KIB Title */}
                  <div className="text-center mb-3">
                    <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase font-serif">
                      {selectedKibType === 'A' && 'KARTU INVENTARIS BARANG (KIB) A - TANAH'}
                      {selectedKibType === 'B' && 'KARTU INVENTARIS BARANG (KIB) B - PERALATAN DAN MESIN'}
                      {selectedKibType === 'C' && 'KARTU INVENTARIS BARANG (KIB) C - GEDUNG DAN BANGUNAN'}
                      {selectedKibType === 'D' && 'KARTU INVENTARIS BARANG (KIB) D - JALAN, IRIGASI, DAN JARINGAN'}
                      {selectedKibType === 'E' && 'KARTU INVENTARIS BARANG (KIB) E - ASET TETAP LAINNYA'}
                      {selectedKibType === 'F' && 'KARTU INVENTARIS BARANG (KIB) F - KONSTRUKSI DALAM PENGERJAAN'}
                      {selectedKibType === 'ALL' && 'KARTU INVENTARIS BARANG (KIB) - REKAPITULASI SEMUA BIDANG BMD'}
                    </h2>
                    <p className="text-[11px] text-slate-600 italic mt-0.5">
                      Berdasarkan Tata Cara Pelaksanaan Penatausahaan BMD (Permendagri No. 47 Tahun 2021)
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-[10px] text-slate-600 font-medium">
                      <span className="bg-indigo-50 text-indigo-800 px-2.5 py-0.5 rounded border border-indigo-200 font-semibold flex items-center gap-1">
                        <Calendar size={11} className="text-indigo-600" />
                        {kibStartDate || kibEndDate 
                          ? `Periode: ${kibStartDate ? new Date(kibStartDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Awal'} s/d ${kibEndDate ? new Date(kibEndDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sekarang'}`
                          : 'Periode: Kumulatif (Semua Tanggal)'}
                      </span>
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        Kondisi: {kibFilterKondisi}
                      </span>
                      <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                        Format Kertas: {kibPaperType} Landscape
                      </span>
                    </div>
                  </div>

                  {/* Search Bar for KIB */}
                  <div className="flex items-center justify-between gap-3 mb-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 flex-1">
                      <Search size={14} className="text-slate-400 ml-1" />
                      <input
                        type="text"
                        value={kibSearch}
                        onChange={(e) => setKibSearch(e.target.value)}
                        placeholder="Cari aset KIB berdasarkan nama, kode, merek, spesifikasi, atau ruangan..."
                        className="w-full text-xs bg-transparent focus:outline-none placeholder:text-slate-400"
                      />
                      {kibSearch && (
                        <button
                          type="button"
                          onClick={() => setKibSearch('')}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                      Menampilkan <strong className="text-indigo-600">{kibAsets.length}</strong> item
                    </div>
                  </div>

                  {/* KIB 12-Column Table */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden text-[9px]">
                    <div className="overflow-x-auto">
                      {(() => {
                        const previewConf = getKibConfig(selectedKibType);
                        return (
                          <table className="w-full text-left">
                            <thead className="bg-slate-800 text-white font-bold text-center">
                              <tr>
                                {previewConf.previewHeaders.map((head, hIdx) => (
                                  <th key={hIdx} className={`px-2 py-1.5 border-r border-slate-700 whitespace-nowrap ${hIdx === 0 ? 'w-7 text-center' : hIdx === 1 ? 'text-left min-w-[140px]' : ''}`}>
                                    {head}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {kibAsets.length > 0 ? (
                                kibAsets.map((a, i) => {
                                  const rowCells = formatAsetKibRow(a, i, selectedKibType, true);
                                  return (
                                    <tr key={a.id} className={i % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100/70'}>
                                      {rowCells.map((cell, cIdx) => (
                                        <td 
                                          key={cIdx} 
                                          className={`px-2 py-1 text-[8.5px] border-r border-slate-200 whitespace-nowrap ${
                                            cIdx === 0 ? 'text-center font-bold text-slate-400' :
                                            cIdx === 1 ? 'font-bold text-slate-800' :
                                            cell.startsWith('Rp') ? 'text-right font-mono font-semibold text-slate-700' :
                                            cell === 'B' || cell === 'Baik' ? 'text-center text-emerald-700 font-bold' :
                                            cell === 'RR' || cell === 'Rusak Ringan' ? 'text-center text-amber-700 font-bold' :
                                            cell === 'RB' || cell === 'Rusak Berat' ? 'text-center text-rose-700 font-bold' :
                                            'text-slate-600'
                                          }`}
                                        >
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr className="bg-white">
                                  <td colSpan={previewConf.previewHeaders.length} className="px-4 py-8 text-center text-slate-400 italic font-medium">
                                    Tidak ada data aset KIB yang terdaftar pada rentang tanggal/kategori ini.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                            {kibAsets.length > 0 && (
                              <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                                <tr>
                                  <td colSpan={2} className="px-3 py-1.5 text-center uppercase tracking-wider text-[8.5px]">
                                    Total Rekapitulasi KIB
                                  </td>
                                  <td colSpan={previewConf.previewHeaders.length - 4} className="border-r border-slate-200"></td>
                                  <td className="px-1.5 py-1.5 text-center text-indigo-950 font-bold border-r border-slate-200">
                                    {totalUnitKib} Unit
                                  </td>
                                  <td className="px-2.5 py-1.5 text-right text-indigo-950 font-black border-r border-slate-200 font-mono text-[9px]">
                                    Rp {totalNilaiKib.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Signature block */}
                <div className="grid grid-cols-2 gap-6 text-[10px] mt-6 pt-4 border-t border-slate-300">
                  <div className="pl-4">
                    <p className="text-slate-600">Mengetahui,</p>
                    <p className="font-bold text-slate-900 font-serif">Kepala {pengaturan.namaSekolah}</p>
                    <div className="h-14"></div>
                    <p className="font-bold text-slate-900 underline font-serif">{pengaturan.kepalaSekolah}</p>
                    <p className="text-slate-600">NIP. {pengaturan.nipKepalaSekolah || '....................................................'}</p>
                  </div>
                  <div className="text-right pr-4">
                    <p className="text-slate-600">Amonggedo, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="font-bold text-slate-900 font-serif">Wakasek Sarana dan Prasarana / Pengurus Barang</p>
                    <div className="h-14"></div>
                    <p className="font-bold text-slate-900 underline font-serif">{pengaturan.namaPetugasSarpras}</p>
                    <p className="text-slate-600">NIP. {pengaturan.nipPetugasSarpras || '....................................................'}</p>
                  </div>
                </div>
              </div>
            ) : reportType !== 'kir' ? (
              <div className="flex flex-col justify-between h-full min-w-[500px]">
                {/* Kop Preview */}
                <div className="text-center font-serif relative">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Pemerintah Provinsi Sulawesi Tenggara</h3>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-0.5">Dinas Pendidikan dan Kebudayaan</h4>
                  <h1 className="text-sm font-black text-indigo-900 uppercase tracking-widest mt-1">{pengaturan.namaSekolah}</h1>
                  <p className="text-[9px] text-slate-500 mt-1 font-sans">NPSN: {pengaturan.npsn} | Alamat: {pengaturan.alamat}</p>
                  
                  <div className="h-[2px] bg-slate-800 mt-3"></div>
                  <div className="h-[0.5px] bg-slate-500 mt-0.5"></div>
                </div>

                {/* Document Title */}
                <div className="text-center mt-6">
                  <h2 className="text-xs font-black text-slate-800 underline uppercase tracking-wide">
                    {reportType === 'inventaris_aktif' 
                      ? 'LAPORAN REKAPITULASI INVENTARISASI SARANA DAN PRASARANA (AKTIF)' 
                      : 'LOG BERITA ACARA PENGHAPUSAN DAN MUTASI BARANG MILIK NEGARA (SARPRAS)'}
                  </h2>
                  <p className="text-[9px] text-slate-400 mt-1 italic font-mono">Status Data: Terverifikasi Sistem E-Sarpras</p>
                </div>

                {/* Table Preview */}
                <div className="my-6 border border-slate-100 rounded-xl overflow-hidden text-[10px]">
                  {reportType === 'inventaris_aktif' ? (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-center">No</th>
                          <th className="px-4 py-2">Kode Aset</th>
                          <th className="px-4 py-2">Nama Barang</th>
                          <th className="px-4 py-2">Ruangan</th>
                          <th className="px-4 py-2 text-center">Jumlah</th>
                          <th className="px-4 py-2">Kondisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeAsets.slice(0, 4).map((a, i) => (
                          <tr key={a.id}>
                            <td className="px-4 py-1.5 text-center font-bold text-slate-400">{i+1}</td>
                            <td className="px-4 py-1.5 font-mono text-[9px]">{a.id}</td>
                            <td className="px-4 py-1.5 font-semibold">{a.nama}</td>
                            <td className="px-4 py-1.5">{a.ruangLokasi}</td>
                            <td className="px-4 py-1.5 text-center font-bold">{a.jumlah} {a.satuan}</td>
                            <td className="px-4 py-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                a.kondisi === 'Baik' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>{a.kondisi}</span>
                            </td>
                          </tr>
                        ))}
                        {activeAsets.length > 4 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-2 text-center text-slate-400 bg-slate-50/50 italic">
                              + {activeAsets.length - 4} item lainnya dalam daftar PDF penuh...
                            </td>
                          </tr>
                        )}
                        {activeAsets.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                              Belum ada data aset aktif.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-100 font-bold text-slate-600">
                        <tr>
                          <th className="px-4 py-2 text-center">No</th>
                          <th className="px-4 py-2">ID Musnah</th>
                          <th className="px-4 py-2">Nama Barang</th>
                          <th className="px-4 py-2">Tanggal</th>
                          <th className="px-4 py-2">Metode</th>
                          <th className="px-4 py-2 text-center">Jumlah</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pemusnahans.length > 0 ? (
                          pemusnahans.slice(0, 3).map((p, i) => (
                            <tr key={p.id}>
                              <td className="px-4 py-1.5 text-center font-bold text-slate-400">{i+1}</td>
                              <td className="px-4 py-1.5 font-mono text-[9px]">{p.id}</td>
                              <td className="px-4 py-1.5 font-semibold">{p.namaAset}</td>
                              <td className="px-4 py-1.5">{p.tanggalPemusnahan}</td>
                              <td className="px-4 py-1.5 font-bold">{p.metode}</td>
                              <td className="px-4 py-1.5 text-center font-bold text-rose-600">{p.jumlah} Unit</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">
                              Belum ada catatan penghapusan aset formal saat ini.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Signature Block Preview */}
                <div className="grid grid-cols-2 gap-8 text-[10px] mt-8 pt-6 border-t border-slate-100">
                  <div>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="font-bold text-slate-800">Kepala Sekolah</p>
                    <div className="h-12"></div>
                    <p className="font-bold text-slate-800 underline">{pengaturan.kepalaSekolah}</p>
                    <p className="text-slate-500">NIP. {pengaturan.nipKepalaSekolah || '-'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Amonggedo, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="font-bold text-slate-800">Wakasek Sarpras</p>
                    <div className="h-12"></div>
                    <p className="font-bold text-slate-800 underline">{pengaturan.namaPetugasSarpras}</p>
                    <p className="text-slate-500">NIP. {pengaturan.nipPetugasSarpras || '-'}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Live Preview of KIR (Portrait or Landscape) */
              <div className={`flex flex-col justify-between h-full border-4 border-double border-slate-800 p-6 rounded-2xl bg-slate-50/50 transition-all ${
                kirOrientation === 'portrait' ? 'min-w-[480px] max-w-[620px] mx-auto' : 'min-w-[700px]'
              }`}>
                <div>
                  {/* KIR Title */}
                  <div className="text-center font-serif relative">
                    <span className="absolute top-0 right-0 px-2 py-0.5 rounded text-[8px] font-bold bg-indigo-100 text-indigo-700">
                      {kirPaperType === 'F4' ? 'Kertas F4 (215x330mm)' : 'Kertas A4'} • {kirOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                    </span>
                    <h2 className="text-sm font-black text-slate-800 tracking-wider">KARTU IDENTITAS RUANGAN (KIR)</h2>
                    <h3 className="text-xs font-bold text-indigo-900 uppercase mt-0.5">{pengaturan.namaSekolah}</h3>
                    <p className="text-[8px] text-slate-500 font-sans mt-0.5">NPSN: {pengaturan.npsn} | Alamat: {pengaturan.alamat}</p>
                    <hr className="border-slate-800 my-2" />
                  </div>

                  {/* Room Metadata */}
                  <div className="grid grid-cols-2 text-[10px] my-3">
                    <div className="space-y-1">
                      <div className="flex"><span className="w-36 font-bold text-slate-700">NAMA RUANGAN</span> <span className="text-slate-900 font-bold">: {isCetakKosong ? '........................................................' : selectedRuang}</span></div>
                      <div className="flex"><span className="w-36 font-bold text-slate-700">KODE RUANGAN</span> <span className="text-slate-900 font-mono font-bold">: {isCetakKosong ? '........................................................' : kodeRuangan}</span></div>
                      <div className="flex"><span className="w-36 font-bold text-slate-700">PENANGGUNG JAWAB</span> <span className="text-slate-900 font-medium">: {isCetakKosong ? '........................................................' : (penanggungJawabRuang || '........................................................')}</span></div>
                      <div className="flex"><span className="w-36 font-bold text-slate-700">NIP PJ RUANGAN</span> <span className="text-slate-900 font-mono">: {isCetakKosong ? '........................................................' : (nipPenanggungJawab || '........................................................')}</span></div>
                    </div>
                    <div className="text-right flex flex-col justify-between">
                      <div><span className="font-bold text-slate-700">TAHUN AJARAN:</span> <span className="font-bold text-indigo-700">2026/2027</span></div>
                    </div>
                  </div>

                  {/* Assets List in selected room */}
                  <div className="border border-slate-300 rounded-lg overflow-hidden text-[9px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-800 text-white font-bold text-center">
                        <tr className="border-b border-slate-700">
                          <th rowSpan={2} className="px-2 py-1.5 border-r border-slate-700 w-8 align-middle text-center bg-slate-900/60">No</th>
                          <th rowSpan={2} className="px-3 py-1.5 border-r border-slate-700 align-middle text-left bg-slate-900/60">Nama Barang / Aset</th>
                          <th rowSpan={2} className="px-2 py-1.5 border-r border-slate-700 w-12 align-middle text-center bg-slate-900/60">Jumlah</th>
                          <th rowSpan={2} className="px-2 py-1.5 border-r border-slate-700 w-14 align-middle text-center bg-slate-900/60">Satuan</th>
                          <th colSpan={3} className="px-2 py-0.5 border-r border-slate-700 text-center text-[8px] uppercase tracking-wider bg-slate-900">Kondisi Kelayakan</th>
                          <th rowSpan={2} className="px-3 py-1.5 align-middle text-left bg-slate-900/60">Keterangan</th>
                        </tr>
                        <tr>
                          <th className="px-1.5 py-0.5 border-r border-slate-700 w-12 text-[8px] bg-slate-800">Baik</th>
                          <th className="px-1.5 py-0.5 border-r border-slate-700 w-16 text-[8px] bg-slate-800">Rsk Ringan</th>
                          <th className="px-1.5 py-0.5 border-r border-slate-700 w-16 text-[8px] bg-slate-800">Rsk Berat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {isCetakKosong ? (
                          Array.from({ length: kirOrientation === 'portrait' ? (kirPaperType === 'F4' ? 20 : 16) : (kirPaperType === 'F4' ? 9 : 8) }).map((_, i) => (
                            <tr key={i} className="bg-white h-7">
                              <td className="px-2 py-1 text-center font-bold text-slate-400 border-r border-slate-200">{i+1}</td>
                              <td className="px-3 py-1 text-center text-slate-400 border-r border-slate-200">.....</td>
                              <td className="px-2 py-1 text-center text-slate-400 border-r border-slate-200">.....</td>
                              <td className="px-2 py-1 text-center text-slate-400 border-r border-slate-200">.....</td>
                              <td className="px-1.5 py-1 text-center text-slate-400 border-r border-slate-200">.....</td>
                              <td className="px-1.5 py-1 text-center text-slate-400 border-r border-slate-200">.....</td>
                              <td className="px-1.5 py-1 text-center text-slate-400 border-r border-slate-200">.....</td>
                              <td className="px-3 py-1 text-center text-slate-400">.....</td>
                            </tr>
                          ))
                        ) : roomAsets.length > 0 ? (
                          roomAsets.slice(0, 5).map((a, i) => (
                            <tr key={a.id} className="bg-white">
                              <td className="px-2 py-1 text-center font-bold text-slate-400 border-r border-slate-200">{i+1}</td>
                              <td className="px-3 py-1 font-bold text-slate-800 border-r border-slate-200">{a.nama}</td>
                              <td className="px-2 py-1 text-center font-bold text-slate-800 border-r border-slate-200">{a.jumlah}</td>
                              <td className="px-2 py-1 text-center text-slate-600 border-r border-slate-200">{a.satuan}</td>
                              <td className="px-1.5 py-1 text-center font-bold text-emerald-600 border-r border-slate-200 bg-emerald-50/20">{a.kondisi === 'Baik' ? a.jumlah : '-'}</td>
                              <td className="px-1.5 py-1 text-center font-bold text-amber-600 border-r border-slate-200 bg-amber-50/20">{a.kondisi === 'Rusak Ringan' ? a.jumlah : '-'}</td>
                              <td className="px-1.5 py-1 text-center font-bold text-rose-600 border-r border-slate-200 bg-rose-50/20">{a.kondisi === 'Rusak Berat' ? a.jumlah : '-'}</td>
                              <td className="px-3 py-1 text-slate-600">{a.catatan || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr className="bg-white">
                            <td colSpan={8} className="px-4 py-6 text-center text-slate-400 italic font-medium">
                              Tidak ada sarana terdaftar di ruangan ini. Silakan tambahkan aset atau edit lokasi aset ke "{selectedRuang}".
                            </td>
                          </tr>
                        )}
                        {!isCetakKosong && roomAsets.length > 5 && (
                          <tr className="bg-slate-50">
                            <td colSpan={8} className="px-4 py-1 text-center text-slate-400 italic">
                              + {roomAsets.length - 5} item lainnya akan dimasukkan dalam lembaran cetak KIR PDF...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Triple Signature block */}
                <div className="grid grid-cols-3 gap-4 text-[9px] mt-6 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-slate-500">Mengetahui,</p>
                    <p className="font-bold text-slate-800">Kepala Sekolah,</p>
                    <div className="h-10"></div>
                    <p className="font-bold text-slate-800 underline">{pengaturan.kepalaSekolah}</p>
                    <p className="text-slate-500">NIP. {pengaturan.nipKepalaSekolah || '-'}</p>
                  </div>
                  <div className="pl-6">
                    <p className="text-slate-500">Setuju / Mengetahui,</p>
                    <p className="font-bold text-slate-800">Penanggung Jawab Ruangan,</p>
                    <div className="h-10"></div>
                    <p className="font-bold text-slate-800 underline">{isCetakKosong ? '........................................................' : (penanggungJawabRuang || '........................................................')}</p>
                    <p className="text-slate-500 mt-1">NIP. {isCetakKosong ? '....................................................' : (nipPenanggungJawab || '....................................................')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">
                      {isCetakKosong 
                        ? 'Amonggedo, .................................... 2026' 
                        : `Amonggedo, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                    </p>
                    <p className="font-bold text-slate-800">Wakasek Sarpras,</p>
                    <div className="h-10"></div>
                    <p className="font-bold text-slate-800 underline">{pengaturan.namaPetugasSarpras}</p>
                    <p className="text-slate-500">NIP. {pengaturan.nipPetugasSarpras || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>

      </div>

      {/* Monthly Backup Manager Component */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Database size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Sistem Backup & Riwayat Bulanan</h3>
              <p className="text-xs text-slate-500">Ambil dan kelola arsip snapshot bulanan untuk memantau sirkulasi & perubahan nilai aset sekolah</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Month Select */}
            <select
              value={backupBulan}
              onChange={(e) => setBackupBulan(e.target.value)}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Year Select */}
            <select
              value={backupTahun}
              onChange={(e) => setBackupTahun(e.target.value)}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
            >
              {['2025', '2026', '2027', '2028', '2029', '2030'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Backup Button */}
            <button
              onClick={handleCreateBackup}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Plus size={14} />
              Ambil Snapshot
            </button>
          </div>
        </div>

        {/* Success message popup */}
        {isBackupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium"
          >
            <CheckCircle size={14} className="text-emerald-600" />
            <span>Snapshot bulanan berhasil disimpan ke dalam media penyimpanan lokal browser Anda!</span>
          </motion.div>
        )}

        {/* Saved Backups List */}
        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Arsip Snapshot Tersimpan ({backups.length})</h4>
          
          {backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-center space-y-2">
              <Archive size={28} className="text-slate-300" />
              <p className="text-xs font-bold text-slate-500">Belum Ada Snapshot Bulanan</p>
              <p className="text-[10px] text-slate-400 max-w-sm leading-normal">
                Silakan pilih bulan dan tahun di atas lalu klik tombol "Ambil Snapshot" untuk membekukan kondisi data aset saat ini sebagai arsip bulanan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {backups.map((bk) => {
                const isActive = activeBackupName === bk.nama;
                return (
                  <div
                    key={bk.id}
                    className={`p-4 rounded-xl border transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-500/10'
                        : 'border-slate-100 hover:border-slate-200 bg-white shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-indigo-600" />
                          <span className="text-xs font-extrabold text-slate-800">{bk.nama}</span>
                        </div>
                        <p className="text-[9px] text-slate-400">Dibuat pada: {bk.tanggal}</p>
                      </div>
                      <span className="text-[8px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                        {bk.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 my-3 py-2 border-y border-slate-100 text-center">
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase font-semibold">Total Jenis Aset</p>
                        <p className="text-xs font-black text-slate-700">{bk.totalAset} jenis</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-slate-400 uppercase font-semibold">Total Volume</p>
                        <p className="text-xs font-black text-slate-700">{bk.totalJumlah} unit</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isActive ? (
                        <button
                          onClick={handleResetOverride}
                          className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer animate-pulse"
                        >
                          <Check size={11} />
                          Sedang Dilihat
                        </button>
                      ) : (
                        <button
                          onClick={() => handleLoadBackup(bk)}
                          className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <Eye size={11} />
                          Lihat Snapshot
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteBackup(bk)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus Backup"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Hapus Backup Bulanan */}
      <AnimatePresence>
        {selectedBackupToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative border border-slate-100"
            >
              <button
                onClick={() => setSelectedBackupToDelete(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-2 text-rose-600 font-extrabold text-base">
                <Trash2 size={22} />
                <h3>Hapus Backup Bulanan</h3>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 my-4">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Apakah Anda yakin ingin menghapus arsip snapshot backup ini dari sistem?
                </p>
                <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-rose-100 text-xs font-semibold text-slate-800 flex justify-between items-center">
                  <span>{selectedBackupToDelete.nama}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{selectedBackupToDelete.bulan} {selectedBackupToDelete.tahun}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBackupToDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetBackup = selectedBackupToDelete;
                    setBackups(prev => prev.filter(b => b.id !== targetBackup.id));
                    if (activeBackupName && targetBackup.nama === activeBackupName) {
                      setOverrideAssets(null);
                      setActiveBackupName(null);
                    }
                    setSelectedBackupToDelete(null);
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  <Trash2 size={14} />
                  <span>Ya, Hapus Backup</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
        {/* Modal Blanko Kosong KIB A - F */}
        {showBlankoModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto">
            <div className="bg-slate-50 w-full max-w-6xl rounded-3xl p-5 md:p-7 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto relative">
              <button
                type="button"
                onClick={() => setShowBlankoModal(false)}
                className="absolute top-5 right-5 p-2 bg-white hover:bg-slate-100 rounded-full border border-slate-200 text-slate-500 hover:text-slate-800 transition cursor-pointer z-20 shadow-xs"
                title="Tutup Modal Blanko"
              >
                <X size={18} />
              </button>
              <div className="pr-10 pb-2">
                <BlankoKibDoc pengaturan={pengaturan} />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
