import React, { useState, useEffect } from 'react';
import { Aset, Peminjaman, LogPemusnahan, PengaturanSekolah, DEFAULT_PENGATURAN, BarangHabisPakai, PengambilanBHP, AuditLog, AUTHORIZED_USERS, MasterRuang, KeluhanSarpras } from './types';
import { SCHOOL_LOGO_BASE64 } from './assets/logoBase64';
import { api } from './api';
import DashboardTab from './components/DashboardTab';
import AsetTab from './components/AsetTab';
import PeminjamanTab from './components/PeminjamanTab';
import BhpTab from './components/BhpTab';
import BarcodeTab from './components/BarcodeTab';
import LaporanTab from './components/LaporanTab';
import SettingsTab from './components/SettingsTab';
import DokumenSarprasHub from './components/documents/DokumenSarprasHub';
import MasterRuangManager from './components/MasterRuangManager';
import QRScanner from './components/QRScanner';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  Database,
  BookOpen,
  Barcode,
  QrCode,
  FileText,
  FileCheck2,
  Settings,
  Camera,
  DatabaseBackup,
  Menu,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Package,
  ShieldAlert,
  Key,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  UserCheck,
  ShieldCheck,
  DoorOpen
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [asets, setAsets] = useState<Aset[]>([]);
  const [peminjamans, setPeminjamans] = useState<Peminjaman[]>([]);
  const [pemusnahans, setPemusnahans] = useState<LogPemusnahan[]>([]);
  const [pengaturan, setPengaturan] = useState<PengaturanSekolah>(DEFAULT_PENGATURAN);
  const [bhp, setBhp] = useState<BarangHabisPakai[]>([]);
  const [pengambilanBhp, setPengambilanBhp] = useState<PengambilanBHP[]>([]);
  const [keluhan, setKeluhan] = useState<KeluhanSarpras[]>([]);
  const [masterRuangs, setMasterRuangs] = useState<MasterRuang[]>(() => api.getMasterRuangs());
  
  // Operator & Audit Log states
  const [activeOperator, setActiveOperator] = useState<string>(() => {
    return localStorage.getItem('active_operator') || 'Nursamsi Muslim Widuri, S.Pd.';
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => api.getAuditLogs());

  const handleSelectOperator = (opName: string) => {
    setActiveOperator(opName);
    localStorage.setItem('active_operator', opName);
  };
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'offline' | 'online' | 'error'>('offline');

  // Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerAction, setScannerAction] = useState<'search' | 'loan_form' | 'aset_form'>('search');
  const [scannerCallback, setScannerCallback] = useState<((code: string) => void) | undefined>(undefined);

  // Mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Security and Role states
  const [userRole, setUserRole] = useState<'admin' | 'guest'>(() => {
    return (localStorage.getItem('user_role') as 'admin' | 'guest') || 'guest';
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (res.ok && data.role === 'admin') {
        setUserRole('admin');
        localStorage.setItem('user_role', 'admin');
        if (data.token) {
          localStorage.setItem('admin_token', data.token);
        }
        setIsLoginModalOpen(false);
        setPasswordInput('');
      } else {
        // Fallback jika mode offline / tanpa server backend
        const correctPassword = pengaturan.adminPassword || 'admin123';
        if (passwordInput === correctPassword) {
          setUserRole('admin');
          localStorage.setItem('user_role', 'admin');
          setIsLoginModalOpen(false);
          setPasswordInput('');
        } else {
          setPasswordError('Kata sandi administrator salah. Silakan periksa kembali.');
        }
      }
    } catch {
      // Fallback offline validation
      const correctPassword = pengaturan.adminPassword || 'admin123';
      if (passwordInput === correctPassword) {
        setUserRole('admin');
        localStorage.setItem('user_role', 'admin');
        setIsLoginModalOpen(false);
        setPasswordInput('');
      } else {
        setPasswordError('Kata sandi administrator salah. Silakan coba lagi.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setUserRole('guest');
    localStorage.setItem('user_role', 'guest');
    localStorage.removeItem('admin_token');
    if (activeTab === 'settings' || activeTab === 'laporan') {
      setActiveTab('dashboard');
    }
  };

  // Load datasets on mount & set up background real-time polling
  useEffect(() => {
    loadAllData();

    // 1. Silent background auto-polling every 30 seconds for multi-device real-time sync
    const pollInterval = setInterval(() => {
      api.getAll().then(result => {
        setAsets(result.asets);
        setPeminjamans(result.peminjamans);
        setPemusnahans(result.pemusnahans);
        setPengaturan(result.pengaturan);
        setBhp(result.bhp);
        setPengambilanBhp(result.pengambilanBhp);
        setKeluhan(result.keluhan || []);
        if (result.pengaturan.googleAppsScriptUrl) {
          setSyncStatus('online');
        }
      }).catch(err => {
        console.warn('Silent auto-sync poll error:', err);
      });
    }, 30000);

    // 2. Re-sync immediately when phone screen unlocks, tab comes to focus, or network re-connects
    const handleFocusOrOnline = () => {
      api.getAll().then(result => {
        setAsets(result.asets);
        setPeminjamans(result.peminjamans);
        setPemusnahans(result.pemusnahans);
        setPengaturan(result.pengaturan);
        setBhp(result.bhp);
        setPengambilanBhp(result.pengambilanBhp);
        setKeluhan(result.keluhan || []);
        if (result.pengaturan.googleAppsScriptUrl) {
          setSyncStatus('online');
        }
      }).catch(err => {
        console.warn('Focus re-sync error:', err);
      });
    };

    window.addEventListener('focus', handleFocusOrOnline);
    window.addEventListener('online', handleFocusOrOnline);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('focus', handleFocusOrOnline);
      window.removeEventListener('online', handleFocusOrOnline);
    };
  }, []);

  const loadAllData = async (showProgress = true, isManual = false) => {
    if (showProgress) setIsLoading(true);
    else setIsRefreshing(true);
    
    try {
      const result = await api.getAll();
      setAsets(result.asets);
      setPeminjamans(result.peminjamans);
      setPemusnahans(result.pemusnahans);
      setPengaturan(result.pengaturan);
      setBhp(result.bhp);
      setPengambilanBhp(result.pengambilanBhp);
      setKeluhan(result.keluhan || []);
      
      if (result.pengaturan.googleAppsScriptUrl) {
        setSyncStatus('online');
        if (isManual) {
          alert('✓ Sinkronisasi Berhasil!\nSemua data telah sinkron dengan database cloud Google Sheets secara real-time.');
        }
      } else {
        setSyncStatus('offline');
        if (isManual) {
          alert('✓ Penyegaran Berhasil (Mode Offline)!\nData diperbarui dari memori lokal HP/Perangkat Anda. Hubungkan Google Sheets di menu Pengaturan agar data sinkron antar perangkat.');
        }
      }
    } catch (error) {
      console.error('Error fetching data', error);
      setSyncStatus('error');
      if (isManual) {
        alert('✗ Gagal Sinkronisasi!\nTidak dapat terhubung ke Google Apps Script. Periksa koneksi internet Anda atau periksa URL di tab Pengaturan.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Mutators
  const handleSaveAset = async (aset: Aset) => {
    let driveError = false;
    const isEdit = asets.some(a => a.id === aset.id);

    if (aset.fotoUrl) {
      try {
        let photos: string[] = [];
        let isJson = false;
        
        if (aset.fotoUrl.startsWith('[')) {
          photos = JSON.parse(aset.fotoUrl);
          isJson = true;
        } else {
          photos = [aset.fotoUrl];
        }

        let hasChanged = false;
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          if (photo && photo.startsWith('data:')) {
            try {
              const cloudUrl = await api.uploadPhotoToDrive(photo, `FOTO_SARPRAS_${aset.id}_${i + 1}.jpg`);
              photos[i] = cloudUrl;
              hasChanged = true;
            } catch (e) {
              console.warn(`Gagal mengupload foto ${i + 1} ke Google Drive. Menyimpan versi lokal offline.`, e);
              driveError = true;
            }
          }
        }

        if (hasChanged) {
          if (isJson) {
            aset.fotoUrl = JSON.stringify(photos);
          } else {
            aset.fotoUrl = photos[0] || '';
          }
        }
      } catch (e) {
        console.warn('Gagal memproses/mengupload list foto ke Google Drive.', e);
      }
    }
    
    const updated = await api.saveAset(aset);
    setAsets(updated);

    const actionType = isEdit ? 'EDIT_ASET' : 'TAMBAH_ASET';
    const details = isEdit 
      ? `Memperbarui data aset ${aset.nama} (${aset.id})`
      : `Menambahkan aset baru ${aset.nama} (${aset.id}) sejumlah ${aset.jumlah} ${aset.satuan}`;
    const newLogs = await api.recordAuditLog(activeOperator, actionType, `${aset.nama} (${aset.id})`, details);
    setAuditLogs(newLogs);
    
    if (pengaturan.googleAppsScriptUrl) {
      if (driveError) {
        alert('✓ Data Aset disimpan ke Google Sheets!\nNamun pengunggahan foto ke Google Drive gagal (foto disimpan sementara di memori lokal HP).');
      } else {
        alert('✓ Sukses!\nData aset dan foto berhasil disimpan dan disinkronkan ke Google Sheets & Google Drive.');
      }
    } else {
      alert('✓ Tersimpan Offline!\nData disimpan di memori HP Anda. Agar dapat dibaca di laptop/device lain, harap hubungkan Google Sheets di tab Pengaturan.');
    }

    loadAllData(false);
  };

  const handleSaveMultipleAsets = async (importedAsets: Aset[]) => {
    if (!importedAsets || importedAsets.length === 0) return;
    
    setIsLoading(true);
    try {
      const updated = await api.saveMultipleAsets(importedAsets);
      setAsets(updated);

      const logDetails = `Import massal ${importedAsets.length} data inventaris sarpras baru ke dalam sistem`;
      const newLogs = await api.recordAuditLog(
        activeOperator,
        'TAMBAH_ASET',
        `Import Massal (${importedAsets.length} Aset)`,
        logDetails
      );
      setAuditLogs(newLogs);

      if (pengaturan.googleAppsScriptUrl) {
        alert(`✓ Import Berhasil!\nSebanyak ${importedAsets.length} data sarpras telah berhasil diunggah dan disinkronkan ke database Google Sheets.`);
      } else {
        alert(`✓ Import Berhasil (Tersimpan Lokal)!\nSebanyak ${importedAsets.length} data sarpras telah berhasil ditambahkan ke memori aplikasi. Hubungkan Google Sheets di menu Pengaturan agar tersinkron ke semua perangkat.`);
      }

      loadAllData(false);
    } catch (err: any) {
      console.error('Error batch importing asets:', err);
      alert('Gagal menyimpan beberapa data import: ' + (err.message || 'Terjadi kesalahan sistem.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAset = async (id: string) => {
    const targetAset = asets.find(a => a.id === id);
    const updated = await api.deleteAset(id);
    setAsets(updated);

    const newLogs = await api.recordAuditLog(
      activeOperator,
      'HAPUS_ASET',
      `${targetAset?.nama || id} (${id})`,
      `Menghapus data aset dari sistem`
    );
    setAuditLogs(newLogs);

    if (pengaturan.googleAppsScriptUrl) {
      alert('✓ Berhasil!\nAset telah dihapus dari Google Sheets.');
    } else {
      alert('✓ Berhasil dihapus secara lokal!');
    }
  };

  const handleSavePeminjaman = async (pinjam: Peminjaman) => {
    const isReturn = pinjam.status === 'Kembali';
    const updated = await api.savePeminjaman(pinjam);
    setPeminjamans(updated);
    
    const actionType = isReturn ? 'KEMBALI_ASET' : 'PINJAM_ASET';
    const details = isReturn
      ? `Pengembalian aset ${pinjam.namaAset} oleh ${pinjam.namaPeminjam}`
      : `Peminjaman ${pinjam.jumlahPinjam} unit ${pinjam.namaAset} oleh ${pinjam.namaPeminjam} (${pinjam.jabatanPeminjam})`;
    const newLogs = await api.recordAuditLog(activeOperator, actionType, `${pinjam.namaAset} (${pinjam.asetId})`, details);
    setAuditLogs(newLogs);

    if (pengaturan.googleAppsScriptUrl) {
      alert('✓ Transaksi Peminjaman Berhasil!\nData telah langsung disinkronkan ke Google Sheets.');
    } else {
      alert('✓ Transaksi Peminjaman Disimpan Offline!\nData disimpan di memori HP Anda. Hubungkan Google Sheets di tab Pengaturan agar sinkron.');
    }

    loadAllData(false);
  };

  const handleLogPemusnahan = async (log: LogPemusnahan) => {
    const updated = await api.savePemusnahan(log);
    setPemusnahans(updated);
    
    // Perbarui state aset sesuai sisa kuantitas aset setelah pemusnahan
    const refreshedAsets = asets.map(a => {
      if (a.id === log.asetId) {
        const sisa = Math.max(0, (a.jumlah || 1) - (log.jumlah || 1));
        return {
          ...a,
          jumlah: sisa,
          kondisi: sisa === 0 ? ('Dihapuskan' as any) : a.kondisi
        };
      }
      return a;
    });
    setAsets(refreshedAsets);
    
    const newLogs = await api.recordAuditLog(
      activeOperator,
      'PEMUSNAHAN_ASET',
      `${log.namaAset} (${log.asetId})`,
      `Penghapusan/Pemusnahan ${log.jumlah} unit via ${log.metode}. SK: ${log.noSkPenghapusan}`
    );
    setAuditLogs(newLogs);

    if (pengaturan.googleAppsScriptUrl) {
      alert('✓ Penghapusan Aset Berhasil!\nStatus aset diubah dan log pemusnahan disinkronkan ke Google Sheets.');
    } else {
      alert('✓ Penghapusan Aset Disimpan Offline!');
    }

    loadAllData(false);
  };

  const handleSavePengaturan = async (cfg: PengaturanSekolah) => {
    const updated = await api.savePengaturan(cfg);
    setPengaturan(updated);

    const newLogs = await api.recordAuditLog(
      activeOperator,
      'UBAH_PENGATURAN',
      `Pengaturan Sekolah`,
      `Memperbarui konfigurasi sistem dan informasi sekolah`
    );
    setAuditLogs(newLogs);

    if (cfg.googleAppsScriptUrl) {
      setSyncStatus('online');
      alert('✓ Konfigurasi Berhasil Disimpan!\nKoneksi Google Sheets & Google Drive Aktif.');
    } else {
      setSyncStatus('offline');
      alert('✓ Konfigurasi Disimpan (Mode Offline/Demo).');
    }
    loadAllData(false);
  };

  const handleSaveBhp = async (item: BarangHabisPakai) => {
    let driveError = false;
    const isEdit = bhp.some(b => b.id === item.id);

    if (item.fotoUrl && item.fotoUrl.startsWith('data:')) {
      try {
        const cloudUrl = await api.uploadPhotoToDrive(item.fotoUrl, `FOTO_BHP_${item.id}.jpg`);
        item.fotoUrl = cloudUrl;
      } catch (e) {
        console.warn('Gagal mengupload foto BHP ke Google Drive. Menyimpan versi lokal offline.', e);
        driveError = true;
      }
    }

    const updated = await api.saveBHP(item);
    setBhp(updated);

    const actionType = isEdit ? 'EDIT_BHP' : 'TAMBAH_BHP';
    const newLogs = await api.recordAuditLog(
      activeOperator,
      actionType,
      `${item.nama} (${item.id})`,
      `Stok awal: ${item.stokAwal}, Stok sekarang: ${item.stokSekarang} ${item.satuan}`
    );
    setAuditLogs(newLogs);

    if (pengaturan.googleAppsScriptUrl) {
      if (driveError) {
        alert('✓ Data BHP disimpan ke Google Sheets!\nNamun upload foto ke Google Drive gagal (foto disimpan sementara di memori HP).');
      } else {
        alert('✓ Sukses!\nData dan foto Barang Habis Pakai berhasil disimpan dan disinkronkan ke Google Sheets & Google Drive.');
      }
    } else {
      alert('✓ Tersimpan Offline!\nData BHP disimpan di memori HP Anda. Agar terbaca di laptop/device lain, hubungkan Google Sheets di tab Pengaturan.');
    }

    loadAllData(false);
  };

  const handleDeleteBhp = async (id: string) => {
    const targetBhp = bhp.find(b => b.id === id);
    const updated = await api.deleteBHP(id);
    setBhp(updated);

    const newLogs = await api.recordAuditLog(
      activeOperator,
      'HAPUS_BHP',
      `${targetBhp?.nama || id} (${id})`,
      `Menghapus data Barang Habis Pakai dari sistem`
    );
    setAuditLogs(newLogs);

    if (pengaturan.googleAppsScriptUrl) {
      alert('✓ Berhasil!\nBarang Habis Pakai telah dihapus dari Google Sheets.');
    } else {
      alert('✓ Berhasil dihapus secara lokal!');
    }
  };

  const handleSavePengambilanBhp = async (pengambilan: PengambilanBHP) => {
    let driveError = false;
    if (pengambilan.buktiFisik && pengambilan.buktiFisik.startsWith('data:')) {
      try {
        const cloudUrl = await api.uploadPhotoToDrive(pengambilan.buktiFisik, `BUKTI_AMBIL_${pengambilan.id}.jpg`);
        pengambilan.buktiFisik = cloudUrl;
      } catch (e) {
        console.warn('Gagal mengupload foto bukti pengambilan ke Google Drive. Menyimpan versi lokal offline.', e);
        driveError = true;
      }
    }

    const updated = await api.savePengambilanBHP(pengambilan);
    setPengambilanBhp(updated);

    const newLogs = await api.recordAuditLog(
      activeOperator,
      'AMBIL_BHP',
      `${pengambilan.namaBhp} (${pengambilan.bhpId})`,
      `Pengambilan ${pengambilan.jumlahDiambil} ${pengambilan.satuan} oleh ${pengambilan.namaPenerima} (${pengambilan.jabatanPenerima})`
    );
    setAuditLogs(newLogs);
    
    const result = await api.getAll();
    setBhp(result.bhp);
    setPengambilanBhp(result.pengambilanBhp);
    
    if (pengaturan.googleAppsScriptUrl) {
      if (driveError) {
        alert('✓ Log Pengambilan BHP disimpan ke Google Sheets!\nNamun upload bukti fisik gagal.');
      } else {
        alert('✓ Sukses!\nPengambilan BHP dan bukti fisik berhasil disimpan dan disinkronkan ke Google Sheets & Google Drive.');
      }
    } else {
      alert('✓ Tersimpan Offline!\nLog pengambilan disimpan di memori HP Anda. Hubungkan Google Sheets di tab Pengaturan agar sinkron.');
    }

    loadAllData(false);
  };

  const handleSaveMasterRuang = async (ruang: MasterRuang) => {
    const updated = await api.saveMasterRuang(ruang, activeOperator);
    setMasterRuangs(updated);
    const newLogs = api.getAuditLogs();
    setAuditLogs(newLogs);
    alert(`✓ Data Master Ruangan "${ruang.nama}" berhasil disimpan!`);
  };

  const handleDeleteMasterRuang = async (id: string) => {
    const updated = await api.deleteMasterRuang(id, activeOperator);
    setMasterRuangs(updated);
    const newLogs = api.getAuditLogs();
    setAuditLogs(newLogs);
    alert('✓ Ruangan berhasil dihapus dari Master Data.');
  };

  const handleOpenScanner = (actionType: 'search' | 'loan_form' | 'aset_form', callback?: (code: string) => void) => {
    setScannerAction(actionType);
    setScannerCallback(() => callback);
    setIsScannerOpen(true);
  };

  const renderLockedTab = (title: string) => {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-xs text-center max-w-xl mx-auto my-8">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-wide">Akses Terbatas: {title}</h2>
        <p className="text-slate-500 mt-3 text-sm leading-relaxed max-w-md">
          Halaman <span className="font-semibold text-slate-700">{title}</span> berisi data sensitif atau konfigurasi sistem dan hanya dapat diakses oleh Administrator {pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button
            onClick={() => setActiveTab('dashboard')}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 text-slate-600 font-bold text-sm rounded-xl transition cursor-pointer"
          >
            Kembali ke Dasbor
          </button>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm rounded-xl transition cursor-pointer shadow-md shadow-indigo-600/15 flex items-center justify-center gap-2"
          >
            <Key size={14} />
            Masuk Sebagai Admin
          </button>
        </div>
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            asets={asets}
            peminjamans={peminjamans}
            pemusnahans={pemusnahans}
            bhp={bhp}
            pengaturan={pengaturan}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        );
      case 'aset':
        return (
          <AsetTab
            asets={asets}
            pengaturan={pengaturan}
            masterRuangs={masterRuangs}
            onSaveAset={handleSaveAset}
            onSaveMultipleAsets={handleSaveMultipleAsets}
            onDeleteAset={handleDeleteAset}
            onLogPemusnahan={handleLogPemusnahan}
            onOpenScanner={handleOpenScanner}
            userRole={userRole}
          />
        );
      case 'master_ruang':
        return userRole === 'admin' ? (
          <MasterRuangManager
            masterRuangs={masterRuangs}
            asets={asets}
            onSaveRuang={handleSaveMasterRuang}
            onDeleteRuang={handleDeleteMasterRuang}
          />
        ) : (
          renderLockedTab('Master Data Ruangan')
        );
      case 'peminjaman':
        return (
          <PeminjamanTab
            peminjamans={peminjamans}
            asets={asets}
            pengaturan={pengaturan}
            onSavePeminjaman={handleSavePeminjaman}
            onOpenScanner={handleOpenScanner}
          />
        );
      case 'bhp':
        return (
          <BhpTab
            bhp={bhp}
            pengambilanBhp={pengambilanBhp}
            pengaturan={pengaturan}
            onSaveBhp={handleSaveBhp}
            onDeleteBhp={handleDeleteBhp}
            onSavePengambilanBhp={handleSavePengambilanBhp}
            userRole={userRole}
          />
        );
      case 'barcode':
        return <BarcodeTab asets={asets} logoUrl={pengaturan.logoUrl} namaSekolah={pengaturan.namaSekolah} />;
      case 'dokumen_sarpras':
        return (
          <DokumenSarprasHub 
            pengaturan={pengaturan} 
            asets={asets} 
            keluhanList={keluhan}
            onRefresh={() => loadAllData(false)}
          />
        );
      case 'laporan':
        return userRole === 'admin' ? (
          <LaporanTab 
            asets={asets} 
            pemusnahans={pemusnahans} 
            pengaturan={pengaturan} 
            auditLogs={auditLogs}
            activeOperator={activeOperator}
            masterRuangs={masterRuangs}
          />
        ) : (
          renderLockedTab('Laporan & Statistik')
        );
      case 'settings':
        return userRole === 'admin' ? (
          <SettingsTab 
            key={JSON.stringify(pengaturan)} 
            pengaturan={pengaturan} 
            onSave={handleSavePengaturan}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        ) : (
          renderLockedTab('Pengaturan Sistem')
        );
      default:
        return <div className="text-center py-12 text-slate-400">Halaman tidak ditemukan</div>;
    }
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'aset', label: 'Data Aset Tetap', icon: <Database size={18} /> },
    { id: 'master_ruang', label: 'Master Ruangan', icon: <DoorOpen size={18} />, adminOnly: true },
    { id: 'peminjaman', label: 'Peminjaman', icon: <BookOpen size={18} /> },
    { id: 'bhp', label: 'Data Barang Habis Pakai (BHP)', icon: <Package size={18} /> },
    { id: 'dokumen_sarpras', label: 'Dokumen Standar Sarpras', icon: <FileCheck2 size={18} /> },
    { id: 'barcode', label: 'Label QR Code', icon: <QrCode size={18} /> },
    { id: 'laporan', label: 'Laporan & KIB', icon: <FileText size={18} />, adminOnly: true },
    { id: 'settings', label: 'Pengaturan', icon: <Settings size={18} />, adminOnly: true }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800" id="app-root">
      
      {/* Sidebar for Desktop */}
      <aside className={`hidden lg:flex flex-col ${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-slate-900 text-slate-200 shrink-0 border-r border-slate-800 transition-all duration-300 relative`}>
        <div className={`p-6 border-b border-slate-800 flex flex-col items-center relative ${isSidebarCollapsed ? 'px-2 py-4' : 'px-6 py-6'}`}>
          <div className={`${isSidebarCollapsed ? 'w-10 h-10' : 'w-16 h-16'} bg-white rounded-full p-1.5 shadow-lg shadow-black/25 flex items-center justify-center mb-3 transition-all duration-300`}>
            <img
              src={pengaturan.logoUrl || SCHOOL_LOGO_BASE64}
              alt="logo SMA Negeri 17 Konawe"
              className={`${isSidebarCollapsed ? 'w-7 h-7' : 'w-12 h-12'} object-contain rounded-full transition-all duration-300`}
            />
          </div>
          {!isSidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h1 className="text-base font-black tracking-wider text-white">E-SARPRAS</h1>
              <p className="text-[10px] text-slate-400 tracking-widest mt-1">{(pengaturan.namaSekolah || 'SMA NEGERI 17 KONAWE').toUpperCase()}</p>
            </motion.div>
          )}

          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-md border border-slate-700 cursor-pointer transition-transform hover:scale-110 active:scale-95 z-50"
            title={isSidebarCollapsed ? "Perbesar Menu" : "Sembunyikan Menu"}
          >
            {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Sync Health Badge */}
        {!isSidebarCollapsed ? (
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/30">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status Database</span>
              <button
                onClick={() => loadAllData(false, true)}
                disabled={isRefreshing}
                className="text-slate-400 hover:text-white transition p-1"
                title="Perbarui Sinkronisasi"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${
                syncStatus === 'online' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
                syncStatus === 'offline' ? 'bg-amber-500 shadow-sm shadow-amber-500/50' :
                'bg-rose-500 animate-pulse'
              }`}></span>
              <span className="text-xs font-bold text-slate-300">
                {syncStatus === 'online' ? 'Google Sheet Aktif' :
                 syncStatus === 'offline' ? 'Database Lokal (Demo)' :
                 'Gangguan Koneksi'}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 border-b border-slate-800/60 bg-slate-950/30 flex flex-col items-center gap-3" title={
            syncStatus === 'online' ? 'Status: Google Sheet Aktif' :
            syncStatus === 'offline' ? 'Status: Database Lokal (Demo)' :
            'Status: Gangguan Koneksi'
          }>
            <span className={`w-3 h-3 rounded-full inline-block ${
              syncStatus === 'online' ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' :
              syncStatus === 'offline' ? 'bg-amber-500 shadow-sm shadow-amber-500/50' :
              'bg-rose-500 animate-pulse'
            }`}></span>
            <button
              onClick={() => loadAllData(false, true)}
              disabled={isRefreshing}
              className="text-slate-400 hover:text-white transition p-1"
              title="Perbarui Sinkronisasi"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        )}

        {/* Active Peran Badge / Controller */}
        {!isSidebarCollapsed ? (
          <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Peran Pengguna</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                userRole === 'admin' 
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                {userRole === 'admin' ? 'Admin' : 'Operator'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              {userRole === 'admin' 
                ? 'Akses penuh ke semua kontrol, laporan & pengaturan.' 
                : 'Bisa menambah/input data tanpa login.'}
            </p>
            <div className="mt-3">
              {userRole === 'admin' ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-1.5 bg-rose-600/10 hover:bg-rose-600/20 active:bg-rose-600/35 text-rose-300 hover:text-white rounded-lg text-[10px] font-bold tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500/20"
                >
                  <LogOut size={10} />
                  Keluar Admin
                </button>
              ) : (
                <button
                  onClick={() => {
                    setPasswordError(null);
                    setPasswordInput('');
                    setIsLoginModalOpen(true);
                  }}
                  className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-[10px] font-bold tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs shadow-indigo-600/10"
                >
                  <Key size={10} />
                  Masuk Admin
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4 border-b border-slate-800/60 flex flex-col items-center gap-3" title={
            userRole === 'admin' ? 'Peran: Admin (Akses Penuh)' : 'Peran: Operator (Tambah Data Tanpa Login)'
          }>
            {userRole === 'admin' ? (
              <button
                onClick={handleLogout}
                className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/20 rounded-lg transition cursor-pointer"
                title="Keluar Admin"
              >
                <Lock size={14} />
              </button>
            ) : (
              <button
                onClick={() => {
                  setPasswordError(null);
                  setPasswordInput('');
                  setIsLoginModalOpen(true);
                }}
                className="p-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white rounded-lg transition cursor-pointer"
                title="Masuk Admin"
              >
                <Key size={14} />
              </button>
            )}
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0 py-3' : 'gap-3.5 px-4 py-3 text-left'} rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                {item.icon}
                {!isSidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom FAB Trigger inside Sidebar */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => handleOpenScanner('search')}
            title="Scanner Kamera"
            className={`w-full bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-white font-bold text-xs ${isSidebarCollapsed ? 'p-3' : 'py-2.5 px-4'} rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm border border-slate-700`}
          >
            <Camera size={14} className="text-indigo-400 animate-pulse" />
            {!isSidebarCollapsed && <span>Scanner Kamera</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-45 lg:hidden flex">
            {/* Backdrop click to close */}
            <div className="absolute inset-0 z-40" onClick={() => setIsMobileMenuOpen(false)} />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-64 bg-slate-900 text-slate-200 h-full flex flex-col border-r border-slate-800 relative z-50"
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-white rounded-full p-0.5 flex items-center justify-center shadow-md">
                    <img
                      src={pengaturan.logoUrl || SCHOOL_LOGO_BASE64}
                      alt="logo SMA Negeri 17 Konawe"
                      className="w-7 h-7 object-contain rounded-full"
                    />
                  </div>
                  <span className="font-black text-white tracking-widest text-sm">E-SARPRAS</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation list for mobile */}
              <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 text-left rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>

              <div className="p-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleOpenScanner('search');
                  }}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <Camera size={14} className="text-indigo-400 animate-pulse" />
                  Scanner Kamera
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Right Content Frame */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        
        {/* Top Header Row */}
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 shrink-0 relative z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 lg:hidden cursor-pointer"
            >
              <Menu size={20} />
            </button>
            <div className="font-extrabold text-sm md:text-base text-slate-800 uppercase tracking-wide">
              {activeTab === 'dashboard' ? 'Dasbor Utama' :
               activeTab === 'aset' ? 'Manajemen Aset Tetap' :
               activeTab === 'peminjaman' ? 'Sirkulasi Peminjaman' :
               activeTab === 'bhp' ? 'Data Barang Habis Pakai (BHP)' :
               activeTab === 'barcode' ? 'Label Barcode' :
               activeTab === 'dokumen_sarpras' ? 'Dokumen Standar Sarpras (Permendagri 47/2021)' :
               activeTab === 'laporan' ? 'Pelaporan Legal & KIB' : 'Konfigurasi Sistem'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Operator Switcher Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 shadow-2xs">
              <UserCheck size={14} className="text-indigo-600 shrink-0" />
              <span className="text-[10px] font-extrabold text-slate-400 hidden lg:inline">Petugas:</span>
              <select
                value={activeOperator}
                onChange={(e) => handleSelectOperator(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 outline-none cursor-pointer py-1"
                title="Pilih Operator / Petugas Sarpras Aktif"
              >
                {AUTHORIZED_USERS.map((user) => (
                  <option key={user} value={user}>
                    {user}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Refresh Icon */}
            <button
              onClick={() => loadAllData(false, true)}
              disabled={isRefreshing}
              className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-500 transition cursor-pointer flex items-center gap-1.5"
              title="Segarkan Sinkronisasi Data"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="text-[10px] font-bold text-slate-400 hidden md:inline">Segarkan & Sinkron</span>
            </button>

            {/* Float Scan Camera */}
            <button
              onClick={() => handleOpenScanner('search')}
              className="p-2 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/70 active:bg-indigo-100 rounded-xl text-indigo-600 transition flex items-center gap-1.5 cursor-pointer"
              title="Buka Scanner Barcode Kamera"
            >
              <Camera size={15} className="animate-pulse" />
              <span className="text-[10px] font-extrabold hidden md:inline">Scanner</span>
            </button>

            {/* Role Header Status Button */}
            <button
              onClick={() => {
                if (userRole === 'admin') {
                  handleLogout();
                } else {
                  setPasswordError(null);
                  setPasswordInput('');
                  setIsLoginModalOpen(true);
                }
              }}
              className={`p-2 rounded-xl border transition flex items-center gap-1.5 cursor-pointer text-[10px] font-extrabold ${
                userRole === 'admin'
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              title={userRole === 'admin' ? "Mode Admin Aktif. Klik untuk keluar." : "Mode Operator (Tanpa Login). Klik untuk masuk sebagai Admin."}
            >
              {userRole === 'admin' ? <ShieldAlert size={14} className="text-emerald-500 animate-pulse" /> : <Lock size={14} className="text-slate-400" />}
              <span>
                {userRole === 'admin' ? 'Admin: Aktif' : 'Masuk Admin'}
              </span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4">
              <RefreshCw size={44} className="text-indigo-600 animate-spin" />
              <div className="text-center">
                <p className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">Menghubungkan Database E-Sarpras</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Memuat datasets inventaris dan konfigurasi sekolah...</p>
              </div>
            </div>
          ) : (
            renderActiveTab()
          )}
        </div>

      </main>

      {/* Global Camera Scanner Modal Overlay */}
      <QRScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        asets={asets}
        peminjamans={peminjamans}
        onQuickReturn={handleSavePeminjaman}
        onSuccessCallback={scannerCallback}
        actionType={scannerAction}
      />

      {/* Admin Login Modal Overlay */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative"
            >
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <ShieldAlert size={24} />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide">Otorisasi Admin</h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Masukkan sandi khusus untuk masuk ke Mode Admin</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Kata Sandi Keamanan</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Masukkan sandi..."
                      className="w-full text-sm pl-4 pr-10 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="text-rose-500 text-[10px] font-bold mt-2 flex items-center gap-1">
                      <X size={12} /> {passwordError}
                    </p>
                  )}
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    🔒 <span className="font-bold text-slate-600">Akses Terlindungi:</span> Masukkan kata sandi petugas sarpras / administrator yang telah terdaftar untuk mengaktifkan izin modifikasi data dan menu Pengaturan.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md shadow-indigo-600/10 cursor-pointer"
                  >
                    Masuk Sekarang
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
