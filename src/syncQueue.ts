// Antrian sinkronisasi offline-first.
//
// Data selalu disimpan ke localStorage dulu (lihat api.ts) sebelum dicoba dikirim ke Firestore -
// jadi data TIDAK PERNAH hilang hanya karena koneksi terputus. Modul ini menangani bagian
// berikutnya: kalau pengiriman ke Firestore gagal, dokumen itu dicatat di sini supaya bisa
// otomatis dicoba lagi begitu koneksi pulih, tanpa operator perlu simpan ulang manual.
import { saveDocumentClient, deleteDocumentClient } from './firebaseClient';

const QUEUE_KEY = 'esarpras_pending_sync';

export interface PendingSyncItem {
  id: string; // `${collection}/${docId}`, dipakai untuk dedupe
  collection: string;
  docId: string;
  op: 'set' | 'delete';
  data?: any; // hanya untuk op 'set'
  label: string; // teks ramah-pengguna, ditampilkan di badge/daftar tunggu
  createdAt: string;
  attempts: number;
  lastError?: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
let isSyncing = false;

function notify(): void {
  listeners.forEach(l => {
    try { l(); } catch (e) { /* satu listener error tidak boleh mengganggu yang lain */ }
  });
}

/** Berlangganan perubahan antrian (jumlah item / status sinkron). Kembalikan fungsi untuk berhenti. */
export function subscribeSyncQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isSyncQueueFlushing(): boolean {
  return isSyncing;
}

function readQueue(): PendingSyncItem[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

function writeQueue(items: PendingSyncItem[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch (e) {
    // Kalau localStorage penuh, antrian retry ini boleh gagal tersimpan - data aslinya
    // tetap aman di KEY_ASETS/dll (sudah tersimpan duluan sebelum ini dipanggil).
    console.warn('[SyncQueue] Gagal menyimpan antrian sinkronisasi (localStorage penuh?):', e);
  }
  notify();
}

export function getPendingSyncQueue(): PendingSyncItem[] {
  return readQueue();
}

export function getPendingSyncCount(): number {
  return readQueue().length;
}

/** Catat dokumen yang gagal terkirim ke Firestore, supaya dicoba lagi nanti. */
export function enqueuePendingSync(collection: string, docId: string, data: any, label: string): void {
  const id = `${collection}/${docId}`;
  const items = readQueue();
  const idx = items.findIndex(i => i.id === id);
  const entry: PendingSyncItem = {
    id,
    collection,
    docId,
    op: 'set',
    data,
    label,
    createdAt: new Date().toISOString(),
    attempts: idx >= 0 ? items[idx].attempts : 0,
  };
  if (idx >= 0) items[idx] = entry; else items.push(entry);
  writeQueue(items);
}

/** Catat penghapusan yang gagal terkirim ke Firestore, supaya dicoba lagi nanti. */
export function enqueuePendingDelete(collection: string, docId: string, label: string): void {
  const id = `${collection}/${docId}`;
  const items = readQueue();
  const idx = items.findIndex(i => i.id === id);
  const entry: PendingSyncItem = {
    id,
    collection,
    docId,
    op: 'delete',
    label,
    createdAt: new Date().toISOString(),
    attempts: idx >= 0 ? items[idx].attempts : 0,
  };
  if (idx >= 0) items[idx] = entry; else items.push(entry);
  writeQueue(items);
}

/** Hapus dari antrian setelah berhasil tersinkron (lewat flush maupun simpan ulang manual). */
export function removePendingSync(collection: string, docId: string): void {
  const id = `${collection}/${docId}`;
  const items = readQueue();
  const filtered = items.filter(i => i.id !== id);
  if (filtered.length !== items.length) writeQueue(filtered);
}

/** Coba kirim ulang semua item dalam antrian. Aman dipanggil berkali-kali (tidak dobel jalan). */
export async function flushPendingSyncQueue(): Promise<{ succeeded: number; failed: number }> {
  if (isSyncing) return { succeeded: 0, failed: 0 };
  const items = readQueue();
  if (items.length === 0) return { succeeded: 0, failed: 0 };

  isSyncing = true;
  notify();

  let succeeded = 0;
  let failed = 0;
  const remaining: PendingSyncItem[] = [];

  for (const item of items) {
    try {
      if (item.op === 'delete') {
        await deleteDocumentClient(item.collection, item.docId);
      } else {
        await saveDocumentClient(item.collection, item.docId, item.data);
      }
      succeeded++;
    } catch (e: any) {
      failed++;
      remaining.push({ ...item, attempts: item.attempts + 1, lastError: e?.message || String(e) });
    }
  }

  writeQueue(remaining);
  isSyncing = false;
  notify();

  return { succeeded, failed };
}
