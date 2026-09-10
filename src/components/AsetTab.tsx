import React, { useState, useRef } from 'react';
import { Aset, KategoriAset, KondisiAset, StandardRuang, LogPemusnahan, PengaturanSekolah, MasterRuang } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Filter, Edit, Trash2, Camera, Info, Barcode, Calendar, 
  RefreshCw, X, AlertTriangle, AlertCircle, ShieldCheck, Lock, ZoomIn, ZoomOut, 
  RotateCw, Maximize2, Loader2, MapPin, Building, FileText, Layers, 
  Hash, DollarSign, BookOpen, Wrench, HardHat, FileSpreadsheet, Check, FolderOpen,
  Sparkles, Wand2
} from 'lucide-react';

// Helper functions to handle multiple photo URLs stored as JSON array or single string inside 'fotoUrl'
const parsePhotos = (fotoUrl: string | undefined): string[] => {
  if (!fotoUrl) return ['', '', ''];
  try {
    if (fotoUrl.startsWith('[')) {
      const parsed = JSON.parse(fotoUrl);
      if (Array.isArray(parsed)) {
        const arr = [...parsed];
        while (arr.length < 3) arr.push('');
        return arr.slice(0, 3);
      }
    }
  } catch (e) {
    // Treat as fallback single string
  }
  return [fotoUrl || '', '', ''];
};

const serializePhotos = (photos: string[]): string => {
  const activePhotos = photos.map(p => p || '').map(p => p.trim());
  // If all are empty, return empty string
  if (activePhotos.every(p => !p)) return '';
  return JSON.stringify(activePhotos);
};

const getFirstPhoto = (fotoUrl: string | undefined): string => {
  if (!fotoUrl) return '';
  try {
    if (fotoUrl.startsWith('[')) {
      const parsed = JSON.parse(fotoUrl);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.find(Boolean) || '';
      }
    }
  } catch (e) {
    // ignore
  }
  return fotoUrl;
};

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

interface AsetTabProps {
  asets: Aset[];
  pengaturan: PengaturanSekolah;
  masterRuangs?: MasterRuang[];
  onSaveAset: (aset: Aset) => Promise<void>;
  onDeleteAset: (id: string) => Promise<void>;
  onLogPemusnahan: (log: LogPemusnahan) => Promise<void>;
  onOpenScanner: (actionType: 'search' | 'aset_form', callback?: (code: string) => void) => void;
  userRole?: 'admin' | 'guest';
}

