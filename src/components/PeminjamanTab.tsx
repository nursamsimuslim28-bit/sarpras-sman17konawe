import React, { useState } from 'react';
import { Aset, Peminjaman, PengaturanSekolah } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Plus, CheckCircle, Clock, Calendar, User, Info, X, Camera } from 'lucide-react';

interface PeminjamanTabProps {
  peminjamans: Peminjaman[];
  asets: Aset[];
  pengaturan: PengaturanSekolah;
  onSavePeminjaman: (peminjaman: Peminjaman) => Promise<void>;
  onOpenScanner: (actionType: 'loan_form', callback?: (code: string) => void) => void;
}

export default function PeminjamanTab({
  peminjamans,
  asets,
  pengaturan,
  onSavePeminjaman,
  onOpenScanner
}: PeminjamanTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Dipinjam' | 'Kembali'>('Semua');

  // New loan form state
  const [newLoan, setNewLoan] = useState<Partial<Peminjaman>>({
    asetId: '',
    namaAset: '',
    namaPeminjam: '',
    jabatanPeminjam: 'Guru',
    tanggalPinjam: new Date().toISOString().split('T')[0],
    tanggalTargetKembali: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 2 days
    jumlahPinjam: 1,
    keterangan: ''
  });

  const handleReturnItem = async (loan: Peminjaman) => {
    const updated: Peminjaman = {
      ...loan,
      status: 'Kembali',
      tanggalKembaliAktual: new Date().toISOString().split('T')[0]
    };
    await onSavePeminjaman(updated);
  };

  // Helper untuk menghitung stok fisik yang benar-benar tersedia (Jumlah total aset - sedang dipinjam aktif)
  const getAvailableStock = (asetId: string, excludeLoanId?: string): number => {
    const targetAset = asets.find(a => a.id === asetId);
    if (!targetAset || targetAset.kondisi === 'Dihapuskan') return 0;
    
    // Hitung total unit yang sedang berstatus 'Dipinjam'
    const sedangDipinjam = peminjamans
      .filter(p => p.asetId === asetId && p.status === 'Dipinjam' && p.id !== excludeLoanId)
      .reduce((sum, p) => sum + (p.jumlahPinjam || 1), 0);

    return Math.max(0, targetAset.jumlah - sedangDipinjam);
  };

  const handleCreateLoanClick = () => {
    // Cari nomor urut pinjaman tertinggi untuk mencegah tabrakan ID
    const maxSeq = peminjamans.reduce((max, p) => {
      const parts = p.id.split('-');
      const num = parseInt(parts[parts.length - 1] || '0', 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    const nextLoanId = `PIN-2026-${String(Math.max(peminjamans.length + 1, maxSeq + 1)).padStart(4, '0')}`;

    // Aset yang masih punya stok fisik tersedia
    const availableAsets = asets.filter(a => a.kondisi !== 'Dihapuskan' && getAvailableStock(a.id) > 0);
    const firstAset = availableAsets[0] || asets.find(a => a.kondisi !== 'Dihapuskan');

    setNewLoan({
      id: nextLoanId,
      asetId: firstAset?.id || '',
      namaAset: firstAset?.nama || '',
      namaPeminjam: '',
      jabatanPeminjam: 'Guru',
      tanggalPinjam: new Date().toISOString().split('T')[0],
      tanggalTargetKembali: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      jumlahPinjam: 1,
      keterangan: ''
    });
    setIsModalOpen(true);
  };

  const handleAsetChangeInForm = (asetId: string) => {
    const selected = asets.find(a => a.id === asetId);
    if (selected) {
      setNewLoan(prev => ({
        ...prev,
        asetId: selected.id,
        namaAset: selected.nama
      }));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoan.id || !newLoan.asetId || !newLoan.namaPeminjam || !newLoan.namaAset) return;

    const finalJumlahPinjam = typeof newLoan.jumlahPinjam === 'string' ? parseInt(newLoan.jumlahPinjam) || 1 : newLoan.jumlahPinjam || 1;

    // Verifikasi stok riil tersedia (memperhitungkan pinjaman aktif lain)
    const availableStock = getAvailableStock(newLoan.asetId, newLoan.id);
    const targetAset = asets.find(a => a.id === newLoan.asetId);

    if (availableStock < finalJumlahPinjam) {
      alert(`Stok tidak mencukupi!\nStok fisik yang tersedia saat ini: ${availableStock} ${targetAset?.satuan || 'Unit'}\n(Sebagian unit sedang dipinjam oleh pihak lain atau kuantitas telah habis).`);
      return;
    }

    try {
      const loan: Peminjaman = {
        ...(newLoan as Peminjaman),
        jumlahPinjam: finalJumlahPinjam,
        status: 'Dipinjam'
      };
      await onSavePeminjaman(loan);
      setIsModalOpen(false);
    } catch (e) {
      alert('Gagal mencatatkan peminjaman.');
    }
  };

  const handleScanBarcodeForLoan = () => {
    onOpenScanner('loan_form', (code) => {
      const matched = asets.find(a => a.id === code && a.kondisi !== 'Dihapuskan');
      if (matched) {
        setNewLoan(prev => ({
          ...prev,
          asetId: matched.id,
          namaAset: matched.nama
        }));
      } else {
        alert(`Aset dengan kode ${code} tidak terdaftar atau telah dihapuskan.`);
      }
    });
  };

  // Filtered list
  const filteredLoans = peminjamans.filter(p => {
    const matchSearch =
      p.namaAset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.namaPeminjam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.asetId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = filterStatus === 'Semua' || p.status === filterStatus;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6" id="peminjaman-tab">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <BookOpen size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Sirkulasi & Peminjaman Sarpras</h2>
            <p className="text-xs text-slate-500">Mencatat pertanggungjawaban peminjaman sarana belajar sekolah</p>
          </div>
        </div>
        <button
          onClick={handleCreateLoanClick}
          className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
        >
          <Plus size={16} />
          Buat Peminjaman Baru
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        <div className="flex-1 relative w-full">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama peminjam, nama aset, atau kode barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-stretch md:self-auto">
          {['Semua', 'Dipinjam', 'Kembali'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === status
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Borrowing Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <th className="px-6 py-3.5">ID Transaksi</th>
                <th className="px-6 py-3.5">Nama Barang & Barcode</th>
                <th className="px-6 py-3.5">Peminjam</th>
                <th className="px-6 py-3.5">Tanggal Pinjam</th>
                <th className="px-6 py-3.5">Target Pengembalian</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-500">
                      {loan.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800">{loan.namaAset}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{loan.asetId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1">
                        <User size={12} className="text-slate-400" />
                        {loan.namaPeminjam}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{loan.jabatanPeminjam}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {loan.tanggalPinjam}
                    </td>
                    <td className="px-6 py-4">
                      {loan.status === 'Dipinjam' ? (
                        <div className="font-semibold text-rose-500 flex items-center gap-1">
                          <Calendar size={12} />
                          {loan.tanggalTargetKembali}
                        </div>
                      ) : (
                        <div className="text-slate-500 font-medium">
                          Kembali: {loan.tanggalKembaliAktual}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-xs ${
                        loan.status === 'Dipinjam'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {loan.status === 'Dipinjam' ? <Clock size={10} /> : <CheckCircle size={10} />}
                        {loan.status === 'Dipinjam' ? 'Sedang Dipinjam' : 'Sudah Kembali'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {loan.status === 'Dipinjam' ? (
                        <button
                          onClick={() => handleReturnItem(loan)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                        >
                          Kembalikan
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium italic">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    <Info size={36} className="text-slate-300 mx-auto mb-2" />
                    Belum ada sirkulasi peminjaman yang terdaftar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Loan Modal Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 relative border border-slate-100"
            >
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <h2 className="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                Catat Peminjaman Barang
              </h2>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                
                {/* Select Asset */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Pilih Barang Sarpras</label>
                    <button
                      type="button"
                      onClick={handleScanBarcodeForLoan}
                      className="text-[10px] text-indigo-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Camera size={12} />
                      Scan Barcode Kamera
                    </button>
                  </div>
                  <select
                    value={newLoan.asetId || ''}
                    onChange={(e) => handleAsetChangeInForm(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    required
                  >
                    {asets.filter(a => a.kondisi !== 'Dihapuskan').map(a => {
                      const avail = getAvailableStock(a.id);
                      return (
                        <option key={a.id} value={a.id} disabled={avail <= 0}>
                          {a.nama} (Stok Fisik Tersedia: {avail}/{a.jumlah} {a.satuan}) - {a.id} {avail <= 0 ? '[HABIS DIPINJAM]' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Borrower Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Peminjam</label>
                  <input
                    type="text"
                    value={newLoan.namaPeminjam || ''}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, namaPeminjam: e.target.value }))}
                    placeholder="Nama Guru, Siswa, atau Staf"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Borrower Role */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan / Peran</label>
                    <select
                      value={newLoan.jabatanPeminjam || 'Guru'}
                      onChange={(e) => setNewLoan(prev => ({ ...prev, jabatanPeminjam: e.target.value as any }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    >
                      <option value="Guru">Guru / Tenaga Pengajar</option>
                      <option value="Siswa">Siswa / Murid</option>
                      <option value="Staf TU">Staf Tata Usaha</option>
                      <option value="Lainnya">Staf Lainnya</option>
                    </select>
                  </div>

                  {/* Quantity to Borrow */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Unit Dipinjam</label>
                    <input
                      type="number"
                      min={1}
                      value={newLoan.jumlahPinjam === undefined || newLoan.jumlahPinjam === null ? '' : newLoan.jumlahPinjam}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewLoan(prev => ({
                          ...prev,
                          jumlahPinjam: val === '' ? '' : parseInt(val) || 0
                        }));
                      }}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Tanggal Pinjam */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Pinjam</label>
                    <input
                      type="date"
                      value={newLoan.tanggalPinjam || ''}
                      onChange={(e) => setNewLoan(prev => ({ ...prev, tanggalPinjam: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>

                  {/* Tanggal Target Kembali */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Dikembalikan</label>
                    <input
                      type="date"
                      value={newLoan.tanggalTargetKembali || ''}
                      onChange={(e) => setNewLoan(prev => ({ ...prev, tanggalTargetKembali: e.target.value }))}
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Keterangan */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Keperluan</label>
                  <textarea
                    rows={2}
                    value={newLoan.keterangan || ''}
                    onChange={(e) => setNewLoan(prev => ({ ...prev, keterangan: e.target.value }))}
                    placeholder="Tulis alasan peminjaman dsb."
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl cursor-pointer shadow-sm shadow-indigo-600/10"
                  >
                    Catat & Pinjamkan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
