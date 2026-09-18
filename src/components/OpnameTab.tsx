import React, { useState, useMemo } from 'react';
import { OpnameEntry, OpnameFotoUnit, OpnameMasterItem, KondisiAset, StatusPenguasaan, PengaturanSekolah } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Camera, Check, Loader2, ClipboardCheck, ChevronRight,
  Trash2, ListChecks, FileArchive, FolderOpen, ScanBarcode
} from 'lucide-react';
import { exportLaporanOpnameZip } from '../utils/opnameLaporanExport';
import QRScanner from './QRScanner';

interface OpnameTabProps {
  opnameMasterList: OpnameMasterItem[];
  opnameEntries: OpnameEntry[];
  activeOperator: string;
  pengaturan: PengaturanSekolah;
  onSaveOpnameEntry: (entry: OpnameEntry) => Promise<void>;
  onDeleteOpnameEntry: (id: string) => Promise<void>;
}

const STATUS_PENGUASAAN_OPTIONS: StatusPenguasaan[] = [
  'Digunakan', 'Dikuasai Pegawai', 'Digunakan Unit Lain', 'Dikuasai Pihak Ketiga'
];

const KIB_LABEL: Record<string, string> = {
  B: 'KIB B - Peralatan dan Mesin',
  C: 'KIB C - Gedung dan Bangunan',
  E: 'KIB E - Aset Tetap Lainnya (Buku)',
};

// Angka wajar maksimum untuk "Jumlah Unit Fisik" (mis. buku ratusan kopi per judul) - ini
// hanya batas catatan angka, bukan batas jumlah foto (lihat MAX_PHOTO_SLOTS di bawah).
const MAX_JUMLAH_UNIT = 9999;

// Foto per unit fisik hanya masuk akal untuk barang/perabot (KIB B) yang jumlahnya wajar
// (mis. 45 kursi rapat) - dibatasi supaya tidak kebablasan jadi ratusan slot foto yang
// bisa bikin 1 dokumen Firestore kelebihan ukuran.
const MAX_PHOTO_SLOTS = 100;

// Untuk buku (KIB E), 1 judul bisa punya ratusan kopi identik - tidak realistis dan tidak
// perlu difoto satu-satu. Cukup 1 foto mewakili semua kopi; jumlah unit tetap dicatat
// sebagai angka saja (untuk referensi operator, bukan kolom laporan resmi).
function getPhotoSlotCount(kib: 'B' | 'C' | 'E', jumlahUnit: number): number {
  if (kib === 'E') return 1;
  return Math.min(Math.max(1, jumlahUnit || 1), MAX_PHOTO_SLOTS);
}

// Kalau unit fisik kondisinya beda-beda (mis. 2 laptop, 1 Baik 1 Rusak Ringan), kondisi
// baris/entry keseluruhan (dipakai di laporan resmi & rekap sensus) diambil dari yang
// PALING PARAH - supaya tidak ada kerusakan yang "tertutupi" oleh unit lain yang masih baik.
const KONDISI_SEVERITY: Record<string, number> = { 'Baik': 0, 'Rusak Ringan': 1, 'Rusak Berat': 2 };
function worstKondisi(kondisiList: (KondisiAset | undefined)[], fallback: KondisiAset): KondisiAset {
  let worst: KondisiAset = fallback;
  let worstScore = -1;
  for (const k of kondisiList) {
    if (!k) continue;
    const score = KONDISI_SEVERITY[k] ?? -1;
    if (score > worstScore) {
      worstScore = score;
      worst = k;
    }
  }
  return worstScore >= 0 ? worst : fallback;
}

// Data harga dari provinsi tersimpan dalam satuan "ribuan Rp" (sama seperti di
// opnameLaporanExport.ts) - dikalikan 1000 supaya tampil harga Rupiah sesungguhnya.
function fmtHargaPerolehan(n: number | undefined): string {
  if (!n) return '-';
  return 'Rp ' + Math.round(n * 1000).toLocaleString('id-ID');
}

// Coba tebak jumlah unit fisik dari data provinsi, dua pola yang umum ditemukan:
// 1. Rentang nomor register, mis. register "0001 s/d 0005" -> 5 unit
// 2. Kalimat di keterangan, mis. "...Jumlah Barang 3 Harga Satuan..." -> 3 unit
function guessJumlahUnit(item: Pick<OpnameMasterItem, 'register' | 'keterangan'>): number {
  if (item.register) {
    const rangeMatch = item.register.match(/(\d+)\s*s\s*\/?\s*d\s*(\d+)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (end >= start && (end - start + 1) <= MAX_JUMLAH_UNIT) return end - start + 1;
    }
  }
  if (item.keterangan) {
    const match = item.keterangan.match(/jumlah\s*(?:barang|unit)?\s*[:=]?\s*(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n <= MAX_JUMLAH_UNIT) return n;
    }
  }
  return 1;
}

