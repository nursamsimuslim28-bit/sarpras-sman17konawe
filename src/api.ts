import { Aset, Peminjaman, LogPemusnahan, PengaturanSekolah, SAMPLE_ASETS, SAMPLE_PEMINJAMANS, SAMPLE_PEMUSNAHANS, DEFAULT_PENGATURAN, BarangHabisPakai, PengambilanBHP, SAMPLE_BHP, SAMPLE_PENGAMBILAN_BHP, AuditLog, AUTHORIZED_USERS, MasterRuang, DEFAULT_MASTER_RUANGS, KeluhanSarpras } from './types';
import { INITIAL_BOSP_2023_ASETS } from './dataBosp2023';
import { INITIAL_BOSP_2024_ASETS } from './dataBosp2024';
import { INITIAL_BOSP_2025_ASETS } from './dataBosp2025';
import { INITIAL_SIPLAH_BUKU_ASETS } from './dataSiplahBuku';
import { INITIAL_BOSP_BHP_DATA } from './dataBospBhp';
import { 
  isFirebaseClientConfigured, 
  saveDocumentClient, 
  deleteDocumentClient,
  getAllDataFromClientFirebase,
  testFirebaseClientConnection,
  saveCustomFirebaseConfig,
  clearCustomFirebaseConfig,
  getFirebaseClientConfig
} from './firebaseClient';

// Storage keys
const KEY_ASETS = 'esarpras_asets';
const KEY_PEMINJAMANS = 'esarpras_peminjamans';
const KEY_PEMUSNAHANS = 'esarpras_pemusnahans';
const KEY_PENGATURAN = 'esarpras_pengaturan';
const KEY_BHP = 'esarpras_bhp';
const KEY_PENGAMBILAN_BHP = 'esarpras_pengambilan_bhp';
const KEY_AUDIT_LOGS = 'esarpras_audit_logs';
const KEY_MASTER_RUANGS = 'esarpras_master_ruangs';
const KEY_KELUHAN = 'esarpras_keluhan';

const SAMPLE_AUDIT_LOGS: AuditLog[] = [];

// Daftar ID data contoh/dummy (dikosongkan agar data pengguna tidak terhapus)
const DUMMY_IDS = new Set<string>([]);

// Purge any residual sample/dummy data from local storage
function purgeSampleDataFromLocalStorage(): void {
  [KEY_ASETS, KEY_PEMINJAMANS, KEY_PEMUSNAHANS, KEY_BHP, KEY_PENGAMBILAN_BHP, KEY_AUDIT_LOGS].forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(item => item && item.id && !DUMMY_IDS.has(item.id));
          localStorage.setItem(key, JSON.stringify(cleaned));
        }
      }
    } catch (e) {}
  });
}
purgeSampleDataFromLocalStorage();

