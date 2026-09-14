import React, { useState } from 'react';
import { PengaturanSekolah } from '../types';
import { motion } from 'motion/react';
import { Save, Clipboard, Check, HardDrive, Key, Wifi, WifiOff, Loader2, Upload, RotateCcw, Cloud, Flame, RefreshCw, Trash2, ArrowUpCircle, DoorOpen, School, ShieldCheck, Database } from 'lucide-react';
import { api } from '../api';
import { isFirebaseClientConfigured, getFirebaseClientConfig, saveCustomFirebaseConfig, clearCustomFirebaseConfig, testFirebaseClientConnection } from '../firebaseClient';
import { SCHOOL_LOGO_BASE64 } from '../assets/logoBase64';

interface SettingsTabProps {
  key?: string;
  pengaturan: PengaturanSekolah;
  onSave: (config: PengaturanSekolah) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

function SectionCard({ icon, iconBg, title, subtitle, children, action }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4"
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg shrink-0 ${iconBg}`}>{icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

export default function SettingsTab({ pengaturan, onSave, onNavigateToTab }: SettingsTabProps) {
  const [formData, setFormData] = useState<PengaturanSekolah>({ ...pengaturan });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; projectId?: string } | null>(null);

  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<{ success: boolean; message: string } | null>(null);

  const [backupNotice, setBackupNotice] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [showFirebaseAdvanced, setShowFirebaseAdvanced] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState(() => {
    const existing = getFirebaseClientConfig();
    return existing ? JSON.stringify(existing, null, 2) : '';
  });
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [envCopied, setEnvCopied] = useState(false);

  const checkDbStatus = () => {
    if (isFirebaseClientConfigured()) {
      const cfg = getFirebaseClientConfig();
      setDbStatus({ configured: true, projectId: cfg?.projectId });
    } else {
      setDbStatus({ configured: false });
    }
  };

  React.useEffect(() => {
    checkDbStatus();
  }, []);

  const handleSyncAllToCloud = async () => {
    setIsSyncingAll(true);
    setSyncAllResult(null);
    try {
      const res = await api.syncAllLocalToCloud();
      setSyncAllResult(res);
      checkDbStatus();
    } catch (e: any) {
      setSyncAllResult({
        success: false,
        message: e?.message || 'Gagal menyinkronkan data ke Cloud.'
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const jsonStr = api.exportBackupData();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `backup-sarpras-sman17konawe-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBackupNotice({
        success: true,
        message: 'File cadangan inventaris JSON berhasil diunduh!'
      });
      setTimeout(() => setBackupNotice(null), 4000);
    } catch (e: any) {
      setBackupNotice({
        success: false,
        message: `Gagal mengekspor data: ${e.message}`
      });
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const res = await api.importBackupData(content);
        setBackupNotice(res);
        if (res.success) {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err: any) {
        setBackupNotice({
          success: false,
          message: `Gagal membaca file: ${err.message}`
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const res = saveCustomFirebaseConfig(firebaseConfigInput);
    setFirebaseTestResult(res);
    checkDbStatus();
    if (res.success) {
      setTimeout(() => {
        setFirebaseTestResult(null);
        setShowFirebaseAdvanced(false);
      }, 1500);
    }
  };

  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    setFirebaseTestResult(null);
    try {
      const res = await testFirebaseClientConnection();
      setFirebaseTestResult(res);
      checkDbStatus();
    } catch (e: any) {
      setFirebaseTestResult({ success: false, message: e.message || 'Gagal menguji koneksi Firebase' });
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handleClearFirebase = () => {
    if (confirm('Yakin ingin memutuskan koneksi kustom Firebase di browser ini? (Konfigurasi dari Vercel Environment Variables tidak terpengaruh)')) {
      clearCustomFirebaseConfig();
      setFirebaseConfigInput('');
      setFirebaseTestResult(null);
      checkDbStatus();
    }
  };

  const copyVercelEnv = () => {
    const cfg = getFirebaseClientConfig();
    const envText = `VITE_FIREBASE_API_KEY=${cfg?.apiKey || ''}
VITE_FIREBASE_AUTH_DOMAIN=${cfg?.authDomain || ''}
VITE_FIREBASE_PROJECT_ID=${cfg?.projectId || ''}
VITE_FIREBASE_STORAGE_BUCKET=${cfg?.storageBucket || ''}
VITE_FIREBASE_MESSAGING_SENDER_ID=${cfg?.messagingSenderId || ''}
VITE_FIREBASE_APP_ID=${cfg?.appId || ''}`;

    navigator.clipboard.writeText(envText);
    setEnvCopied(true);
    setTimeout(() => setEnvCopied(false), 2500);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'targetKapasitasSiswa' || name === 'jumlahRombel' || name === 'jumlahSiswaAktif') ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      await onSave(formData);
      setSaveStatus('success');
      checkDbStatus();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="settings-tab">

      {/* ================= KOLOM KIRI: DATABASE & SINKRONISASI ================= */}
      <div className="space-y-6">

        {/* --- Status Koneksi Database (Firebase) --- */}
        <SectionCard
          icon={<Database size={20} className={dbStatus?.configured ? 'text-indigo-600' : 'text-amber-600'} />}
          iconBg={dbStatus?.configured ? 'bg-indigo-50' : 'bg-amber-50'}
          title="Database Cloud (Firebase)"
          subtitle="Satu-satunya penyimpanan aset real-time, terhubung ke semua perangkat"
          action={
            <button type="button" onClick={checkDbStatus} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer" title="Periksa Ulang Status">
              <RefreshCw size={14} />
            </button>
          }
        >
          {dbStatus === null ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-slate-400" size={20} />
            </div>
          ) : dbStatus.configured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-amber-500" />
                  <span className="text-xs font-semibold text-emerald-900">Firebase Firestore Cloud</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider">ONLINE</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Data tersinkronisasi otomatis secara cloud, aman, dan dapat diakses dari HP, laptop, atau perangkat lain — semua membaca data yang sama.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg text-[10px] text-slate-600">
                <div className="font-semibold text-slate-400 mb-0.5">PROJECT FIREBASE:</div>
                <div className="font-mono">{dbStatus.projectId || '-'}</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestFirebase}
                  disabled={isTestingFirebase}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isTestingFirebase ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} className="text-emerald-500" />}
                  Uji Koneksi
                </button>
                <button
                  type="button"
                  onClick={() => setShowFirebaseAdvanced(!showFirebaseAdvanced)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {showFirebaseAdvanced ? 'Tutup Opsi Lanjutan' : 'Opsi Lanjutan'}
                </button>
              </div>
              {firebaseTestResult && (
                <div className={`p-2.5 rounded-lg text-xs font-medium flex items-start gap-2 ${firebaseTestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                  {firebaseTestResult.success ? <Check size={14} className="mt-0.5 text-emerald-600 shrink-0" /> : <WifiOff size={14} className="mt-0.5 text-rose-600 shrink-0" />}
                  <span>{firebaseTestResult.message}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                <span className="text-xs font-semibold text-amber-800">Mode Lokal Browser</span>
                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider">Offline</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Data hanya tersimpan di browser ini, tidak sinkron ke perangkat lain. Hubungkan Firebase agar semua perangkat membaca data yang sama.
              </p>
              <button
                type="button"
                onClick={() => setShowFirebaseAdvanced(true)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Flame size={14} />
                Hubungkan Firebase Firestore
              </button>
            </div>
          )}

          {/* Opsi Lanjutan: override config manual (biasanya tidak perlu jika sudah diatur lewat Vercel) */}
          {showFirebaseAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-50 border border-indigo-100 rounded-xl space-y-3 mt-1"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Flame size={14} className="text-amber-500" />
                  <span>Override Konfigurasi Firebase (Opsional)</span>
                </div>
                <button
                  type="button"
                  onClick={copyVercelEnv}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Salin sebagai variabel lingkungan Vercel"
                >
                  {envCopied ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                  <span>{envCopied ? 'Tersalin!' : 'Salin untuk Vercel (.env)'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Biasanya <strong>tidak perlu diisi</strong> jika konfigurasi Firebase sudah diatur lewat Environment Variables di Vercel. Gunakan ini hanya untuk menguji project Firebase lain langsung dari browser ini. Salin objek <code>firebaseConfig</code> dari Firebase Console &rarr; Project Settings &rarr; General &rarr; Your Apps.
              </p>

              <form onSubmit={handleSaveFirebaseConfig} className="space-y-2.5">
                <textarea
                  rows={6}
                  value={firebaseConfigInput}
                  onChange={(e) => setFirebaseConfigInput(e.target.value)}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "proyek-anda.firebaseapp.com",\n  "projectId": "proyek-anda",\n  "storageBucket": "proyek-anda.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                  className="w-full text-[11px] font-mono p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-tight"
                />
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button type="submit" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition cursor-pointer">
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={handleTestFirebase}
                      disabled={isTestingFirebase}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1 transition cursor-pointer"
                    >
                      {isTestingFirebase ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                      Uji Koneksi
                    </button>
                  </div>
                  {isFirebaseClientConfigured() && (
                    <button type="button" onClick={handleClearFirebase} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer" title="Hapus Override Kustom">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </SectionCard>

        {/* --- Sinkronisasi & Migrasi --- */}
        <SectionCard
          icon={<Cloud size={20} className="text-emerald-600" />}
          iconBg="bg-emerald-50"
          title="Sinkronisasi & Migrasi Data"
          subtitle="Pindahkan data dari browser ini ke Cloud, atau cadangkan sebagai berkas"
        >
          <div className="space-y-3">
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <ArrowUpCircle size={15} className="text-indigo-600" />
                  Unggah Data Browser Ini ke Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Kirim seluruh data aset, peminjaman, BHP, dan pengaturan dari browser ini ke Firestore agar bisa dibaca dari perangkat lain. Data lama di Cloud akan digabung, bukan dihapus.
              </p>
              <button
                type="button"
                onClick={handleSyncAllToCloud}
                disabled={isSyncingAll || !dbStatus?.configured}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isSyncingAll ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Menyinkronkan ke Cloud...
                  </>
                ) : (
                  <>
                    <Cloud size={14} />
                    Unggah Semua Data Lokal ke Cloud
                  </>
                )}
              </button>
              {!dbStatus?.configured && (
                <p className="text-[10px] text-amber-700 mt-1.5">Hubungkan Firebase terlebih dahulu di atas sebelum mengunggah.</p>
              )}
              {syncAllResult && (
                <div className={`mt-2 p-2.5 rounded-lg text-xs font-medium flex items-start gap-1.5 ${syncAllResult.success ? 'bg-emerald-100/70 text-emerald-800' : 'bg-rose-100/70 text-rose-800'}`}>
                  {syncAllResult.success ? <Check size={14} className="mt-0.5 shrink-0" /> : <WifiOff size={14} className="mt-0.5 shrink-0" />}
                  <span>{syncAllResult.message}</span>
                </div>
              )}
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive size={14} className="text-slate-600" />
                Cadangan Berkas (Backup / Restore JSON)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Unduh salinan cadangan offline untuk arsip, atau pulihkan ke browser/perangkat lain — terlepas dari status koneksi Firebase.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <RefreshCw size={13} className="text-emerald-600 rotate-90" />
                  Unduh Backup JSON
                </button>
                <label className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer">
                  <Upload size={13} className="text-indigo-600" />
                  <span>Pulihkan Backup</span>
                  <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportBackup} />
                </label>
              </div>
              {backupNotice && (
                <div className={`mt-2 p-2 rounded-lg text-xs font-medium ${backupNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                  {backupNotice.message}
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* --- Master Data Ruangan --- */}
        <SectionCard
          icon={<DoorOpen size={20} className="text-indigo-600" />}
          iconBg="bg-indigo-50"
          title="Master Data Ruangan"
          subtitle="Kelola daftar resmi ruangan sekolah (Khusus Admin)"
          action={onNavigateToTab ? (
            <button
              type="button"
              onClick={() => onNavigateToTab('master_ruang')}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20 flex items-center gap-1.5 whitespace-nowrap"
            >
              <DoorOpen size={14} />
              <span>Buka</span>
            </button>
          ) : undefined}
        >
          <p className="text-xs text-slate-600 leading-relaxed">
            Petugas penginput aset memilih ruangan dari daftar master ini secara terpusat dan tertib. Penambahan atau penghapusan ruangan hanya dapat dilakukan oleh administrator.
          </p>
        </SectionCard>
      </div>

      {/* ================= KOLOM KANAN: IDENTITAS SEKOLAH & KEAMANAN ================= */}
      <div className="space-y-6">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-5"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <School size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Identitas Sekolah / Satuan Pendidikan</h2>
              <p className="text-xs text-slate-500">Data ini tampil di kop surat, laporan, KIB, dan barcode</p>
            </div>
          </div>

          {/* Logo Sekolah */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
              <img src={formData.logoUrl || SCHOOL_LOGO_BASE64} alt="Logo Sekolah" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-xs font-bold text-slate-800">Logo Resmi Sekolah</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">Aktif</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Digunakan pada kop surat laporan, kartu riwayat pemeliharaan, KIB, stiker barcode, dan berkas BMD.
              </p>
              <div className="mt-2 flex items-center justify-center sm:justify-start gap-2">
                <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer transition">
                  <Upload size={12} />
                  <span>Ganti Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          if (result) setFormData(prev => ({ ...prev, logoUrl: result }));
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
                {formData.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, logoUrl: '' }))}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition"
                    title="Kembalikan ke logo bawaan"
                  >
                    <RotateCcw size={12} />
                    <span>Reset Bawaan</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Nama Sekolah</label>
              <input type="text" name="namaSekolah" value={formData.namaSekolah} onChange={handleInputChange}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">NPSN</label>
                <input type="text" name="npsn" value={formData.npsn} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Target Kapasitas Siswa</label>
                <input type="number" name="targetKapasitasSiswa" value={formData.targetKapasitasSiswa} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Jumlah Rombel (Kelas)</label>
                <input type="number" name="jumlahRombel" value={formData.jumlahRombel ?? 16} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" required />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Jumlah Siswa Aktif</label>
                <input type="number" name="jumlahSiswaAktif" value={formData.jumlahSiswaAktif ?? 400} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" required />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Alamat Sekolah</label>
              <textarea name="alamat" rows={2} value={formData.alamat} onChange={handleInputChange}
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Kepala Sekolah</label>
                <input type="text" name="kepalaSekolah" value={formData.kepalaSekolah} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none" required />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">NIP Kepala Sekolah</label>
                <input type="text" name="nipKepalaSekolah" value={formData.nipKepalaSekolah} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Wakasek Sarpras</label>
                <input type="text" name="namaPetugasSarpras" value={formData.namaPetugasSarpras} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none" required />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">NIP Wakasek Sarpras</label>
                <input type="text" name="nipPetugasSarpras" value={formData.nipPetugasSarpras} onChange={handleInputChange}
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none" />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              Keamanan & Akses Admin
            </h3>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Sandi / PIN Keamanan Admin</label>
              <input
                type="text"
                name="adminPassword"
                value={formData.adminPassword || 'admin123'}
                onChange={handleInputChange}
                placeholder="Masukkan sandi keamanan admin"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                *Sandi ini digunakan saat masuk ke mode Admin untuk mengedit data, menghapus data, melihat laporan, atau membuka menu Pengaturan ini.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Save size={16} />
            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>

          {saveStatus === 'success' && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs text-center font-medium animate-pulse">
              ✓ Pengaturan berhasil disimpan!
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs text-center font-medium">
              ✗ Gagal menyinkronkan pengaturan ke Cloud. Tersimpan secara lokal.
            </div>
          )}
        </motion.form>
      </div>
    </div>
  );
}