function normalizeFotoUnits(entry: Partial<OpnameEntry> | undefined, photoSlotCount: number): OpnameFotoUnit[] {
  let units: OpnameFotoUnit[] = entry?.fotoUnits ? [...entry.fotoUnits] : [];
  if (units.length === 0 && (entry?.foto1 || entry?.foto2)) {
    units = [{ foto1: entry.foto1, foto2: entry.foto2 }];
  }
  while (units.length < photoSlotCount) units.push({});
  return units;
}

// Kompres foto ke JPEG max 1000px agar ringan di database
function compressImage(file: File, maxDim = 1000, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('canvas context gagal')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function OpnameTab({ opnameMasterList, opnameEntries, activeOperator, pengaturan, onSaveOpnameEntry, onDeleteOpnameEntry }: OpnameTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKib, setFilterKib] = useState<'Semua' | 'B' | 'C' | 'E'>('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Sudah' | 'Belum'>('Semua');
  const [filterKondisi, setFilterKondisi] = useState<'Semua' | KondisiAset>('Semua');
  const [filterTahun, setFilterTahun] = useState<string>('Semua');
  const [filterDitemukan, setFilterDitemukan] = useState<'Semua' | 'Ya' | 'Tidak'>('Semua');
  const [selectedItem, setSelectedItem] = useState<OpnameMasterItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState<{ unit: number; slot: 1 | 2 } | null>(null);
  const [isExportingLaporan, setIsExportingLaporan] = useState(false);
  const [zoomFoto, setZoomFoto] = useState<{ src: string; label: string } | null>(null);
  const [scanUnitIdx, setScanUnitIdx] = useState<number | null>(null);

  const handleExportLaporan = async () => {
    if (opnameMasterList.length === 0) {
      alert('Belum ada data referensi opname yang dimuat.');
      return;
    }
    setIsExportingLaporan(true);
    try {
      await exportLaporanOpnameZip(pengaturan, opnameMasterList, opnameEntries);
    } catch (e) {
      console.error('Gagal membuat laporan opname:', e);
      alert('Gagal membuat laporan. Silakan coba lagi.');
    } finally {
      setIsExportingLaporan(false);
    }
  };

  const opnameByRefId = useMemo(() => {
    const map = new Map<string, OpnameEntry>();
    opnameEntries.forEach(e => map.set(e.refId, e));
    return map;
  }, [opnameEntries]);

  const [form, setForm] = useState<Partial<OpnameEntry>>({});

  const filteredItems = useMemo(() => {
    let list = opnameMasterList;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(a =>
        a.nama.toLowerCase().includes(term) ||
        a.kode.toLowerCase().includes(term) ||
        a.register.toLowerCase().includes(term) ||
        (a.keterangan || '').toLowerCase().includes(term)
      );
    }
    if (filterKib !== 'Semua') {
      list = list.filter(a => a.kib === filterKib);
    }
    if (filterStatus === 'Sudah') {
      list = list.filter(a => opnameByRefId.has(a.id));
    } else if (filterStatus === 'Belum') {
      list = list.filter(a => !opnameByRefId.has(a.id));
    }
    if (filterKondisi !== 'Semua') {
      // Kondisi cuma relevan untuk barang yang ditemukan - barang "Tidak Ditemukan" tidak
      // dianggap match kondisi apapun, walau field kondisinya masih nyimpan nilai bawaan lama.
      list = list.filter(a => {
        const entry = opnameByRefId.get(a.id);
        return entry?.ditemukan !== 'Tidak' && entry?.kondisi === filterKondisi;
      });
    }
    if (filterDitemukan !== 'Semua') {
      list = list.filter(a => opnameByRefId.get(a.id)?.ditemukan === filterDitemukan);
    }
    if (filterTahun !== 'Semua') {
      list = list.filter(a => (a.tahun || '-') === filterTahun);
    }
    // Urutkan sesuai nomor urut resmi provinsi (per KIB) supaya urutannya sama seperti Excel asli
    list = [...list].sort((a, b) => {
      if (a.kib !== b.kib) return a.kib.localeCompare(b.kib);
      const na = parseFloat(a.no || '0') || 0;
      const nb = parseFloat(b.no || '0') || 0;
      return na - nb;
    });
    return list;
  }, [opnameMasterList, searchTerm, filterKib, filterStatus, filterKondisi, filterDitemukan, filterTahun, opnameByRefId]);

  // Daftar tahun pengadaan yang benar-benar ada di data, buat isi dropdown filter tahun
  const availableTahun = useMemo(() => {
    const set = new Set<string>();
    opnameMasterList.forEach(a => set.add(a.tahun || '-'));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [opnameMasterList]);

  const totalItem = opnameMasterList.length;
  const totalSudah = opnameMasterList.filter(a => opnameByRefId.has(a.id)).length;
  const persenSelesai = totalItem > 0 ? Math.round((totalSudah / totalItem) * 100) : 0;

  const openForm = (item: OpnameMasterItem) => {
    const existing = opnameByRefId.get(item.id);
    const jumlahUnit = existing?.jumlahUnit || guessJumlahUnit(item);
    const photoSlots = getPhotoSlotCount(item.kib, jumlahUnit);
    setSelectedItem(item);
    setForm(existing ? { ...existing, jumlahUnit, fotoUnits: normalizeFotoUnits(existing, photoSlots), merk: existing.merk || item.merk || '' } : {
      ditemukan: 'Ya',
      statusPenguasaan: 'Digunakan',
      kondisi: 'Baik',
      kodeStiker: '',
      keterangan: '',
      jumlahUnit,
      fotoUnits: normalizeFotoUnits(undefined, photoSlots),
      // Isi awal dari data provinsi kalau ada - operator tinggal koreksi kalau salah/kosong
      merk: item.merk || '',
    });
  };

  const handleFotoChange = async (unitIdx: number, slot: 1 | 2, file: File | null) => {
    if (!file) return;
    setIsUploadingFoto({ unit: unitIdx, slot });
    try {
      const compressed = await compressImage(file);
      setForm(prev => {
        const units = [...(prev.fotoUnits || [])];
        while (units.length <= unitIdx) units.push({});
        units[unitIdx] = { ...units[unitIdx], [slot === 1 ? 'foto1' : 'foto2']: compressed };
        return { ...prev, fotoUnits: units };
      });
    } catch (e) {
      alert('Gagal memproses foto. Coba lagi.');
    } finally {
      setIsUploadingFoto(null);
    }
  };

  const handleRemoveFoto = (unitIdx: number, slot: 1 | 2) => {
    setForm(prev => {
      const units = [...(prev.fotoUnits || [])];
      if (!units[unitIdx]) return prev;
      units[unitIdx] = { ...units[unitIdx], [slot === 1 ? 'foto1' : 'foto2']: undefined };
      return { ...prev, fotoUnits: units };
    });
  };

  const handleJumlahUnitChange = (raw: string) => {
    // Kalau lagi dikosongkan (mau ganti angka), biarkan kosong dulu - jangan
    // dipaksa balik ke 1, supaya tidak numpuk jadi "13" saat ganti 1 -> 3
    if (raw === '') {
      setForm(prev => ({ ...prev, jumlahUnit: undefined }));
      return;
    }
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    const jumlahUnit = Math.max(1, Math.min(MAX_JUMLAH_UNIT, n));
    const photoSlots = getPhotoSlotCount(selectedItem?.kib || 'B', jumlahUnit);
    setForm(prev => ({ ...prev, jumlahUnit, fotoUnits: normalizeFotoUnits(prev, photoSlots) }));
  };

  const handleJumlahUnitBlur = () => {
    if (!form.jumlahUnit) {
      const photoSlots = getPhotoSlotCount(selectedItem?.kib || 'B', 1);
      setForm(prev => ({ ...prev, jumlahUnit: 1, fotoUnits: normalizeFotoUnits(prev, photoSlots) }));
    }
  };

  const handleNomorSeriChange = (unitIdx: number, nomorSeri: string) => {
    setForm(prev => {
      const units = [...(prev.fotoUnits || [])];
      while (units.length <= unitIdx) units.push({});
      units[unitIdx] = { ...units[unitIdx], nomorSeri };
      return { ...prev, fotoUnits: units };
    });
  };

  const handleUnitKondisiChange = (unitIdx: number, kondisi: KondisiAset) => {
    setForm(prev => {
      const units = [...(prev.fotoUnits || [])];
      while (units.length <= unitIdx) units.push({});
      units[unitIdx] = { ...units[unitIdx], kondisi };
      return { ...prev, fotoUnits: units };
    });
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      const existing = opnameByRefId.get(selectedItem.id);
      // ID deterministik berdasarkan refId (bukan Date.now()) - supaya kalau item yang sama
      // disimpan ulang di kondisi cache lokal sempat basi, tetap menimpa dokumen yang sama
      // di Firestore, bukan membuat dokumen duplikat baru.
      const jumlahUnit = Math.max(1, form.jumlahUnit || 1);
      const photoSlots = getPhotoSlotCount(selectedItem.kib, jumlahUnit);
      const fotoUnits = normalizeFotoUnits(form, photoSlots).slice(0, photoSlots);
      // Kalau ada lebih dari 1 unit dan tiap unit punya pilihan kondisi sendiri, kondisi
      // baris/entry keseluruhan diambil dari yang paling parah di antara semua unit.
      const isMultiUnitKondisi = selectedItem.kib !== 'E' && photoSlots > 1;
      const kondisi = isMultiUnitKondisi
        ? worstKondisi(fotoUnits.map(u => u.kondisi), form.kondisi || 'Baik')
        : (form.kondisi || 'Baik');
      const entry: OpnameEntry = {
        id: existing?.id || `OPN-${selectedItem.id}`,
        refId: selectedItem.id,
        kib: selectedItem.kib,
        namaBarang: selectedItem.nama,
        kodeBarang: selectedItem.kode,
        noRegister: selectedItem.register,
        tanggalOpname: new Date().toISOString().slice(0, 10),
        ditemukan: form.ditemukan || 'Ya',
        statusPenguasaan: form.statusPenguasaan || 'Digunakan',
        kondisi,
        kodeStiker: form.kodeStiker || '',
        jumlahUnit,
        fotoUnits,
        keterangan: form.keterangan || '',
        petugas: activeOperator,
        updatedAt: new Date().toISOString(),
        ukuranCC: form.ukuranCC || undefined,
        penggunaan: form.penggunaan || undefined,
        satuan: form.satuan || undefined,
        luasLantai: form.luasLantai ?? undefined,
        luasTanahDokumen: form.luasTanahDokumen ?? undefined,
        nomorKodeTanah: form.nomorKodeTanah || undefined,
        hargaSatuan: form.hargaSatuan ?? undefined,
        spesifikasi: form.spesifikasi || undefined,
        merk: form.merk || undefined,
      };
      await onSaveOpnameEntry(entry);
      setSelectedItem(null);
      setForm({});
    } catch (e) {
      console.error('Gagal menyimpan data opname:', e);
      alert('Gagal menyimpan ke server - kemungkinan koneksi internet terputus. Data BELUM tersimpan, silakan periksa koneksi lalu tekan Simpan lagi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    const existing = opnameByRefId.get(selectedItem.id);
    if (!existing) return;
    if (!confirm(`Hapus catatan opname untuk "${selectedItem.nama}"?`)) return;
    setIsSaving(true);
    try {
      await onDeleteOpnameEntry(existing.id);
      setSelectedItem(null);
      setForm({});
    } catch (e) {
      console.error('Gagal menghapus data opname:', e);
      alert('Gagal menghapus di server - kemungkinan koneksi internet terputus. Coba lagi setelah koneksi stabil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Ringkasan Progress */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
              <ClipboardCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Opname Fisik BMD 2026</h2>
              <p className="text-xs text-slate-500">Daftar barang mengacu ke data RESMI PROVINSI (rptrekapkib_b/c/e.xls) - bukan daftar aset aplikasi.</p>
            </div>
          </div>
          <button
            onClick={handleExportLaporan}
            disabled={isExportingLaporan || totalItem === 0}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-teal-600/20 shrink-0"
            title="Unduh laporan sensus KIB B/C/E (Excel + surat + foto) sesuai format resmi, dalam satu file ZIP"
          >
            {isExportingLaporan ? <Loader2 size={14} className="animate-spin" /> : <FileArchive size={14} />}
            {isExportingLaporan ? 'Menyiapkan Laporan...' : 'Unduh Laporan Sensus (ZIP)'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${persenSelesai}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{totalSudah} / {totalItem} ({persenSelesai}%)</span>
        </div>
        {totalItem === 0 && (
          <p className="text-[11px] text-amber-600 font-semibold mt-2">
            Daftar referensi provinsi belum dimuat ke database. Hubungi admin untuk mengimpor data KIB B/C/E.
          </p>
        )}
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs space-y-2.5">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama barang, kode, register, atau keterangan..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['Semua', 'B', 'C', 'E'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilterKib(k)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                filterKib === k ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {k === 'Semua' ? 'Semua KIB' : `KIB ${k}`}
            </button>
          ))}
          <span className="w-px bg-slate-200 mx-1" />
          {(['Semua', 'Belum', 'Sudah'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                filterStatus === s ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterKondisi}
            onChange={(e) => setFilterKondisi(e.target.value as 'Semua' | KondisiAset)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
          >
            <option value="Semua">Semua Kondisi</option>
            <option value="Baik">Baik</option>
            <option value="Rusak Ringan">Rusak Ringan</option>
            <option value="Rusak Berat">Rusak Berat</option>
          </select>
          <select
            value={filterTahun}
            onChange={(e) => setFilterTahun(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
          >
            <option value="Semua">Semua Tahun</option>
            {availableTahun.map(t => (
              <option key={t} value={t}>{t === '-' ? 'Tahun Kosong' : t}</option>
            ))}
          </select>
          <select
            value={filterDitemukan}
            onChange={(e) => setFilterDitemukan(e.target.value as 'Semua' | 'Ya' | 'Tidak')}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 cursor-pointer"
          >
            <option value="Semua">Ditemukan/Tidak (Semua)</option>
            <option value="Ya">Ditemukan</option>
            <option value="Tidak">Tidak Ditemukan</option>
          </select>
        </div>
      </div>

      {/* List Barang */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <ListChecks size={28} className="text-slate-300" />
            Tidak ada barang yang cocok dengan pencarian/filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
            {filteredItems.slice(0, 300).map(item => {
              const done = opnameByRefId.get(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => openForm(item)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 transition text-left cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${!done ? 'bg-slate-300' : done.ditemukan === 'Tidak' ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black border bg-slate-50 text-slate-500 border-slate-200 shrink-0">{item.kib}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.nama}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {item.no ? `No. ${item.no} · ` : ''}{item.kode} · Reg. {item.register}{item.tahun ? ` · ${item.tahun}` : ''}
                    </p>
                    {item.keterangan && (
                      <p className="text-[10px] text-orange-600 font-semibold truncate italic">{item.keterangan}</p>
                    )}
                  </div>
                  {done ? (
                    done.ditemukan === 'Tidak' ? (
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black border shrink-0 bg-slate-100 text-slate-500 border-slate-300">
                        Tidak Ditemukan
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black border shrink-0 ${
                        done.kondisi === 'Baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        done.kondisi === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {done.kondisi}
                      </span>
                    )
                  ) : (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black border bg-slate-50 text-slate-400 border-slate-200 shrink-0">
                      Belum
                    </span>
                  )}
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              );
            })}
            {filteredItems.length > 300 && (
              <div className="p-3 text-center text-[11px] text-slate-400 font-semibold">
                Menampilkan 300 dari {filteredItems.length} hasil - persempit pencarian untuk melihat lainnya.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Form Opname */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 relative border border-slate-100 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => { setSelectedItem(null); setForm({}); }}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-1 text-teal-800 font-extrabold text-base">
                <div className="p-2 bg-teal-100 text-teal-800 rounded-xl">
                  <ClipboardCheck size={20} />
                </div>
                <h3>Isi Data Opname</h3>
              </div>
              <p className="text-xs text-slate-600 mb-1">
                <strong className="text-slate-900">{selectedItem.nama}</strong>
              </p>
              <p className="text-[11px] text-slate-400 font-mono mb-4">
                {KIB_LABEL[selectedItem.kib]}{selectedItem.no ? ` · No. ${selectedItem.no}` : ''} · Kode {selectedItem.kode} · Reg. {selectedItem.register}
              </p>
              {selectedItem.keterangan && (
                <p className="text-[11px] text-slate-500 italic mb-2 bg-slate-50 rounded-lg p-2">
                  Keterangan provinsi: {selectedItem.keterangan}
                </p>
              )}

              {/* Info tambahan dari data provinsi - supaya operator tahu konteksnya saat cek fisik */}
              {(() => {
                const infoRows: { label: string; value: string }[] = [];
                if (selectedItem.kib === 'C') {
                  if (selectedItem.letakLokasi) infoRows.push({ label: 'Letak/Lokasi', value: selectedItem.letakLokasi });
                  if (selectedItem.kondisiBangunan) infoRows.push({ label: 'Kondisi Bangunan (Admin)', value: selectedItem.kondisiBangunan });
                  if (selectedItem.bertingkat) infoRows.push({ label: 'Bertingkat/Tidak', value: selectedItem.bertingkat });
                  if (selectedItem.konstruksi) infoRows.push({ label: 'Konstruksi', value: selectedItem.konstruksi });
                  if (selectedItem.statusTanah) infoRows.push({ label: 'Status Tanah', value: selectedItem.statusTanah });
                  if (selectedItem.dokumenNomor || selectedItem.dokumenTanggal) {
                    infoRows.push({ label: 'Dokumen Gedung', value: [selectedItem.dokumenNomor, selectedItem.dokumenTanggal].filter(Boolean).join(' · ') });
                  }
                }
                if (selectedItem.kib === 'E' && selectedItem.judulPencipta) {
                  infoRows.push({ label: 'Judul/Pencipta', value: selectedItem.judulPencipta });
                }
                if (selectedItem.asalUsul) infoRows.push({ label: 'Asal Usul', value: selectedItem.asalUsul });
                if (selectedItem.harga) infoRows.push({ label: 'Harga Perolehan', value: fmtHargaPerolehan(selectedItem.harga) });
                if (infoRows.length === 0) return null;
                return (
                  <div className="mb-4 bg-slate-50 rounded-lg p-2.5 space-y-1">
                    {infoRows.map(row => (
                      <p key={row.label} className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-600">{row.label}:</span> {row.value}
                      </p>
                    ))}
                  </div>
                );
              })()}

              {/* Ditemukan */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Ditemukan?</label>
                <div className="flex gap-2">
                  {(['Ya', 'Tidak'] as const).map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setForm({ ...form, ditemukan: v })}
                      className={`flex-1 py-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        form.ditemukan === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {form.ditemukan === 'Tidak' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-3">
                  Aset ditandai tidak ditemukan - kondisi, foto, dan data lain tidak perlu diisi. Boleh tambahkan catatan di bawah kalau perlu, lalu Simpan.
                </p>
              )}

              {form.ditemukan !== 'Tidak' && (
              <>
              {/* Status Penguasaan */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Status Penguasaan</label>
                <select
                  value={form.statusPenguasaan || 'Digunakan'}
                  onChange={(e) => setForm({ ...form, statusPenguasaan: e.target.value as StatusPenguasaan })}
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  {STATUS_PENGUASAAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Kondisi - kalau lebih dari 1 unit, kondisi diisi per unit di bawah (bisa beda-beda) */}
              {selectedItem.kib !== 'E' && getPhotoSlotCount(selectedItem.kib, form.jumlahUnit || 1) > 1 ? (
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-3">
                  Ada lebih dari 1 unit - kondisi diisi untuk masing-masing unit di bagian foto di bawah, karena kondisinya bisa berbeda-beda.
                </p>
              ) : (
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Kondisi Saat Ini</label>
                  <div className="flex gap-2">
                    {(['Baik', 'Rusak Ringan', 'Rusak Berat'] as KondisiAset[]).map(k => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setForm({ ...form, kondisi: k })}
                        className={`flex-1 py-2 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
                          form.kondisi === k ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Merek/Type - khusus KIB B, tampilkan & bisa dikoreksi */}
              {selectedItem.kib === 'B' && (
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Merek/Type</label>
                  <input
                    type="text"
                    value={form.merk || ''}
                    onChange={(e) => setForm({ ...form, merk: e.target.value })}
                    placeholder="Contoh: Epson, Acer, Lokal"
                    className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    {selectedItem.merk ? 'Terisi otomatis dari data provinsi - koreksi kalau salah atau berbeda dengan fisiknya.' : 'Data provinsi kosong - isi merek/tipe sesuai fisik barang.'}
                  </p>
                </div>
              )}

              {/* Kode Stiker */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Kode Stiker (opsional)</label>
                <input
                  type="text"
                  value={form.kodeStiker || ''}
                  onChange={(e) => setForm({ ...form, kodeStiker: e.target.value })}
                  placeholder={`Contoh: ${selectedItem.kib}/${selectedItem.register}/1/B/${selectedItem.tahun || '2020'}`}
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Kolom wajib format resmi yang tidak ada di data provinsi - diisi manual */}
              {selectedItem.kib === 'B' && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Data Tambahan untuk Laporan Resmi (kosong di data provinsi)</p>
                  <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Ukuran/CC</label>
                      <input
                        type="text"
                        value={form.ukuranCC || ''}
                        onChange={(e) => setForm({ ...form, ukuranCC: e.target.value })}
                        placeholder="Contoh: 45x35 cm"
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Satuan</label>
                      <input
                        type="text"
                        list="satuan-options"
                        value={form.satuan || ''}
                        onChange={(e) => setForm({ ...form, satuan: e.target.value })}
                        placeholder="Contoh: Unit"
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                      <datalist id="satuan-options">
                        <option value="Unit" />
                        <option value="Buah" />
                        <option value="Set" />
                        <option value="Paket" />
                        <option value="Pasang" />
                        <option value="Buku" />
                      </datalist>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Penggunaan</label>
                    <input
                      type="text"
                      value={form.penggunaan || ''}
                      onChange={(e) => setForm({ ...form, penggunaan: e.target.value })}
                      placeholder="Contoh: Digunakan untuk KBM"
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {selectedItem.kib === 'C' && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Data Tambahan untuk Laporan Resmi (kosong di data provinsi)</p>
                  <div className="grid grid-cols-2 gap-2.5 mb-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Luas Lantai Bangunan (M2)</label>
                      <input
                        type="number"
                        value={form.luasLantai ?? ''}
                        onChange={(e) => setForm({ ...form, luasLantai: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Contoh: 120"
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Luas Tanah - Dokumen (M2)</label>
                      <input
                        type="number"
                        value={form.luasTanahDokumen ?? ''}
                        onChange={(e) => setForm({ ...form, luasTanahDokumen: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Contoh: 500"
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nomor Kode Tanah</label>
                      <input
                        type="text"
                        value={form.nomorKodeTanah || ''}
                        onChange={(e) => setForm({ ...form, nomorKodeTanah: e.target.value })}
                        placeholder="Contoh: 15.03.02.01.0001"
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Harga Satuan (Rp)</label>
                      <input
                        type="number"
                        value={form.hargaSatuan ?? ''}
                        onChange={(e) => setForm({ ...form, hargaSatuan: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Contoh: 519321250"
                        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedItem.kib === 'E' && (
                <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-2">Data Tambahan untuk Laporan Resmi (kosong di data provinsi)</p>
                  <div className="mb-2.5">
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Spesifikasi</label>
                    <input
                      type="text"
                      value={form.spesifikasi || ''}
                      onChange={(e) => setForm({ ...form, spesifikasi: e.target.value })}
                      placeholder="Contoh: Cover keras, 250 halaman"
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Penggunaan</label>
                    <input
                      type="text"
                      value={form.penggunaan || ''}
                      onChange={(e) => setForm({ ...form, penggunaan: e.target.value })}
                      placeholder="Contoh: Koleksi Perpustakaan"
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>
              )}

              {/* Jumlah Unit Fisik */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Jumlah Unit Fisik</label>
                <input
                  type="number"
                  min={1}
                  max={MAX_JUMLAH_UNIT}
                  value={form.jumlahUnit ?? ''}
                  onChange={(e) => handleJumlahUnitChange(e.target.value)}
                  onBlur={handleJumlahUnitBlur}
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                {selectedItem.kib === 'E' ? (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Untuk buku, isi jumlah kopi/eksemplar judul ini. Tidak perlu foto satu-satu - cukup 1 foto mewakili semua kopi di bawah.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Kalau 1 baris data ini mewakili beberapa barang fisik sekaligus (mis. "...Jumlah Barang 3..." di keterangan), isi sesuai jumlahnya - tiap unit butuh 2 foto sendiri-sendiri
                    {(form.jumlahUnit || 1) > MAX_PHOTO_SLOTS ? ` (foto dibatasi ${MAX_PHOTO_SLOTS} slot pertama supaya data tidak kegedean).` : '.'}
                  </p>
                )}
              </div>

              {/* Foto per Unit Fisik */}
              {Array.from({ length: getPhotoSlotCount(selectedItem.kib, form.jumlahUnit || 1) }, (_, unitIdx) => {
                const unit = form.fotoUnits?.[unitIdx] || {};
                return (
                  <div key={unitIdx} className="mb-3">
                    {selectedItem.kib === 'E' && (form.jumlahUnit || 1) > 1 && (
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1.5">Foto Mewakili Semua Kopi ({form.jumlahUnit} eksemplar)</p>
                    )}
                    {selectedItem.kib !== 'E' && (form.jumlahUnit || 1) > 1 && (
                      <>
                        <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1.5">Unit {unitIdx + 1} dari {form.jumlahUnit}</p>
                        <div className="mb-2">
                          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Kondisi Unit Ini</label>
                          <div className="flex gap-1.5">
                            {(['Baik', 'Rusak Ringan', 'Rusak Berat'] as KondisiAset[]).map(k => (
                              <button
                                key={k}
                                type="button"
                                onClick={() => handleUnitKondisiChange(unitIdx, k)}
                                className={`flex-1 py-1.5 rounded-lg border text-[9.5px] font-bold transition cursor-pointer ${
                                  (unit.kondisi || 'Baik') === k ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500'
                                }`}
                              >
                                {k}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {selectedItem.kib === 'B' && (
                      <div className="mb-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nomor Seri/Pabrik (wajib untuk alat elektronik)</label>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            value={unit.nomorSeri || ''}
                            onChange={(e) => handleNomorSeriChange(unitIdx, e.target.value)}
                            placeholder="Contoh: SN-2024XJ0012345"
                            className="flex-1 min-w-0 text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                          />
                          <button
                            type="button"
                            onClick={() => setScanUnitIdx(unitIdx)}
                            title="Scan barcode nomor seri dengan kamera"
                            className="shrink-0 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition flex items-center justify-center cursor-pointer"
                          >
                            <ScanBarcode size={18} />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Scan hanya berhasil jika stiker alat punya barcode. Kalau tidak ada, ketik manual.</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2.5">
                      {([1, 2] as const).map(slot => {
                        const val = slot === 1 ? unit.foto1 : unit.foto2;
                        const isUploading = isUploadingFoto?.unit === unitIdx && isUploadingFoto?.slot === slot;
                        return (
                          <div key={slot}>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-1">Foto {slot} {slot === 1 ? '(Tampak Depan)' : '(Kondisi/Detail)'}</label>
                            {isUploading ? (
                              <div className="w-full aspect-4/3 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                                <Loader2 size={22} className="animate-spin text-teal-500" />
                              </div>
                            ) : val ? (
                              <div className="relative w-full aspect-4/3 rounded-xl overflow-hidden border border-slate-200">
                                <img
                                  src={val}
                                  alt={`Foto ${slot}`}
                                  onClick={() => setZoomFoto({ src: val, label: `Unit ${unitIdx + 1} - Foto ${slot} - ${selectedItem.nama}` })}
                                  className="w-full h-full object-cover cursor-zoom-in"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFoto(unitIdx, slot)}
                                  className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md transition z-10 cursor-pointer"
                                  title="Hapus foto"
                                >
                                  <X size={12} />
                                </button>
                                <div className="absolute bottom-0 left-0 right-0 flex items-center gap-1 p-1 bg-slate-900/60">
                                  <label className="flex-1 py-1 bg-white/90 hover:bg-white text-slate-700 rounded flex items-center justify-center cursor-pointer transition" title="Ganti dari Galeri">
                                    <FolderOpen size={11} />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleFotoChange(unitIdx, slot, e.target.files?.[0] || null)}
                                    />
                                  </label>
                                  <label className="flex-1 py-1 bg-white/90 hover:bg-white text-slate-700 rounded flex items-center justify-center cursor-pointer transition" title="Ganti dengan Kamera">
                                    <Camera size={11} />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      onChange={(e) => handleFotoChange(unitIdx, slot, e.target.files?.[0] || null)}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full aspect-4/3 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 p-2 bg-slate-50">
                                <Camera size={18} className="text-slate-300" />
                                <div className="flex items-center gap-1.5 w-full">
                                  <label className="flex-1 py-1.5 px-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-[9.5px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition border border-slate-200" title="Pilih dari Galeri / Folder HP">
                                    <FolderOpen size={11} className="shrink-0 text-slate-500" />
                                    <span>Galeri</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => handleFotoChange(unitIdx, slot, e.target.files?.[0] || null)}
                                    />
                                  </label>
                                  <label className="flex-1 py-1.5 px-1 bg-teal-600 hover:bg-teal-700 text-white text-[9.5px] font-bold rounded-lg flex items-center justify-center gap-1 cursor-pointer transition shadow-xs" title="Ambil foto langsung dengan Kamera HP">
                                    <Camera size={11} className="shrink-0" />
                                    <span>Kamera</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      className="hidden"
                                      onChange={(e) => handleFotoChange(unitIdx, slot, e.target.files?.[0] || null)}
                                    />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </>
              )}

              {/* Keterangan */}
              <div className="mb-5">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Keterangan Tambahan (opsional)</label>
                <textarea
                  value={form.keterangan || ''}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan saat opname..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                {opnameByRefId.has(selectedItem.id) ? (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleDelete}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 size={13} /> Hapus
                  </button>
                ) : <div />}
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => { setSelectedItem(null); setForm({}); }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-2 shadow-md shadow-teal-600/15"
                  >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    <span>Simpan</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Zoom Foto */}
      <AnimatePresence>
        {zoomFoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomFoto(null)}
            className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center z-[60] p-4 cursor-zoom-out"
          >
            <button
              type="button"
              onClick={() => setZoomFoto(null)}
              className="absolute right-4 top-4 p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition cursor-pointer"
            >
              <X size={20} />
            </button>
            <img
              src={zoomFoto.src}
              alt={zoomFoto.label}
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl cursor-default"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scanner Barcode untuk Nomor Seri */}
      <QRScanner
        isOpen={scanUnitIdx !== null}
        onClose={() => setScanUnitIdx(null)}
        asets={[]}
        peminjamans={[]}
        onQuickReturn={async () => {}}
        actionType="aset_form"
        onSuccessCallback={(code) => {
          if (scanUnitIdx !== null) handleNomorSeriChange(scanUnitIdx, code);
          setScanUnitIdx(null);
        }}
      />
    </div>
  );
}