// Helper to safely set storage without QuotaExceededError crashing
function safeSetStorage(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Storage] Kuota memori browser penuh untuk ${key}. Mengoptimalkan foto lokal agar data utama tetap tersimpan...`);
    if (Array.isArray(data)) {
      const cleaned = data.map(item => {
        if (!item || typeof item !== 'object') return item;
        if (item.fotoUrl && typeof item.fotoUrl === 'string') {
          let fotoUrl = item.fotoUrl;
          if (fotoUrl.startsWith('[')) {
            try {
              let parsed: string[] = JSON.parse(fotoUrl);
              parsed = parsed.map(p => (typeof p === 'string' && (p.includes('data:') || p.length > 500)) ? '(Foto disederhanakan untuk menghemat memori)' : p);
              fotoUrl = JSON.stringify(parsed);
            } catch (e) {
              fotoUrl = '(Foto disederhanakan)';
            }
          } else if (fotoUrl.includes('data:') || fotoUrl.length > 500) {
            fotoUrl = '(Foto disederhanakan untuk menghemat memori)';
          }
          return { ...item, fotoUrl };
        }
        return item;
      });
      try {
        localStorage.setItem(key, JSON.stringify(cleaned));
      } catch (innerErr) {
        // Fallback: strip all photos if quota is still exceeded
        const stripped = data.map(item => (item && typeof item === 'object') ? { ...item, fotoUrl: '' } : item);
        try {
          localStorage.setItem(key, JSON.stringify(stripped));
        } catch (finalErr) {
          console.warn(`[Storage] Memori browser benar-benar penuh untuk ${key}.`);
        }
      }
    }
  }
}

// Helper to safely merge remote datasets with local datasets so no locally created item is lost
function mergeById<T extends { id: string }>(remote: T[] | undefined, local: T[]): T[] {
  const map = new Map<string, T>();

  // 1. Tambahkan data dari server remote (filter data dummy jika ada)
  if (Array.isArray(remote)) {
    remote.forEach(item => {
      if (item && item.id && !DUMMY_IDS.has(item.id)) {
        map.set(item.id, item);
      }
    });
  }

  // 2. Gabungkan dengan data lokal (filter data dummy jika ada)
  if (Array.isArray(local)) {
    local.forEach(item => {
      if (item && item.id && !DUMMY_IDS.has(item.id)) {
        if (!map.has(item.id)) {
          map.set(item.id, item);
        } else {
          const existing = map.get(item.id)!;
          map.set(item.id, { ...existing, ...item });
        }
      }
    });
  }

  return Array.from(map.values());
}

// Daftar seluruh data pengadaan BOSP 2023, BOSP 2024, BOSP 2025 & SIPLah Buku
const DEFAULT_INVENTORY_DATA: Aset[] = [
  ...INITIAL_BOSP_2023_ASETS,
  ...INITIAL_BOSP_2024_ASETS,
  ...INITIAL_BOSP_2025_ASETS,
  ...INITIAL_SIPLAH_BUKU_ASETS
];

const KEY_INITIALIZED = 'esarpras_app_initialized';
const KEY_BOSP_SEEDED = 'esarpras_bosp2023_2024_2025_siplah_seeded_v3';
const KEY_BHP_SEEDED = 'esarpras_bhp_2023_2024_2025_seeded_v2';

// Inisialisasi storage awal
if (!localStorage.getItem(KEY_INITIALIZED)) {
  if (!localStorage.getItem(KEY_ASETS)) safeSetStorage(KEY_ASETS, DEFAULT_INVENTORY_DATA);
  if (!localStorage.getItem(KEY_PEMINJAMANS)) safeSetStorage(KEY_PEMINJAMANS, []);
  if (!localStorage.getItem(KEY_PEMUSNAHANS)) safeSetStorage(KEY_PEMUSNAHANS, []);
  if (!localStorage.getItem(KEY_BHP)) safeSetStorage(KEY_BHP, INITIAL_BOSP_BHP_DATA);
  if (!localStorage.getItem(KEY_PENGAMBILAN_BHP)) safeSetStorage(KEY_PENGAMBILAN_BHP, []);
  if (!localStorage.getItem(KEY_AUDIT_LOGS)) safeSetStorage(KEY_AUDIT_LOGS, []);
  if (!localStorage.getItem(KEY_MASTER_RUANGS)) safeSetStorage(KEY_MASTER_RUANGS, DEFAULT_MASTER_RUANGS);
  if (!localStorage.getItem(KEY_KELUHAN)) safeSetStorage(KEY_KELUHAN, []);
  localStorage.setItem(KEY_INITIALIZED, 'true');
  localStorage.setItem(KEY_BOSP_SEEDED, 'true');
  localStorage.setItem(KEY_BHP_SEEDED, 'true');
} else {
  if (!localStorage.getItem(KEY_MASTER_RUANGS)) {
    safeSetStorage(KEY_MASTER_RUANGS, DEFAULT_MASTER_RUANGS);
  }
  // Pastikan data BOSP 2023, 2024, 2025 & Buku SIPLah otomatis tersuntikkan ke storage pengguna yang sudah ada
  if (!localStorage.getItem(KEY_BOSP_SEEDED)) {
    try {
      const existingAsets: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
      const mergedAsets = mergeById(DEFAULT_INVENTORY_DATA, existingAsets);
      safeSetStorage(KEY_ASETS, mergedAsets);
      localStorage.setItem(KEY_BOSP_SEEDED, 'true');
    } catch (e) {
      console.warn('Gagal seeding data BOSP 2023, 2024 & 2025:', e);
    }
  }
  // Pastikan master data BHP 2023/2024/2025 tersuntikkan ke storage
  if (!localStorage.getItem(KEY_BHP_SEEDED)) {
    try {
      const existingBhp: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
      const mergedBhp = mergeById(INITIAL_BOSP_BHP_DATA, existingBhp);
      safeSetStorage(KEY_BHP, mergedBhp);
      localStorage.setItem(KEY_BHP_SEEDED, 'true');
    } catch (e) {
      console.warn('Gagal seeding data BHP:', e);
    }
  }
}

// Migrate or initialize Pengaturan
const localPengaturan = localStorage.getItem(KEY_PENGATURAN);
if (!localPengaturan) {
  localStorage.setItem(KEY_PENGATURAN, JSON.stringify(DEFAULT_PENGATURAN));
} else {
  try {
    const parsed = JSON.parse(localPengaturan);
    // Gabungkan dengan DEFAULT_PENGATURAN agar jika ada properti baru tetap terisi
    const merged = { ...DEFAULT_PENGATURAN, ...parsed };

    // Selalu pastikan googleAppsScriptUrl dan googleDriveFolderId terisi dari DEFAULT_PENGATURAN jika kosong
    if (!merged.googleAppsScriptUrl || !merged.googleAppsScriptUrl.trim()) {
      merged.googleAppsScriptUrl = DEFAULT_PENGATURAN.googleAppsScriptUrl;
    }
    if (!merged.googleSpreadsheetUrl || !merged.googleSpreadsheetUrl.trim()) {
      merged.googleSpreadsheetUrl = DEFAULT_PENGATURAN.googleSpreadsheetUrl;
    }
    if (!merged.googleDriveFolderId || !merged.googleDriveFolderId.trim()) {
      merged.googleDriveFolderId = DEFAULT_PENGATURAN.googleDriveFolderId;
    }

    // Pastikan nama sekolah resmi terformat SMA Negeri 17 Konawe jika ada nama lama atau typo
    if (!merged.namaSekolah || merged.namaSekolah.includes("AMONGGED") || merged.namaSekolah === "SMAN 17 Konawe") {
      merged.namaSekolah = "SMA Negeri 17 Konawe";
    }

    localStorage.setItem(KEY_PENGATURAN, JSON.stringify(merged));
  } catch (e) {
    localStorage.setItem(KEY_PENGATURAN, JSON.stringify(DEFAULT_PENGATURAN));
  }
}

// Utility to verify if dynamic URL is configured - always fallback to hardcoded default
const getScriptUrl = (): string => {
  try {
    const local = localStorage.getItem(KEY_PENGATURAN);
    if (local) {
      const parsed = JSON.parse(local);
      if (parsed.googleAppsScriptUrl && parsed.googleAppsScriptUrl.trim()) {
        return parsed.googleAppsScriptUrl.trim();
      }
    }
  } catch (e) {
    console.error('Error reading script URL from local storage:', e);
  }
  return DEFAULT_PENGATURAN.googleAppsScriptUrl || "";
};

// Helper function to call Google Apps Script directly from the browser (no-preflight simple POST requests to bypass CORS)
async function callDirectGAS(url: string, method: 'GET' | 'POST', payload?: any): Promise<Response> {
  if (method === 'GET') {
    const fetchUrl = `${url}?action=${payload?.action || 'get_all'}`;
    return await fetch(fetchUrl, {
      method: 'GET',
      mode: 'cors'
    });
  } else {
    // We send without custom Content-Type header to keep it as a "simple request"
    // which bypasses CORS preflight (OPTIONS) checks that Google Apps Script Web Apps don't support well.
    return await fetch(url, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(payload)
    });
  }
}

// Helper function to call GAS via local server proxy with automatic client-side direct fallback
async function callProxy(url: string, method: 'GET' | 'POST', payload?: any): Promise<Response> {
  try {
    if (method === 'GET') {
      const proxyUrl = `/api/gas-proxy?url=${encodeURIComponent(url)}&action=${payload?.action || 'get_all'}`;
      const response = await fetch(proxyUrl);
      
      // If 404 is returned, the Express proxy backend does not exist (static deployment on Vercel)
      if (response.status === 404) {
        console.log('[API] Proxy tidak ditemukan (404), beralih ke koneksi langsung browser...');
        return await callDirectGAS(url, method, payload);
      }
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${response.status}`);
      }
      return response;
    } else {
      const response = await fetch(`/api/gas-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          ...payload
        })
      });
      
      if (response.status === 404) {
        console.log('[API] Proxy tidak ditemukan (404), beralih ke koneksi langsung browser...');
        return await callDirectGAS(url, method, payload);
      }
      
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${response.status}`);
      }
      return response;
    }
  } catch (err: any) {
    console.warn('[API] Gagal menghubungi proxy, mencoba koneksi langsung ke Google Apps Script:', err.message);
    return await callDirectGAS(url, method, payload);
  }
}

