import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let db: any = null;

export function getFirestoreDb() {
  if (db) return db;

  try {
    const configPath = join(process.cwd(), 'firebase-applet-config.json');
    if (!existsSync(configPath)) {
      // Firebase config file is optional if app uses Google Sheets / Local Storage
      return null;
    }
    const configContent = readFileSync(configPath, 'utf8');
    const firebaseConfig = JSON.parse(configContent);

    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log('[Firebase Init]: Firestore initialized successfully with databaseId:', firebaseConfig.firestoreDatabaseId);
    return db;
  } catch (err) {
    console.error('[Firebase Init Error]: Gagal inisialisasi Firestore:', err);
    return null;
  }
}

// Check if Firebase is configured
export function isFirebaseConfigured() {
  return getFirestoreDb() !== null;
}

// CRUD Wrapper Helpers

export async function getAllData() {
  const firestoreDb = getFirestoreDb();
  if (!firestoreDb) return null;

  try {
    const fetchPengaturan = async () => {
      try {
        const docRef = doc(firestoreDb, 'pengaturan', 'default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (!data.namaSekolah || data.namaSekolah.includes("AMONGGED") || data.namaSekolah === "SMAN 17 Konawe") {
            data.namaSekolah = "SMA Negeri 17 Konawe";
            // Persist the updated school name to Firestore asynchronously
            setDoc(docRef, { namaSekolah: "SMA Negeri 17 Konawe" }, { merge: true }).catch(err => console.warn('Gagal update nama sekolah ke Firestore:', err));
          }
          return data;
        }
        return null;
      } catch (e) {
        console.warn('Gagal memuat pengaturan dari Firestore:', e);
        return null;
      }
    };

    // Helper to get all docs from a collection
    const getCollectionDocs = async (collName: string) => {
      try {
        const snap = await getDocs(collection(firestoreDb, collName));
        const list: any[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() });
        });
        return list;
      } catch (e) {
        console.warn(`Gagal memuat ${collName} dari Firestore:`, e);
        return [];
      }
    };

    const [pengaturan, asets, peminjamans, pemusnahans, bhp, pengambilanBhp] = await Promise.all([
      fetchPengaturan(),
      getCollectionDocs('asets'),
      getCollectionDocs('peminjamans'),
      getCollectionDocs('pemusnahans'),
      getCollectionDocs('bhp'),
      getCollectionDocs('pengambilan_bhp')
    ]);

    return {
      pengaturan,
      asets,
      peminjamans,
      pemusnahans,
      bhp,
      pengambilanBhp
    };
  } catch (error) {
    console.error('Error getAllData from Firestore:', error);
    throw error;
  }
}

export async function saveDocument(collName: string, docId: string, data: any) {
  const firestoreDb = getFirestoreDb();
  if (!firestoreDb) throw new Error('Firebase Firestore not initialized');
  
  const docRef = doc(firestoreDb, collName, docId);
  await setDoc(docRef, data, { merge: true });
}

export async function deleteDocument(collName: string, docId: string) {
  const firestoreDb = getFirestoreDb();
  if (!firestoreDb) throw new Error('Firebase Firestore not initialized');

  const docRef = doc(firestoreDb, collName, docId);
  await deleteDoc(docRef);
}
