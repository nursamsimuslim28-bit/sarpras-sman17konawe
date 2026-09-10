import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection, Firestore } from 'firebase/firestore';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
  firestoreDatabaseId?: string;
}

const STORAGE_KEY_FIREBASE = 'esarpras_firebase_config';

/**
 * Mendapatkan konfigurasi Firebase Web Client dari:
 * 1. Penyimpanan Lokal Browser (Pengaturan -> Database Firebase)
 * 2. Variabel Lingkungan Vite (Vercel / GitHub Actions / .env)
 */
export function getFirebaseClientConfig(): FirebaseWebConfig | null {
  // 1. Cek konfigurasi yang disimpan pengguna di browser
  try {
    const rawLocal = localStorage.getItem(STORAGE_KEY_FIREBASE);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      if (parsed && (parsed.apiKey || parsed.projectId)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Firebase Client] Gagal membaca konfigurasi dari localStorage:', e);
  }

  // 2. Cek VITE_FIREBASE_CONFIG (Format JSON string penuh)
  try {
    const rawEnvConfig = import.meta.env.VITE_FIREBASE_CONFIG;
    if (rawEnvConfig && typeof rawEnvConfig === 'string') {
      const parsed = JSON.parse(rawEnvConfig);
      if (parsed && (parsed.apiKey || parsed.projectId)) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore JSON parse error from env
  }

  // 3. Cek variabel individual Vite (VITE_FIREBASE_API_KEY, dll)
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;

  if (apiKey && projectId) {
    return {
      apiKey: apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
    };
  }

  return null;
}

export function isFirebaseClientConfigured(): boolean {
  const config = getFirebaseClientConfig();
  return !!(config && config.projectId && config.apiKey);
}

let cachedClientDb: Firestore | null = null;
let currentAppInstance: FirebaseApp | null = null;

export function getClientFirestore(): Firestore | null {
  if (cachedClientDb) return cachedClientDb;

  const config = getFirebaseClientConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    const appName = 'esarpras-web-client';
    const existingApps = getApps();
    const existingApp = existingApps.find(a => a.name === appName);

    if (existingApp) {
      currentAppInstance = existingApp;
    } else {
      currentAppInstance = initializeApp(config, appName);
    }

    const databaseId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? config.firestoreDatabaseId 
      : undefined;

    cachedClientDb = getFirestore(currentAppInstance, databaseId);
    console.log('[Firebase Client]: Firestore Client Web SDK berhasil diinisialisasi untuk project:', config.projectId);
    return cachedClientDb;
  } catch (err) {
    console.error('[Firebase Client Init Error]:', err);
    return null;
  }
}

/**
 * Simpan konfigurasi Firebase kustom dari UI Settings
 */
export function saveCustomFirebaseConfig(configData: string | object): { success: boolean; message: string } {
  try {
    let parsed: FirebaseWebConfig;
    if (typeof configData === 'string') {
      // Hilangkan syntax JS seperti "const firebaseConfig = " jika pengguna menyalin langsung dari Firebase Console
      let cleanString = configData.trim();
      if (cleanString.includes('=')) {
        cleanString = cleanString.substring(cleanString.indexOf('=') + 1).trim();
      }
      if (cleanString.endsWith(';')) {
        cleanString = cleanString.slice(0, -1).trim();
      }
      // Ganti unquoted keys jika ada
      try {
        parsed = JSON.parse(cleanString);
      } catch (jsonErr) {
        // Coba evaluasi struktur object JS sederhana
        const sanitized = cleanString
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
          .replace(/'/g, '"');
        parsed = JSON.parse(sanitized);
      }
    } else {
      parsed = configData as FirebaseWebConfig;
    }

    if (!parsed.apiKey || !parsed.projectId) {
      return {
        success: false,
        message: 'Konfigurasi tidak valid. Minimal harus terdapat "apiKey" dan "projectId".'
      };
    }

    localStorage.setItem(STORAGE_KEY_FIREBASE, JSON.stringify(parsed));
    
    // Reset cache DB
    cachedClientDb = null;
    currentAppInstance = null;

    return {
      success: true,
      message: 'Konfigurasi Firebase Web Client berhasil disimpan.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal memproses konfigurasi Firebase: ${err.message || 'Format JSON tidak valid'}`
    };
  }
}

/**
 * Hapus konfigurasi Firebase kustom
 */
export function clearCustomFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_FIREBASE);
  cachedClientDb = null;
  currentAppInstance = null;
}