// Check if Supabase or Firebase is configured and reachable
async function isSupabaseActive(): Promise<boolean> {
  if (isFirebaseClientConfigured()) {
    return true;
  }
  try {
    const res = await fetch('/api/supabase/status');
    if (res.ok) {
      const data = await res.json();
      return !!data.configured;
    }
  } catch (e) {
    console.warn('[API] Gagal memeriksa status backend proxy:', e);
  }
  return false;
}

// Dynamic API client that handles syncs
export const api = {
  // Get all data
  async getAll(): Promise<{ asets: Aset[]; peminjamans: Peminjaman[]; pemusnahans: LogPemusnahan[]; pengaturan: PengaturanSekolah; bhp: BarangHabisPakai[]; pengambilanBhp: PengambilanBHP[]; keluhan: KeluhanSarpras[] }> {
    // Ambil data lokal saat ini
    const localAsets: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const localPeminjamans: Peminjaman[] = JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]');
    const localPemusnahans: LogPemusnahan[] = JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]');
    const localBhp: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
    const localPengambilanBhp: PengambilanBHP[] = JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]');
    const localKeluhan: KeluhanSarpras[] = JSON.parse(localStorage.getItem(KEY_KELUHAN) || '[]');

    // 1. UTAMA (Remote-First): Ambil data dari Google Apps Script / Google Sheets
    const url = getScriptUrl();
    if (url) {
      try {
        const response = await callProxy(url, 'GET', { action: 'get_all' });
        if (response.ok) {
          const remoteData = await response.json();
          if (remoteData && remoteData.status === 'success' && remoteData.data) {
            const data = remoteData.data;

            const localPengaturanStr = localStorage.getItem(KEY_PENGATURAN);
            let mergedPengaturan = { ...DEFAULT_PENGATURAN };
            if (localPengaturanStr) {
              try {
                mergedPengaturan = { ...mergedPengaturan, ...JSON.parse(localPengaturanStr) };
              } catch (e) {}
            }

            if (data.pengaturan && Object.keys(data.pengaturan).length > 0) {
              const remote = data.pengaturan;
              mergedPengaturan = {
                namaSekolah: remote.namaSekolah || mergedPengaturan.namaSekolah || '',
                npsn: remote.npsn || mergedPengaturan.npsn || '',
                alamat: remote.alamat || mergedPengaturan.alamat || '',
                kepalaSekolah: remote.kepalaSekolah || mergedPengaturan.kepalaSekolah || '',
                nipKepalaSekolah: remote.nipKepalaSekolah || mergedPengaturan.nipKepalaSekolah || '',
                namaPetugasSarpras: remote.namaPetugasSarpras || mergedPengaturan.namaPetugasSarpras || '',
                nipPetugasSarpras: remote.nipPetugasSarpras || mergedPengaturan.nipPetugasSarpras || '',
                targetKapasitasSiswa: remote.targetKapasitasSiswa ? parseInt(remote.targetKapasitasSiswa) : mergedPengaturan.targetKapasitasSiswa || 596,
                jumlahRombel: remote.jumlahRombel ? parseInt(remote.jumlahRombel) : mergedPengaturan.jumlahRombel || 16,
                jumlahSiswaAktif: remote.jumlahSiswaAktif ? parseInt(remote.jumlahSiswaAktif) : mergedPengaturan.jumlahSiswaAktif || 400,
                googleAppsScriptUrl: mergedPengaturan.googleAppsScriptUrl || remote.googleAppsScriptUrl || DEFAULT_PENGATURAN.googleAppsScriptUrl,
                googleDriveFolderId: remote.googleDriveFolderId || mergedPengaturan.googleDriveFolderId || DEFAULT_PENGATURAN.googleDriveFolderId
              };
            }

            const mergedAsets = mergeById(data.asets, localAsets);
            const mergedPeminjamans = mergeById(data.peminjamans, localPeminjamans);
            const mergedPemusnahans = mergeById(data.pemusnahans, localPemusnahans);
            const mergedBhp = mergeById(data.bhp, localBhp);
            const mergedPengambilanBhp = mergeById(data.pengambilanBhp, localPengambilanBhp);
            const mergedKeluhan = mergeById(data.keluhan, localKeluhan);
            if (data.masterRuangs && Array.isArray(data.masterRuangs) && data.masterRuangs.length > 0) {
              const localRuangs = this.getMasterRuangs();
              const mergedRuangs = mergeById(data.masterRuangs, localRuangs);
              safeSetStorage(KEY_MASTER_RUANGS, mergedRuangs);
            }

            safeSetStorage(KEY_ASETS, mergedAsets);
            safeSetStorage(KEY_PEMINJAMANS, mergedPeminjamans);
            safeSetStorage(KEY_PEMUSNAHANS, mergedPemusnahans);
            safeSetStorage(KEY_PENGATURAN, mergedPengaturan);
            safeSetStorage(KEY_BHP, mergedBhp);
            safeSetStorage(KEY_PENGAMBILAN_BHP, mergedPengambilanBhp);
            safeSetStorage(KEY_KELUHAN, mergedKeluhan);

            return {
              asets: mergedAsets,
              peminjamans: mergedPeminjamans,
              pemusnahans: mergedPemusnahans,
              pengaturan: mergedPengaturan,
              bhp: mergedBhp,
              pengambilanBhp: mergedPengambilanBhp,
              keluhan: mergedKeluhan
            };
          }
        }
      } catch (err) {
        console.warn('[API] Gagal memuat data dari Google Sheets, mencoba cloud/fallback lainnya...', err);
      }
    }

    // 2. Fallback Cloud: Server-Side API Proxy (Firebase Firestore / Cloud Storage)
    try {
      const response = await fetch('/api/supabase/get_all');
      if (response.ok) {
        const body = await response.json();
        if (body && body.status === 'success' && body.data) {
          const data = body.data;

          const localPengaturanStr = localStorage.getItem(KEY_PENGATURAN);
          let mergedPengaturan = { ...DEFAULT_PENGATURAN };
          if (localPengaturanStr) {
            try {
              mergedPengaturan = { ...mergedPengaturan, ...JSON.parse(localPengaturanStr) };
            } catch (e) {}
          }

          if (data.pengaturan && Object.keys(data.pengaturan).length > 0) {
            mergedPengaturan = { ...mergedPengaturan, ...data.pengaturan };
          }

          const mergedAsets = mergeById(data.asets, localAsets);
          const mergedPeminjamans = mergeById(data.peminjamans, localPeminjamans);
          const mergedPemusnahans = mergeById(data.pemusnahans, localPemusnahans);
          const mergedBhp = mergeById(data.bhp, localBhp);
          const mergedPengambilanBhp = mergeById(data.pengambilanBhp, localPengambilanBhp);
          const mergedKeluhan = mergeById(data.keluhan, localKeluhan);

          safeSetStorage(KEY_ASETS, mergedAsets);
          safeSetStorage(KEY_PEMINJAMANS, mergedPeminjamans);
          safeSetStorage(KEY_PEMUSNAHANS, mergedPemusnahans);
          safeSetStorage(KEY_PENGATURAN, mergedPengaturan);
          safeSetStorage(KEY_BHP, mergedBhp);
          safeSetStorage(KEY_PENGAMBILAN_BHP, mergedPengambilanBhp);
          safeSetStorage(KEY_KELUHAN, mergedKeluhan);

          return {
            asets: mergedAsets,
            peminjamans: mergedPeminjamans,
            pemusnahans: mergedPemusnahans,
            pengaturan: mergedPengaturan,
            bhp: mergedBhp,
            pengambilanBhp: mergedPengambilanBhp,
            keluhan: mergedKeluhan
          };
        }
      }
    } catch (err) {
      console.warn('[API] Gagal memuat data via Express Proxy Server:', err);
    }

    // 3. Fallback Cloud: Firebase Web Client SDK
    if (isFirebaseClientConfigured()) {
      try {
        const clientData = await getAllDataFromClientFirebase();
        if (clientData) {
          const localPengaturanStr = localStorage.getItem(KEY_PENGATURAN);
          let mergedPengaturan = { ...DEFAULT_PENGATURAN };
          if (localPengaturanStr) {
            try {
              mergedPengaturan = { ...mergedPengaturan, ...JSON.parse(localPengaturanStr) };
            } catch (e) {}
          }

          if (clientData.pengaturan && Object.keys(clientData.pengaturan).length > 0) {
            mergedPengaturan = { ...mergedPengaturan, ...clientData.pengaturan };
          }

          const mergedAsets = mergeById(clientData.asets, localAsets);
          const mergedPeminjamans = mergeById(clientData.peminjamans, localPeminjamans);
          const mergedPemusnahans = mergeById(clientData.pemusnahans, localPemusnahans);
          const mergedBhp = mergeById(clientData.bhp, localBhp);
          const mergedPengambilanBhp = mergeById(clientData.pengambilanBhp, localPengambilanBhp);
          const mergedKeluhan = mergeById(clientData.keluhan, localKeluhan);

          safeSetStorage(KEY_ASETS, mergedAsets);
          safeSetStorage(KEY_PEMINJAMANS, mergedPeminjamans);
          safeSetStorage(KEY_PEMUSNAHANS, mergedPemusnahans);
          safeSetStorage(KEY_PENGATURAN, mergedPengaturan);
          safeSetStorage(KEY_BHP, mergedBhp);
          safeSetStorage(KEY_PENGAMBILAN_BHP, mergedPengambilanBhp);
          safeSetStorage(KEY_KELUHAN, mergedKeluhan);

          return {
            asets: mergedAsets,
            peminjamans: mergedPeminjamans,
            pemusnahans: mergedPemusnahans,
            pengaturan: mergedPengaturan,
            bhp: mergedBhp,
            pengambilanBhp: mergedPengambilanBhp,
            keluhan: mergedKeluhan
          };
        }
      } catch (clientErr) {
        console.warn('[API] Gagal memuat data dari Firebase Client SDK:', clientErr);
      }
    }

    // Offline local storage fallback
    const offlinePengaturan = JSON.parse(localStorage.getItem(KEY_PENGATURAN) || '{}');
    if (!offlinePengaturan.namaSekolah || offlinePengaturan.namaSekolah.includes("AMONGGED") || offlinePengaturan.namaSekolah === "SMAN 17 Konawe") {
      offlinePengaturan.namaSekolah = "SMA Negeri 17 Konawe";
    }
    return {
      asets: JSON.parse(localStorage.getItem(KEY_ASETS) || '[]'),
      peminjamans: JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]'),
      pemusnahans: JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]'),
      pengaturan: offlinePengaturan,
      bhp: JSON.parse(localStorage.getItem(KEY_BHP) || '[]'),
      pengambilanBhp: JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]'),
      keluhan: JSON.parse(localStorage.getItem(KEY_KELUHAN) || '[]')
    };
  },

  // Test Connection to Google Apps Script URL
  async testConnection(url: string): Promise<{ success: boolean; message: string }> {
    if (!url) {
      return { success: false, message: 'URL Google Apps Script tidak boleh kosong.' };
    }

    const trimmedUrl = url.trim();

    if (trimmedUrl.includes('docs.google.com/spreadsheets')) {
      return {
        success: false,
        message: 'Koneksi gagal: URL yang Anda masukkan adalah URL Google Spreadsheet. Anda harus memasukkan URL Web App Google Apps Script (yang didapatkan dari hasil Deploy Script berakhiran "/exec"), bukan URL Spreadsheet.'
      };
    }

    if (trimmedUrl.includes('/edit') || !trimmedUrl.includes('/macros/s/')) {
      return {
        success: false,
        message: 'Koneksi gagal: URL yang Anda masukkan tampaknya adalah URL Editor Apps Script. Anda harus memasukkan URL Web App yang didapatkan setelah mengklik tombol "Deploy" -> "New deployment" -> pilih tipe "Web app", lalu salin URL Web App yang berakhiran dengan "/exec".'
      };
    }

    if (trimmedUrl.includes('/dev')) {
      return {
        success: false,
        message: 'Koneksi gagal: Anda memasukkan URL Apps Script yang berakhiran "/dev". URL "/dev" memerlukan login akun pengembang dan tidak dapat diakses secara publik oleh server proxy. Silakan lakukan Deploy Ulang (Deploy -> New deployment), pastikan tipe "Web app" dan pilih "Who has access: Anyone", lalu salin URL Web App yang berakhiran "/exec".'
      };
    }

    if (!trimmedUrl.startsWith('https://script.google.com/')) {
      return { success: false, message: 'Format URL salah. URL harus dimulai dengan https://script.google.com/' };
    }

    try {
      // Menggunakan proxy lokal untuk menghindari masalah CORS / Sandbox iframe di browser
      const response = await callProxy(trimmedUrl, 'GET', { action: 'get_all' });
      
      if (response.ok) {
        const responseText = await response.text();
        let json;
        try {
          json = JSON.parse(responseText);
        } catch (jsonErr) {
          console.warn("GAS Non-JSON Response:", responseText);

          if (responseText.includes('Google Accounts') || 
              responseText.includes('Sign in') || 
              responseText.includes('accounts.google.com') || 
              responseText.includes('login') ||
              responseText.includes('Sign-in') ||
              responseText.includes('Service Login')) {
            return {
              success: false,
              message: 'Koneksi gagal: Google Apps Script meminta Login Google. Ini terjadi karena setelan akses "Who has access" belum diatur ke "Anyone" (Siapa saja, bahkan anonim). Silakan lakukan "Deploy" -> "New deployment" di Apps Script, pilih tipe "Web app", ubah akses ke "Anyone", lalu deploy dan gunakan URL yang baru.'
            };
          }

          if (responseText.includes('Exception:') || 
              responseText.includes('Error:') || 
              responseText.includes('TypeError:') || 
              responseText.includes('ReferenceError:')) {
            const match = responseText.match(/(Exception|Error|TypeError|ReferenceError):[^<]+/);
            const detailError = match ? match[0] : 'Error internal pada kode Google Apps Script Anda.';
            return {
              success: false,
              message: `Koneksi gagal: Google Apps Script Anda mengembalikan error saat dijalankan: "${detailError}". Silakan buka Editor Apps Script Anda, klik tombol "Run/Jalankan" untuk menguji fungsi doGet, dan pastikan Anda sudah memberikan izin akses (otorisasi) ke Google Sheets / Drive.`
            };
          }

          // Bersihkan tag HTML untuk pesan error teks murni yang ringkas
          const cleanText = responseText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 150);
          return {
            success: false,
            message: `Koneksi gagal: Tanggapan dari Google Apps Script bukan berformat JSON yang valid. Tanggapan yang diterima: "${cleanText}...". Pastikan Anda menggunakan URL "Web app" yang berakhir dengan "/exec" (bukan "/dev") dan akses diatur ke "Anyone" (Siapa saja, bahkan anonim).`
          };
        }

        if (json && json.status === 'success') {
          return { success: true, message: 'Koneksi Berhasil! Sistem Anda berhasil terhubung dengan Google Sheets.' };
        } else if (json && json.status === 'error') {
          return { success: false, message: `Koneksi gagal: Apps Script mengembalikan error: "${json.message || 'Error tidak diketahui'}"` };
        } else {
          return { success: false, message: `Koneksi gagal: Format respon tidak sesuai. Data: ${JSON.stringify(json)}` };
        }
      }
      return { success: false, message: `Koneksi gagal: Server mengembalikan status HTTP ${response.status} (${response.statusText}).` };
    } catch (err: any) {
      console.error('Test connection error:', err);
      return { 
        success: false, 
        message: `Koneksi gagal: ${err.message || 'Terjadi kesalahan jaringan.'}. Pastikan URL sudah benar, koneksi internet aktif, dan pengaturan akses Web App di Google Apps Script telah diset ke "Anyone" (Siapa saja, bahkan anonim).` 
      };
    }
  },

  // Save/Update Aset
  async saveAset(aset: Aset): Promise<Aset[]> {
    const local: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const index = local.findIndex(x => x.id === aset.id);
    if (index >= 0) {
      local[index] = aset;
    } else {
      local.push(aset);
    }
    
    safeSetStorage(KEY_ASETS, local);

    // Firebase Client SDK Sync
    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('asets', aset.id, aset);
      } catch (e) {
        console.error('[API] Gagal menyimpan aset ke Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/save_aset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(aset)
        });
      } catch (e) {
        console.error('[API] Gagal menyimpan aset ke Express Proxy:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_aset', data: aset });
      } catch (e) {
        console.warn('Error syncing aset to GAS', e);
      }
    }

    return local;
  },

  // Save multiple asets at once (Bulk import massal)
  async saveMultipleAsets(newAsets: Aset[]): Promise<Aset[]> {
    if (!newAsets || newAsets.length === 0) {
      return JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    }

    const local: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const map = new Map<string, Aset>();
    local.forEach(a => { if (a && a.id) map.set(a.id, a); });
    newAsets.forEach(a => { if (a && a.id) map.set(a.id, a); });

    const merged = Array.from(map.values());
    safeSetStorage(KEY_ASETS, merged);

    // Firebase Client SDK Sync
    if (isFirebaseClientConfigured()) {
      for (const aset of newAsets) {
        try {
          await saveDocumentClient('asets', aset.id, aset);
        } catch (e) {
          console.warn('[API] Gagal menyimpan aset batch ke Firebase Client:', e);
        }
      }
    }

    // Express backend sync
    const isSupa = await isSupabaseActive();
    if (isSupa) {
      for (const aset of newAsets) {
        try {
          await fetch('/api/supabase/save_aset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(aset)
          });
        } catch (e) {}
      }
    }

    // Google Apps Script batch or iterative sync
    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_multiple_asets', data: newAsets });
      } catch (e) {
        // Fallback simpan satu per satu jika script GAS belum update handler batch
        for (const aset of newAsets) {
          try {
            await callProxy(url, 'POST', { action: 'save_aset', data: aset });
          } catch (innerErr) {}
        }
      }
    }

    return merged;
  },

  // Delete Aset
  async deleteAset(id: string): Promise<Aset[]> {
    const local: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const filtered = local.filter(x => x.id !== id);
    safeSetStorage(KEY_ASETS, filtered);

    if (isFirebaseClientConfigured()) {
      try {
        await deleteDocumentClient('asets', id);
      } catch (e) {
        console.error('[API] Gagal menghapus aset di Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/delete_aset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (e) {
        console.error('[API] Gagal menghapus aset di Express Proxy:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'delete_aset', id });
      } catch (e) {
        console.warn('Error deleting aset in GAS', e);
      }
    }

    return filtered;
  },

  // Save/Update Peminjaman
  async savePeminjaman(pinjam: Peminjaman): Promise<Peminjaman[]> {
    const local: Peminjaman[] = JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]');
    const index = local.findIndex(x => x.id === pinjam.id);
    if (index >= 0) {
      local[index] = pinjam;
    } else {
      local.push(pinjam);
    }
    safeSetStorage(KEY_PEMINJAMANS, local);

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('peminjamans', pinjam.id, pinjam);
      } catch (e) {
        console.error('[API] Gagal menyimpan peminjaman ke Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/save_peminjaman', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pinjam)
        });
      } catch (e) {
        console.error('[API] Gagal menyimpan peminjaman ke Express Proxy:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_peminjaman', data: pinjam });
      } catch (e) {
        console.warn('Error syncing peminjaman to GAS', e);
      }
    }

    return local;
  },

  // Save Log Pemusnahan (Penghapusan Aset)
  async savePemusnahan(log: LogPemusnahan): Promise<LogPemusnahan[]> {
    const local: LogPemusnahan[] = JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]');
    local.push(log);
    localStorage.setItem(KEY_PEMUSNAHANS, JSON.stringify(local));

    // Update target asset quantity or mark as 'Dihapuskan'
    const asets: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const asetIndex = asets.findIndex(x => x.id === log.asetId);
    if (asetIndex >= 0) {
      const currentAset = asets[asetIndex];
      const kuantitasDihapus = typeof log.jumlah === 'number' && log.jumlah > 0 ? log.jumlah : 1;
      const sisaKuantitas = Math.max(0, (currentAset.jumlah || 1) - kuantitasDihapus);

      if (sisaKuantitas === 0) {
        currentAset.kondisi = 'Dihapuskan';
        currentAset.jumlah = 0;
      } else {
        // Pemusnahan sebagian (parsial): kurangi stok aset tanpa menghapus seluruh unit yang masih aktif
        currentAset.jumlah = sisaKuantitas;
      }
      currentAset.updatedAt = new Date().toISOString();

      safeSetStorage(KEY_ASETS, asets);
      
      if (isFirebaseClientConfigured()) {
        try {
          await saveDocumentClient('asets', currentAset.id, currentAset);
        } catch (e) {
          console.error('[API] Gagal memperbarui status aset di Firebase Client:', e);
        }
      }

      const isSupa = await isSupabaseActive();
      if (isSupa) {
        try {
          await fetch('/api/supabase/save_aset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentAset)
          });
        } catch (e) {
          console.error('[API] Gagal memperbarui kondisi aset di Express Proxy:', e);
        }
      }

      const url = getScriptUrl();
      if (url) {
        try {
          await callProxy(url, 'POST', { action: 'save_aset', data: currentAset });
        } catch (e) {
          console.warn('Error syncing removed asset status to GAS', e);
        }
      }
    }

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('pemusnahans', log.id, log);
      } catch (e) {
        console.error('[API] Gagal menyimpan pemusnahan ke Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/save_pemusnahan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(log)
        });
      } catch (e) {
        console.error('[API] Gagal menyimpan pemusnahan ke Express Proxy:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_pemusnahan', data: log });
      } catch (e) {
        console.warn('Error syncing pemusnahan to GAS', e);
      }
    }

    return local;
  },

  // Save/Update Pengaturan
  async savePengaturan(cfg: PengaturanSekolah): Promise<PengaturanSekolah> {
    localStorage.setItem(KEY_PENGATURAN, JSON.stringify(cfg));

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('pengaturan', 'default', cfg);
      } catch (e) {
        console.error('[API] Gagal menyimpan pengaturan ke Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/save_pengaturan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg)
        });
      } catch (e) {
        console.error('[API] Gagal menyimpan pengaturan ke Express Proxy:', e);
      }
    }

    const url = cfg.googleAppsScriptUrl || getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_pengaturan', data: cfg });
      } catch (e) {
        console.warn('Error syncing pengaturan to GAS', e);
      }
    }

    return cfg;
  },

  // Upload file (photo) to Google Drive (Returns direct web url)
  async uploadPhotoToDrive(base64Data: string, filename: string): Promise<string> {
    const url = getScriptUrl();
    if (!url) {
      // Local fallback: just return the base64 or a mock url
      return base64Data;
    }

    try {
      const uploadPromise = (async () => {
        const response = await callProxy(url, 'POST', {
          action: 'upload_file',
          fileData: base64Data,
          fileName: filename
        });
        const resData = await response.json();
        if (resData && resData.status === 'success' && resData.fileUrl) {
          return resData.fileUrl as string;
        }
        throw new Error(resData?.message || 'Gagal mengupload foto ke Google Drive.');
      })();

      // Batas waktu max 10 detik agar sistem tidak menggantung jika koneksi/Apps Script lambat
      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout upload Google Drive')), 10000)
      );

      return await Promise.race([uploadPromise, timeoutPromise]);
    } catch (err: any) {
      console.warn('[API] Upload bukti ke Drive gagal/timeout, menggunakan file lokal:', err?.message || err);
      // Fallback to offline local base64 storage
      return base64Data;
    }
  },

  // Save/Update Barang Habis Pakai (BHP)
  async saveBHP(item: BarangHabisPakai): Promise<BarangHabisPakai[]> {
    const local: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
    const index = local.findIndex(x => x.id === item.id);
    if (index >= 0) {
      local[index] = item;
    } else {
      local.push(item);
    }
    safeSetStorage(KEY_BHP, local);

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('bhp', item.id, item);
      } catch (e) {
        console.error('[API] Gagal menyimpan BHP ke Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/save_bhp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
      } catch (e) {
        console.error('[API] Gagal menyimpan BHP ke Express Proxy:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_bhp', data: item });
      } catch (e) {
        console.warn('Error syncing BHP to GAS', e);
      }
    }

    return local;
  },

  // Delete Barang Habis Pakai (BHP)
  async deleteBHP(id: string): Promise<BarangHabisPakai[]> {
    const local: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
    const filtered = local.filter(x => x.id !== id);
    localStorage.setItem(KEY_BHP, JSON.stringify(filtered));

    if (isFirebaseClientConfigured()) {
      try {
        await deleteDocumentClient('bhp', id);
      } catch (e) {
        console.error('[API] Gagal menghapus BHP di Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/delete_bhp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        });
      } catch (e) {
        console.error('[API] Gagal menghapus BHP di Express Proxy:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'delete_bhp', id });
      } catch (e) {
        console.warn('Error deleting BHP in GAS', e);
      }
    }

    return filtered;
  },

  // Save/Update Pengambilan BHP (Issuance / Disbursement)
  async savePengambilanBHP(pengambilan: PengambilanBHP): Promise<PengambilanBHP[]> {
    const local: PengambilanBHP[] = JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]');
    const index = local.findIndex(x => x.id === pengambilan.id);
    
    // If it's a new pengambilan, we deduct the stock from BHP
    const isNew = index < 0;
    
    if (isNew) {
      local.push(pengambilan);
      
      // Update the actual stock
      const bhpList: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
      const bhpIndex = bhpList.findIndex(x => x.id === pengambilan.bhpId);
      if (bhpIndex >= 0) {
        bhpList[bhpIndex].stokSekarang = Math.max(0, bhpList[bhpIndex].stokSekarang - pengambilan.jumlahDiambil);
        localStorage.setItem(KEY_BHP, JSON.stringify(bhpList));
        
        // Sync the updated BHP stock
        if (isFirebaseClientConfigured()) {
          try {
            await saveDocumentClient('bhp', bhpList[bhpIndex].id, bhpList[bhpIndex]);
          } catch (e) {
            console.error('[API] Gagal menyelaraskan stok BHP ke Firebase Client:', e);
          }
        }

        const isSupa = await isSupabaseActive();
        if (isSupa) {
          try {
            await fetch('/api/supabase/save_bhp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bhpList[bhpIndex])
            });
          } catch (e) {
            console.error('[API] Gagal menyelaraskan stok BHP ke Express Proxy:', e);
          }
        }

        const url = getScriptUrl();
        if (url) {
          try {
            await callProxy(url, 'POST', { action: 'save_bhp', data: bhpList[bhpIndex] });
          } catch (e) {
            console.warn('Error syncing updated BHP stock to GAS', e);
          }
        }
      }
    } else {
      // If updating, adjust stock difference
      const oldItem = local[index];
      const diff = pengambilan.jumlahDiambil - oldItem.jumlahDiambil;
      local[index] = pengambilan;
      
      if (diff !== 0) {
        const bhpList: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
        const bhpIndex = bhpList.findIndex(x => x.id === pengambilan.bhpId);
        if (bhpIndex >= 0) {
          bhpList[bhpIndex].stokSekarang = Math.max(0, bhpList[bhpIndex].stokSekarang - diff);
          localStorage.setItem(KEY_BHP, JSON.stringify(bhpList));
          
          if (isFirebaseClientConfigured()) {
            try {
              await saveDocumentClient('bhp', bhpList[bhpIndex].id, bhpList[bhpIndex]);
            } catch (e) {
              console.error('[API] Gagal menyelaraskan stok BHP ke Firebase Client:', e);
            }
          }

          const isSupa = await isSupabaseActive();
          if (isSupa) {
            try {
              await fetch('/api/supabase/save_bhp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bhpList[bhpIndex])
              });
            } catch (e) {
              console.error('[API] Gagal menyelaraskan penyesuaian stok BHP ke Express Proxy:', e);
            }
          }

          const url = getScriptUrl();
          if (url) {
            try {
              await callProxy(url, 'POST', { action: 'save_bhp', data: bhpList[bhpIndex] });
            } catch (e) {
              console.warn('Error syncing updated BHP stock to GAS', e);
            }
          }
        }
      }
    }
    
    localStorage.setItem(KEY_PENGAMBILAN_BHP, JSON.stringify(local));

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('pengambilan_bhp', pengambilan.id, pengambilan);
      } catch (e) {
        console.error('[API] Gagal menyimpan pengambilan BHP ke Firebase Client:', e);
      }
    }

    const isSupa = await isSupabaseActive();
    if (isSupa) {
      try {
        await fetch('/api/supabase/save_pengambilan_bhp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pengambilan)
        });
      } catch (e) {
        console.error('[API] Gagal menyimpan pengambilan BHP ke Supabase:', e);
      }
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_pengambilan_bhp', data: pengambilan });
      } catch (e) {
        console.warn('Error syncing pengambilan BHP to GAS', e);
      }
    }

    return local;
  },

  getMasterRuangs(): MasterRuang[] {
    try {
      const raw = localStorage.getItem(KEY_MASTER_RUANGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading master ruangs:', e);
    }
    safeSetStorage(KEY_MASTER_RUANGS, DEFAULT_MASTER_RUANGS);
    return DEFAULT_MASTER_RUANGS;
  },

  async saveMasterRuang(ruang: MasterRuang, operator?: string): Promise<MasterRuang[]> {
    const list = this.getMasterRuangs();
    const index = list.findIndex(r => r.id === ruang.id || r.nama.toLowerCase().trim() === ruang.nama.toLowerCase().trim());
    let updated: MasterRuang[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = { ...updated[index], ...ruang };
    } else {
      updated = [...list, ruang];
    }
    safeSetStorage(KEY_MASTER_RUANGS, updated);

    // Record audit log
    await this.recordAuditLog(
      operator || 'Admin Sarpras',
      'KELOLA_RUANG',
      ruang.nama,
      `Menyimpan data master ruangan (${ruang.kategori})`
    );

    // Cloud sync via GAS if available
    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_master_ruang', data: ruang });
      } catch (e) {
        console.warn('Error syncing master ruang to GAS', e);
      }
    }

    return updated;
  },

  async deleteMasterRuang(id: string, operator?: string): Promise<MasterRuang[]> {
    const list = this.getMasterRuangs();
    const target = list.find(r => r.id === id);
    const updated = list.filter(r => r.id !== id);
    safeSetStorage(KEY_MASTER_RUANGS, updated);

    if (target) {
      await this.recordAuditLog(
        operator || 'Admin Sarpras',
        'KELOLA_RUANG',
        target.nama,
        `Menghapus ruangan ${target.nama} dari master data`
      );
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'delete_master_ruang', id });
      } catch (e) {
        console.warn('Error syncing delete master ruang to GAS', e);
      }
    }

    return updated;
  },

  getAuditLogs(): AuditLog[] {
    try {
      return JSON.parse(localStorage.getItem(KEY_AUDIT_LOGS) || '[]');
    } catch {
      return [];
    }
  },

  async recordAuditLog(
    operator: string,
    action: AuditLog['action'],
    target: string,
    details: string
  ): Promise<AuditLog[]> {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: `LOG-${new Date().getFullYear()}-${String(logs.length + 1).padStart(4, '0')}`,
      timestamp: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }),
      operator: operator || 'Nursamsi Muslim Widuri, S.Pd.',
      action,
      target,
      details
    };
    const updated = [newLog, ...logs];
    localStorage.setItem(KEY_AUDIT_LOGS, JSON.stringify(updated));

    return updated;
  },

  // Sinkronkan seluruh data lokal (Aset, Peminjaman, Pemusnahan, BHP, Pengaturan) ke Google Sheets & Firebase Cloud
  async syncAllLocalToCloud(): Promise<{ success: boolean; message: string; syncedCount: number }> {
    const asets: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const peminjamans: Peminjaman[] = JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]');
    const pemusnahans: LogPemusnahan[] = JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]');
    const bhp: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
    const pengambilanBhp: PengambilanBHP[] = JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]');
    const localPengaturan = localStorage.getItem(KEY_PENGATURAN);
    const pengaturan: PengaturanSekolah = localPengaturan ? JSON.parse(localPengaturan) : DEFAULT_PENGATURAN;
    const masterRuangs: MasterRuang[] = this.getMasterRuangs();

    let syncedCount = 0;
    const errors: string[] = [];

    // 1. Simpan Pengaturan
    try {
      await this.savePengaturan(pengaturan);
    } catch (e: any) {
      errors.push(`Pengaturan: ${e?.message}`);
    }

    // 2. Simpan Semua Aset
    for (const aset of asets) {
      try {
        await this.saveAset(aset);
        syncedCount++;
      } catch (e: any) {
        errors.push(`Aset ${aset.id}: ${e?.message}`);
      }
    }

    // 3. Simpan Peminjaman
    for (const p of peminjamans) {
      try {
        await this.savePeminjaman(p);
      } catch (e: any) {
        errors.push(`Peminjaman ${p.id}: ${e?.message}`);
      }
    }

    // 4. Simpan Pemusnahan
    for (const log of pemusnahans) {
      try {
        await this.savePemusnahan(log);
      } catch (e: any) {
        errors.push(`Pemusnahan ${log.id}: ${e?.message}`);
      }
    }

    // 5. Simpan BHP
    for (const item of bhp) {
      try {
        await this.saveBHP(item);
      } catch (e: any) {
        errors.push(`BHP ${item.id}: ${e?.message}`);
      }
    }

    // 6. Simpan Pengambilan BHP
    for (const item of pengambilanBhp) {
      try {
        await this.savePengambilanBHP(item);
      } catch (e: any) {
        errors.push(`Pengambilan BHP ${item.id}: ${e?.message}`);
      }
    }

    // 7. Simpan Master Ruangan
    for (const r of masterRuangs) {
      try {
        await this.saveMasterRuang(r);
        syncedCount++;
      } catch (e: any) {
        errors.push(`Ruang ${r.nama}: ${e?.message}`);
      }
    }

    if (errors.length > 0 && syncedCount === 0) {
      return {
        success: false,
        message: `Gagal menyinkronkan data: ${errors.slice(0, 2).join(', ')}`,
        syncedCount
      };
    }

    return {
      success: true,
      message: `Berhasil menyinkronkan ${syncedCount} data inventaris sarpras ke Cloud!`,
      syncedCount
    };
  },

  // Export full JSON backup
  exportBackupData(): string {
    const backup = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      schoolName: 'SMA Negeri 17 Konawe',
      asets: JSON.parse(localStorage.getItem(KEY_ASETS) || '[]'),
      peminjamans: JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]'),
      pemusnahans: JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]'),
      bhp: JSON.parse(localStorage.getItem(KEY_BHP) || '[]'),
      pengambilanBhp: JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]'),
      pengaturan: JSON.parse(localStorage.getItem(KEY_PENGATURAN) || JSON.stringify(DEFAULT_PENGATURAN)),
      masterRuangs: this.getMasterRuangs(),
      auditLogs: this.getAuditLogs()
    };
    return JSON.stringify(backup, null, 2);
  },

  // Import JSON backup and apply to local & trigger cloud sync
  async importBackupData(jsonString: string): Promise<{ success: boolean; message: string; count: number }> {
    try {
      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        throw new Error('Format file cadangan tidak valid (bukan JSON).');
      }

      if (Array.isArray(data.asets)) {
        safeSetStorage(KEY_ASETS, data.asets);
      }
      if (Array.isArray(data.peminjamans)) {
        safeSetStorage(KEY_PEMINJAMANS, data.peminjamans);
      }
      if (Array.isArray(data.pemusnahans)) {
        safeSetStorage(KEY_PEMUSNAHANS, data.pemusnahans);
      }
      if (Array.isArray(data.bhp)) {
        safeSetStorage(KEY_BHP, data.bhp);
      }
      if (Array.isArray(data.pengambilanBhp)) {
        safeSetStorage(KEY_PENGAMBILAN_BHP, data.pengambilanBhp);
      }
      if (Array.isArray(data.masterRuangs)) {
        safeSetStorage(KEY_MASTER_RUANGS, data.masterRuangs);
      }
      if (data.pengaturan && typeof data.pengaturan === 'object') {
        const merged = { ...DEFAULT_PENGATURAN, ...data.pengaturan };
        safeSetStorage(KEY_PENGATURAN, merged);
      }
      if (Array.isArray(data.auditLogs)) {
        safeSetStorage(KEY_AUDIT_LOGS, data.auditLogs);
      }

      const totalAsets = Array.isArray(data.asets) ? data.asets.length : 0;

      // Otomatis sinkronkan ke cloud
      this.syncAllLocalToCloud().catch(err => console.warn('[Backup] Background sync error:', err));

      return {
        success: true,
        message: `Cadangan data berhasil dipulihkan (${totalAsets} aset sarpras dimuat).`,
        count: totalAsets
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Gagal memulihkan cadangan: ${e.message}`,
        count: 0
      };
    }
  },

  getFirebaseConfig() {
    return getFirebaseClientConfig();
  },

  isFirebaseConfigured() {
    return isFirebaseClientConfigured();
  },

  saveFirebaseConfig(config: string | object) {
    return saveCustomFirebaseConfig(config);
  },

  clearFirebaseConfig() {
    clearCustomFirebaseConfig();
  },

  testFirebaseConnection() {
    return testFirebaseClientConnection();
  },

  getKeluhan(): KeluhanSarpras[] {
    try {
      const raw = localStorage.getItem(KEY_KELUHAN);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  async saveKeluhan(item: KeluhanSarpras): Promise<KeluhanSarpras[]> {
    const local = this.getKeluhan();
    const index = local.findIndex(x => x.id === item.id);
    if (index >= 0) {
      local[index] = item;
    } else {
      local.unshift(item);
    }
    safeSetStorage(KEY_KELUHAN, local);

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('keluhan', item.id, item);
      } catch (e) {}
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'save_keluhan', data: item });
      } catch (e) {}
    }

    return local;
  },

  async deleteKeluhan(id: string): Promise<KeluhanSarpras[]> {
    const local = this.getKeluhan();
    const filtered = local.filter(x => x.id !== id);
    safeSetStorage(KEY_KELUHAN, filtered);

    if (isFirebaseClientConfigured()) {
      try {
        await deleteDocumentClient('keluhan', id);
      } catch (e) {}
    }

    const url = getScriptUrl();
    if (url) {
      try {
        await callProxy(url, 'POST', { action: 'delete_keluhan', id });
      } catch (e) {}
    }

    return filtered;
  }
};
