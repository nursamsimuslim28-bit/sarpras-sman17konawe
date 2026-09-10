import React, { useState } from 'react';
import { MasterRuang, DEFAULT_MASTER_RUANGS, Aset } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { DoorOpen, Plus, Trash2, Edit2, Check, X, ShieldAlert, AlertCircle, Building, Users, Search, Layers, SquareCode } from 'lucide-react';

interface MasterRuangManagerProps {
  masterRuangs: MasterRuang[];
  asets?: Aset[];
  onSaveRuang: (ruang: MasterRuang) => Promise<void>;
  onDeleteRuang: (id: string) => Promise<void>;
  onResetDefaults?: () => Promise<void>;
}

export default function MasterRuangManager({
  masterRuangs,
  asets = [],
  onSaveRuang,
  onDeleteRuang,
  onResetDefaults
}: MasterRuangManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [isEditing, setIsEditing] = useState(false);
  const [currentRuang, setCurrentRuang] = useState<Partial<MasterRuang>>({
    kategori: 'Ruang Pembelajaran',
    penanggungJawab: '',
    nipPj: '',
    idGedungKibC: '',
    namaGedungKibC: '',
    lantai: 'Lantai 1',
    kapasitas: 36,
    luasM2: undefined,
    keterangan: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter daftar aset Gedung & Bangunan (KIB C)
  const kibCGedungs = asets.filter(a => 
    a.kategori === 'KIB C (Gedung dan Bangunan)' || 
    a.kategori === 'Prasarana (Bangunan/Fasilitas)' ||
    (a.nama && a.nama.toLowerCase().includes('gedung'))
  );

  const kategoriList: MasterRuang['kategori'][] = [
    'Ruang Pembelajaran',
    'Ruang Penunjang',
    'Ruang Administrasi',
    'Fasilitas Umum',
    'Lainnya'
  ];

  const filteredRuangs = masterRuangs.filter(r => {
    const matchSearch = r.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.penanggungJawab && r.penanggungJawab.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterKategori === 'Semua' || r.kategori === filterKategori;
    return matchSearch && matchCat;
  });

  const handleOpenAdd = () => {
    const maxSeq = masterRuangs.reduce((max, r) => {
      const num = parseInt(r.id.replace(/\D/g, '') || '0', 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextId = `RNG-${String(Math.max(masterRuangs.length + 1, maxSeq + 1)).padStart(2, '0')}`;
    setCurrentRuang({
      id: nextId,
      nama: '',
      kategori: 'Ruang Pembelajaran',
      penanggungJawab: '',
      nipPj: '',
      idGedungKibC: kibCGedungs[0]?.id || '',
      namaGedungKibC: kibCGedungs[0]?.nama || '',
      lantai: 'Lantai 1',
      kapasitas: 36,
      luasM2: undefined,
      keterangan: ''
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (ruang: MasterRuang) => {
    setCurrentRuang({ ...ruang });
    setIsEditing(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRuang.nama || !currentRuang.nama.trim()) {
      alert('Nama ruangan tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    try {
      const selectedGedung = kibCGedungs.find(g => g.id === currentRuang.idGedungKibC);
      const payload: MasterRuang = {
        id: currentRuang.id || `RNG-${Date.now().toString().slice(-4)}`,
        nama: currentRuang.nama.trim(),
        kategori: currentRuang.kategori || 'Ruang Pembelajaran',
        idGedungKibC: currentRuang.idGedungKibC || undefined,
        namaGedungKibC: selectedGedung ? selectedGedung.nama : (currentRuang.namaGedungKibC || undefined),
        lantai: currentRuang.lantai || 'Lantai 1',
        penanggungJawab: currentRuang.penanggungJawab?.trim() || '-',
        nipPj: currentRuang.nipPj?.trim() || undefined,
        kapasitas: currentRuang.kapasitas ? Number(currentRuang.kapasitas) : undefined,
        luasM2: currentRuang.luasM2 ? Number(currentRuang.luasM2) : undefined,
        keterangan: currentRuang.keterangan?.trim() || ''
      };
      await onSaveRuang(payload);
      setIsEditing(false);
      setCurrentRuang({});
    } catch (err: any) {
      alert('Gagal menyimpan ruangan: ' + (err?.message || 'Terjadi kesalahan'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      await onDeleteRuang(id);
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert('Gagal menghapus ruangan: ' + (err?.message || 'Terjadi kesalahan'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Deskripsi Otoritas Admin */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-900/40">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-400/30 rounded-xl flex items-center justify-center shrink-0">
            <DoorOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Master Data Ruangan Sekolah</h2>
              <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/30 uppercase tracking-wider">
                Khusus Admin
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              Kelola daftar ruangan resmi sekolah. Petugas penginput aset akan memilih ruangan dari daftar master ini, sehingga data penempatan seragam dan tidak diketik manual.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
        >
          <Plus size={15} />
          <span>Tambah Ruangan</span>
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama ruang, kode, PJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-medium text-slate-500 shrink-0">Kategori:</span>
          <select
            value={filterKategori}
            onChange={(e) => setFilterKategori(e.target.value)}
            className="text-xs py-2 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition bg-white"
          >
            <option value="Semua">Semua Kategori</option>
            {kategoriList.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-lg shrink-0">
            Total: {filteredRuangs.length} Ruang
          </span>
        </div>
      </div>

      {/* Form Tambah/Edit Ruangan Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <DoorOpen size={18} />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {currentRuang.id && masterRuangs.some(r => r.id === currentRuang.id) ? 'Edit Master Ruangan' : 'Tambah Ruangan Baru'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kode Ruang</label>
                    <input
                      type="text"
                      value={currentRuang.id || ''}
                      onChange={(e) => setCurrentRuang(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                      placeholder="e.g. RNG-01"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Ruangan</label>
                    <select
                      value={currentRuang.kategori || 'Ruang Pembelajaran'}
                      onChange={(e) => setCurrentRuang(prev => ({ ...prev, kategori: e.target.value as any }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      required
                    >
                      {kategoriList.map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Ruangan Lengkap</label>
                  <input
                    type="text"
                    value={currentRuang.nama || ''}
                    onChange={(e) => setCurrentRuang(prev => ({ ...prev, nama: e.target.value }))}
                    placeholder="Contoh: Ruang Kelas X-A, Laboratorium Komputer 1"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Relasi Gedung KIB C & Lantai */}
                <div className="p-3 bg-indigo-50/40 border border-indigo-100 rounded-xl space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Building size={14} className="text-indigo-600" />
                    <span>Relasi Gedung KIB C (Struktur Bangunan Induk)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Gedung Induk (KIB C)</label>
                      {kibCGedungs.length > 0 ? (
                        <select
                          value={currentRuang.idGedungKibC || ''}
                          onChange={(e) => {
                            const gid = e.target.value;
                            const gd = kibCGedungs.find(x => x.id === gid);
                            setCurrentRuang(prev => ({
                              ...prev,
                              idGedungKibC: gid,
                              namaGedungKibC: gd ? gd.nama : ''
                            }));
                          }}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                        >
                          <option value="">-- Pilih Gedung KIB C Terdaftar --</option>
                          {kibCGedungs.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.nama} ({g.id})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={currentRuang.namaGedungKibC || ''}
                          onChange={(e) => setCurrentRuang(prev => ({ ...prev, namaGedungKibC: e.target.value }))}
                          placeholder="Nama Gedung (e.g. Gedung Unit Belajar A)"
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                        />
                      )}
                      <p className="text-[10px] text-slate-500 mt-0.5">Menghubungkan ruangan ke entitas KIB C Gedung</p>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Posisi Lantai</label>
                      <select
                        value={currentRuang.lantai || 'Lantai 1'}
                        onChange={(e) => setCurrentRuang(prev => ({ ...prev, lantai: e.target.value }))}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none bg-white"
                      >
                        <option value="Lantai 1">Lantai 1 (Dasar)</option>
                        <option value="Lantai 2">Lantai 2</option>
                        <option value="Lantai 3">Lantai 3</option>
                        <option value="Lantai 4">Lantai 4</option>
                        <option value="Area Terbuka / Luar Gedung">Area Terbuka / Luar Gedung</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Penanggung Jawab (PJ Ruangan)</label>
                    <input
                      type="text"
                      value={currentRuang.penanggungJawab || ''}
                      onChange={(e) => setCurrentRuang(prev => ({ ...prev, penanggungJawab: e.target.value }))}
                      placeholder="Contoh: Drs. Ahmad Dahlan"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">NIP Penanggung Jawab (KIR)</label>
                    <input
                      type="text"
                      value={currentRuang.nipPj || ''}
                      onChange={(e) => setCurrentRuang(prev => ({ ...prev, nipPj: e.target.value }))}
                      placeholder="Contoh: 19780512 200501 1 004"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Kapasitas (Orang)</label>
                    <input
                      type="number"
                      min={0}
                      value={currentRuang.kapasitas || ''}
                      onChange={(e) => setCurrentRuang(prev => ({ ...prev, kapasitas: parseInt(e.target.value) || undefined }))}
                      placeholder="Contoh: 36"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Luas Ruangan (m²)</label>
                    <input
                      type="number"
                      min={0}
                      value={currentRuang.luasM2 !== undefined ? currentRuang.luasM2 : ''}
                      onChange={(e) => setCurrentRuang(prev => ({ ...prev, luasM2: e.target.value ? Number(e.target.value) : undefined }))}
                      placeholder="Contoh: 64"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Catatan Fisik</label>
                  <input
                    type="text"
                    value={currentRuang.keterangan || ''}
                    onChange={(e) => setCurrentRuang(prev => ({ ...prev, keterangan: e.target.value }))}
                    placeholder="Contoh: Sayap Barat dekat Laboratorium IPA"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm"
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan Data Ruangan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grid Kartu Ruangan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredRuangs.map((ruang) => (
          <div
            key={ruang.id}
            className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 shadow-xs hover:shadow-sm transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                  {ruang.id}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  ruang.kategori === 'Ruang Pembelajaran' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  ruang.kategori === 'Ruang Penunjang' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                  ruang.kategori === 'Ruang Administrasi' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                  {ruang.kategori}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-800 mt-2.5 leading-snug">{ruang.nama}</h4>

              {/* Relasi Gedung & Lantai */}
              {(ruang.namaGedungKibC || ruang.lantai) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1">
                  {ruang.namaGedungKibC && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-1.5 py-0.5 rounded">
                      <Building size={10} />
                      {ruang.namaGedungKibC}
                    </span>
                  )}
                  {ruang.lantai && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                      <Layers size={10} />
                      {ruang.lantai}
                    </span>
                  )}
                  {ruang.luasM2 && (
                    <span className="text-[10px] text-slate-500 font-medium">
                      • {ruang.luasM2} m²
                    </span>
                  )}
                </div>
              )}

              <div className="mt-2 space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Users size={12} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    PJ: <strong className="text-slate-700 font-semibold">{ruang.penanggungJawab || '-'}</strong>
                    {ruang.nipPj && <span className="text-[10px] text-slate-400 ml-1 font-mono">({ruang.nipPj})</span>}
                  </span>
                </div>
                {ruang.keterangan && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Building size={11} className="shrink-0" />
                    <span className="truncate">{ruang.keterangan}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {ruang.kapasitas ? `Kapasitas: ${ruang.kapasitas} orang` : 'Standar Sarpras'}
              </span>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(ruang)}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title="Ubah Ruangan"
                >
                  <Edit2 size={13} />
                </button>
                {confirmDeleteId === ruang.id ? (
                  <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                    <button
                      onClick={() => handleDeleteConfirm(ruang.id)}
                      className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded"
                    >
                      Hapus
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="p-0.5 text-slate-500 hover:text-slate-700"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(ruang.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Hapus Ruangan"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRuangs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <DoorOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Tidak ada ruangan yang cocok dengan pencarian.</p>
          <button
            onClick={handleOpenAdd}
            className="mt-3 text-xs text-indigo-600 font-bold hover:underline"
          >
            + Tambah Ruangan Baru
          </button>
        </div>
      )}
    </div>
  );
}
