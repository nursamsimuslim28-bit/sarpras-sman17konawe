import React, { useState, useMemo, useRef } from 'react';
import { Aset, OpnameEntry, KondisiAset, StatusPenguasaan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, X, Camera, Check, Loader2, ClipboardCheck, ChevronRight,
  Trash2, ListChecks
} from 'lucide-react';

interface OpnameTabProps {
  asets: Aset[];
  opnameEntries: OpnameEntry[];
  activeOperator: string;
  onSaveOpnameEntry: (entry: OpnameEntry) => Promise<void>;
  onDeleteOpnameEntry: (id: string) => Promise<void>;
}

const STATUS_PENGUASAAN_OPTIONS: StatusPenguasaan[] = [
  'Digunakan', 'Dikuasai Pegawai', 'Digunakan Unit Lain', 'Dikuasai Pihak Ketiga'
];

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

export default function OpnameTab({ asets, opnameEntries, activeOperator, onSaveOpnameEntry, onDeleteOpnameEntry }: OpnameTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Sudah' | 'Belum'>('Semua');
  const [selectedAset, setSelectedAset] = useState<Aset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFoto, setIsUploadingFoto] = useState<1 | 2 | null>(null);

  const foto1Ref = useRef<HTMLInputElement>(null);
  const foto2Ref = useRef<HTMLInputElement>(null);

  const opnameByAsetId = useMemo(() => {
    const map = new Map<string, OpnameEntry>();
    opnameEntries.forEach(e => map.set(e.asetId, e));
    return map;
  }, [opnameEntries]);

  const [form, setForm] = useState<Partial<OpnameEntry>>({});

  const activeAsets = asets.filter(a => a.kondisi !== 'Dihapuskan');

  const filteredAsets = useMemo(() => {
    let list = activeAsets;
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(a =>
        a.nama.toLowerCase().includes(term) ||
        a.id.toLowerCase().includes(term) ||
        (a.merek || '').toLowerCase().includes(term)
      );
    }
    if (filterStatus === 'Sudah') {
      list = list.filter(a => opnameByAsetId.has(a.id));
    } else if (filterStatus === 'Belum') {
      list = list.filter(a => !opnameByAsetId.has(a.id));
    }
    return list;
  }, [activeAsets, searchTerm, filterStatus, opnameByAsetId]);

  const totalAset = activeAsets.length;
  const totalSudah = activeAsets.filter(a => opnameByAsetId.has(a.id)).length;
  const persenSelesai = totalAset > 0 ? Math.round((totalSudah / totalAset) * 100) : 0;

  const openForm = (aset: Aset) => {
    const existing = opnameByAsetId.get(aset.id);
    setSelectedAset(aset);
    setForm(existing ? { ...existing } : {
      ditemukan: 'Ya',
      statusPenguasaan: 'Digunakan',
      kondisi: aset.kondisi,
      kodeStiker: '',
      keterangan: '',
    });
  };

  const handleFotoChange = async (slot: 1 | 2, file: File | null) => {
    if (!file) return;
    setIsUploadingFoto(slot);
    try {
      const compressed = await compressImage(file);
      setForm(prev => ({ ...prev, [slot === 1 ? 'foto1' : 'foto2']: compressed }));
    } catch (e) {
      alert('Gagal memproses foto. Coba lagi.');
    } finally {
      setIsUploadingFoto(null);
    }
  };

  const handleSave = async () => {
    if (!selectedAset) return;
    setIsSaving(true);
    try {
      const existing = opnameByAsetId.get(selectedAset.id);
      const entry: OpnameEntry = {
        id: existing?.id || `OPN-${Date.now()}`,
        asetId: selectedAset.id,
        namaAset: selectedAset.nama,
        kodeAset: selectedAset.id,
        kategori: selectedAset.kategori,
        tanggalOpname: new Date().toISOString().slice(0, 10),
        ditemukan: form.ditemukan || 'Ya',
        statusPenguasaan: form.statusPenguasaan || 'Digunakan',
        kondisi: form.kondisi || selectedAset.kondisi,
        kodeStiker: form.kodeStiker || '',
        foto1: form.foto1,
        foto2: form.foto2,
        keterangan: form.keterangan || '',
        petugas: activeOperator,
        updatedAt: new Date().toISOString(),
      };
      await onSaveOpnameEntry(entry);
      setSelectedAset(null);
      setForm({});
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAset) return;
    const existing = opnameByAsetId.get(selectedAset.id);
    if (!existing) return;
    if (!confirm(`Hapus catatan opname untuk "${selectedAset.nama}"?`)) return;
    setIsSaving(true);
    try {
      await onDeleteOpnameEntry(existing.id);
      setSelectedAset(null);
      setForm({});
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Ringkasan Progress */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-2xs">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
            <ClipboardCheck size={22} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Opname Fisik BMD 2026</h2>
            <p className="text-xs text-slate-500">Cari barang, isi status hasil pengecekan fisik, dan ambil foto langsung dari HP.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${persenSelesai}%` }} />
          </div>
          <span className="text-xs font-bold text-slate-600 whitespace-nowrap">{totalSudah} / {totalAset} ({persenSelesai}%)</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama barang, kode, atau merek..."
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
          <div className="flex gap-2">
            {(['Semua', 'Belum', 'Sudah'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  filterStatus === s
                    ? 'bg-teal-600 border-teal-600 text-white'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List Barang */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        {filteredAsets.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
            <ListChecks size={28} className="text-slate-300" />
            Tidak ada barang yang cocok dengan pencarian/filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-50 max-h-[60vh] overflow-y-auto">
            {filteredAsets.map(aset => {
              const done = opnameByAsetId.get(aset.id);
              return (
                <button
                  key={aset.id}
                  onClick={() => openForm(aset)}
                  className="w-full flex items-center gap-3 p-3.5 hover:bg-slate-50 transition text-left cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${done ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{aset.nama}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{aset.id} · {aset.kategori} · {aset.tahunPerolehan}</p>
                  </div>
                  {done ? (
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black border ${
                      done.kondisi === 'Baik' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      done.kondisi === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {done.kondisi}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black border bg-slate-50 text-slate-400 border-slate-200">
                      Belum
                    </span>
                  )}
                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Form Opname */}
      <AnimatePresence>
        {selectedAset && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 relative border border-slate-100 shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => { setSelectedAset(null); setForm({}); }}
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
              <p className="text-xs text-slate-600 mb-4">
                <strong className="text-slate-900">{selectedAset.nama}</strong> ({selectedAset.id})
              </p>

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
                  placeholder="Contoh: B/0001/1/B/2020"
                  className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Foto 1 & 2 */}
              <div className="mb-3 grid grid-cols-2 gap-2.5">
                {([1, 2] as const).map(slot => {
                  const val = slot === 1 ? form.foto1 : form.foto2;
                  const ref = slot === 1 ? foto1Ref : foto2Ref;
                  return (
                    <div key={slot}>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-1">Foto {slot} {slot === 1 ? '(Tampak Depan)' : '(Kondisi/Detail)'}</label>
                      <input
                        ref={ref}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleFotoChange(slot, e.target.files?.[0] || null)}
                      />
                      <button
                        type="button"
                        onClick={() => ref.current?.click()}
                        className="w-full aspect-4/3 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-400 flex items-center justify-center overflow-hidden relative cursor-pointer bg-slate-50"
                      >
                        {isUploadingFoto === slot ? (
                          <Loader2 size={22} className="animate-spin text-teal-500" />
                        ) : val ? (
                          <img src={val} alt={`Foto ${slot}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-400">
                            <Camera size={20} />
                            <span className="text-[10px] font-semibold">Ambil Foto</span>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Keterangan */}
              <div className="mb-5">
                <label className="block text-[10px] font-semibold text-slate-500 mb-1">Keterangan (opsional)</label>
                <textarea
                  value={form.keterangan || ''}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={2}
                  placeholder="Catatan tambahan saat opname..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                {opnameByAsetId.has(selectedAset.id) ? (
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
                    onClick={() => { setSelectedAset(null); setForm({}); }}
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
    </div>
  );
}
