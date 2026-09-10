import React, { useState } from 'react';
import { KeluhanSarpras, PengaturanSekolah, StatusKeluhan, UrgensiKeluhan } from '../../types';
import { SULTRA_LOGO_BASE64, SCHOOL_LOGO_BASE64 } from '../../assets/logoBase64';
import { api } from '../../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, 
  MessageSquareWarning, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Download, 
  Printer, 
  Edit3, 
  Trash2, 
  FolderOpen, 
  Camera, 
  X, 
  User, 
  MapPin, 
  DollarSign, 
  Wrench, 
  Check, 
  ShieldAlert, 
  Eye,
  Send,
  Building
} from 'lucide-react';

interface Props {
  pengaturan: PengaturanSekolah;
  keluhanList: KeluhanSarpras[];
  onRefresh: () => void;
}

export default function KeluhanDoc({ pengaturan, keluhanList, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterUrgensi, setFilterUrgensi] = useState<string>('Semua');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedKeluhan, setSelectedKeluhan] = useState<KeluhanSarpras | null>(null);

  // Form State for Adding New Complaint
  const [form, setForm] = useState<Partial<KeluhanSarpras>>({
    namaPelapor: '',
    jabatanPelapor: 'Guru',
    lokasiRuang: 'Ruang Kelas',
    namaBarangFasilitas: '',
    deskripsiKerusakan: '',
    urgensi: 'Biasa',
    fotoKerusakan: ''
  });

  // Action Form State (For Wakasek Sarpras Handling)
  const [actionForm, setActionForm] = useState<Partial<KeluhanSarpras>>({
    status: 'Dalam Proses',
    tanggapanSarpras: '',
    petugasPenanggungJawab: pengaturan.namaPetugasSarpras || 'Nursamsi Muslim Widuri, S.Pd.',
    estimasiBiaya: 0,
    tanggalTindakLanjut: new Date().toISOString().split('T')[0],
    catatanHasil: ''
  });

  // Filtered List
  const filteredList = keluhanList.filter(item => {
    const matchSearch = 
      item.namaPelapor.toLowerCase().includes(search.toLowerCase()) ||
      item.namaBarangFasilitas.toLowerCase().includes(search.toLowerCase()) ||
      item.lokasiRuang.toLowerCase().includes(search.toLowerCase()) ||
      item.deskripsiKerusakan.toLowerCase().includes(search.toLowerCase());
    
    const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
    const matchUrgensi = filterUrgensi === 'Semua' || item.urgensi === filterUrgensi;

    return matchSearch && matchStatus && matchUrgensi;
  });

  // Handle Compress Base64 Photo
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          resolve(compressedDataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Submit New Complaint
  const handleSaveNewComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaPelapor || !form.namaBarangFasilitas || !form.deskripsiKerusakan) {
      alert('Mohon lengkapi Nama Pelapor, Barang/Fasilitas, dan Deskripsi Kerusakan.');
      return;
    }

    const newId = `KLH-${new Date().getFullYear()}-${String(keluhanList.length + 1).padStart(4, '0')}`;
    const newItem: KeluhanSarpras = {
      id: newId,
      tanggal: new Date().toISOString().split('T')[0],
      namaPelapor: form.namaPelapor || '',
      jabatanPelapor: form.jabatanPelapor as any || 'Guru',
      lokasiRuang: form.lokasiRuang || 'Ruang Kelas',
      namaBarangFasilitas: form.namaBarangFasilitas || '',
      deskripsiKerusakan: form.deskripsiKerusakan || '',
      urgensi: form.urgensi as any || 'Biasa',
      fotoKerusakan: form.fotoKerusakan || '',
      status: 'Menunggu'
    };

    await api.saveKeluhan(newItem);
    onRefresh();
    setIsAddModalOpen(false);
    setForm({
      namaPelapor: '',
      jabatanPelapor: 'Guru',
      lokasiRuang: 'Ruang Kelas',
      namaBarangFasilitas: '',
      deskripsiKerusakan: '',
      urgensi: 'Biasa',
      fotoKerusakan: ''
    });
    alert('✓ Laporan keluhan sarpras berhasil dikirim!');
  };

  // Open Action Modal
  const handleOpenAction = (item: KeluhanSarpras) => {
    setSelectedKeluhan(item);
    setActionForm({
      status: item.status || 'Dalam Proses',
      tanggapanSarpras: item.tanggapanSarpras || '',
      petugasPenanggungJawab: item.petugasPenanggungJawab || pengaturan.namaPetugasSarpras || 'Nursamsi Muslim Widuri, S.Pd.',
      estimasiBiaya: item.estimasiBiaya || 0,
      tanggalTindakLanjut: item.tanggalTindakLanjut || new Date().toISOString().split('T')[0],
      tanggalSelesai: item.tanggalSelesai || (item.status === 'Selesai' ? new Date().toISOString().split('T')[0] : ''),
      catatanHasil: item.catatanHasil || ''
    });
    setIsActionModalOpen(true);
  };

  // Submit Action Response
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedKeluhan) return;

    const updatedItem: KeluhanSarpras = {
      ...selectedKeluhan,
      status: actionForm.status as StatusKeluhan,
      tanggapanSarpras: actionForm.tanggapanSarpras,
      petugasPenanggungJawab: actionForm.petugasPenanggungJawab,
      estimasiBiaya: Number(actionForm.estimasiBiaya) || 0,
      tanggalTindakLanjut: actionForm.tanggalTindakLanjut,
      tanggalSelesai: actionForm.status === 'Selesai' ? (actionForm.tanggalSelesai || new Date().toISOString().split('T')[0]) : actionForm.tanggalSelesai,
      catatanHasil: actionForm.catatanHasil
    };

    await api.saveKeluhan(updatedItem);
    onRefresh();
    setIsActionModalOpen(false);
    alert('✓ Status penanganan keluhan berhasil diperbarui!');
  };

  // Delete Complaint
  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data keluhan ini?')) {
      await api.deleteKeluhan(id);
      onRefresh();
    }
  };

  // PDF Export Function for Register Buku Keluhan
  const handleExportPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    // Header Kop Surat
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PEMERINTAH PROVINSI SULAWESI TENGGARA', 148, 12, { align: 'center' });
    doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', 148, 17, { align: 'center' });
    doc.setFontSize(13);
    doc.text((pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE').toUpperCase(), 148, 23, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${pengaturan.alamat || 'Jl. Poros Amonggedo - Meluhu'} | NPSN: ${pengaturan.npsn || '40404643'}`, 148, 28, { align: 'center' });
    doc.setLineWidth(0.8);
    doc.line(14, 31, 283, 31);

    // Title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('BUKU REGISTER KELUHAN & PENANGANAN KERUSAKAN SARPRAS', 148, 38, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tahun Ajaran 2025/2026 | Dicetak pada: ${todayStr}`, 148, 43, { align: 'center' });

    // AutoTable
    const tableRows = filteredList.map((item, idx) => [
      idx + 1,
      item.id,
      item.tanggal,
      `${item.namaPelapor}\n(${item.jabatanPelapor})`,
      `${item.namaBarangFasilitas}\n[${item.lokasiRuang}]`,
      item.deskripsiKerusakan,
      item.urgensi,
      item.status,
      item.tanggapanSarpras || '-',
      item.estimasiBiaya ? `Rp ${item.estimasiBiaya.toLocaleString('id-ID')}` : '-'
    ]);

    autoTable(doc, {
      startY: 48,
      head: [['No', 'Kode Reg', 'Tanggal', 'Pelapor', 'Barang/Ruang', 'Uraian Keluhan', 'Urgensi', 'Status', 'Tindak Lanjut', 'Est. Biaya']],
      body: tableRows,
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'center', cellWidth: 18 },
        2: { halign: 'center', cellWidth: 16 },
        3: { cellWidth: 28 },
        4: { cellWidth: 32 },
        5: { cellWidth: 50 },
        6: { halign: 'center', cellWidth: 16 },
        7: { halign: 'center', cellWidth: 20 },
        8: { cellWidth: 45 },
        9: { halign: 'right', cellWidth: 22 }
      }
    });

    // Signature
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    if (finalY < 170) {
      doc.setFontSize(8);
      doc.text('Mengetahui,', 30, finalY);
      doc.text('Kepala Sekolah', 30, finalY + 5);
      doc.text(pengaturan.kepalaSekolah || 'Hapri, S.Pd., M.Pd', 30, finalY + 25);
      doc.text(`NIP. ${pengaturan.nipKepalaSekolah || '-'}`, 30, finalY + 29);

      doc.text('Konawe, ' + todayStr, 220, finalY);
      doc.text('Wakasek Sarana Prasarana', 220, finalY + 5);
      doc.text(pengaturan.namaPetugasSarpras || 'Nursamsi Muslim Widuri, S.Pd.', 220, finalY + 25);
      doc.text(`NIP. ${pengaturan.nipPetugasSarpras || '-'}`, 220, finalY + 29);
    }

    doc.save(`Buku_Register_Keluhan_Sarpras_${pengaturan.namaSekolah.replace(/\s+/g, '_')}.pdf`);
  };

  // Stats Counters
  const totalCount = keluhanList.length;
  const waitingCount = keluhanList.filter(x => x.status === 'Menunggu').length;
  const processCount = keluhanList.filter(x => x.status === 'Dalam Proses').length;
  const doneCount = keluhanList.filter(x => x.status === 'Selesai').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20">
            <MessageSquareWarning size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800">Register Keluhan & Pengaduan Sarpras</h2>
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                Laporan Warga Sekolah
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Dokumen pencatatan aspirasi, pengaduan kerusakan fasilitas dari guru/siswa/staf, serta rekapitulasi status penanganannya.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} />
            <span>Buat Laporan Keluhan</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Printer size={16} />
            <span>Cetak Register PDF</span>
          </button>
        </div>
      </div>

      {/* Stats Widget */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Laporan</p>
          <p className="text-xl font-black text-slate-800 mt-1">{totalCount} <span className="text-xs font-normal text-slate-400">kasus</span></p>
        </div>

        <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <p className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <Clock size={12} />
            Menunggu Respon
          </p>
          <p className="text-xl font-black text-amber-900 mt-1">{waitingCount} <span className="text-xs font-normal text-amber-600">item</span></p>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200 shadow-xs">
          <p className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <Wrench size={12} />
            Sedang Diproses
          </p>
          <p className="text-xl font-black text-blue-900 mt-1">{processCount} <span className="text-xs font-normal text-blue-600">item</span></p>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <p className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={12} />
            Selesai Ditangani
          </p>
          <p className="text-xl font-black text-emerald-900 mt-1">{doneCount} <span className="text-xs font-normal text-emerald-600">kasus</span></p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pelapor, barang, lokasi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
            <Filter size={14} className="text-slate-400" />
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Menunggu">Menunggu</option>
              <option value="Dalam Proses">Dalam Proses</option>
              <option value="Selesai">Selesai</option>
              <option value="Diusulkan ke RAB">Diusulkan ke RAB</option>
              <option value="Ditolak/Ditunda">Ditolak/Ditunda</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600">
            <span>Urgensi:</span>
            <select
              value={filterUrgensi}
              onChange={e => setFilterUrgensi(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Tingkat</option>
              <option value="Biasa">Biasa</option>
              <option value="Mendesak">Mendesak</option>
              <option value="Darurat">Darurat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table Register Keluhan */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">No / Kode Reg</th>
                <th className="py-3 px-4">Tanggal & Pelapor</th>
                <th className="py-3 px-4">Objek Kerusakan & Lokasi</th>
                <th className="py-3 px-4">Detail Keluhan</th>
                <th className="py-3 px-4 text-center">Urgensi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Tindak Lanjut Sarpras</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Belum ada data keluhan sarpras yang tercatat.
                  </td>
                </tr>
              ) : (
                filteredList.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <p className="font-extrabold text-slate-800">{idx + 1}</p>
                      <span className="text-[10px] font-mono font-bold text-slate-400">{item.id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{item.namaPelapor}</p>
                      <p className="text-[10px] text-slate-500">{item.jabatanPelapor} • {item.tanggal}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-indigo-950">{item.namaBarangFasilitas}</p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="text-slate-400" />
                        {item.lokasiRuang}
                      </p>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <p className="line-clamp-2 text-slate-600 leading-relaxed">{item.deskripsiKerusakan}</p>
                      {item.fotoKerusakan && (
                        <span className="inline-block mt-1 text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer" onClick={() => { setSelectedKeluhan(item); setIsDetailModalOpen(true); }}>
                          📷 Lihat Foto Lampiran
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.urgensi === 'Darurat' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                        item.urgensi === 'Mendesak' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.urgensi}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold inline-block ${
                        item.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        item.status === 'Dalam Proses' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        item.status === 'Diusulkan ke RAB' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                        item.status === 'Ditolak/Ditunda' ? 'bg-slate-200 text-slate-700' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {item.tanggapanSarpras ? (
                        <div>
                          <p className="line-clamp-2 text-slate-700 font-medium">{item.tanggapanSarpras}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            PJ: {item.petugasPenanggungJawab || '-'}
                            {item.estimasiBiaya ? ` • Rp ${item.estimasiBiaya.toLocaleString('id-ID')}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Belum ditanggapi</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenAction(item)}
                          className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                          title="Tindak Lanjut / Respon Sarpras"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                          title="Hapus Record"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Form Tambah Keluhan Warga */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
                  <MessageSquareWarning size={20} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-800">Form Laporan Keluhan Sarpras</h3>
                  <p className="text-[11px] text-slate-400">Pengaduan kerusakan fasilitas dari warga sekolah</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewComplaint} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Pelapor <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drs. Ahmad Fauzi / Andi (Siswa XI-A)"
                  value={form.namaPelapor}
                  onChange={e => setForm({ ...form, namaPelapor: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peran / Jabatan</label>
                  <select
                    value={form.jabatanPelapor}
                    onChange={e => setForm({ ...form, jabatanPelapor: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Guru">Guru</option>
                    <option value="Siswa">Siswa</option>
                    <option value="Staf TU">Staf TU</option>
                    <option value="Masyarakat/Wali">Masyarakat / Wali</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat Urgensi</label>
                  <select
                    value={form.urgensi}
                    onChange={e => setForm({ ...form, urgensi: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Biasa">Biasa (Perbaikan Rutin)</option>
                    <option value="Mendesak">Mendesak (Mengganggu KBM)</option>
                    <option value="Darurat">Darurat (Risiko Keselamatan)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Ruangan / Fasilitas <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ruang Lab Biologi / Toilet Siswa Pria"
                  value={form.lokasiRuang}
                  onChange={e => setForm({ ...form, lokasiRuang: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang / Fasilitas <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Proyektor LCD / AC Split / Kran Air Saklar"
                  value={form.namaBarangFasilitas}
                  onChange={e => setForm({ ...form, namaBarangFasilitas: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Uraian Detail Kerusakan <span className="text-rose-500">*</span></label>
                <textarea
                  rows={3}
                  required
                  placeholder="Jelaskan secara singkat gejala kerusakan yang terjadi..."
                  value={form.deskripsiKerusakan}
                  onChange={e => setForm({ ...form, deskripsiKerusakan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Foto Bukti Kerusakan (Opsional)</label>
                <div className="flex items-center gap-2">
                  <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5">
                    <FolderOpen size={14} />
                    <span>Galeri</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const base64 = await compressImage(file);
                          setForm({ ...form, fotoKerusakan: base64 });
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition cursor-pointer flex items-center gap-1.5">
                    <Camera size={14} />
                    <span>Kamera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const base64 = await compressImage(file);
                          setForm({ ...form, fotoKerusakan: base64 });
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  {form.fotoKerusakan && (
                    <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                      ✓ Foto Terlampir
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Kirim Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Tindak Lanjut oleh Wakasek Sarpras */}
      {isActionModalOpen && selectedKeluhan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">Tindak Lanjut & Respon Sarpras</h3>
                <p className="text-[11px] text-slate-400">Kode Register: {selectedKeluhan.id}</p>
              </div>
              <button onClick={() => setIsActionModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <p className="font-bold text-slate-800">{selectedKeluhan.namaBarangFasilitas} ({selectedKeluhan.lokasiRuang})</p>
                <p className="text-slate-500">{selectedKeluhan.deskripsiKerusakan}</p>
                <p className="text-[10px] text-slate-400">Pelapor: {selectedKeluhan.namaPelapor} ({selectedKeluhan.jabatanPelapor})</p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Penanganan</label>
                <select
                  value={actionForm.status}
                  onChange={e => setActionForm({ ...actionForm, status: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Menunggu">Menunggu (Antrean)</option>
                  <option value="Dalam Proses">Dalam Proses Perbaikan</option>
                  <option value="Selesai">Selesai Ditangani</option>
                  <option value="Diusulkan ke RAB">Diusulkan ke RAB ARKAS (Pembelian Baru)</option>
                  <option value="Ditolak/Ditunda">Ditolak / Ditunda</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggapan & Solusi Teknif Sarpras</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Penjelasan langkah perbaikan atau keputusan penanganan..."
                  value={actionForm.tanggapanSarpras}
                  onChange={e => setActionForm({ ...actionForm, tanggapanSarpras: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Petugas PJ Penanganan</label>
                  <input
                    type="text"
                    value={actionForm.petugasPenanggungJawab}
                    onChange={e => setActionForm({ ...actionForm, petugasPenanggungJawab: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimasi Biaya (Rp)</label>
                  <input
                    type="number"
                    value={actionForm.estimasiBiaya}
                    onChange={e => setActionForm({ ...actionForm, estimasiBiaya: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer shadow-sm"
                >
                  Simpan Tindak Lanjut
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Detail Foto */}
      {isDetailModalOpen && selectedKeluhan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center">
            <h3 className="font-extrabold text-slate-800 text-base">{selectedKeluhan.namaBarangFasilitas}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{selectedKeluhan.lokasiRuang}</p>
            {selectedKeluhan.fotoKerusakan && (
              <img
                src={selectedKeluhan.fotoKerusakan}
                alt="Foto Bukti Kerusakan"
                className="w-full h-64 object-cover rounded-2xl my-4 border border-slate-200"
              />
            )}
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="px-5 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
            >
              Tutup Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