export default function AsetTab({
  asets,
  pengaturan,
  masterRuangs = [],
  onSaveAset,
  onDeleteAset,
  onLogPemusnahan,
  onOpenScanner,
  userRole = 'guest'
}: AsetTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRuang, setFilterRuang] = useState<string>('Semua');
  const [filterKondisi, setFilterKondisi] = useState<string>('Semua');
  const [filterTahun, setFilterTahun] = useState<string>('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPemusnahanModalOpen, setIsPemusnahanModalOpen] = useState(false);
  
  // Current editing aset
  const [currentAset, setCurrentAset] = useState<Partial<Aset> | null>(null);
  // Current aset to destroy
  const [selectedAsetToDestroy, setSelectedAsetToDestroy] = useState<Aset | null>(null);
  // Current aset selected for delete choice modal
  const [selectedAsetForDeleteChoice, setSelectedAsetForDeleteChoice] = useState<Aset | null>(null);
  const [isConfirmingPermanentDelete, setIsConfirmingPermanentDelete] = useState(false);
  const [isDeletingAset, setIsDeletingAset] = useState(false);

  // Form states for Disposal/Pemusnahan
  const [disposalForm, setDisposalForm] = useState<Partial<LogPemusnahan>>({
    metode: 'Pemusnahan Fisik',
    alasan: 'Rusak Berat total tidak bisa diperbaiki',
    noSkPenghapusan: '',
    petugasEksekusi: pengaturan.namaPetugasSarpras || '',
    catatan: ''
  });

  const [uploadingPhoto, setUploadingUploadingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisposing, setIsDisposing] = useState(false);

  // Photo Zoom Preview Modal state
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    photos: string[];
    currentIndex: number;
    title: string;
  } | null>(null);

  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleOpenPhotoPreview = (photos: string[], index: number = 0, title: string = '') => {
    const activePhotos = photos.map(p => p ? p.trim() : '').filter(Boolean);
    if (activePhotos.length === 0) return;
    setPreviewModal({
      isOpen: true,
      photos: activePhotos,
      currentIndex: Math.min(index, activePhotos.length - 1),
      title
    });
    setZoomScale(1);
    setRotation(0);
  };

  // Custom satuan list stored in local storage
  const [customSatuans, setCustomSatuans] = useState<string[]>(() => {
    const saved = localStorage.getItem('custom_satuans');
    return saved ? JSON.parse(saved) : ['Unit', 'Set', 'Eksemplar', 'Buah', 'Meter', 'Box', 'Paket'];
  });

  // State to manage input toggles
  const [isCustomRuangActive, setIsCustomRuangActive] = useState(false);
  const [isCustomSatuanActive, setIsCustomSatuanActive] = useState(false);
  const [isCustomSumberDanaActive, setIsCustomSumberDanaActive] = useState(false);
  const [isCustomStatusTanahActive, setIsCustomStatusTanahActive] = useState(false);
  const [isCustomKodeTanahActive, setIsCustomKodeTanahActive] = useState(false);

  const standardStatusTanahOptions = [
    'Tanah Hak Pakai Pemerintah Daerah',
    'Tanah Hak Milik (SHM)',
    'Tanah Hak Guna Bangunan (HGB)',
    'Tanah Wakaf / Hibah',
    'Tanah Milik Pihak Lain / Pinjam Pakai'
  ];

  // Standard KIB Categories Permendagri No. 47 Tahun 2021
  const kibCategories = [
    { 
      id: 'A' as const, 
      code: 'KIB A',
      label: 'KIB A (Tanah)', 
      shortTitle: 'Tanah',
      fullCat: 'KIB A (Tanah)' as KategoriAset, 
      desc: 'Lahan / bidang tanah sekolah', 
      prefix: '01.01.11.04.001',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    { 
      id: 'B' as const, 
      code: 'KIB B',
      label: 'KIB B (Peralatan & Mesin)', 
      shortTitle: 'Peralatan & Mesin',
      fullCat: 'KIB B (Peralatan dan Mesin)' as KategoriAset, 
      desc: 'Komputer, printer, alat lab, mebel, kendaraan', 
      prefix: '02.06.01.01.001',
      badgeBg: 'bg-blue-100 text-blue-800 border-blue-300'
    },
    { 
      id: 'C' as const, 
      code: 'KIB C',
      label: 'KIB C (Gedung & Bangunan)', 
      shortTitle: 'Gedung & Bangunan',
      fullCat: 'KIB C (Gedung dan Bangunan)' as KategoriAset, 
      desc: 'Gedung sekolah, laboratorium, ruang kelas, aula', 
      prefix: '03.11.01.01.001',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    { 
      id: 'D' as const, 
      code: 'KIB D',
      label: 'KIB D (Jalan, Irigasi & Jaringan)', 
      shortTitle: 'Jalan & Jaringan',
      fullCat: 'KIB D (Jalan, Irigasi, dan Jaringan)' as KategoriAset, 
      desc: 'Paving jalan, drainase, instalasi pipa/listrik/LAN', 
      prefix: '04.14.01.01.001',
      badgeBg: 'bg-violet-100 text-violet-800 border-violet-300'
    },
    { 
      id: 'E' as const, 
      code: 'KIB E',
      label: 'KIB E (Aset Tetap Lainnya)', 
      shortTitle: 'Aset Tetap Lainnya',
      fullCat: 'KIB E (Aset Tetap Lainnya)' as KategoriAset, 
      desc: 'Buku perpustakaan, alat peraga, olahraga, kesenian', 
      prefix: '05.17.01.01.001',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300'
    },
    { 
      id: 'F' as const, 
      code: 'KIB F',
      label: 'KIB F (KDP / Konstruksi)', 
      shortTitle: 'KDP Konstruksi',
      fullCat: 'KIB F (Konstruksi dalam Pengerjaan)' as KategoriAset, 
      desc: 'Proyek fisik yang sedang berlangsung', 
      prefix: '06.20.01.01.001',
      badgeBg: 'bg-orange-100 text-orange-800 border-orange-300'
    },
  ];

  const getActiveKib = (kategori?: string): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => {
    if (!kategori) return 'B';
    if (kategori.includes('KIB A') || kategori.toLowerCase().includes('tanah')) return 'A';
    if (kategori.includes('KIB C') || kategori.includes('Prasarana (Bangunan/Fasilitas)')) return 'C';
    if (kategori.includes('KIB D') || kategori.toLowerCase().includes('jalan') || kategori.toLowerCase().includes('jaringan')) return 'D';
    if (kategori.includes('KIB E') || kategori.includes('Sarana (Bahan Pembelajaran)')) return 'E';
    if (kategori.includes('KIB F') || kategori.toLowerCase().includes('konstruksi')) return 'F';
    return 'B';
  };

  // Options
  const categories: KategoriAset[] = [
    'KIB A (Tanah)',
    'KIB B (Peralatan dan Mesin)',
    'KIB C (Gedung dan Bangunan)',
    'KIB D (Jalan, Irigasi, dan Jaringan)',
    'KIB E (Aset Tetap Lainnya)',
    'KIB F (Konstruksi dalam Pengerjaan)',
    'Sarana (Peralatan Belajar)',
    'Sarana (Bahan Pembelajaran)',
    'Perlengkapan (Mebel/Meja/Kursi)',
    'Prasarana (Bangunan/Fasilitas)'
  ];

  const defaultSpaces: StandardRuang[] = [
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

  const spaces: StandardRuang[] = masterRuangs && masterRuangs.length > 0
    ? Array.from(new Set([...masterRuangs.map(r => r.nama), ...defaultSpaces]))
    : defaultSpaces;

  const conditions: KondisiAset[] = ['Baik', 'Rusak Ringan', 'Rusak Berat', 'Dihapuskan'];

  // Standard funding sources for Indonesian schools (Permendikbudristek & BSKAP Juknis reference)
  const fundingSources = [
    'BOS Reguler',
    'BOS Kinerja',
    'BOS Daerah (BOSDA)',
    'DAK Fisik Pendidikan',
    'APBD Provinsi / Kabupaten',
    'Sumbangan Komite Sekolah',
    'Dana Hibah / Donasi / CSR',
    'Kas Yayasan',
    'Anggaran Internal Sekolah (APBS)'
  ];

  // Year options: current year back to 1980
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1980 + 1 }, (_, i) => currentYear - i);

  // Helper generator otomatis nomor aset, kode BMD, register, dokumen gedung, dll.
  const generateSmartAsetDefaults = (
    kibId: 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
    allAsets: Aset[],
    pengaturanSekolah: PengaturanSekolah,
    availableSpaces: string[]
  ): Partial<Aset> & Record<string, any> => {
    const yr = new Date().getFullYear();
    const prefixMap: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', string> = {
      'A': 'TNH',
      'B': 'SAR',
      'C': 'GDG',
      'D': 'JAL',
      'E': 'ATL',
      'F': 'KDP'
    };
    const prefix = prefixMap[kibId] || 'SAR';

    // Cari sequence tertinggi secara global
    const maxIdSeq = allAsets.reduce((max, a) => {
      const parts = (a.id || '').split('-');
      const num = parseInt(parts[parts.length - 1] || '0', 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextSeqNum = Math.max(allAsets.length + 1, maxIdSeq + 1);
    const paddingId = String(nextSeqNum).padStart(4, '0');
    const autoId = `${prefix}-${yr}-${paddingId}`;

    // Hitung nomor register / NUP per KIB
    const kibAsets = allAsets.filter(a => getActiveKib(a.kategori) === kibId);
    const maxRegSeq = kibAsets.reduce((max, a) => {
      const raw = ((a as any).nomorRegister || a.nomorRegisterBmd || '').replace(/\D/g, '');
      const num = parseInt(raw || '0', 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const autoRegister = String(Math.max(kibAsets.length + 1, maxRegSeq + 1)).padStart(6, '0');

    // Kode Barang BMD Permendagri 47/2021
    const bmdMap: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', string> = {
      'A': '01.01.01.01.001',
      'B': '02.06.01.01.001',
      'C': '03.11.01.01.001',
      'D': '04.14.01.01.001',
      'E': '05.17.01.01.001',
      'F': '06.20.01.01.001'
    };

    const fullCatMap: Record<'A' | 'B' | 'C' | 'D' | 'E' | 'F', KategoriAset> = {
      'A': 'KIB A (Tanah)',
      'B': 'KIB B (Peralatan dan Mesin)',
      'C': 'KIB C (Gedung dan Bangunan)',
      'D': 'KIB D (Jalan, Irigasi, dan Jaringan)',
      'E': 'KIB E (Aset Tetap Lainnya)',
      'F': 'KIB F (Konstruksi dalam Pengerjaan)'
    };

    // Cari aset tanah referensi jika ada
    const firstLand = allAsets.find(a => getActiveKib(a.kategori) === 'A');
    const defaultLandCode = firstLand?.id || 'TNH-2026-0001';

    const baseResult: Partial<Aset> & Record<string, any> = {
      id: autoId,
      nomorRegister: autoRegister,
      nomorRegisterBmd: autoRegister,
      kodeBarangBmd: bmdMap[kibId],
      kategori: fullCatMap[kibId],
      nama: '',
      merek: '',
      spesifikasi: '',
      jumlah: 1,
      satuan: kibId === 'A' ? 'Bidang' : kibId === 'C' ? 'Unit Gedung' : kibId === 'D' ? 'Ruas / Titik' : 'Unit',
      kondisi: 'Baik',
      sumberDana: 'BOS Reguler',
      tahunPerolehan: yr,
      hargaPerolehan: 0,
      fotoUrl: '',
      catatan: '',
      tanggalRegister: new Date().toISOString().split('T')[0],
      serialNumber: ''
    };

    if (kibId === 'A') {
      baseResult.ruangLokasi = 'Lahan Sekolah / Area Terbuka';
      baseResult.luasM2 = 10000;
      baseResult.luasTanahM2 = 10000;
      baseResult.hakTanah = 'Hak Pakai';
      baseResult.nomorSertifikat = `HP-DIKBUD/${yr}/${paddingId}`;
      baseResult.nomorSertifikatTanah = `HP-DIKBUD/${yr}/${paddingId}`;
      baseResult.tanggalSertifikat = new Date().toISOString().split('T')[0];
      baseResult.tanggalSertifikatTanah = new Date().toISOString().split('T')[0];
      baseResult.letakAlamat = pengaturanSekolah.alamat || 'Kec. Routa, Kab. Konawe, Sulawesi Tenggara';
      baseResult.letakAlamatTanah = pengaturanSekolah.alamat || 'Kec. Routa, Kab. Konawe, Sulawesi Tenggara';
      baseResult.penggunaanTanah = 'Bangunan Sekolah & Fasilitas Pembelajaran';
      baseResult.asalUsulTanah = 'Pemerintah Provinsi Sulawesi Tenggara';
    } else if (kibId === 'C') {
      baseResult.ruangLokasi = 'Kompleks Gedung Sekolah';
      baseResult.kondisiBangunan = 'Permanen';
      baseResult.kondisiFisikBangunan = 'Permanen';
      baseResult.beton = 'Beton';
      baseResult.konstruksiBeton = 'Beton';
      baseResult.bertingkat = 'Tidak Bertingkat';
      baseResult.kondisiBangunanTingkat = 'Tidak Bertingkat';
      baseResult.luasLantaiM2 = 72;
      baseResult.nomorDokumenGedung = `IMB-GDG/${yr}/${paddingId}`;
      baseResult.tanggalDokumenGedung = new Date().toISOString().split('T')[0];
      baseResult.statusTanahGedung = 'Tanah Hak Pakai Pemerintah Daerah';
      baseResult.kodeTanahKibA = defaultLandCode;
      baseResult.kodeTanahGedung = defaultLandCode;
    } else if (kibId === 'D') {
      baseResult.ruangLokasi = 'Lingkungan Sekolah';
      baseResult.nomorDokumenJalan = `BAST-JAL/${yr}/${paddingId}`;
      baseResult.tanggalDokumenJalan = new Date().toISOString().split('T')[0];
      baseResult.konstruksiJalan = 'Paving Block / Beton';
      baseResult.panjangM = 50;
      baseResult.lebarM = 4;
      baseResult.luasM2 = 200;
      baseResult.statusTanahJalan = 'Tanah Hak Pakai Sekolah';
    } else if (kibId === 'E') {
      baseResult.ruangLokasi = 'Ruang Perpustakaan';
      baseResult.satuan = 'Eksemplar';
      baseResult.spesifikasiBuku = 'Penerbit Kemendikbudristek';
      baseResult.asalUsulBuku = 'Pengadaan BOS';
    } else if (kibId === 'F') {
      baseResult.ruangLokasi = 'Area Konstruksi';
      baseResult.bangunanRencana = 'Permanen Bertingkat';
      baseResult.luasM2 = 144;
      baseResult.nomorSpk = `SPK-KDP/${yr}/${paddingId}`;
      baseResult.tanggalMulaiPembangunan = new Date().toISOString().split('T')[0];
      baseResult.namaKontraktor = 'CV. Pelaksana Konstruksi';
      baseResult.nilaiKontrak = 0;
    } else {
      baseResult.ruangLokasi = availableSpaces[0] || 'Ruang Kelas';
    }

    return baseResult;
  };

  // Photo handlers for multiple photo slots
  const handlePhotoUploadAt = (index: number) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingUploadingPhoto(true);
    try {
      const compressedBase64 = await compressImage(file);
      if (currentAset) {
        const photos = parsePhotos(currentAset.fotoUrl);
        photos[index] = compressedBase64;
        setCurrentAset(prev => ({
          ...prev,
          fotoUrl: serializePhotos(photos)
        }));
      }
    } catch (err) {
      console.error('Error compressing uploaded photo:', err);
    } finally {
      setUploadingUploadingPhoto(false);
    }
  };

  const handleRemovePhotoAt = (index: number) => {
    if (currentAset) {
      const photos = parsePhotos(currentAset.fotoUrl);
      photos[index] = '';
      setCurrentAset(prev => ({
        ...prev,
        fotoUrl: serializePhotos(photos)
      }));
    }
  };

  // Validation Schema for Asset Form
  const validateAsetForm = (aset: (Partial<Aset> & Record<string, any>) | null, activeKib: 'A' | 'B' | 'C' | 'D' | 'E' | 'F'): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!aset) return errors;

    const currentYear = new Date().getFullYear();

    // 1. General & Ownership Validation (All KIB Types)
    if (!aset.nama || !aset.nama.trim()) {
      errors.nama = 'Nama barang / aset wajib diisi.';
    }

    if (!aset.id || !aset.id.trim()) {
      errors.id = 'Kode Barcode / ID Aset wajib diisi.';
    }

    if (!aset.kodeBarangBmd || !aset.kodeBarangBmd.trim()) {
      errors.kodeBarangBmd = 'Kodefikasi barang BMD wajib diisi.';
    }

    if (!aset.ruangLokasi || !aset.ruangLokasi.trim()) {
      errors.ruangLokasi = 'Penempatan lokasi ruang (KIR) wajib ditentukan.';
    }

    const rawJumlah = Number(aset.jumlah);
    if (aset.jumlah === undefined || aset.jumlah === null || (aset.jumlah as any) === '' || isNaN(rawJumlah) || rawJumlah <= 0) {
      errors.jumlah = 'Jumlah fisik barang wajib diisi angka bulat positif (minimal 1).';
    }

    if (!aset.satuan || !aset.satuan.trim()) {
      errors.satuan = 'Satuan ukuran barang wajib diisi.';
    }

    if (!aset.sumberDana || !aset.sumberDana.trim()) {
      errors.sumberDana = 'Sumber pembiayaan / informasi kepemilikan wajib dipilih.';
    }

    const rawTahun = Number(aset.tahunPerolehan);
    if (aset.tahunPerolehan === undefined || aset.tahunPerolehan === null || isNaN(rawTahun) || rawTahun < 1900 || rawTahun > currentYear + 1) {
      errors.tahunPerolehan = `Tahun perolehan fisik tidak valid (harus antara 1900 - ${currentYear}).`;
    }

    const rawHarga = Number(aset.hargaPerolehan);
    if (aset.hargaPerolehan === undefined || aset.hargaPerolehan === null || isNaN(rawHarga) || rawHarga < 0) {
      errors.hargaPerolehan = 'Harga perolehan satuan wajib diisi angka positif atau 0.';
    }

    if (!aset.kondisi) {
      errors.kondisi = 'Kondisi fisik barang wajib dipilih.';
    }

    // 2. KIB-Specific Column Validations (A - F)
    if (activeKib === 'A') { // KIB A (Tanah)
      const rawLuas = Number(aset.luasM2 || aset.luasTanahM2);
      if (!rawLuas || isNaN(rawLuas) || rawLuas <= 0) {
        errors.luasM2 = 'Luas tanah (m²) wajib diisi dengan angka positif (> 0).';
      }
      const alamat = aset.letakAlamat || aset.letakAlamatTanah;
      if (!alamat || !alamat.trim()) {
        errors.letakAlamat = 'Letak / Alamat lokasi bidang tanah wajib diisi.';
      }
      const guna = aset.penggunaan || aset.penggunaanTanah;
      if (!guna || !guna.trim()) {
        errors.penggunaan = 'Penggunaan tanah wajib diisi (misal: Bangunan Sekolah / Olahraga).';
      }
      if (!aset.hakTanah || !aset.hakTanah.trim()) {
        errors.hakTanah = 'Status hak atas tanah wajib dipilih.';
      }
    } else if (activeKib === 'B') { // KIB B (Peralatan & Mesin)
      if (!aset.merek || !aset.merek.trim()) {
        errors.merek = 'Merek / Pabrikan wajib diisi (isi "-" jika tidak ada merek).';
      }
    } else if (activeKib === 'C') { // KIB C (Gedung & Bangunan)
      const rawLuasGedung = Number(aset.luasLantaiM2);
      if (!aset.luasLantaiM2 || isNaN(rawLuasGedung) || rawLuasGedung <= 0) {
        errors.luasLantaiM2 = 'Luas lantai gedung (m²) wajib diisi angka positif (> 0).';
      }
      if (!aset.statusTanahGedung || !aset.statusTanahGedung.trim()) {
        errors.statusTanahGedung = 'Status tanah tempat gedung berdiri wajib diisi.';
      }
      if (!aset.nomorDokumenGedung || !aset.nomorDokumenGedung.trim()) {
        errors.nomorDokumenGedung = 'Nomor IMB / BAST / Dokumen gedung wajib diisi (isi "-" jika belum ada).';
      }
    } else if (activeKib === 'D') { // KIB D (Jalan, Irigasi & Jaringan)
      if (!aset.konstruksiJaringan || !aset.konstruksiJaringan.trim()) {
        errors.konstruksiJaringan = 'Bahan / konstruksi jaringan wajib diisi (misal: Paving Block, Drainase).';
      }
      const rawPanjang = Number(aset.panjangM);
      const rawLuasD = Number(aset.luasM2 || aset.luasJaringanM2);
      if ((!rawPanjang || rawPanjang <= 0) && (!rawLuasD || rawLuasD <= 0)) {
        errors.panjangM = 'Dimensi panjang (m) atau luas (m²) jaringan wajib diisi angka positif.';
      }
      const alamatD = aset.letakAlamat || aset.lokasiJaringan;
      if (!alamatD || !alamatD.trim()) {
        errors.letakAlamat = 'Lokasi / letak jaringan wajib diisi.';
      }
    } else if (activeKib === 'E') { // KIB E (Aset Tetap Lainnya)
      if (!aset.jenisAsetLainnya) {
        errors.jenisAsetLainnya = 'Sub-jenis aset lainnya (buku, kesenian, dll) wajib dipilih.';
      }
      const pengarang = aset.pengarangBuku || aset.penciptaKesenian || aset.penciptaSeni;
      if (!pengarang || !pengarang.trim()) {
        errors.pengarangBuku = 'Pengarang / pencipta / spesifikasi asal wajib diisi (isi "-" jika tidak ada).';
      }
    } else if (activeKib === 'F') { // KIB F (KDP / Konstruksi)
      const rawLuasF = Number(aset.luasLantaiM2 || aset.luasKdpM2);
      if (!rawLuasF || isNaN(rawLuasF) || rawLuasF <= 0) {
        errors.luasLantaiM2 = 'Luas rencana konstruksi (m²) wajib diisi angka positif (> 0).';
      }
      const rawKontrak = Number(aset.nilaiKontrakPembangunan || aset.nilaiKontrakKdp);
      if (!rawKontrak || isNaN(rawKontrak) || rawKontrak <= 0) {
        errors.nilaiKontrakPembangunan = 'Nilai kontrak pembangunan (Rp) wajib diisi angka positif (> 0).';
      }
      const rawProgress = Number(aset.persentaseFisikKdp !== undefined ? aset.persentaseFisikKdp : aset.progressFisikPersen);
      if (rawProgress === undefined || isNaN(rawProgress) || rawProgress < 0 || rawProgress > 100) {
        errors.persentaseFisikKdp = 'Progress realisasi fisik KDP harus antara 0% s/d 100%.';
      }
      const tglMulai = aset.tanggalMulaiPembangunan || aset.tanggalMulaiKdp;
      if (!tglMulai || !tglMulai.trim()) {
        errors.tanggalMulaiPembangunan = 'Tanggal mulai SPK / pembangunan wajib diisi.';
      }
    }

    return errors;
  };

  const handleEditClick = (aset: Aset) => {
    setCurrentAset(aset);
    setIsCustomRuangActive(!spaces.includes(aset.ruangLokasi as any));
    setIsCustomSatuanActive(!customSatuans.includes(aset.satuan));
    setIsCustomSumberDanaActive(!fundingSources.includes(aset.sumberDana));
    setIsCustomStatusTanahActive(!!aset.statusTanahGedung && !standardStatusTanahOptions.includes(aset.statusTanahGedung));
    const landAssets = asets.filter(a => getActiveKib(a.kategori) === 'A');
    setIsCustomKodeTanahActive(!!aset.kodeTanahKibA && !landAssets.some(l => l.id === aset.kodeTanahKibA));
    setFormErrors({});
    setHasAttemptedSubmit(false);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    const smartDefaults = generateSmartAsetDefaults('B', asets, pengaturan, spaces);
    setCurrentAset(smartDefaults);
    setIsCustomRuangActive(false);
    setIsCustomSatuanActive(false);
    setIsCustomSumberDanaActive(false);
    setIsCustomStatusTanahActive(false);
    setIsCustomKodeTanahActive(false);
    setFormErrors({});
    setHasAttemptedSubmit(false);
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !currentAset) return;

    const activeKib = getActiveKib(currentAset.kategori);
    const errors = validateAsetForm(currentAset, activeKib);

    setHasAttemptedSubmit(true);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      if (modalScrollRef.current) {
        modalScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setIsSaving(true);
    try {
      const parsedJumlah = typeof currentAset.jumlah === 'string' ? parseInt(currentAset.jumlah) : currentAset.jumlah;
      const parsedTahun = typeof currentAset.tahunPerolehan === 'string' ? parseInt(currentAset.tahunPerolehan) : currentAset.tahunPerolehan;

      // Update custom units list if custom is added
      if (currentAset.satuan && !customSatuans.includes(currentAset.satuan)) {
        const updated = [...customSatuans, currentAset.satuan];
        setCustomSatuans(updated);
        localStorage.setItem('custom_satuans', JSON.stringify(updated));
      }

      const finalAset = {
        ...(currentAset as Aset),
        jumlah: typeof parsedJumlah === 'number' && parsedJumlah > 0 ? parsedJumlah : 1,
        tahunPerolehan: typeof parsedTahun === 'number' && parsedTahun > 0 ? parsedTahun : new Date().getFullYear()
      };

      await onSaveAset(finalAset);
      setIsModalOpen(false);
      setCurrentAset(null);
      setFormErrors({});
      setHasAttemptedSubmit(false);
    } catch (err) {
      alert('Gagal menyimpan aset. Silakan coba lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisposalClick = (aset: Aset) => {
    setSelectedAsetToDestroy(aset);
    const uniqueDisposalId = `MUS-2026-${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100).toString().padStart(2, '0')}`;
    setDisposalForm({
      id: uniqueDisposalId,
      asetId: aset.id,
      namaAset: aset.nama,
      jumlah: aset.jumlah,
      tanggalPemusnahan: new Date().toISOString().split('T')[0],
      metode: 'Pemusnahan Fisik',
      alasan: 'Rusak Berat total tidak bisa diperbaiki',
      noSkPenghapusan: `SK-SARPRAS/${new Date().getFullYear()}/${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      petugasEksekusi: pengaturan.namaPetugasSarpras || '',
      catatan: ''
    });
    setIsPemusnahanModalOpen(true);
  };

  const handleDisposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDisposing || !selectedAsetToDestroy || !disposalForm.id) return;

    setIsDisposing(true);
    try {
      const parsedJumlah = typeof disposalForm.jumlah === 'string' ? parseInt(disposalForm.jumlah) : disposalForm.jumlah;
      const finalJumlah = typeof parsedJumlah === 'number' && parsedJumlah > 0 ? parsedJumlah : 1;

      await onLogPemusnahan({
        ...(disposalForm as LogPemusnahan),
        jumlah: finalJumlah
      });
      setIsPemusnahanModalOpen(false);
      setSelectedAsetToDestroy(null);
    } catch (err) {
      alert('Gagal memproses penghapusan aset.');
    } finally {
      setIsDisposing(false);
    }
  };

  const handleScanBarcodeForAsetForm = (field: 'id' | 'serialNumber' = 'id') => {
    onOpenScanner('aset_form', (code) => {
      if (currentAset) {
        if (field === 'serialNumber') {
          setCurrentAset(prev => ({ ...prev, serialNumber: code, nomorPabrik: code }));
        } else {
          setCurrentAset(prev => {
            const next = { ...prev, id: code };
            if (hasAttemptedSubmit) {
              const currentKib = getActiveKib(next.kategori);
              setFormErrors(validateAsetForm(next, currentKib));
            }
            return next;
          });
        }
      }
    });
  };

  const handleQuickAddWithScan = (field: 'id' | 'serialNumber' = 'id') => {
    const nextNum = asets.length + 1;
    const paddingId = String(nextNum).padStart(4, '0');
    setCurrentAset({
      id: `SAR-${new Date().getFullYear()}-${paddingId}`,
      nama: '',
      merek: '',
      spesifikasi: '',
      kategori: 'Sarana (Peralatan Belajar)',
      ruangLokasi: 'Ruang Kelas',
      jumlah: 1,
      satuan: 'Unit',
      kondisi: 'Baik',
      sumberDana: 'BOS Reguler',
      tahunPerolehan: new Date().getFullYear(),
      hargaPerolehan: 0,
      fotoUrl: '',
      catatan: '',
      tanggalRegister: new Date().toISOString().split('T')[0],
      serialNumber: ''
    });
    setIsCustomRuangActive(false);
    setIsCustomSatuanActive(false);
    setIsCustomSumberDanaActive(false);
    setFormErrors({});
    setHasAttemptedSubmit(false);
    setIsModalOpen(true);

    // Langsung buka kamera scanner perangkat untuk memindai ke formulir
    onOpenScanner('aset_form', (code) => {
      if (field === 'serialNumber') {
        setCurrentAset(prev => ({ ...prev, serialNumber: code, nomorPabrik: code }));
      } else {
        setCurrentAset(prev => ({ ...prev, id: code }));
      }
    });
  };

  // Filtered dataset
  const filteredAsets = asets.filter(item => {
    const matchSearch =
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.merek.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchRuang = filterRuang === 'Semua' || item.ruangLokasi === filterRuang;
    const matchKondisi = filterKondisi === 'Semua' || item.kondisi === filterKondisi;
    const matchTahun = filterTahun === 'Semua' || String(item.tahunPerolehan) === filterTahun;

    return matchSearch && matchRuang && matchKondisi && matchTahun;
  });

  return (
    <div className="space-y-6" id="aset-tab">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Barcode size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daftar Inventaris Sarpras</h2>
            <p className="text-xs text-slate-500">Mendukung standar kepatuhan fisik sarpras {pengaturan.namaSekolah}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => handleQuickAddWithScan('id')}
            className="flex-1 md:flex-none px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10"
            title="Tambah aset baru dan langsung buka kamera scanner barcode untuk mengisi ID aset"
          >
            <Camera size={16} />
            <span>Tambah via Scan Kamera</span>
          </button>
          <button
            onClick={handleAddClick}
            className="flex-1 md:flex-none px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Plus size={16} />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

      {/* Banner Informasi Pendataan Ulang 2026 */}
      <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex items-start gap-3 text-amber-900 text-xs shadow-xs">
        <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold text-amber-950">Info Pendataan & Inventarisasi Aset (Peluncuran 2026):</p>
          <p className="text-[11px] text-amber-800 mt-0.5">
            Aplikasi E-SarPras ini mencatat seluruh aset sekolah termasuk perolehan tahun-tahun sebelumnya. Saat menambah aset baru, pastikan untuk menentukan <strong className="font-bold underline">Tahun Perolehan Fisik</strong> sesuai tahun pertama barang/peralatan dibeli (misal: 2018, 2020, 2024, dst) agar riwayat perolehan fisik tercatat dengan tepat.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 relative">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama aset, merek, atau kode barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={filterRuang}
            onChange={(e) => setFilterRuang(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="Semua">Semua Lokasi Ruang</option>
            {spaces.map(sp => (
              <option key={sp} value={sp}>{sp}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="Semua">Semua Kondisi</option>
            {conditions.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <Calendar size={16} className="text-slate-400 shrink-0" />
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="w-full text-xs py-2 px-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
          >
            <option value="Semua">Semua Thn Perolehan</option>
            {years.map(yr => (
              <option key={yr} value={String(yr)}>Tahun {yr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid List View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredAsets.length > 0 ? (
          filteredAsets.map((aset) => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={aset.id}
              className={`bg-white rounded-2xl border ${aset.kondisi === 'Dihapuskan' ? 'border-slate-200 opacity-60' : 'border-slate-100'} shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow`}
            >
              {/* Image Section */}
              <div
                onClick={() => {
                  const allPhotos = parsePhotos(aset.fotoUrl).map(p => p ? p.trim() : '').filter(Boolean);
                  if (allPhotos.length > 0) {
                    handleOpenPhotoPreview(allPhotos, 0, `${aset.nama} (${aset.id})`);
                  }
                }}
                className={`relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden group ${
                  parsePhotos(aset.fotoUrl).filter(Boolean).length > 0 ? 'cursor-pointer' : ''
                }`}
              >
                {getFirstPhoto(aset.fotoUrl) ? (
                  <>
                    <img
                      src={getFirstPhoto(aset.fotoUrl)}
                      alt={aset.nama}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold backdrop-blur-[2px]">
                      <Maximize2 size={16} />
                      <span>Klik untuk Zoom / Preview</span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <Camera size={36} className="opacity-40 mb-1" />
                    <span className="text-[10px] font-medium">Foto Tidak Tersedia</span>
                  </div>
                )}
                
                {/* Condition pill */}
                <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm text-white ${
                  aset.kondisi === 'Baik' ? 'bg-emerald-500' :
                  aset.kondisi === 'Rusak Ringan' ? 'bg-amber-500' :
                  aset.kondisi === 'Rusak Berat' ? 'bg-rose-500' : 'bg-slate-600'
                }`}>
                  {aset.kondisi}
                </span>

                {/* Amount pill */}
                <span className="absolute bottom-3 right-3 text-[10px] font-bold bg-slate-900/80 text-white px-2.5 py-1 rounded-lg backdrop-blur-xs">
                  {aset.jumlah} {aset.satuan}
                </span>
              </div>

              {/* Text info */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {aset.id}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">{aset.sumberDana}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mt-2 line-clamp-1">{aset.nama}</h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 mt-0.5 font-medium">
                    <span>{aset.merek || '-'}</span>
                    {aset.serialNumber && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-indigo-600 bg-indigo-50/60 px-1.5 py-0.5 rounded text-[10px] font-bold" title="Serial Number / Kode S/N">
                          S/N: {aset.serialNumber}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="mt-3 space-y-1.5 border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                      <RefreshCw size={12} className="text-slate-400" />
                      <span>Lokasi: <span className="text-slate-800 font-bold">{aset.ruangLokasi}</span></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Calendar size={12} className="text-slate-400 shrink-0" />
                      <span>Thn Perolehan: <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        aset.tahunPerolehan < currentYear
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {aset.tahunPerolehan} {aset.tahunPerolehan < currentYear ? '(Lama)' : '(Baru 2026)'}
                      </span></span>
                    </div>
                    {aset.catatan && (
                      <div className="flex items-center gap-1.5 text-[10px] text-rose-500 bg-rose-50/50 p-1.5 rounded-lg font-medium leading-relaxed">
                        <Info size={12} className="shrink-0" />
                        <span>{aset.catatan}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions */}
                {aset.kondisi !== 'Dihapuskan' && (
                  <div className="flex gap-2 pt-3 border-t border-slate-50">
                    {userRole === 'admin' ? (
                      <>
                        <button
                          onClick={() => handleEditClick(aset)}
                          className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <Edit size={12} />
                          Ubah data
                        </button>
                        <button
                          onClick={() => setSelectedAsetForDeleteChoice(aset)}
                          className="px-3 py-2 border border-rose-200 hover:bg-rose-50 active:bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center transition cursor-pointer"
                          title="Pilihan Hapus Data / Pemusnahan Aset"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <div className="w-full text-center text-[10px] font-bold text-slate-400 bg-slate-50 p-2 rounded-xl flex items-center justify-center gap-1">
                        <Lock size={12} className="text-slate-300" />
                        Akses Terbatas: Hanya Admin yang dapat edit/hapus
                      </div>
                    )}
                  </div>
                )}

                {aset.kondisi === 'Dihapuskan' && (
                  <div className="pt-2 text-center text-[10px] font-bold text-slate-500 bg-slate-100 p-2 rounded-lg border border-slate-200">
                    DIHAPUSKAN DARI REGISTER SEKOLAH
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center">
            <Info size={40} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">Tidak ada aset yang sesuai kriteria pencarian.</p>
            <p className="text-xs text-slate-400 mt-1">Silakan reset filter atau tambahkan aset baru di tombol kanan atas.</p>
          </div>
        )}
      </div>

      {/* Aset Modal (Add/Edit) */}
      <AnimatePresence>
        {isModalOpen && currentAset && (() => {
          const activeKib = getActiveKib(currentAset.kategori);
          const currentKibObj = kibCategories.find(k => k.id === activeKib) || kibCategories[1];

          return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              ref={modalScrollRef}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 relative border border-slate-100 scroll-smooth"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentKibObj.badgeBg}`}>
                  {currentKibObj.code}
                </span>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Barcode size={18} className="text-indigo-600" />
                  {currentAset.id && asets.some(x => x.id === currentAset.id) ? 'Ubah Inventaris Sarpras BMD' : 'Registrasi Sarpras BMD Baru'}
                </h2>
              </div>

              {/* Compliance banner */}
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-3 py-2 rounded-xl border border-emerald-100 mb-3">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <p className="font-semibold text-[10px] leading-tight text-emerald-800">
                  Format Formulir Adaptif Standar Permendagri No. 47 Tahun 2021 (Tata Cara Pembukuan, Inventarisasi & Pelaporan BMD) & Permendikbudristek No. 22 Tahun 2023
                </p>
              </div>

              {/* Validation Warning Summary Banner */}
              {Object.keys(formErrors).length > 0 && hasAttemptedSubmit && (
                <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs shadow-sm animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-rose-700 mb-1.5">
                    <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                    <span>Terdapat {Object.keys(formErrors).length} Isian Formulir Tidak Sesuai / Belum Lengkap:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-1 ml-1 font-medium">
                    {Object.values(formErrors).map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* KIB Category Selector Bar */}
              <div className="mb-5 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Pilih Klasifikasi KIB (Kartu Inventaris Barang):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                  {kibCategories.map((kib) => {
                    const isSelected = activeKib === kib.id;
                    return (
                      <button
                        key={kib.id}
                        type="button"
                        onClick={() => {
                          const isNew = !asets.some(a => a.id === currentAset.id);
                          const smart = generateSmartAsetDefaults(kib.id, asets, pengaturan, spaces);

                          setCurrentAset(prev => {
                            // Pertahankan input nama, merek, jumlah, harga, foto yang sudah diinput
                            const next = {
                              ...smart,
                              ...prev,
                              kategori: kib.fullCat,
                              // Jika aset baru atau belum diubah manual secara khusus, gunakan nomor otomatis KIB baru
                              id: isNew ? smart.id : (prev?.id || smart.id),
                              nomorRegister: isNew ? smart.nomorRegister : (prev?.nomorRegister || smart.nomorRegister),
                              nomorRegisterBmd: isNew ? smart.nomorRegister : (prev?.nomorRegisterBmd || smart.nomorRegister),
                              kodeBarangBmd: isNew ? smart.kodeBarangBmd : (prev?.kodeBarangBmd || smart.kodeBarangBmd),
                              ruangLokasi: smart.ruangLokasi || prev?.ruangLokasi || spaces[0],
                              nama: prev?.nama || '',
                              merek: prev?.merek || '',
                              spesifikasi: prev?.spesifikasi || '',
                              jumlah: prev?.jumlah || 1,
                              hargaPerolehan: prev?.hargaPerolehan ?? 0,
                              sumberDana: prev?.sumberDana || 'BOS Reguler',
                              tahunPerolehan: prev?.tahunPerolehan || new Date().getFullYear(),
                              kondisi: prev?.kondisi || 'Baik',
                              fotoUrl: prev?.fotoUrl || '',
                              catatan: prev?.catatan || ''
                            };
                            if (hasAttemptedSubmit) {
                              setFormErrors(validateAsetForm(next, kib.id));
                            }
                            return next;
                          });
                        }}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-black tracking-wider ${isSelected ? 'text-indigo-100' : 'text-indigo-600'}`}>
                            {kib.code}
                          </span>
                          {isSelected && <Check size={12} className="text-white" />}
                        </div>
                        <p className="text-xs font-bold leading-tight mt-1 truncate">
                          {kib.shortTitle}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500 bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span>🎯 <strong>{currentKibObj.label}:</strong> {currentKibObj.desc}</span>
                  <span className="font-mono font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[10px]">
                    Ref BMD: {currentKibObj.prefix}
                  </span>
                </div>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* SECTION 1: Identitas & Kodefikasi Resmi */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <Hash size={14} className="text-indigo-600" />
                      <span>1. Identifikasi & Nomor Register Barang (Permendagri 47/2021)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const smart = generateSmartAsetDefaults(activeKib, asets, pengaturan, spaces);
                        setCurrentAset(prev => ({
                          ...prev,
                          id: smart.id,
                          nomorRegister: smart.nomorRegister,
                          nomorRegisterBmd: smart.nomorRegister,
                          kodeBarangBmd: smart.kodeBarangBmd
                        }));
                      }}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition"
                      title="Otomatiskan ulang semua penomoran ID, Register, dan Kode BMD"
                    >
                      <Sparkles size={11} className="text-indigo-600" />
                      <span>Auto-Generate Semua Nomor</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Kodefikasi BMD <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const smart = generateSmartAsetDefaults(activeKib, asets, pengaturan, spaces);
                            setCurrentAset(prev => ({ ...prev, kodeBarangBmd: smart.kodeBarangBmd }));
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Generate Kodefikasi BMD Otomatis"
                        >
                          <Wand2 size={10} /> Auto
                        </button>
                      </div>
                      <input
                        type="text"
                        value={currentAset.kodeBarangBmd || currentKibObj.prefix}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentAset(prev => {
                            const next = { ...prev, kodeBarangBmd: val };
                            if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                            return next;
                          });
                        }}
                        className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.kodeBarangBmd ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono`}
                        placeholder="Contoh: 02.06.01.01.001"
                      />
                      {formErrors.kodeBarangBmd ? (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{formErrors.kodeBarangBmd}</span>
                        </p>
                      ) : (
                        <p className="text-[9px] text-slate-400 mt-0.5">Kode barang resmi Pemda/KIB</p>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Nomor Register / NUP
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const smart = generateSmartAsetDefaults(activeKib, asets, pengaturan, spaces);
                            setCurrentAset(prev => ({ ...prev, nomorRegister: smart.nomorRegister, nomorRegisterBmd: smart.nomorRegister }));
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Generate NUP Register Otomatis"
                        >
                          <Wand2 size={10} /> Auto
                        </button>
                      </div>
                      <input
                        type="text"
                        value={currentAset.nomorRegister || ''}
                        onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorRegister: e.target.value, nomorRegisterBmd: e.target.value }))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                        placeholder="Contoh: 000001 atau 001"
                      />
                      <p className="text-[9px] text-slate-400 mt-0.5">Nomor urut pendaftaran fisik otomatis</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Kode Barcode / ID Aset <span className="text-rose-500">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            const smart = generateSmartAsetDefaults(activeKib, asets, pengaturan, spaces);
                            setCurrentAset(prev => ({ ...prev, id: smart.id }));
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                          title="Generate ID Barcode Otomatis"
                        >
                          <Wand2 size={10} /> Auto
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={currentAset.id || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCurrentAset(prev => {
                              const next = { ...prev, id: val };
                              if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                              return next;
                            });
                          }}
                          className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.id ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-bold text-indigo-700`}
                          required
                        />
                        <button
                          type="button"
                          onClick={handleScanBarcodeForAsetForm}
                          className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer transition shrink-0"
                          title="Scan Barcode ID menggunakan Kamera"
                        >
                          <Camera size={14} />
                        </button>
                      </div>
                      {formErrors.id ? (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{formErrors.id}</span>
                        </p>
                      ) : (
                        <p className="text-[9px] text-slate-400 mt-0.5">ID unik cetak stiker QR/Barcode</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Barang / Aset <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={currentAset.nama || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCurrentAset(prev => {
                          const next = { ...prev, nama: val };
                          if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                          return next;
                        });
                      }}
                      className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.nama ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-800`}
                      placeholder={
                        activeKib === 'A' ? 'Contoh: Tanah Bangunan SMA Negeri 17 Konawe' :
                        activeKib === 'B' ? 'Contoh: Laptop Chromebook Axioo, Meja Belajar Siswa' :
                        activeKib === 'C' ? 'Contoh: Gedung Unit Belajar Ruang Kelas X, Gedung Laboratorium IPA' :
                        activeKib === 'D' ? 'Contoh: Jalan Lingkungan Paving Block, Jaringan Drainase Timur' :
                        activeKib === 'E' ? 'Contoh: Buku Teks Pelajaran Matematika Kelas X Kurikulum Merdeka' :
                        'Contoh: Pembangunan Ruang Praktik Siswa / RKB'
                      }
                      required
                    />
                    {formErrors.nama && (
                      <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle size={12} className="shrink-0" />
                        <span>{formErrors.nama}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* SECTION 2: ADAPTIVE KIB SPECIFIC FIELDS */}
                <div className="p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-indigo-200/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      <Layers size={14} className="text-indigo-600" />
                      <span>2. Kolom Spesifik {currentKibObj.label}</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200 font-medium">
                      Kolom Sesuai Lampiran Permendagri 47/2021
                    </span>
                  </div>

                  {/* KIB A (TANAH) */}
                  {activeKib === 'A' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Luas Tanah (m²) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={currentAset.luasM2 || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentAset(prev => {
                                const next = { ...prev, luasM2: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.luasM2 ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Contoh: 15400"
                          />
                          {formErrors.luasM2 && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.luasM2}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Hak Atas Tanah <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={currentAset.hakTanah || 'Hak Pakai'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, hakTanah: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.hakTanah ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                          >
                            <option value="Hak Pakai">Hak Pakai (Pemda)</option>
                            <option value="Hak Pengelolaan">Hak Pengelolaan (HPL)</option>
                            <option value="Hak Milik">Hak Milik</option>
                            <option value="Adat / Girik">Adat / Girik</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Penggunaan Tanah <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={currentAset.penggunaan || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, penggunaan: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.penggunaan ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Bangunan Sekolah & Sarana Olahraga"
                          />
                          {formErrors.penggunaan && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.penggunaan}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">Nomor Sertifikat / Bukti Kepemilikan</label>
                            <button
                              type="button"
                              onClick={() => {
                                const smart = generateSmartAsetDefaults('A', asets, pengaturan, spaces);
                                setCurrentAset(prev => ({
                                  ...prev,
                                  nomorSertifikat: smart.nomorSertifikat,
                                  nomorSertifikatTanah: smart.nomorSertifikatTanah,
                                  tanggalSertifikat: smart.tanggalSertifikat,
                                  tanggalSertifikatTanah: smart.tanggalSertifikatTanah
                                }));
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Generate Nomor Sertifikat Otomatis"
                            >
                              <Wand2 size={10} /> Auto
                            </button>
                          </div>
                          <input
                            type="text"
                            value={currentAset.nomorSertifikat || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorSertifikat: e.target.value, nomorSertifikatTanah: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none font-mono"
                            placeholder="Nomor HP/HPL/Akta Hibah"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Sertifikat</label>
                          <input
                            type="date"
                            value={currentAset.tanggalSertifikat || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, tanggalSertifikat: e.target.value, tanggalSertifikatTanah: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Letak / Alamat Tanah <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={currentAset.letakAlamat || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, letakAlamat: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.letakAlamat ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Kec. Routa, Kab. Konawe, Sulawesi Tenggara"
                          />
                          {formErrors.letakAlamat && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.letakAlamat}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Asal-Usul Perolehan Tanah</label>
                          <input
                            type="text"
                            value={currentAset.asalUsulTanah || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, asalUsulTanah: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Pengadaan APBD / Hibah Masyarakat"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KIB B (PERALATAN DAN MESIN) */}
                  {activeKib === 'B' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Merek / Pabrikan <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={currentAset.merek || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, merek: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.merek ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Contoh: Asus, Epson, Chitose, Honda"
                          />
                          {formErrors.merek && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.merek}</span>
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Ukuran / CC / Dimensi</label>
                          <input
                            type="text"
                            value={currentAset.ukuran || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, ukuran: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Contoh: 14 Inch, 125 CC, 120 x 60 cm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Bahan Material</label>
                          <input
                            type="text"
                            value={currentAset.bahanMaterial || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, bahanMaterial: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Besi, Kayu Jati, Plastik, Logam"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nomor Pabrik / Serial Number (S/N)
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              value={currentAset.serialNumber || currentAset.nomorPabrik || ''}
                              onChange={(e) => setCurrentAset(prev => ({ ...prev, serialNumber: e.target.value, nomorPabrik: e.target.value }))}
                              className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                              placeholder="SN-1928490219"
                            />
                            <button
                              type="button"
                              onClick={() => handleScanBarcodeForAsetForm('serialNumber')}
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition shrink-0"
                              title="Scan Barcode Serial Number menggunakan Kamera"
                            >
                              <Camera size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Ruangan Penempatan Aset */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Penempatan Ruang (KIR) <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] text-indigo-600 font-semibold">Master Ruangan</span>
                          </div>
                          {!isCustomRuangActive ? (
                            <select
                              value={spaces.includes(currentAset.ruangLokasi as any) ? (currentAset.ruangLokasi || spaces[0] || 'Ruang Kelas') : '__custom__'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  setIsCustomRuangActive(true);
                                  setCurrentAset(prev => {
                                    const next = { ...prev, ruangLokasi: '' as any };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                } else {
                                  setCurrentAset(prev => {
                                    const next = { ...prev, ruangLokasi: val as any };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }
                              }}
                              className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.ruangLokasi ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium`}
                            >
                              {spaces.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                              {userRole === 'admin' && (
                                <option value="__custom__">+ Input Manual...</option>
                              )}
                            </select>
                          ) : (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={currentAset.ruangLokasi || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentAset(prev => {
                                    const next = { ...prev, ruangLokasi: val as any };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }}
                                placeholder="Nama ruang..."
                                className={`w-full text-xs px-2.5 py-2 border ${formErrors.ruangLokasi ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-indigo-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomRuangActive(false);
                                  setCurrentAset(prev => {
                                    const next = { ...prev, ruangLokasi: spaces[0] || 'Ruang Kelas' };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }}
                                className="px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-semibold shrink-0"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                          {formErrors.ruangLokasi && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.ruangLokasi}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Spesifik Mesin / Kendaraan Dinas (Accordion Ringan) */}
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                          Khusus Kendaraan Bermotor / Mesin Dinas (Opsional):
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <input
                            type="text"
                            value={currentAset.nomorRangka || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorRangka: e.target.value }))}
                            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
                            placeholder="No. Rangka"
                          />
                          <input
                            type="text"
                            value={currentAset.nomorMesin || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorMesin: e.target.value }))}
                            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
                            placeholder="No. Mesin"
                          />
                          <input
                            type="text"
                            value={currentAset.nomorPolisi || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorPolisi: e.target.value }))}
                            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
                            placeholder="No. Polisi (DT...)"
                          />
                          <input
                            type="text"
                            value={currentAset.nomorBpkb || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorBpkb: e.target.value }))}
                            className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-md font-mono"
                            placeholder="No. BPKB"
                          />
                        </div>
                      </div>

                      {/* Jumlah dan Satuan */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Jumlah Fisik Barang <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={currentAset.jumlah === undefined || currentAset.jumlah === null ? '' : currentAset.jumlah}
                            onChange={(e) => {
                              const val = e.target.value;
                              const numVal = val === '' ? '' : parseInt(val) || 0;
                              setCurrentAset(prev => {
                                const next = { ...prev, jumlah: numVal };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.jumlah ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            required
                          />
                          {formErrors.jumlah && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.jumlah}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Satuan Ukuran <span className="text-rose-500">*</span>
                          </label>
                          {!isCustomSatuanActive ? (
                            <select
                              value={customSatuans.includes(currentAset.satuan || '') ? (currentAset.satuan || 'Unit') : '__custom__'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  setIsCustomSatuanActive(true);
                                  setCurrentAset(prev => {
                                    const next = { ...prev, satuan: '' };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                } else {
                                  setCurrentAset(prev => {
                                    const next = { ...prev, satuan: val };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }
                              }}
                              className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.satuan ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            >
                              {Array.from(new Set([...customSatuans, ...asets.map(a => a.satuan).filter(Boolean)])).map(st => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                              <option value="__custom__">+ Tulis Kustom...</option>
                            </select>
                          ) : (
                            <div className="flex gap-1">
                              <input
                                type="text"
                                value={currentAset.satuan || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentAset(prev => {
                                    const next = { ...prev, satuan: val };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }}
                                placeholder="Satuan..."
                                className={`w-full text-xs px-2.5 py-2 border ${formErrors.satuan ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-indigo-200'} rounded-lg focus:outline-none`}
                                required
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomSatuanActive(false);
                                  setCurrentAset(prev => {
                                    const next = { ...prev, satuan: 'Unit' };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }}
                                className="px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px]"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}
                          {formErrors.satuan && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.satuan}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KIB C (GEDUNG DAN BANGUNAN) */}
                  {activeKib === 'C' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Konstruksi Tingkat</label>
                          <select
                            value={currentAset.bertingkat || 'Tidak Bertingkat'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, bertingkat: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Tidak Bertingkat">Tidak Bertingkat (1 Lantai)</option>
                            <option value="Bertingkat">Bertingkat (2+ Lantai)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Konstruksi Beton</label>
                          <select
                            value={currentAset.beton || 'Beton'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, beton: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Beton">Beton Bertulang</option>
                            <option value="Bukan Beton">Bukan Beton (Kayu/Baja Ringan)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Karakter Fisik Gedung</label>
                          <select
                            value={currentAset.kondisiBangunan || 'Permanen'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, kondisiBangunan: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Permanen">Permanen</option>
                            <option value="Semi Permanen">Semi Permanen</option>
                            <option value="Darurat">Darurat</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Luas Lantai Gedung (m²) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={currentAset.luasLantaiM2 || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentAset(prev => {
                                const next = { ...prev, luasLantaiM2: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.luasLantaiM2 ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Contoh: 288"
                          />
                          {formErrors.luasLantaiM2 && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.luasLantaiM2}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Nomor Dokumen / IMB / PBG <span className="text-rose-500">*</span>
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const smart = generateSmartAsetDefaults('C', asets, pengaturan, spaces);
                                setCurrentAset(prev => ({
                                  ...prev,
                                  nomorDokumenGedung: smart.nomorDokumenGedung,
                                  tanggalDokumenGedung: smart.tanggalDokumenGedung,
                                  statusTanahGedung: prev?.statusTanahGedung || smart.statusTanahGedung,
                                  kodeTanahKibA: prev?.kodeTanahKibA || smart.kodeTanahKibA
                                }));
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 cursor-pointer"
                              title="Generate Nomor Dokumen IMB/PBG Gedung Otomatis"
                            >
                              <Wand2 size={10} /> Auto
                            </button>
                          </div>
                          <input
                            type="text"
                            value={currentAset.nomorDokumenGedung || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, nomorDokumenGedung: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.nomorDokumenGedung ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none font-mono`}
                            placeholder="IMB No. / SIPB / BAST"
                          />
                          {formErrors.nomorDokumenGedung && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.nomorDokumenGedung}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Dokumen Gedung</label>
                          <input
                            type="date"
                            value={currentAset.tanggalDokumenGedung || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, tanggalDokumenGedung: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Status Tanah Tempat Gedung Berdiri */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Status Tanah Tempat Gedung Berdiri <span className="text-rose-500">*</span>
                            </label>
                            {isCustomStatusTanahActive && (
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomStatusTanahActive(false);
                                  setCurrentAset(prev => {
                                    const next = { ...prev, statusTanahGedung: standardStatusTanahOptions[0] };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                              >
                                Pilih dari Daftar
                              </button>
                            )}
                          </div>

                          {!isCustomStatusTanahActive ? (
                            <select
                              value={standardStatusTanahOptions.includes(currentAset.statusTanahGedung || '') ? currentAset.statusTanahGedung : '__custom__'}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '__custom__') {
                                  setIsCustomStatusTanahActive(true);
                                } else {
                                  setCurrentAset(prev => {
                                    const next = { ...prev, statusTanahGedung: val };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }
                              }}
                              className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.statusTanahGedung ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500`}
                            >
                              {standardStatusTanahOptions.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                              <option value="__custom__">+ Ketik Status Lainnya / Kustom...</option>
                            </select>
                          ) : (
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={currentAset.statusTanahGedung || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCurrentAset(prev => {
                                    const next = { ...prev, statusTanahGedung: val };
                                    if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                    return next;
                                  });
                                }}
                                className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.statusTanahGedung ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                                placeholder="Contoh: Tanah Pinjam Pakai Yayasan"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCustomStatusTanahActive(false);
                                  setCurrentAset(prev => ({ ...prev, statusTanahGedung: standardStatusTanahOptions[0] }));
                                }}
                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition shrink-0"
                                title="Kembali ke Pilihan Dropdown"
                              >
                                Batal
                              </button>
                            </div>
                          )}

                          {formErrors.statusTanahGedung && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.statusTanahGedung}</span>
                            </p>
                          )}
                        </div>

                        {/* Kode Aset Tanah KIB A Terkait */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold text-slate-700">
                              Kode Aset Tanah KIB A Terkait (Opsional)
                            </label>
                            {isCustomKodeTanahActive && (
                              <button
                                type="button"
                                onClick={() => setIsCustomKodeTanahActive(false)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
                              >
                                Pilih dari Data KIB A
                              </button>
                            )}
                          </div>

                          {(() => {
                            const landAssets = asets.filter(a => getActiveKib(a.kategori) === 'A');

                            if (!isCustomKodeTanahActive && landAssets.length > 0) {
                              return (
                                <div className="space-y-1">
                                  <select
                                    value={currentAset.kodeTanahKibA || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val === '__custom__') {
                                        setIsCustomKodeTanahActive(true);
                                      } else {
                                        const selectedLand = landAssets.find(l => l.id === val);
                                        setCurrentAset(prev => {
                                          const next = { 
                                            ...prev, 
                                            kodeTanahKibA: val,
                                            kodeTanahGedung: val
                                          };
                                          // Otomatis sinkronkan status tanah jika aset tanah memiliki data hakTanah
                                          if (selectedLand && selectedLand.hakTanah) {
                                            const matchedStatus = standardStatusTanahOptions.find(s => s.toLowerCase().includes((selectedLand.hakTanah || '').toLowerCase()));
                                            if (matchedStatus) {
                                              next.statusTanahGedung = matchedStatus;
                                            } else {
                                              next.statusTanahGedung = `Tanah ${selectedLand.hakTanah}`;
                                            }
                                          }
                                          if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                          return next;
                                        });
                                      }
                                    }}
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                  >
                                    <option value="">-- Tidak Terhubung / Belum Dipilih --</option>
                                    {landAssets.map(land => (
                                      <option key={land.id} value={land.id}>
                                        {land.id} — {land.nama || 'Lahan Sekolah'} ({land.luasTanahM2 || land.luasM2 || 0} m²{land.nomorSertifikat || land.nomorSertifikatTanah ? ` • ${land.nomorSertifikat || land.nomorSertifikatTanah}` : ''})
                                      </option>
                                    ))}
                                    <option value="__custom__">+ Ketik Manual Kode Lain...</option>
                                  </select>
                                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                    <span className="text-emerald-600 font-bold">✓</span>
                                    <span>Otomatis terhubung dengan Master Tanah KIB A</span>
                                  </p>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-1">
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    value={currentAset.kodeTanahKibA || ''}
                                    onChange={(e) => setCurrentAset(prev => ({ ...prev, kodeTanahKibA: e.target.value, kodeTanahGedung: e.target.value }))}
                                    className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none font-mono"
                                    placeholder="Contoh: TNH-2026-0001"
                                  />
                                  {landAssets.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => setIsCustomKodeTanahActive(false)}
                                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer transition shrink-0"
                                    >
                                      Pilih
                                    </button>
                                  )}
                                </div>
                                {landAssets.length === 0 && (
                                  <p className="text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-200">
                                    💡 Belum ada data KIB A (Tanah) terdaftar. Anda bisa mendaftarkan tanah di KIB A atau mengisi manual.
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KIB D (JALAN, IRIGASI & JARINGAN) */}
                  {activeKib === 'D' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Konstruksi Jaringan</label>
                          <input
                            type="text"
                            value={currentAset.konstruksiJaringan || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, konstruksiJaringan: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Paving Block, Rabat Beton, Pipa PVC SNI"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Panjang (m)</label>
                          <input
                            type="number"
                            step="any"
                            value={currentAset.panjangM || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, panjangM: parseFloat(e.target.value) || 0 }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Contoh: 150"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Lebar (m) / Luas (m²)</label>
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="number"
                              step="any"
                              value={currentAset.lebarM || ''}
                              onChange={(e) => setCurrentAset(prev => ({ ...prev, lebarM: parseFloat(e.target.value) || 0 }))}
                              className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                              placeholder="Lebar"
                            />
                            <input
                              type="number"
                              step="any"
                              value={currentAset.luasM2 || ''}
                              onChange={(e) => setCurrentAset(prev => ({ ...prev, luasM2: parseFloat(e.target.value) || 0 }))}
                              className="w-full text-xs px-2 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                              placeholder="Luas m²"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi / Letak Jaringan</label>
                          <input
                            type="text"
                            value={currentAset.letakAlamat || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, letakAlamat: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Area Halaman Depan & Jalur Lapangan"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Status Kepemilikan Tanah Jaringan</label>
                          <input
                            type="text"
                            value={currentAset.statusTanahGedung || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, statusTanahGedung: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Tanah Milik Pemda / Sekolah"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KIB E (ASET TETAP LAINNYA) */}
                  {activeKib === 'E' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Jenis Aset Lainnya</label>
                          <select
                            value={currentAset.jenisAsetLainnya || 'Buku/Perpustakaan'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, jenisAsetLainnya: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none font-semibold text-slate-800"
                          >
                            <option value="Buku/Perpustakaan">Buku Perpustakaan / Teks</option>
                            <option value="Barang Bercorak Kesenian/Kebudayaan">Kesenian / Kebudayaan</option>
                            <option value="Hewan/Tumbuhan">Hewan / Tanaman Sekolah</option>
                            <option value="Alat Olahraga/Peraga">Alat Olahraga / Peraga</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {currentAset.jenisAsetLainnya === 'Barang Bercorak Kesenian/Kebudayaan' ? 'Pencipta / Seniman' : 'Pengarang Buku'}
                          </label>
                          <input
                            type="text"
                            value={currentAset.pengarangBuku || currentAset.penciptaSeni || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, pengarangBuku: e.target.value, penciptaSeni: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Nama Pengarang / Seniman"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {currentAset.jenisAsetLainnya === 'Barang Bercorak Kesenian/Kebudayaan' ? 'Asal Daerah Kesenian' : 'Penerbit Buku'}
                          </label>
                          <input
                            type="text"
                            value={currentAset.penerbitBuku || currentAset.asalDaerahSeni || ''}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, penerbitBuku: e.target.value, asalDaerahSeni: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            placeholder="Kemendikbudristek / Erlangga / Sulawesi Tenggara"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Penempatan Ruangan (KIR)</label>
                          <select
                            value={currentAset.ruangLokasi || 'Ruang Perpustakaan'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, ruangLokasi: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            {spaces.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Fisik</label>
                          <input
                            type="number"
                            min={1}
                            value={currentAset.jumlah || 1}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, jumlah: parseInt(e.target.value) || 1 }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Satuan Ukuran</label>
                          <select
                            value={currentAset.satuan || 'Eksemplar'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, satuan: e.target.value }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Eksemplar">Eksemplar</option>
                            <option value="Judul">Judul</option>
                            <option value="Buah">Buah</option>
                            <option value="Set">Set</option>
                            <option value="Unit">Unit</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KIB F (KONSTRUKSI DALAM PENGERJAAN / KDP) */}
                  {activeKib === 'F' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Konstruksi</label>
                          <select
                            value={currentAset.bertingkat || 'Tidak Bertingkat'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, bertingkat: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Tidak Bertingkat">Tidak Bertingkat</option>
                            <option value="Bertingkat">Bertingkat</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">Bahan Rencana</label>
                          <select
                            value={currentAset.beton || 'Beton'}
                            onChange={(e) => setCurrentAset(prev => ({ ...prev, beton: e.target.value as any }))}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                          >
                            <option value="Beton">Beton Bertulang</option>
                            <option value="Bukan Beton">Bukan Beton</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Luas Rencana (m²) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            step="any"
                            value={currentAset.luasLantaiM2 || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentAset(prev => {
                                const next = { ...prev, luasLantaiM2: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.luasLantaiM2 ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Contoh: 180"
                          />
                          {formErrors.luasLantaiM2 && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.luasLantaiM2}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tanggal Mulai SPK <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={currentAset.tanggalMulaiPembangunan || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, tanggalMulaiPembangunan: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.tanggalMulaiPembangunan ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                          />
                          {formErrors.tanggalMulaiPembangunan && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.tanggalMulaiPembangunan}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Nilai Kontrak Fisik (Rp) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={currentAset.nilaiKontrakPembangunan || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentAset(prev => {
                                const next = { ...prev, nilaiKontrakPembangunan: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.nilaiKontrakPembangunan ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                            placeholder="Rp 250.000.000"
                          />
                          {formErrors.nilaiKontrakPembangunan && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.nilaiKontrakPembangunan}</span>
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Progress Fisik (%) <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={currentAset.persentaseFisikKdp !== undefined ? currentAset.persentaseFisikKdp : ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setCurrentAset(prev => {
                                const next = { ...prev, persentaseFisikKdp: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.persentaseFisikKdp ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none font-bold text-amber-700`}
                            placeholder="Contoh: 65"
                          />
                          {formErrors.persentaseFisikKdp && (
                            <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                              <AlertCircle size={12} className="shrink-0" />
                              <span>{formErrors.persentaseFisikKdp}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 3: Finansial, Kondisi & Dokumen Perolehan */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <DollarSign size={14} className="text-indigo-600" />
                    <span>3. Data Finansial, Tahun Perolehan & Kondisi Barang</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kondisi Saat Ini <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={currentAset.kondisi || 'Baik'}
                        onChange={(e) => {
                          const val = e.target.value as KondisiAset;
                          setCurrentAset(prev => {
                            const next = { ...prev, kondisi: val };
                            if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                            return next;
                          });
                        }}
                        className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.kondisi ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none font-semibold text-slate-800`}
                      >
                        {conditions.filter(x => x !== 'Dihapuskan').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      {formErrors.kondisi && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{formErrors.kondisi}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Sumber Pembiayaan <span className="text-rose-500">*</span>
                      </label>
                      {!isCustomSumberDanaActive ? (
                        <select
                          value={fundingSources.includes(currentAset.sumberDana || '') ? (currentAset.sumberDana || 'BOS Reguler') : '__custom__'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              setIsCustomSumberDanaActive(true);
                              setCurrentAset(prev => {
                                const next = { ...prev, sumberDana: '' };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            } else {
                              setCurrentAset(prev => {
                                const next = { ...prev, sumberDana: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }
                          }}
                          className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.sumberDana ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none`}
                        >
                          {Array.from(new Set([...fundingSources, ...asets.map(a => a.sumberDana).filter(Boolean)])).map(fd => (
                            <option key={fd} value={fd}>{fd}</option>
                          ))}
                          <option value="__custom__">+ Tulis Kustom...</option>
                        </select>
                      ) : (
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={currentAset.sumberDana || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCurrentAset(prev => {
                                const next = { ...prev, sumberDana: val };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            placeholder="Sumber dana..."
                            className={`w-full text-xs px-2.5 py-2 border ${formErrors.sumberDana ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-indigo-200'} rounded-lg focus:outline-none`}
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setIsCustomSumberDanaActive(false);
                              setCurrentAset(prev => {
                                const next = { ...prev, sumberDana: 'BOS Reguler' };
                                if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                                return next;
                              });
                            }}
                            className="px-2 py-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-[10px]"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      {formErrors.sumberDana && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{formErrors.sumberDana}</span>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Tahun Perolehan Fisik</span>
                        {currentAset.tahunPerolehan && currentAset.tahunPerolehan < currentYear && (
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                            Perolehan Lama ({currentAset.tahunPerolehan})
                          </span>
                        )}
                      </label>
                      <select
                        value={currentAset.tahunPerolehan || currentYear}
                        onChange={(e) => setCurrentAset(prev => ({ ...prev, tahunPerolehan: parseInt(e.target.value) || currentYear }))}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none font-semibold text-slate-800"
                      >
                        {years.map(yr => (
                          <option key={yr} value={yr}>
                            Tahun {yr} {yr === currentYear ? '— (Barang Baru 2026)' : '— (Barang Lama)'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bukti / Dokumen Perolehan (BAST / Faktur / SPK)
                      </label>
                      <input
                        type="text"
                        value={currentAset.nomorBuktiPerolehan || ''}
                        onChange={(e) => setCurrentAset(prev => ({ ...prev, nomorBuktiPerolehan: e.target.value }))}
                        placeholder="Contoh: BAST No. 042/DISDIK/2026 atau Faktur"
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Harga Perolehan Satuan (Rp) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={currentAset.hargaPerolehan !== undefined ? currentAset.hargaPerolehan : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = val === '' ? undefined : parseFloat(val) || 0;
                          setCurrentAset(prev => {
                            const next = { ...prev, hargaPerolehan: numVal };
                            if (hasAttemptedSubmit) setFormErrors(validateAsetForm(next, activeKib));
                            return next;
                          });
                        }}
                        placeholder="Contoh: 7500000"
                        className={`w-full text-xs px-3 py-2 bg-white border ${formErrors.hargaPerolehan ? 'border-rose-500 ring-2 ring-rose-200 bg-rose-50/30' : 'border-slate-200'} rounded-lg focus:outline-none font-semibold text-emerald-700`}
                      />
                      {formErrors.hargaPerolehan && (
                        <p className="text-[10px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{formErrors.hargaPerolehan}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Spesifikasi Teknis & Dokumentasi Foto */}
                <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider pb-1 border-b border-slate-200">
                    <FileText size={14} className="text-indigo-600" />
                    <span>4. Keterangan Spesifikasi Teknis</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Spesifikasi Detail / Catatan Aset</label>
                    <textarea
                      rows={2}
                      value={currentAset.spesifikasi || ''}
                      onChange={(e) => setCurrentAset(prev => ({ ...prev, spesifikasi: e.target.value }))}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none resize-none"
                      placeholder="Spesifikasi teknis, kelengkapan aksesoris, catatan fisik, riwayat pemeliharaan, dsb."
                    />
                  </div>
                </div>

                {/* Photo upload inputs (3 Slots) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Foto Fisik Inventaris (Minimal 3 Kolom Foto / Kamera Aktif)</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Foto Utama', desc: 'Tampak depan' },
                      { label: 'Foto Samping', desc: 'Samping / Merek' },
                      { label: 'Foto Detail', desc: 'Kondisi fisik' }
                    ].map((slot, idx) => {
                      const photoUrl = parsePhotos(currentAset.fotoUrl)[idx];
                      return (
                        <div key={idx} className="border border-slate-200 rounded-2xl p-2 bg-slate-50 flex flex-col justify-between items-center text-center relative min-h-[120px] overflow-hidden">
                          {photoUrl ? (
                            <div className="w-full h-20 rounded-xl overflow-hidden relative group">
                              <img
                                src={photoUrl}
                                alt={slot.label}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => {
                                  const allPhotos = parsePhotos(currentAset.fotoUrl).map(p => p ? p.trim() : '').filter(Boolean);
                                  if (allPhotos.length > 0) {
                                    handleOpenPhotoPreview(allPhotos, allPhotos.indexOf(photoUrl), currentAset.nama || 'Preview Foto');
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <Maximize2 size={14} className="text-white" />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePhotoAt(idx)}
                                className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition z-10"
                                title="Hapus foto"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ) : (
                            <div className="w-full h-20 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-1.5 bg-white">
                              <span className="text-[9px] text-slate-500 font-bold mb-1.5">{slot.label}</span>
                              <div className="flex items-center gap-1 w-full">
                                <label className="flex-1 py-1 px-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition border border-slate-200" title="Pilih dari Galeri / Folder HP">
                                  <FolderOpen size={11} className="shrink-0 text-slate-500" />
                                  <span>Galeri</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoUploadAt(idx)}
                                    className="hidden"
                                  />
                                </label>
                                <label className="flex-1 py-1 px-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition shadow-xs" title="Ambil foto langsung dengan Kamera HP">
                                  <Camera size={11} className="shrink-0" />
                                  <span>Kamera</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handlePhotoUploadAt(idx)}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            </div>
                          )}
                          <div className="mt-1 text-[9px] font-bold text-slate-600">{slot.label}</div>
                          <div className="text-[8px] text-slate-400 leading-tight">{slot.desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Internal Perawatan</label>
                  <input
                    type="text"
                    value={currentAset.catatan || ''}
                    onChange={(e) => setCurrentAset(prev => ({ ...prev, catatan: e.target.value }))}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    placeholder="e.g. Berkala diuji kelayakannya"
                  />
                </div>

                {/* Saving Indicator Banner inside Modal */}
                {isSaving && (
                  <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-2xl flex items-center gap-3 text-indigo-800 text-xs font-semibold animate-pulse">
                    <Loader2 size={20} className="animate-spin text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-bold">Menyimpan & Menyelaraskan Data...</p>
                      <p className="text-[10px] text-indigo-600 font-normal mt-0.5">Sedang mengirimkan data ke database. Mohon tunggu sebentar.</p>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || uploadingPhoto}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center gap-2 transition"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Menyimpan ke Database...</span>
                      </>
                    ) : (
                      <span>Simpan Inventaris BMD ({currentKibObj.code})</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
          );
        })()}
      </AnimatePresence>

      {/* Modal Opsi Hapus: Data Uji Coba vs Pemusnahan Resmi */}
      <AnimatePresence>
        {selectedAsetForDeleteChoice && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 relative border border-slate-100"
            >
              <button
                onClick={() => {
                  setSelectedAsetForDeleteChoice(null);
                  setIsConfirmingPermanentDelete(false);
                }}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              {isConfirmingPermanentDelete ? (
                /* Langkah Konfirmasi Hapus Permanen */
                <div>
                  <div className="flex items-center gap-2 mb-2 text-rose-600 font-extrabold text-base">
                    <Trash2 size={22} />
                    <h3>Konfirmasi Hapus Permanen</h3>
                  </div>
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 my-4">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Apakah Anda yakin ingin menghapus <span className="font-bold text-slate-900">PERMANEN</span> data uji coba / salah input berikut?
                    </p>
                    <div className="mt-2 p-2.5 bg-white/80 rounded-xl border border-rose-100 text-xs font-semibold text-slate-800 flex justify-between items-center">
                      <span>{selectedAsetForDeleteChoice.nama}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{selectedAsetForDeleteChoice.id}</span>
                    </div>
                    <p className="text-[11px] text-rose-600 font-medium mt-2">
                      ⚠️ Data akan dihapus bersih dari database dan tidak dapat dikembalikan.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isDeletingAset}
                      onClick={() => setIsConfirmingPermanentDelete(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Kembali
                    </button>
                    <button
                      type="button"
                      disabled={isDeletingAset}
                      onClick={async () => {
                        const id = selectedAsetForDeleteChoice.id;
                        try {
                          setIsDeletingAset(true);
                          await onDeleteAset(id);
                          setSelectedAsetForDeleteChoice(null);
                          setIsConfirmingPermanentDelete(false);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setIsDeletingAset(false);
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-sm"
                    >
                      {isDeletingAset ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      <span>Ya, Hapus Permanen</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Langkah Pilih Jenis Penghapusan */
                <div>
                  <div className="flex items-center gap-2 mb-1 text-rose-600 font-extrabold text-base">
                    <Trash2 size={20} />
                    <h3>Pilih Jenis Penghapusan Aset</h3>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">
                    Aset: <span className="font-bold text-slate-800">{selectedAsetForDeleteChoice.nama}</span> ({selectedAsetForDeleteChoice.id})
                  </p>

                  <div className="space-y-3">
                    {/* Opsi 1: Hapus Permanen (Uji Coba / Salah Input) */}
                    <div
                      onClick={() => setIsConfirmingPermanentDelete(true)}
                      className="p-4 rounded-2xl border-2 border-slate-100 hover:border-rose-300 bg-slate-50/50 hover:bg-rose-50/30 transition cursor-pointer group flex items-start gap-3.5"
                    >
                      <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl group-hover:bg-rose-600 group-hover:text-white transition shrink-0">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-rose-700 transition">
                          1. Hapus Permanen (Data Uji Coba / Salah Input)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Hapus bersih record ini dari sistem. Cocok jika Anda sedang melakukan uji coba aplikasi, simulasi data, atau salah memasukkan data.
                        </p>
                      </div>
                    </div>

                    {/* Opsi 2: Pemusnahan Resmi (SK & Berita Acara) */}
                    <div
                      onClick={() => {
                        const aset = selectedAsetForDeleteChoice;
                        setSelectedAsetForDeleteChoice(null);
                        setIsConfirmingPermanentDelete(false);
                        handleDisposalClick(aset);
                      }}
                      className="p-4 rounded-2xl border-2 border-slate-100 hover:border-amber-300 bg-slate-50/50 hover:bg-amber-50/30 transition cursor-pointer group flex items-start gap-3.5"
                    >
                      <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition shrink-0">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-800 group-hover:text-amber-800 transition">
                          2. Pemusnahan / Penghapusan Resmi (SK Sarpras)
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                          Proses formal barang sekolah yang rusak berat/lapuk. Akan menerbitkan Berita Acara Pemusnahan, mencatat Nomor SK Resmi, dan mengubah status ke "Dihapuskan".
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedAsetForDeleteChoice(null);
                        setIsConfirmingPermanentDelete(false);
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Destruction / Disposal Log Modal */}
      <AnimatePresence>
        {isPemusnahanModalOpen && selectedAsetToDestroy && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl p-6 relative border border-slate-100"
            >
              <button
                onClick={() => setIsPemusnahanModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-base font-bold text-rose-600 mb-4 pb-2 border-b border-rose-100 flex items-center gap-2">
                <AlertTriangle size={18} />
                Pernyataan Berita Acara Penghapusan Aset
              </h2>

              <div className="bg-rose-50 border border-rose-100 p-3 rounded-xl mb-4 text-xs leading-relaxed text-rose-700 flex flex-col gap-2">
                <div>
                  Tindakan ini akan <span className="font-bold">menghapus secara formal</span> item berikut dari status registrasi inventaris sekolah aktif. Proses ini dicatat dalam log audit legal pemusnahan sarpras.
                  <div className="mt-1 font-semibold text-slate-800">
                    Item: {selectedAsetToDestroy.nama} ({selectedAsetToDestroy.jumlah} {selectedAsetToDestroy.satuan})
                  </div>
                </div>
                <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
                  <span className="text-slate-600 font-medium">Data ini hanya uji coba / salah input?</span>
                  <button
                    type="button"
                    onClick={() => {
                      const aset = selectedAsetToDestroy;
                      setIsPemusnahanModalOpen(false);
                      setSelectedAsetToDestroy(null);
                      setSelectedAsetForDeleteChoice(aset);
                      setIsConfirmingPermanentDelete(true);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-lg transition cursor-pointer shrink-0"
                  >
                    Hapus Permanen Langsung
                  </button>
                </div>
              </div>

              <form onSubmit={handleDisposalSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">No. SK Penghapusan Aset Resmi</label>
                  <input
                    type="text"
                    value={disposalForm.noSkPenghapusan || ''}
                    onChange={(e) => setDisposalForm(prev => ({ ...prev, noSkPenghapusan: e.target.value }))}
                    placeholder="e.g. SK-SARPRAS/2026/112"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Penghapusan</label>
                    <select
                      value={disposalForm.metode || 'Pemusnahan Fisik'}
                      onChange={(e) => setDisposalForm(prev => ({ ...prev, metode: e.target.value as any }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="Pemusnahan Fisik">Pemusnahan Fisik (Hancur)</option>
                      <option value="Penjualan/Lelang">Penjualan/Lelang Aset</option>
                      <option value="Hibah">Hibah Sosial</option>
                      <option value="Transfer Satuan Lain">Transfer ke Sekolah Lain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Eksekusi</label>
                    <input
                      type="date"
                      value={disposalForm.tanggalPemusnahan || ''}
                      onChange={(e) => setDisposalForm(prev => ({ ...prev, tanggalPemusnahan: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Alasan Justifikasi Resmi</label>
                  <input
                    type="text"
                    value={disposalForm.alasan || ''}
                    onChange={(e) => setDisposalForm(prev => ({ ...prev, alasan: e.target.value }))}
                    placeholder="e.g. Rusak Berat Total, lapuk dimakan usia"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Petugas Pelaksana</label>
                    <input
                      type="text"
                      value={disposalForm.petugasEksekusi || ''}
                      onChange={(e) => setDisposalForm(prev => ({ ...prev, petugasEksekusi: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Dihapuskan</label>
                    <input
                      type="number"
                      max={selectedAsetToDestroy.jumlah}
                      min={1}
                      value={disposalForm.jumlah === undefined || disposalForm.jumlah === null ? '' : disposalForm.jumlah}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDisposalForm(prev => ({
                          ...prev,
                          jumlah: val === '' ? '' : parseInt(val) || 0
                        }));
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Berita Acara</label>
                  <textarea
                    rows={2}
                    value={disposalForm.catatan || ''}
                    onChange={(e) => setDisposalForm(prev => ({ ...prev, catatan: e.target.value }))}
                    placeholder="Catatan tambahan mengenai penimbunan barang dsb."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    disabled={isDisposing}
                    onClick={() => setIsPemusnahanModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isDisposing}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-md shadow-rose-600/10 flex items-center justify-center gap-2 transition disabled:bg-rose-400"
                  >
                    {isDisposing ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Memproses Penghapusan...</span>
                      </>
                    ) : (
                      <span>Tandatangan & Hapuskan</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Photo Zoom Preview Modal */}
      <AnimatePresence>
        {previewModal && previewModal.isOpen && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-between z-[100] p-4 select-none">
            {/* Top Bar Controls */}
            <div className="w-full max-w-5xl flex items-center justify-between text-white py-2.5 px-4 z-10 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-2xl">
              <div className="flex items-center gap-2 overflow-hidden">
                <Camera size={18} className="text-indigo-400 shrink-0" />
                <span className="text-xs md:text-sm font-bold truncate max-w-xs md:max-w-md">{previewModal.title}</span>
                {previewModal.photos.length > 1 && (
                  <span className="text-[10px] md:text-xs bg-indigo-950 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-800 shrink-0">
                    {previewModal.currentIndex + 1} / {previewModal.photos.length}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.min(prev + 0.3, 3))}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
                  title="Perbesar (Zoom In)"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(prev => Math.max(prev - 0.3, 0.5))}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
                  title="Perkecil (Zoom Out)"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
                  title="Putar Foto (Rotate)"
                >
                  <RotateCw size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoomScale(1); setRotation(0); }}
                  className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
                  title="Reset Tampilan"
                >
                  Reset
                </button>
                <div className="h-4 w-px bg-slate-700 mx-1" />
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="p-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl transition cursor-pointer shadow-md"
                  title="Tutup Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Main Viewport */}
            <div className="flex-1 w-full flex items-center justify-center overflow-hidden my-4 relative">
              {previewModal.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewModal(prev => prev ? ({ ...prev, currentIndex: (prev.currentIndex - 1 + prev.photos.length) % prev.photos.length }) : null);
                      setZoomScale(1);
                      setRotation(0);
                    }}
                    className="absolute left-2 md:left-6 z-20 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 shadow-2xl transition cursor-pointer"
                    title="Foto Sebelumnya"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewModal(prev => prev ? ({ ...prev, currentIndex: (prev.currentIndex + 1) % prev.photos.length }) : null);
                      setZoomScale(1);
                      setRotation(0);
                    }}
                    className="absolute right-2 md:right-6 z-20 p-3 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full border border-slate-700 shadow-2xl transition cursor-pointer"
                    title="Foto Selanjutnya"
                  >
                    →
                  </button>
                </>
              )}

              <div
                className="max-w-full max-h-full flex items-center justify-center p-4 transition-transform duration-200"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`
                }}
              >
                <img
                  src={previewModal.photos[previewModal.currentIndex]}
                  alt="Preview High Resolution"
                  className="max-h-[75vh] max-w-[85vw] object-contain rounded-2xl shadow-2xl border border-slate-800"
                />
              </div>
            </div>

            {/* Thumbnail Selector (if multiple photos) */}
            {previewModal.photos.length > 1 && (
              <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-2xl border border-slate-800 shadow-xl">
                {previewModal.photos.map((ph, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPreviewModal(prev => prev ? ({ ...prev, currentIndex: idx }) : null);
                      setZoomScale(1);
                      setRotation(0);
                    }}
                    className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                      idx === previewModal.currentIndex ? 'border-indigo-500 scale-105' : 'border-slate-700 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={ph} alt="Thumb" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
