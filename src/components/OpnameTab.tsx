import React, { useState, useMemo } from 'react';
import { OpnameEntry, OpnameFotoUnit, OpnameMasterItem, KondisiAset, StatusPenguasaan, PengaturanSekolah } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Camera, Check, Loader2, ClipboardCheck, ChevronRight,
  Trash2, ListChecks, FileArchive, FolderOpen
} from 'lucide-react';
import { exportLaporanOpnameZip } from '../utils/opnameLaporanExport';

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

// Coba tebak jumlah unit fisik dari data provinsi, dua pola yang umum ditemukan:
// 1. Rentang nomor register, mis. register "0001 s/d 0005" -> 5 unit
// 2. Kalimat di keterangan, mis. "...Jumlah Barang 3 Harga Satuan..." -> 3 unit
function guessJumlahUnit(item: Pick<OpnameMasterItem, 'register' | 'keterangan'>): number {
  if (item.register) {
    const rangeMatch = item.register.match(/(\d+)\s*s\s*\/?\s*d\s*(\d+)/i);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (end >= start && (end - start + 1) <= 100) return end - start + 1;
    }
  }
  if (item.keterangan) {
    const match = item.keterangan.match(/jumlah\s*(?:barang|unit)?\s*[:=]?\s*(\d+)/i);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > 0 && n <= 100) return n;
    }
  }
  return 1;
}

function normalizeFotoUnits(entry: Partial<OpnameEntry> | undefined, jumlahUnit: number): OpnameFotoUnit[] {
  let units: OpnameFotoUnit[] = entry?.fotoUnits ? [...entry.fotoUnits] : [];
  if (units.length === 0 && (entry?.foto1 || entry?.foto2)) {
    units = [{ foto1: entry.foto1, foto2: entry.foto2 }];
  }
  while (units.length < jumlahUnit) units.push({});
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
  const [selectedItem, setSelectedItem] = useState<OpnameMasterItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState<{ unit: number; slot: 1 | 2 } | null>(null);
  const [isExportingLaporan, setIsExportingLaporan] = useState(false);
  const [zoomFoto, setZoomFoto] = useState<{ src: string; label: string } | null>(null);

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
    return list;
  }, [opnameMasterList, searchTerm, filterKib, filterStatus, opnameByRefId]);

  const totalItem = opnameMasterList.length;
  const totalSudah = opnameMasterList.filter(a => opnameByRefId.has(a.id)).length;
  const persenSelesai = totalItem > 0 ? Math.round((totalSudah / totalItem) * 100) : 0;

  const openForm = (item: OpnameMasterItem) => {
    const existing = opnameByRefId.get(item.id);
    const jumlahUnit = existing?.jumlahUnit || guessJumlahUnit(item);
    setSelectedItem(item);
    setForm(existing ? { ...existing, jumlahUnit, fotoUnits: normalizeFotoUnits(existing, jumlahUnit) } : {
      ditemukan: 'Ya',
      statusPenguasaan: 'Digunakan',
      kondisi: 'Baik',
      kodeStiker: '',
      keterangan: '',
      jumlahUnit,
      fotoUnits: normalizeFotoUnits(undefined, jumlahUnit),
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

  const handleJumlahUnitChange = (n: number) => {
    const jumlahUnit = Math.max(1, Math.min(100, n || 1));
    setForm(prev => ({ ...prev, jumlahUnit, fotoUnits: normalizeFotoUnits(prev, jumlahUnit) }));
  };

  const handleNomorSeriChange = (unitIdx: number, nomorSeri: string) => {
    setForm(prev => {
      const units = [...(prev.fotoUnits || [])];
      while (units.length <= unitIdx) units.push({});
      units[unitIdx] = { ...units[unitIdx], nomorSeri };
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
      const fotoUnits = normalizeFotoUnits(form, jumlahUnit).slice(0, jumlahUnit);
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
        kondisi: form.kondisi || 'Baik',
        kodeStiker: form.kodeStiker || '',
        jumlahUnit,
        fotoUnits,
        keterangan: form.keterangan || '',
        petugas: activeOperator,
        updatedAt: new Date().toISOString(),
      };
      await onSaveOpnameEntry(entry);
      setSelectedItem(null);
      setForm({});
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
                  <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black border bg-slate-50 text-slate-500 border-slate-200 shrink-0">{item.kib}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{item.nama}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {item.kode} · Reg. {item.register}{item.tahun ? ` · ${item.tahun}` : ''}
                    </p>
                    {item.keterangan && (
                      <p className="text-[10px] text-orange-600 font-semibold truncate italic">{item.keterangan}</p>
                    )}
                  </div>
                  {done ? (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black border shrink-0 ${
                      done.kondisi === 'Baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      done.kondisi === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {done.kondisi}
                    </span>
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
                {KIB_LABEL[selectedItem.kib]} · Kode {selectedItem.kode} · Reg. {selectedItem.register}
              </p>
              {selectedItem.keterangan && (
                <p className="text-[11px] text-slate-500 italic mb-4 bg-slate-50 rounded-lg p-2">
                  Keterangan provinsi: {selectedItem.keterangan}
                </p>
              )}

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

              {/* Kondisi */}
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

              {/* Jumlah Unit Fisik */}
              <div className="mb-3">
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Jumlah Unit Fisik</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={form.jumlahUnit || 1}
                  onChange={(e) => handleJumlahUnitChange(parseInt(e.target.value, 10))}
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Kalau 1 baris data ini mewakili beberapa barang fisik sekaligus (mis. "...Jumlah Barang 3..." di keterangan), isi sesuai jumlahnya - tiap unit butuh 2 foto sendiri-sendiri.
                </p>
              </div>

              {/* Foto per Unit Fisik */}
              {Array.from({ length: Math.max(1, form.jumlahUnit || 1) }, (_, unitIdx) => {
                const unit = form.fotoUnits?.[unitIdx] || {};
                return (
                  <div key={unitIdx} className="mb-3">
                    {(form.jumlahUnit || 1) > 1 && (
                      <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wide mb-1.5">Unit {unitIdx + 1} dari {form.jumlahUnit}</p>
                    )}
                    {selectedItem.kib === 'B' && (
                      <div className="mb-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-1">Nomor Seri/Pabrik (wajib untuk alat elektronik)</label>
                        <input
                          type="text"
                          value={unit.nomorSeri || ''}
                          onChange={(e) => handleNomorSeriChange(unitIdx, e.target.value)}
                          placeholder="Contoh: SN-2024XJ0012345"
                          className="w-full text-sm px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
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
    </div>
  );
}
