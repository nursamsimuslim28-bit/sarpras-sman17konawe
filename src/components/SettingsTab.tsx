import React, { useState } from 'react';
import { PengaturanSekolah } from '../types';
import { motion } from 'motion/react';
import { Save, Clipboard, Check, HelpCircle, HardDrive, FileSpreadsheet, Key, Wifi, WifiOff, Loader2, Image as ImageIcon, Upload, RotateCcw, Cloud, Flame, RefreshCw, Trash2, ExternalLink, Download, Folder, ArrowUpCircle, DoorOpen } from 'lucide-react';
import { api } from '../api';
import { isFirebaseClientConfigured, getFirebaseClientConfig, saveCustomFirebaseConfig, clearCustomFirebaseConfig, testFirebaseClientConnection } from '../firebaseClient';
import { SCHOOL_LOGO_BASE64 } from '../assets/logoBase64';

interface SettingsTabProps {
  key?: string;
  pengaturan: PengaturanSekolah;
  onSave: (config: PengaturanSekolah) => Promise<void>;
  onNavigateToTab?: (tab: string) => void;
}

export default function SettingsTab({ pengaturan, onSave, onNavigateToTab }: SettingsTabProps) {
  const [formData, setFormData] = useState<PengaturanSekolah>({ ...pengaturan });
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [supabaseConfig, setSupabaseConfig] = useState<{ configured: boolean; url?: string } | null>(null);

  // Sync all to Cloud state
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllResult, setSyncAllResult] = useState<{ success: boolean; message: string } | null>(null);

  // Backup / Restore states
  const [backupNotice, setBackupNotice] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Firebase Client Config States
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState(() => {
    const existing = getFirebaseClientConfig();
    return existing ? JSON.stringify(existing, null, 2) : '';
  });
  const [firebaseTestResult, setFirebaseTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [envCopied, setEnvCopied] = useState(false);

  const checkDbStatus = () => {
    // 1. Cek Google Sheets yang sudah terkonfigurasi secara permanen
    const scriptUrl = formData.googleAppsScriptUrl || pengaturan.googleAppsScriptUrl;
    const isGoogleSheetsActive = !!(scriptUrl && scriptUrl.trim() !== '');

    if (isGoogleSheetsActive) {
      setSupabaseConfig({
        configured: true,
        url: 'Google Sheets Spreadsheet Cloud Database'
      });
      return;
    }

    fetch('/api/supabase/status')
      .then(res => res.json())
      .then(data => {
        if (data && data.configured) {
          setSupabaseConfig({
            configured: true,
            url: 'Firebase Firestore Enterprise (Server-Side Proxy)'
          });
        } else if (isFirebaseClientConfigured()) {
          const cfg = getFirebaseClientConfig();
          setSupabaseConfig({
            configured: true,
            url: `Firebase Firestore Client SDK (Project: ${cfg?.projectId || 'Terkonfigurasi'})`
          });
        } else {
          setSupabaseConfig({ configured: false });
        }
      })
      .catch(() => {
        if (isFirebaseClientConfigured()) {
          const cfg = getFirebaseClientConfig();
          setSupabaseConfig({
            configured: true,
            url: `Firebase Firestore Client SDK (Project: ${cfg?.projectId || 'Terkonfigurasi'})`
          });
        } else {
          setSupabaseConfig({ configured: false });
        }
      });
  };

  React.useEffect(() => {
    checkDbStatus();
  }, []);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await api.testConnection(formData.googleAppsScriptUrl);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Gagal menghubungi server Google Apps Script.'
      });
    } finally {
      setIsTesting(false);
    }
  };

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
        setShowFirebaseModal(false);
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
    if (confirm('Yakin ingin memutuskan koneksi Firebase kustom di browser ini?')) {
      clearCustomFirebaseConfig();
      setFirebaseConfigInput('');
      setFirebaseTestResult(null);
      checkDbStatus();
    }
  };

  const copyVercelEnv = () => {
    const cfg = getFirebaseClientConfig();
    const envText = `# Environment Variables untuk Vercel / GitHub
VITE_FIREBASE_API_KEY="${cfg?.apiKey || ''}"
VITE_FIREBASE_AUTH_DOMAIN="${cfg?.authDomain || ''}"
VITE_FIREBASE_PROJECT_ID="${cfg?.projectId || ''}"
VITE_FIREBASE_STORAGE_BUCKET="${cfg?.storageBucket || ''}"
VITE_FIREBASE_MESSAGING_SENDER_ID="${cfg?.messagingSenderId || ''}"
VITE_FIREBASE_APP_ID="${cfg?.appId || ''}"
VITE_FIREBASE_DATABASE_ID="${cfg?.firestoreDatabaseId || '(default)'}"`;

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

  const copyScriptCode = () => {
    navigator.clipboard.writeText(googleAppsScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const googleAppsScriptCode = `/**
 * BACKEND E-SARPRAS SEKOLAH - GOOGLE APPS SCRIPT
 * Hubungkan sistem Sarpras Anda dengan Google Sheets & Google Drive.
 * Simpan kode ini di https://script.google.com kemudian Deploy sebagai Web App.
 * Akses Web App harus diatur ke: "Anyone" (Siapa saja, bahkan anonim).
 */

function doGet(e) {
  setupDatabase();
  
  // Jika dijalankan manual dari editor tanpa parameter e (untuk pengetesan izin/otorisasi)
  if (!e || !e.parameter) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Koneksi Berhasil! Fungsi doGet berjalan dengan baik. Google Apps Script Anda telah aktif dan memiliki izin yang diperlukan.' 
    })).setMimeType(ContentService.MimeType.JSON);
  }

  var action = e.parameter.action;
  
  if (action === 'get_all') {
    var data = loadAllData();
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Action tidak valid' }))
                       .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  setupDatabase();
  var result = { status: 'error', message: 'Unknown error' };
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Request body kosong atau tidak valid (Jalankan doPost via Web App, bukan tombol Run).' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action;
    
    if (action === 'save_aset') {
      saveRow('Data_Sarpras', postData.data);
      result = { status: 'success', message: 'Aset berhasil disimpan' };
    } else if (action === 'delete_aset') {
      deleteRow('Data_Sarpras', postData.id);
      result = { status: 'success', message: 'Aset berhasil dihapus' };
    } else if (action === 'save_peminjaman') {
      saveRow('Data_Peminjaman', postData.data);
      result = { status: 'success', message: 'Peminjaman berhasil disimpan' };
    } else if (action === 'save_pemusnahan') {
      insertRow('Log_Pemusnahan', postData.data);
      result = { status: 'success', message: 'Pemusnahan berhasil dicatat' };
    } else if (action === 'save_pengaturan') {
      savePengaturanToSheet(postData.data);
      result = { status: 'success', message: 'Pengaturan berhasil diperbarui' };
    } else if (action === 'upload_file') {
      var folderId = getFolderId();
      var fileData = postData.data ? postData.data.fileData : postData.fileData;
      var fileName = postData.data ? postData.data.fileName : postData.fileName;
      var fileUrl = uploadFileToDrive(fileData, fileName, folderId);
      result = { status: 'success', fileUrl: fileUrl };
    } else if (action === 'save_bhp') {
      saveRow('Data_BHP', postData.data);
      result = { status: 'success', message: 'BHP berhasil disimpan' };
    } else if (action === 'delete_bhp') {
      deleteRow('Data_BHP', postData.id);
      result = { status: 'success', message: 'BHP berhasil dihapus' };
    } else if (action === 'save_pengambilan_bhp') {
      saveRow('Log_Pengambilan_BHP', postData.data);
      result = { status: 'success', message: 'Pengambilan BHP berhasil disimpan' };
    } else if (action === 'save_master_ruang') {
      saveRow('Data_Ruangan', postData.data);
      result = { status: 'success', message: 'Data ruangan berhasil disimpan' };
    } else if (action === 'delete_master_ruang') {
      deleteRow('Data_Ruangan', postData.id);
      result = { status: 'success', message: 'Data ruangan berhasil dihapus' };
    }
  } catch (err) {
    result = { status: 'error', message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
                       .setMimeType(ContentService.MimeType.JSON);
}

function getFolderId() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pengaturan');
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (data[i][0] === 'googleDriveFolderId') {
        return data[i][1];
      }
    }
  }
  return '';
}

function savePengaturanToSheet(config) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Pengaturan');
  sheet.clearContents();
  sheet.appendRow(['Kunci', 'Nilai']);
  Object.keys(config).forEach(function(key) {
    sheet.appendRow([key, config[key]]);
  });
}

function uploadFileToDrive(base64Str, filename, folderId) {
  var parts = base64Str.split(',');
  var cleanBase64 = parts.length > 1 ? parts[1] : parts[0];
  var data = Utilities.base64Decode(cleanBase64);
  var blob = Utilities.newBlob(data, 'image/jpeg', filename);
  
  var folder;
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    // Default folder
    var folders = DriveApp.getFoldersByName('E-Sarpras Foto Barang');
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder('E-Sarpras Foto Barang');
    }
  }
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  // Ambil URL langsung untuk gambar
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}

function loadAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return {
    asets: getSheetDataAsObjects(ss.getSheetByName('Data_Sarpras')),
    peminjamans: getSheetDataAsObjects(ss.getSheetByName('Data_Peminjaman')),
    pemusnahans: getSheetDataAsObjects(ss.getSheetByName('Log_Pemusnahan')),
    pengaturan: getPengaturanAsObject(ss.getSheetByName('Pengaturan')),
    bhp: getSheetDataAsObjects(ss.getSheetByName('Data_BHP')),
    pengambilanBhp: getSheetDataAsObjects(ss.getSheetByName('Log_Pengambilan_BHP')),
    masterRuangs: getSheetDataAsObjects(ss.getSheetByName('Data_Ruangan'))
  };
}

function getPengaturanAsObject(sheet) {
  if (!sheet) return {};
  var data = sheet.getDataRange().getValues();
  var obj = {};
  for (var i = 1; i < data.length; i++) {
    var k = data[i][0];
    var v = data[i][1];
    if (k === 'targetKapasitasSiswa' || k === 'jumlahRombel' || k === 'jumlahSiswaAktif') {
      obj[k] = parseInt(v) || 0;
    } else {
      obj[k] = v;
    }
  }
  return obj;
}

function getSheetDataAsObjects(sheet) {
  if (!sheet) return [];
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length <= 1) return [];
  
  var headers = values[0];
  var result = [];
  
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j];
      var cellVal = row[j];
      
      // Parse data types
      if (header === 'jumlah' || header === 'tahunPerolehan' || header === 'jumlahPinjam' || header === 'stokAwal' || header === 'stokSekarang' || header === 'jumlahDiambil') {
        obj[header] = parseInt(cellVal) || 0;
      } else {
        obj[header] = cellVal;
      }
    }
    result.push(obj);
  }
  return result;
}

function saveRow(sheetName, obj) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  
  var idIndex = headers.indexOf('id');
  var foundRowIndex = -1;
  
  if (idIndex !== -1) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] === obj.id) {
        foundRowIndex = i + 1; // 1-based index for row
        break;
      }
    }
  }
  
  var rowValues = headers.map(function(header) {
    return obj[header] !== undefined ? obj[header] : '';
  });
  
  if (foundRowIndex !== -1) {
    sheet.getRange(foundRowIndex, 1, 1, headers.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function insertRow(sheetName, obj) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var headers = sheet.getDataRange().getValues()[0];
  var rowValues = headers.map(function(header) {
    return obj[header] !== undefined ? obj[header] : '';
  });
  sheet.appendRow(rowValues);
}

function deleteRow(sheetName, id) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf('id');
  
  if (idIndex !== -1) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] === id) {
        sheet.deleteRow(i + 1);
        break;
      }
    }
  }
}

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Data_Sarpras
  var shAset = ss.getSheetByName('Data_Sarpras');
  if (!shAset) {
    shAset = ss.insertSheet('Data_Sarpras');
    shAset.appendRow([
      'id', 'nama', 'merek', 'spesifikasi', 'kategori', 'ruangLokasi', 
      'jumlah', 'satuan', 'kondisi', 'sumberDana', 'tahunPerolehan', 
      'fotoUrl', 'catatan', 'tanggalRegister'
    ]);
  }
  
  // 2. Data_Peminjaman
  var shPinjam = ss.getSheetByName('Data_Peminjaman');
  if (!shPinjam) {
    shPinjam = ss.insertSheet('Data_Peminjaman');
    shPinjam.appendRow([
      'id', 'asetId', 'namaAset', 'namaPeminjam', 'jabatanPeminjam', 
      'tanggalPinjam', 'tanggalTargetKembali', 'tanggalKembaliAktual', 
      'jumlahPinjam', 'status', 'keterangan'
    ]);
  }
  
  // 3. Log_Pemusnahan
  var shMusnah = ss.getSheetByName('Log_Pemusnahan');
  if (!shMusnah) {
    shMusnah = ss.insertSheet('Log_Pemusnahan');
    shMusnah.appendRow([
      'id', 'asetId', 'namaAset', 'jumlah', 'tanggalPemusnahan', 
      'metode', 'alasan', 'noSkPenghapusan', 'petugasEksekusi', 'catatan'
    ]);
  }
  
  // 4. Pengaturan
  var shConfig = ss.getSheetByName('Pengaturan');
  if (!shConfig) {
    shConfig = ss.insertSheet('Pengaturan');
    shConfig.appendRow(['Kunci', 'Nilai']);
  }

  // 5. Data_BHP
  var shBhp = ss.getSheetByName('Data_BHP');
  if (!shBhp) {
    shBhp = ss.insertSheet('Data_BHP');
    shBhp.appendRow([
      'id', 'nama', 'merek', 'kategori', 'stokAwal', 'stokSekarang', 
      'satuan', 'lokasiPenyimpanan', 'catatan', 'fotoUrl'
    ]);
  }
  
  // 6. Log_Pengambilan_BHP
  var shAmbilBhp = ss.getSheetByName('Log_Pengambilan_BHP');
  if (!shAmbilBhp) {
    shAmbilBhp = ss.insertSheet('Log_Pengambilan_BHP');
    shAmbilBhp.appendRow([
      'id', 'bhpId', 'namaBhp', 'namaPenerima', 'jabatanPenerima', 
      'tanggalAmbil', 'jumlahDiambil', 'satuan', 'keterangan', 'buktiFisik'
    ]);
  }

  // 7. Data_Ruangan (Master Data Ruangan)
  var shRuang = ss.getSheetByName('Data_Ruangan');
  if (!shRuang) {
    shRuang = ss.insertSheet('Data_Ruangan');
    shRuang.appendRow([
      'id', 'kode', 'nama', 'kategori', 'penanggungJawab', 'nipPj', 'kapasitas', 'luasM2', 'keterangan'
    ]);
  }
}
`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8" id="settings-tab">
      {/* Kiri: Form Identitas & Apps Script */}
      <div className="lg:col-span-5 space-y-6">
        {/* Status Database Utama - Firebase Cloud DB */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${supabaseConfig?.configured ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'}`}>
                <HardDrive size={20} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Status Database Utama</h2>
                <p className="text-xs text-slate-500">Penyimpanan aset real-time sekolah</p>
              </div>
            </div>
            <button
              type="button"
              onClick={checkDbStatus}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Periksa Ulang Status Database"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {supabaseConfig === null ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-slate-400" size={20} />
            </div>
          ) : supabaseConfig.configured ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  {supabaseConfig.url?.includes('Google Sheets') ? (
                    <FileSpreadsheet size={16} className="text-emerald-600" />
                  ) : (
                    <Flame size={16} className="text-amber-500" />
                  )}
                  <span className="text-xs font-semibold text-emerald-900">
                    {supabaseConfig.url?.includes('Google Sheets') ? 'Google Sheets Cloud Database' : 'Firebase Firestore Cloud'}
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider">ONLINE</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {supabaseConfig.url?.includes('Google Sheets')
                  ? 'Aplikasi Anda terhubung langsung ke **Google Sheets Spreadsheet**. Data tersinkronisasi otomatis secara cloud, aman, dan tersimpan di Google Drive sekolah.'
                  : 'Aplikasi Anda terhubung langsung ke **Firebase Firestore Enterprise**. Data tersinkronisasi otomatis secara cloud, aman, dan dapat diakses multi-perangkat.'}
              </p>
              <div className="p-3 bg-slate-50 rounded-lg space-y-1 text-[10px] text-slate-600">
                <div className="font-semibold text-slate-400">DETAIL KONEKSI:</div>
                <div className="font-mono break-all">{supabaseConfig.url || 'Database Cloud Active'}</div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {supabaseConfig.url?.includes('Google Sheets') ? (
                  <>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={isTesting || !formData.googleAppsScriptUrl}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} className="text-emerald-600" />}
                      Uji Google Sheets
                    </button>
                    {(formData.googleSpreadsheetUrl || formData.googleAppsScriptUrl) && (
                      <a
                        href={formData.googleSpreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1laYSmeUNv7swa-Al8XJ_nxXFy_tj9W170hpnSvOM_TY/edit'}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition shadow-sm"
                        title="Buka Spreadsheet Google Sheet di Tab Baru"
                      >
                        <FileSpreadsheet size={13} />
                        Buka Google Sheet <ExternalLink size={11} />
                      </a>
                    )}
                    {formData.googleDriveFolderId && (
                      <a
                        href={`https://drive.google.com/drive/folders/${formData.googleDriveFolderId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition"
                        title="Buka Folder Google Drive Tempat Foto/Data Disimpan"
                      >
                        <Folder size={13} className="text-sky-600" />
                        Buka Folder Drive <ExternalLink size={11} />
                      </a>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleTestFirebase}
                    disabled={isTestingFirebase}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {isTestingFirebase ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} className="text-emerald-500" />}
                    Uji Firebase
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFirebaseModal(!showFirebaseModal)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                >
                  {showFirebaseModal ? 'Tutup Opsi Firebase' : 'Opsi Firebase'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                <span className="text-xs font-semibold text-amber-800">Local Cache Mode</span>
                <span className="px-2 py-0.5 bg-amber-500 text-white font-bold text-[10px] rounded-full uppercase tracking-wider">Lokal / Offline</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Aplikasi saat ini berjalan dalam mode lokal browser. Jika Anda men-deploy ke <strong>Vercel</strong> atau <strong>GitHub</strong>, masukkan konfigurasi Firebase Web SDK di bawah atau gunakan Google Sheets.
              </p>
              <button
                type="button"
                onClick={() => setShowFirebaseModal(true)}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
              >
                <Flame size={14} />
                Hubungkan Firebase Firestore (Vercel Ready)
              </button>
            </div>
          )}

          {/* Panel Konfigurasi Firebase Web Client */}
          {showFirebaseModal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-slate-50 border border-indigo-100 rounded-xl space-y-3 mt-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Flame size={14} className="text-amber-500" />
                  <span>Konfigurasi Firebase Web SDK</span>
                </div>
                <button
                  type="button"
                  onClick={copyVercelEnv}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                  title="Salin variabel lingkungan untuk Vercel"
                >
                  {envCopied ? <Check size={12} className="text-emerald-600" /> : <Clipboard size={12} />}
                  <span>{envCopied ? 'Tersalin!' : 'Salin untuk Vercel (.env)'}</span>
                </button>
              </div>

              <p className="text-[10px] text-slate-500 leading-relaxed">
                Salin objek <code>firebaseConfig</code> dari <em>Firebase Console &rarr; Project Settings &rarr; General &rarr; Your Apps &rarr; SDK Setup/Config</em> dan tempelkan di bawah ini:
              </p>

              <form onSubmit={handleSaveFirebaseConfig} className="space-y-2.5">
                <textarea
                  rows={6}
                  value={firebaseConfigInput}
                  onChange={(e) => setFirebaseConfigInput(e.target.value)}
                  placeholder={`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "proyek-anda.firebaseapp.com",\n  "projectId": "proyek-anda",\n  "storageBucket": "proyek-anda.appspot.com",\n  "messagingSenderId": "...",\n  "appId": "..."\n}`}
                  className="w-full text-[11px] font-mono p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition leading-tight"
                />

                {firebaseTestResult && (
                  <div className={`p-2.5 rounded-lg text-xs font-medium flex items-start gap-2 ${firebaseTestResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                    {firebaseTestResult.success ? (
                      <Check size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                    ) : (
                      <WifiOff size={14} className="mt-0.5 text-rose-600 shrink-0" />
                    )}
                    <span>{firebaseTestResult.message}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition cursor-pointer"
                    >
                      Simpan Firebase
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
                    <button
                      type="button"
                      onClick={handleClearFirebase}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus / Reset Konfigurasi Firebase"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Key size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Koneksi Backend & API</h2>
              <p className="text-xs text-slate-500">Hubungkan frontend dengan database Google Sheets Anda</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Google Spreadsheet URL (Database Utama)
                </label>
                {(formData.googleSpreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1laYSmeUNv7swa-Al8XJ_nxXFy_tj9W170hpnSvOM_TY/edit') && (
                  <a
                    href={formData.googleSpreadsheetUrl || 'https://docs.google.com/spreadsheets/d/1laYSmeUNv7swa-Al8XJ_nxXFy_tj9W170hpnSvOM_TY/edit'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold inline-flex items-center gap-1"
                    title="Buka Spreadsheet di Tab Baru"
                  >
                    <FileSpreadsheet size={12} />
                    <span>Buka Sheet</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <input
                type="url"
                name="googleSpreadsheetUrl"
                value={formData.googleSpreadsheetUrl || ''}
                onChange={handleInputChange}
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                *Tautan spreadsheet resmi sarpras sekolah Anda. Klik tombol "Buka Sheet" di kanan atas untuk langsung melihat lembar kerja.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Google Apps Script Web App URL (Jalur Data)
                </label>
                {formData.googleAppsScriptUrl && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                    Endpoint Aktif
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  name="googleAppsScriptUrl"
                  value={formData.googleAppsScriptUrl}
                  onChange={handleInputChange}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !formData.googleAppsScriptUrl}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer"
                >
                  {isTesting ? (
                    <Loader2 size={14} className="animate-spin text-slate-500" />
                  ) : (
                    <Wifi size={14} className="text-emerald-500" />
                  )}
                  Uji Koneksi
                </button>
              </div>
              {testResult && (
                <div className={`mt-2 p-3 rounded-lg text-xs font-medium flex items-start gap-2 ${testResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                  {testResult.success ? (
                    <Check size={14} className="mt-0.5 text-emerald-600 shrink-0" />
                  ) : (
                    <WifiOff size={14} className="mt-0.5 text-rose-600 shrink-0" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                *Jalur API Web App Google Apps Script untuk mengirim dan menerima data secara otomatis.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-slate-700">
                  Google Drive Folder ID (Untuk Foto)
                </label>
                {formData.googleDriveFolderId && (
                  <a
                    href={`https://drive.google.com/drive/folders/${formData.googleDriveFolderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold inline-flex items-center gap-1"
                    title="Buka Folder Google Drive"
                  >
                    <Folder size={12} />
                    <span>Buka Folder Drive</span>
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <input
                type="text"
                name="googleDriveFolderId"
                value={formData.googleDriveFolderId}
                onChange={handleInputChange}
                placeholder="1aBcD...zXyW"
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                *Masukkan ID Folder Google Drive Anda agar foto-foto aset sekolah disimpan secara terpusat dengan kapasitas besar sekolah Anda.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 mb-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                Identitas Sekolah / Satuan Pendidikan
              </h3>
              
              {/* Logo Sekolah Preview & Upload */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-3 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                  <img
                    src={formData.logoUrl || SCHOOL_LOGO_BASE64}
                    alt="Logo Sekolah"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="text-xs font-bold text-slate-800">Logo Resmi SMAN 17 Konawe</span>
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
                              if (result) {
                                setFormData(prev => ({ ...prev, logoUrl: result }));
                              }
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
                  <input
                    type="text"
                    name="namaSekolah"
                    value={formData.namaSekolah}
                    onChange={handleInputChange}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">NPSN</label>
                    <input
                      type="text"
                      name="npsn"
                      value={formData.npsn}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Target Kapasitas Siswa</label>
                    <input
                      type="number"
                      name="targetKapasitasSiswa"
                      value={formData.targetKapasitasSiswa}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Jumlah Rombel (Kelas)</label>
                    <input
                      type="number"
                      name="jumlahRombel"
                      value={formData.jumlahRombel ?? 16}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Jumlah Siswa Aktif Terdaftar</label>
                    <input
                      type="number"
                      name="jumlahSiswaAktif"
                      value={formData.jumlahSiswaAktif ?? 400}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Alamat Sekolah</label>
                  <textarea
                    name="alamat"
                    rows={2}
                    value={formData.alamat}
                    onChange={handleInputChange}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Kepala Sekolah</label>
                    <input
                      type="text"
                      name="kepalaSekolah"
                      value={formData.kepalaSekolah}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">NIP Kepala Sekolah</label>
                    <input
                      type="text"
                      name="nipKepalaSekolah"
                      value={formData.nipKepalaSekolah}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Wakasek Sarpras</label>
                    <input
                      type="text"
                      name="namaPetugasSarpras"
                      value={formData.namaPetugasSarpras}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">NIP Wakasek Sarpras</label>
                    <input
                      type="text"
                      name="nipPetugasSarpras"
                      value={formData.nipPetugasSarpras}
                      onChange={handleInputChange}
                      className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    Akses Kontrol & Sandi Admin
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
                      *Sandi ini digunakan saat masuk ke mode Admin untuk melakukan edit data, hapus data, melihat laporan, atau membuka menu pengaturan ini.
                    </p>
                  </div>
                </div>
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
                ✓ Pengaturan berhasil disimpan secara dinamis!
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs text-center font-medium">
                ✗ Gagal menyinkronkan pengaturan ke Google Apps Script. Mempertahankan penyimpanan lokal.
              </div>
            )}
          </form>
        </motion.div>

        {/* Panel Master Data Ruangan Khusus Admin */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <DoorOpen size={20} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-800">Master Data Ruangan</h2>
                <p className="text-xs text-slate-500">Kelola daftar resmi ruangan sekolah (Khusus Admin)</p>
              </div>
            </div>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('master_ruang')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm shadow-indigo-600/20 flex items-center gap-1.5"
              >
                <DoorOpen size={14} />
                <span>Buka Master Ruang</span>
              </button>
            )}
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Petugas penginput aset memilih ruangan dari daftar master ini secara terpusat dan tertib. Penambahan atau penghapusan ruangan hanya dapat dilakukan oleh administrator.
          </p>
        </motion.div>

        {/* Panel Sinkronisasi & Migrasi / Backup Data */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4"
        >
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <Cloud size={20} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Sinkronisasi & Migrasi Data</h2>
              <p className="text-xs text-slate-500">Pindahkan seluruh data lokal ke Cloud atau antar perangkat</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                  <ArrowUpCircle size={15} className="text-indigo-600" />
                  Paksa Sinkronkan Semua ke Cloud
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Kirim seluruh data aset (12 aset), peminjaman, BHP, dan pengaturan dari browser ini langsung ke Google Sheets / Firestore agar terbaca di Vercel atau browser lain.
              </p>
              <button
                type="button"
                onClick={handleSyncAllToCloud}
                disabled={isSyncingAll}
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
              {syncAllResult && (
                <div className={`mt-2 p-2.5 rounded-lg text-xs font-medium flex items-start gap-1.5 ${syncAllResult.success ? 'bg-emerald-100/70 text-emerald-800' : 'bg-rose-100/70 text-rose-800'}`}>
                  {syncAllResult.success ? <Check size={14} className="mt-0.5 shrink-0" /> : <WifiOff size={14} className="mt-0.5 shrink-0" />}
                  <span>{syncAllResult.message}</span>
                </div>
              )}
            </div>

            {/* Ekspor / Impor JSON Cadangan */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <HardDrive size={14} className="text-slate-600" />
                Cadangan Berkas (Backup / Restore JSON)
              </span>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Unduh salinan berkas cadangan offline untuk arsip atau impor ke website yang berjalan di Vercel/domain lain.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  <Download size={13} className="text-emerald-600" />
                  Unduh Backup JSON
                </button>
                <label className="py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition shadow-2xs cursor-pointer">
                  <Upload size={13} className="text-indigo-600" />
                  <span>Pulihkan Backup</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleImportBackup}
                  />
                </label>
              </div>
              {backupNotice && (
                <div className={`mt-2 p-2 rounded-lg text-xs font-medium ${backupNotice.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'}`}>
                  {backupNotice.message}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Kanan: Instruksi Setup & Kode GAS */}
      <div className="lg:col-span-7 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-slate-900 text-slate-200 p-6 rounded-2xl shadow-xl border border-slate-800"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-800 text-amber-400 rounded-lg">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Kode Google Apps Script</h2>
                <p className="text-xs text-slate-400">Instal backend serverless gratis untuk e-Sarpras Anda</p>
              </div>
            </div>
            <button
              onClick={copyScriptCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-semibold text-white rounded-lg flex items-center gap-2 transition cursor-pointer"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Clipboard size={14} />}
              {copied ? 'Tersalin!' : 'Salin Kode'}
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 overflow-x-auto max-h-[360px] overflow-y-auto mb-6">
            <pre className="text-xs font-mono text-emerald-400 leading-relaxed whitespace-pre-wrap select-all">
              {googleAppsScriptCode}
            </pre>
          </div>

          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <HelpCircle size={16} className="text-indigo-400" />
            Langkah-Langkah Integrasi Backend (Google Sheets & Drive)
          </h3>
          <ol className="space-y-3 text-xs text-slate-400 leading-relaxed list-decimal pl-4">
            <li>
              Buka <a href="https://sheets.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-indigo-300">Google Sheets</a> baru, beri nama <span className="text-white font-medium">Database E-Sarpras Sekolah</span>.
            </li>
            <li>
              Di menu atas, pilih <span className="text-white font-medium">Extensions (Ekstensi) &gt; Apps Script</span>.
            </li>
            <li>
              Hapus semua kode default di dalam editor Apps Script, lalu <span className="text-white font-medium">tempel (paste) kode di atas</span> yang telah disalin.
            </li>
            <li>
              Klik ikon <span className="text-white font-medium">Save (Simpan / Ctrl+S)</span>.
            </li>
            <li>
              Klik tombol <span className="text-white font-medium">Deploy &gt; New deployment (Penerapan baru)</span>.
            </li>
            <li>
              Klik ikon gerigi di sebelah Select type, pilih <span className="text-white font-medium">Web app</span>. Isikan deskripsi, setel <span className="text-white font-medium">Execute as</span> ke <span className="text-indigo-300 font-semibold">Me (akun anda)</span>, dan ubah <span className="text-white font-medium">Who has access</span> ke <span className="text-emerald-400 font-semibold">Anyone (Siapa saja)</span>.
            </li>
            <li>
              Klik <span className="text-white font-medium">Deploy</span>. Berikan otorisasi akses Google Drive dan Sheets jika diminta oleh Google.
            </li>
            <li>
              Salin <span className="text-white font-medium">Web App URL</span> yang diperoleh, lalu tempelkan di form <span className="text-white font-medium">Google Apps Script Web App URL</span> di sebelah kiri Anda.
            </li>
            <li>
              <span className="text-amber-400 font-semibold">Untuk Mengaktifkan Penyimpanan Foto</span>: Buat folder kosong di Google Drive Anda, salin ID folder tersebut (karakter di akhir link URL folder Anda), masukkan ke kolom ID folder di atas, lalu simpan! Foto yang diupload akan otomatis masuk ke Google Drive sekolah dengan kapasitas aman dan terpusat.
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
}
