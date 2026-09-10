import React, { useState } from 'react';
import { Aset, Peminjaman, LogPemusnahan, PengaturanSekolah } from '../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Archive, Award, BookOpen, CheckCircle, Clock, Database, MapPin, Users, Smartphone, Download, ExternalLink, Chrome, Compass, Laptop, Info, ArrowUpRight, X, Search, FileText, FileCheck2, Scale } from 'lucide-react';

interface DashboardTabProps {
  asets: Aset[];
  peminjamans: Peminjaman[];
  pemusnahans: LogPemusnahan[];
  pengaturan: PengaturanSekolah;
  onNavigateToTab: (tab: string) => void;
}

export default function DashboardTab({
  asets,
  peminjamans,
  pemusnahans,
  pengaturan,
  onNavigateToTab
}: DashboardTabProps) {
  
  // Details Modal state
  const [selectedStatModal, setSelectedStatModal] = useState<'sarpras_aktif' | 'peminjaman_aktif' | 'rusak_berat' | 'aset_dihapuskan' | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [filterRuangDashboard, setFilterRuangDashboard] = useState<string>('Semua');

  // PWA states and hooks
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [isInstallable, setIsInstallable] = React.useState<boolean>(false);
  const [activeGuideTab, setActiveGuideTab] = React.useState<'android' | 'ios' | 'pc'>('android');
  const [isIframe, setIsIframe] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Cek apakah di dalam iframe
    setIsIframe(window.self !== window.top);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // 1. Calculations for high-level metrics
  const activeAsets = asets.filter(a => a.kondisi !== 'Dihapuskan');
  const totalItemCount = activeAsets.reduce((sum, item) => sum + item.jumlah, 0);
  const totalItemJenis = activeAsets.length;
  
  const dipinjamCount = peminjamans
    .filter(p => p.status === 'Dipinjam')
    .reduce((sum, p) => sum + p.jumlahPinjam, 0);
    
  const rusakBeratCount = activeAsets
    .filter(a => a.kondisi === 'Rusak Berat')
    .reduce((sum, item) => sum + item.jumlah, 0);

  const dihapuskanCount = pemusnahans.reduce((sum, p) => sum + p.jumlah, 0);

  // Details Modal Filtering
  const filteredActiveAsets = activeAsets.filter(aset => 
    aset.nama.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    aset.id.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    aset.ruangLokasi.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  const filteredActiveLoans = peminjamans.filter(p => p.status === 'Dipinjam' && (
    p.namaPeminjam.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    p.namaAset.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    p.asetId.toLowerCase().includes(modalSearchQuery.toLowerCase())
  ));

  const filteredRusakAsets = activeAsets.filter(aset => aset.kondisi === 'Rusak Berat' && (
    aset.nama.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    aset.id.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    aset.ruangLokasi.toLowerCase().includes(modalSearchQuery.toLowerCase())
  ));

  const filteredDisposals = pemusnahans.filter(p => 
    p.namaAset.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    p.asetId.toLowerCase().includes(modalSearchQuery.toLowerCase()) ||
    p.noSkPenghapusan.toLowerCase().includes(modalSearchQuery.toLowerCase())
  );

  // 2. Data preparation for Condition Pie Chart (Mendukung filter cepat per ruangan)
  const roomFilteredAsets = filterRuangDashboard === 'Semua' 
    ? activeAsets 
    : activeAsets.filter(a => a.ruangLokasi === filterRuangDashboard);

  const kondisiStats = roomFilteredAsets.reduce((acc, item) => {
    acc[item.kondisi] = (acc[item.kondisi] || 0) + item.jumlah;
    return acc;
  }, {} as Record<string, number>);

  const pieData = [
    { name: 'Baik', value: kondisiStats['Baik'] || 0, color: '#10b981' },
    { name: 'Rusak Ringan', value: kondisiStats['Rusak Ringan'] || 0, color: '#f59e0b' },
    { name: 'Rusak Berat', value: kondisiStats['Rusak Berat'] || 0, color: '#ef4444' }
  ].filter(d => d.value > 0);

  // List unique rooms for fast filter
  const uniqueRooms = Array.from(new Set(activeAsets.map(a => a.ruangLokasi).filter(Boolean))).sort();

  // 3. Data preparation for Location Bar Chart
  const lokasiStats = activeAsets.reduce((acc, item) => {
    acc[item.ruangLokasi] = (acc[item.ruangLokasi] || 0) + item.jumlah;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(lokasiStats).map(key => ({
    name: key,
    Jumlah: lokasiStats[key]
  }));

  // 4. Compliance Calculation (Permendikbudristek 22/2023 & Juknis 048/2023)
  // Juknis specifies that a student needs standard furniture (Meja/Kursi).
  // Total classroom seats in Meja/Kursi must be >= target student capacity.
  const furnitureSiswa = activeAsets.filter(
    a => a.ruangLokasi === 'Ruang Kelas' && 
         (a.nama.toLowerCase().includes('meja') || a.nama.toLowerCase().includes('kursi'))
  );
  
  const totalFurnitureSiswa = furnitureSiswa.reduce((sum, a) => sum + a.jumlah, 0);
  // Divide by 2 because Meja and Kursi are separate, or approximate 1 table + 1 chair = 2 units per student
  const estimatedCapacity = Math.round(totalFurnitureSiswa / 2);
  const complianceRate = Math.min(
    100,
    Math.round((estimatedCapacity / pengaturan.targetKapasitasSiswa) * 100)
  );

  return (
    <div className="space-y-8" id="dashboard-tab">
      
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-900 to-indigo-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg"
      >
        <div className="relative z-10 max-w-2xl">
          <span className="bg-indigo-500/30 text-indigo-200 text-xs px-3 py-1.5 rounded-full font-semibold tracking-wide uppercase border border-indigo-400/20">
            {pengaturan.npsn ? `NPSN: ${pengaturan.npsn}` : 'Sistem Manajemen Sarpras'}
          </span>
          <h1 className="text-2xl md:text-3xl font-bold mt-3 tracking-tight">
            Selamat Datang di E-Sarpras
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold text-indigo-200 mt-1">
            {pengaturan.namaSekolah}
          </h2>
          <p className="text-indigo-200/80 text-xs md:text-sm mt-3 leading-relaxed">
            Sistem terintegrasi untuk pendataan sarana prasarana sekolah, pelaporan standar kelayakan sarpras, pelabelan barcode dinamis, dan pencatatan sirkulasi peminjaman aset secara tertib.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-12 translate-y-12">
          <Database size={240} className="text-white" />
        </div>
      </motion.div>

      {/* Quick Banner: Dokumen Standar BMD Permendagri 47/2021 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.03 }}
        className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="flex items-start gap-4">
          <div className="p-3.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20 shrink-0">
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-1">
                <Scale size={10} />
                Permendagri No. 47/2021 & ARKAS
              </span>
              <span className="text-[10px] font-bold text-slate-400">• Standar Siklus Lengkap BMD</span>
            </div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 mt-1">
              Dokumen Standar Sarana & Prasarana {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
              Tersedia modul siap cetak PDF resmi: <strong>Program Kerja 12 Bulan</strong>, <strong>RAB Sarpras BOS (Cap 20%)</strong>, <strong>Jadwal & Riwayat Pemeliharaan</strong>, <strong>Laporan Berkala 5 Bagian</strong>, <strong>Penghapusan BMD 3-Tahap</strong>, dan <strong>Sarpras Khusus / Lab</strong>.
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigateToTab('dokumen_sarpras')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-extrabold rounded-xl transition shadow-md shadow-indigo-600/15 flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Buka Dokumen Resmi</span>
          <ArrowUpRight size={14} />
        </button>
      </motion.div>

      {/* PWA Installation Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row gap-6 items-stretch justify-between">
          <div className="flex-1 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Smartphone size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Pasang Aplikasi e-Sarpras di Android / iOS</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Akses cepat tanpa browser, responsif penuh, dan mendukung mode luring!</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Aplikasi ini mendukung teknologi **PWA (Progressive Web App)** sehingga Anda dapat memasangnya langsung di layar utama smartphone Android atau iPhone Anda seperti aplikasi asli yang diunduh dari Play Store/App Store.
              </p>
            </div>

            {isIframe ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-2xl text-xs space-y-2.5">
                <div className="flex items-center gap-2 font-bold">
                  <Info size={16} />
                  <span>Petunjuk Deteksi Preview</span>
                </div>
                <p className="leading-relaxed">
                  Saat ini Anda sedang membuka aplikasi di dalam bingkai preview AI Studio. 
                  Agar tombol instalasi dan menu browser dapat berfungsi dengan baik, silakan buka aplikasi ini di **Tab Baru** terlebih dahulu.
                </p>
                <div className="pt-1">
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer text-xs"
                  >
                    <span>Buka Aplikasi di Tab Baru</span>
                    <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 items-center">
                {isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs py-3 px-5 rounded-xl transition shadow-md shadow-indigo-600/15 cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Instal Sekarang</span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold text-xs py-2 px-3.5 rounded-xl">
                    <CheckCircle size={14} />
                    <span>PWA Siap Dipasang Manual</span>
                  </div>
                )}
                <span className="text-[11px] text-slate-400">Atau ikuti panduan manual di samping kanan ini:</span>
              </div>
            )}
          </div>

          <div className="w-full lg:w-auto min-w-[280px] lg:min-w-[380px] bg-slate-50 border border-slate-100 rounded-2xl p-4 shrink-0 flex flex-col justify-between">
            <div>
              {/* Guide Tabs */}
              <div className="flex border-b border-slate-200 pb-2 mb-3">
                {[
                  { id: 'android', label: 'Android (Chrome)', icon: <Chrome size={12} /> },
                  { id: 'ios', label: 'iOS (Safari)', icon: <Compass size={12} /> },
                  { id: 'pc', label: 'Komputer', icon: <Laptop size={12} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveGuideTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 pb-2 text-[11px] font-extrabold tracking-wide transition-all border-b-2 cursor-pointer ${
                      activeGuideTab === tab.id
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Guide Body */}
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                {activeGuideTab === 'android' && (
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>Buka browser <strong>Chrome</strong> di HP Android Anda.</li>
                    <li>Buka tautan aplikasi ini secara mandiri (di luar frame preview).</li>
                    <li>Ketuk ikon <strong>titik tiga (⋮)</strong> di pojok kanan atas Chrome.</li>
                    <li>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.</li>
                    <li>Konfirmasi dan tunggu hingga aplikasi e-Sarpras terpasang di menu HP Anda!</li>
                  </ol>
                )}
                {activeGuideTab === 'ios' && (
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>Buka browser <strong>Safari</strong> di iPhone/iPad Anda.</li>
                    <li>Buka tautan aplikasi e-Sarpras secara mandiri.</li>
                    <li>Ketuk tombol <strong>Bagikan (Share icon)</strong> di bilah menu bawah Safari.</li>
                    <li>Gulir ke bawah dan pilih opsi <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen).</li>
                    <li>Ketuk tombol <strong>"Tambah"</strong> di kanan atas layar. Selesai!</li>
                  </ol>
                )}
                {activeGuideTab === 'pc' && (
                  <ol className="list-decimal pl-4 space-y-1.5">
                    <li>Gunakan browser desktop seperti <strong>Google Chrome</strong> atau <strong>Edge</strong>.</li>
                    <li>Perhatikan ujung kanan bilah alamat URL di bagian atas browser Anda.</li>
                    <li>Klik ikon <strong>Instal (Monitor/Komputer dengan tanda panah bawah)</strong>.</li>
                    <li>Klik tombol <strong>"Instal"</strong> pada dialog konfirmasi yang muncul.</li>
                  </ol>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top counters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            type: 'sarpras_aktif',
            title: 'Total Sarpras Aktif',
            subtitle: `${totalItemJenis} Jenis Inventaris`,
            value: totalItemCount,
            color: 'bg-blue-50/40 text-blue-600 border-blue-100/80 hover:border-blue-300',
            icon: <Database size={20} />
          },
          {
            type: 'peminjaman_aktif',
            title: 'Peminjaman Aktif',
            subtitle: 'Sirkulasi Penggunaan',
            value: dipinjamCount,
            color: 'bg-amber-50/40 text-amber-600 border-amber-100/80 hover:border-amber-300',
            icon: <Clock size={20} />
          },
          {
            type: 'rusak_berat',
            title: 'Kondisi Rusak Berat',
            subtitle: 'Perlu Penghapusan',
            value: rusakBeratCount,
            color: 'bg-rose-50/40 text-rose-600 border-rose-100/80 hover:border-rose-300',
            icon: <AlertTriangle size={20} />
          },
          {
            type: 'aset_dihapuskan',
            title: 'Aset Dihapuskan',
            subtitle: 'Log Pemusnahan Resmi',
            value: dihapuskanCount,
            color: 'bg-slate-50/40 text-slate-600 border-slate-100/80 hover:border-slate-300',
            icon: <Archive size={20} />
          }
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            onClick={() => {
              setModalSearchQuery('');
              setSelectedStatModal(stat.type as any);
            }}
            className="p-5 rounded-2xl border bg-white flex items-center justify-between shadow-xs cursor-pointer transition-all duration-200 group relative overflow-hidden"
            style={{ borderColor: 'inherit' }}
          >
            <div className="absolute inset-0 bg-linear-to-r from-transparent to-slate-50/10 opacity-0 group-hover:opacity-100 transition duration-300" />
            <div className="relative z-10">
              <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition duration-200">{stat.title}</p>
              <h3 className="text-3xl font-black text-slate-800 mt-1.5 flex items-baseline gap-1.5">
                {stat.value}
                <span className="text-[9px] font-bold text-indigo-500 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
                  Detail →
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold group-hover:text-slate-700 transition duration-200">{stat.subtitle}</p>
            </div>
            <div className={`p-3 bg-white rounded-xl shadow-xs border border-slate-100 text-inherit group-hover:scale-110 transition duration-300 relative z-10 ${stat.color}`}>
              {stat.icon}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Compliance Standard & Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Compliance Card based on Permendikbudristek */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-3">
              <Award size={18} />
              <h3 className="text-sm">Standar Permendikbud 22/2023</h3>
            </div>
            <h4 className="text-base font-bold text-slate-800">
              Kelayakan Ruang Kelas Siswa
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Kecukupan meja dan kursi siswa dibanding target kapasitas <span className="font-semibold">{pengaturan.targetKapasitasSiswa} siswa</span>.
            </p>

            {/* Compliance Gauge Circular representation */}
            <div className="my-6 flex flex-col items-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-slate-100 fill-none"
                    strokeWidth="10"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r="64"
                    className="stroke-indigo-600 fill-none transition-all duration-1000 ease-out"
                    strokeWidth="10"
                    strokeDasharray={402}
                    strokeDashoffset={402 - (402 * complianceRate) / 100}
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-extrabold text-slate-800">{complianceRate}%</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Terpenuhi</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4 mt-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-500">Estimasi Kapasitas Mebel:</span>
              <span className="text-slate-800 font-bold">{estimatedCapacity} Siswa ({totalFurnitureSiswa} Mebel)</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-500">Daya Tampung Maksimal:</span>
              <span className="text-slate-800 font-bold">{pengaturan.targetKapasitasSiswa} Siswa</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-500">Jumlah Rombel (Kelas):</span>
              <span className="text-slate-800 font-bold">{pengaturan.jumlahRombel ?? 16} Kelas</span>
            </div>
            <div className="flex justify-between text-xs font-medium">
              <span className="text-slate-500">Jumlah Siswa Terdaftar:</span>
              <span className="text-slate-800 font-bold">{pengaturan.jumlahSiswaAktif ?? 400} Siswa</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              Juknis BSKAP 048/2023 mengharuskan minimal 1 Meja & 1 Kursi layak pakai per siswa yang belajar di kelas.
            </div>
          </div>
        </motion.div>

        {/* Condition Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-3 gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Status Kondisi Sarpras</h3>
              <p className="text-[10px] text-slate-400">Distribusi kelayakan fisik</p>
            </div>
            <select
              value={filterRuangDashboard}
              onChange={(e) => setFilterRuangDashboard(e.target.value)}
              className="text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer max-w-[150px] truncate"
              title="Filter per Ruang/Lokasi"
            >
              <option value="Semua">Semua Ruang</option>
              {uniqueRooms.map(ruang => (
                <option key={ruang} value={ruang}>{ruang}</option>
              ))}
            </select>
          </div>

          <div className="h-48 flex justify-center items-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Unit`, 'Jumlah']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400">Tidak ada data kondisi</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center mt-3 pt-4 border-t border-slate-50">
            {pieData.map((d, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 justify-center">
                  <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: d.color }}></span>
                  {d.name}
                </span>
                <span className="text-sm font-bold text-slate-800 mt-1">{d.value} <span className="text-[10px] text-slate-400 font-medium">unit</span></span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Location distribution Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-50 mb-4">
            <h3 className="text-sm font-semibold text-slate-800">Distribusi per Lokasi Ruang</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold">Standard Ruang</span>
          </div>

          <div className="h-56">
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '9px', fontWeight: 500 }} />
                  <Tooltip formatter={(value) => [`${value} Unit`, 'Jumlah']} />
                  <Bar dataKey="Jumlah" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-400 flex items-center justify-center h-full">Tidak ada data lokasi</p>
            )}
          </div>
        </motion.div>

      </div>

      {/* Quick Action Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Aset Rusak Berat Perlu Ditindak */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
              <AlertTriangle size={18} />
              <span>Inventaris Rusak Berat (Perlu Penghapusan)</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Batas Usia Kelayakan</span>
          </div>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {activeAsets.filter(a => a.kondisi === 'Rusak Berat').length > 0 ? (
              activeAsets
                .filter(a => a.kondisi === 'Rusak Berat')
                .map((aset) => (
                  <div key={aset.id} className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{aset.nama}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Kode: {aset.id} | Lokasi: {aset.ruangLokasi}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-rose-700 bg-rose-100/50 px-2 py-1 rounded">
                        {aset.jumlah} {aset.satuan}
                      </span>
                      <button
                        onClick={() => onNavigateToTab('aset')}
                        className="block text-[9px] text-indigo-600 hover:underline font-semibold mt-1 cursor-pointer"
                      >
                        Pemusnahan &gt;
                      </button>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                Semua aset sekolah terpelihara dengan baik. Tidak ada sarpras rusak berat yang terbengkalai.
              </div>
            )}
          </div>
        </div>

        {/* Peminjaman Terakhir & Jatuh Tempo */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
              <BookOpen size={18} />
              <span>Sirkulasi Peminjaman Aset</span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Daftar Aktif</span>
          </div>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {peminjamans.filter(p => p.status === 'Dipinjam').length > 0 ? (
              peminjamans
                .filter(p => p.status === 'Dipinjam')
                .map((pinjam) => (
                  <div key={pinjam.id} className="p-3 bg-indigo-50/30 rounded-xl border border-indigo-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{pinjam.namaAset}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">Peminjam: {pinjam.namaPeminjam} ({pinjam.jabatanPeminjam})</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/50 px-2 py-1 rounded-full">
                        {pinjam.jumlahPinjam} unit
                      </span>
                      <p className="text-[9px] text-rose-500 font-medium mt-1">Kembali: {pinjam.tanggalTargetKembali}</p>
                    </div>
                  </div>
                ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle size={32} className="text-emerald-500 mx-auto mb-2" />
                Semua peminjaman telah dikembalikan. Sirkulasi saat ini dalam kondisi kosong.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Detail Popup Modal */}
      <AnimatePresence>
        {selectedStatModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full border border-slate-100 shadow-2xl relative flex flex-col max-h-[85vh]"
            >
              <button
                onClick={() => setSelectedStatModal(null)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div className="mb-5">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  {selectedStatModal === 'sarpras_aktif' && (
                    <>
                      <Database className="text-blue-500" size={20} />
                      <span>Rincian Seluruh Sarpras Aktif</span>
                    </>
                  )}
                  {selectedStatModal === 'peminjaman_aktif' && (
                    <>
                      <Clock className="text-amber-500" size={20} />
                      <span>Rincian Peminjaman Aktif</span>
                    </>
                  )}
                  {selectedStatModal === 'rusak_berat' && (
                    <>
                      <AlertTriangle className="text-rose-500" size={20} />
                      <span>Daftar Inventaris Rusak Berat</span>
                    </>
                  )}
                  {selectedStatModal === 'aset_dihapuskan' && (
                    <>
                      <Archive className="text-slate-500" size={20} />
                      <span>Log Penghapusan / Pemusnahan Aset</span>
                    </>
                  )}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  {selectedStatModal === 'sarpras_aktif' && 'Menampilkan semua aset sekolah yang masih aktif digunakan.'}
                  {selectedStatModal === 'peminjaman_aktif' && 'Menampilkan daftar sirkulasi barang yang saat ini dipinjam.'}
                  {selectedStatModal === 'rusak_berat' && 'Menampilkan aset berstatus rusak berat yang perlu diusulkan untuk penghapusan.'}
                  {selectedStatModal === 'aset_dihapuskan' && 'Menampilkan arsip/log resmi tindakan pemusnahan, hibah, atau lelang aset.'}
                </p>
              </div>

              {/* Search Bar inside Modal */}
              <div className="relative mb-4">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <Search size={15} />
                </span>
                <input
                  type="text"
                  placeholder="Cari data berdasarkan nama atau kode..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {modalSearchQuery && (
                  <button
                    onClick={() => setModalSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Modal Content / Table Container */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 select-none">
                {selectedStatModal === 'sarpras_aktif' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-3">Kode Aset</th>
                          <th className="py-2 px-3">Nama Aset</th>
                          <th className="py-2 px-3">Ruang / Lokasi</th>
                          <th className="py-2 px-3 text-center">Jumlah</th>
                          <th className="py-2 px-3 text-center">Kondisi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {filteredActiveAsets.length > 0 ? (
                          filteredActiveAsets.map((aset) => (
                            <tr key={aset.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-[10px] text-slate-500">{aset.id}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {aset.nama}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {aset.merek && `Merek: ${aset.merek}`}
                                  {aset.merek && aset.serialNumber && ' | '}
                                  {aset.serialNumber && `S/N: ${aset.serialNumber}`}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">{aset.ruangLokasi}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{aset.jumlah} {aset.satuan}</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  aset.kondisi === 'Baik' 
                                    ? 'bg-emerald-50 text-emerald-600' 
                                    : 'bg-amber-50 text-amber-600'
                                }`}>
                                  {aset.kondisi}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">Tidak ada data ditemukan</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedStatModal === 'peminjaman_aktif' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-3">Nama Peminjam</th>
                          <th className="py-2 px-3">Barang / Aset</th>
                          <th className="py-2 px-3">Tgl Pinjam</th>
                          <th className="py-2 px-3">Batas Kembali</th>
                          <th className="py-2 px-3 text-center">Jumlah</th>
                          <th className="py-2 px-3">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {filteredActiveLoans.length > 0 ? (
                          filteredActiveLoans.map((loan) => (
                            <tr key={loan.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {loan.namaPeminjam}
                                <span className="block text-[10px] text-slate-400 font-medium">{loan.jabatanPeminjam}</span>
                              </td>
                              <td className="py-2.5 px-3 font-bold text-slate-700">
                                {loan.namaAset}
                                <span className="block text-[10px] text-slate-400 font-mono">ID: {loan.asetId}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">{loan.tanggalPinjam}</td>
                              <td className="py-2.5 px-3 text-rose-500 font-bold">{loan.tanggalTargetKembali}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{loan.jumlahPinjam} unit</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate" title={loan.keterangan}>
                                {loan.keterangan || '-'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">Tidak ada peminjaman aktif saat ini</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedStatModal === 'rusak_berat' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-3">Kode Aset</th>
                          <th className="py-2 px-3">Nama Aset</th>
                          <th className="py-2 px-3">Ruang / Lokasi</th>
                          <th className="py-2 px-3 text-center">Jumlah</th>
                          <th className="py-2 px-3">Sumber Dana</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {filteredRusakAsets.length > 0 ? (
                          filteredRusakAsets.map((aset) => (
                            <tr key={aset.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-mono font-bold text-[10px] text-slate-500">{aset.id}</td>
                              <td className="py-2.5 px-3 font-bold text-rose-600">
                                {aset.nama}
                                <span className="block text-[10px] text-slate-400 font-normal">
                                  {aset.merek && `Merek: ${aset.merek}`}
                                  {aset.merek && aset.serialNumber && ' | '}
                                  {aset.serialNumber && `S/N: ${aset.serialNumber}`}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium">{aset.ruangLokasi}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-800">{aset.jumlah} {aset.satuan}</td>
                              <td className="py-2.5 px-3 text-slate-500">{aset.sumberDana}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-400">Semua aset dalam kondisi baik / aman</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedStatModal === 'aset_dihapuskan' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-2 px-3">Barang / Aset</th>
                          <th className="py-2 px-3">Tanggal</th>
                          <th className="py-2 px-3 text-center">Jumlah</th>
                          <th className="py-2 px-3">Metode</th>
                          <th className="py-2 px-3">Alasan</th>
                          <th className="py-2 px-3">No. SK Penghapusan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {filteredDisposals.length > 0 ? (
                          filteredDisposals.map((disposal) => (
                            <tr key={disposal.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                {disposal.namaAset}
                                <span className="block text-[10px] text-slate-400 font-mono">ID Aset: {disposal.asetId}</span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 font-medium whitespace-nowrap">{disposal.tanggalPemusnahan}</td>
                              <td className="py-2.5 px-3 text-center font-bold text-rose-600">{disposal.jumlah} unit</td>
                              <td className="py-2.5 px-3 font-bold text-slate-700">{disposal.metode}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[150px] truncate" title={disposal.alasan}>
                                {disposal.alasan}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-[10px] text-slate-600 font-semibold">{disposal.noSkPenghapusan}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400">Belum ada log penghapusan atau pemusnahan aset</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-3">
                {selectedStatModal === 'sarpras_aktif' && (
                  <button
                    onClick={() => {
                      setSelectedStatModal(null);
                      onNavigateToTab('aset');
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    Buka Kelola Sarpras
                  </button>
                )}
                {selectedStatModal === 'peminjaman_aktif' && (
                  <button
                    onClick={() => {
                      setSelectedStatModal(null);
                      onNavigateToTab('peminjaman');
                    }}
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    Buka Kelola Peminjaman
                  </button>
                )}
                <button
                  onClick={() => setSelectedStatModal(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