/**
 * Uji koneksi ke Firebase Firestore Client
 */
export async function testFirebaseClientConnection(): Promise<{ success: boolean; message: string }> {
  const db = getClientFirestore();
  if (!db) {
    return {
      success: false,
      message: 'Firebase belum dikonfigurasi. Masukkan API Key dan Project ID terlebih dahulu.'
    };
  }

  try {
    // Coba baca dokumen pengaturan atau lakukan ping ringan ke koleksi pengaturan
    const docRef = doc(db, 'pengaturan', 'default');
    const docSnap = await getDoc(docRef);
    return {
      success: true,
      message: `Koneksi Berhasil! Terhubung ke Firebase Firestore (Project ID: ${getFirebaseClientConfig()?.projectId}). Dokumen ${docSnap.exists() ? 'ditemukan' : 'siap digunakan'}.`
    };
  } catch (err: any) {
    console.error('[Firebase Client Test Error]:', err);
    return {
      success: false,
      message: `Koneksi Gagal: ${err.message || 'Periksa aturan keamanan (Security Rules) di Firebase Console atau koneksi internet.'}`
    };
  }
}

/**
 * Ambil semua data dari Firestore Client SDK
 */
export async function getAllDataFromClientFirebase(): Promise<{
  asets: any[];
  peminjamans: any[];
  pemusnahans: any[];
  bhp: any[];
  pengambilanBhp: any[];
  keluhan: any[];
  pengaturan: any;
} | null> {
  const db = getClientFirestore();
  if (!db) return null;

  try {
    // 1. Pengaturan
    let pengaturan: any = null;
    try {
      const docRef = doc(db, 'pengaturan', 'default');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        pengaturan = snap.data();
      }
    } catch (e) {
      console.warn('[Firebase Client] Gagal memuat pengaturan:', e);
    }

    // 2. Helper ambil koleksi
    const fetchColl = async (collName: string) => {
      try {
        const snap = await getDocs(collection(db, collName));
        const items: any[] = [];
        snap.forEach(d => {
          items.push({ id: d.id, ...d.data() });
        });
        return items;
      } catch (e) {
        console.warn(`[Firebase Client] Gagal memuat koleksi ${collName}:`, e);
        return [];
      }
    };

    const [asets, peminjamans, pemusnahans, bhp, pengambilanBhp, keluhan] = await Promise.all([
      fetchColl('asets'),
      fetchColl('peminjamans'),
      fetchColl('pemusnahans'),
      fetchColl('bhp'),
      fetchColl('pengambilan_bhp'),
      fetchColl('keluhan')
    ]);

    return {
      pengaturan,
      asets,
      peminjamans,
      pemusnahans,
      bhp,
      pengambilanBhp,
      keluhan
    };
  } catch (err) {
    console.error('[Firebase Client getAllData Error]:', err);
    return null;
  }
}

/**
 * Simpan dokumen ke Firestore Client SDK
 */
export async function saveDocumentClient(collName: string, docId: string, data: any): Promise<void> {
  const db = getClientFirestore();
  if (!db) return;

  try {
    const docRef = doc(db, collName, docId);
    // Bersihkan undefined values agar tidak ditolak Firestore
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
    console.log(`[Firebase Client] Berhasil menyimpan ${collName}/${docId}`);
  } catch (err) {
    console.error(`[Firebase Client Save Error ${collName}/${docId}]:`, err);
    throw err;
  }
}

/**
 * Hapus dokumen dari Firestore Client SDK
 */
export async function deleteDocumentClient(collName: string, docId: string): Promise<void> {
  const db = getClientFirestore();
  if (!db) return;

  try {
    const docRef = doc(db, collName, docId);
    await deleteDoc(docRef);
    console.log(`[Firebase Client] Berhasil menghapus ${collName}/${docId}`);
  } catch (err) {
    console.error(`[Firebase Client Delete Error ${collName}/${docId}]:`, err);
    throw err;
  }
}
