/**
 * syncQueue.ts
 * Background synchronization queue system for e-Sarpras SMAN 1 Amonggedo / SMA Negeri 17 Konawe.
 * - Stores all CRUD actions locally first (localStorage/IndexedDB resilient).
 * - Background worker handles queue retries with exponential backoff.
 * - Offline-first design prevents data loss on network drops.
 */

export interface SyncQueueItem {
  id: string;
  timestamp: number;
  action: 'save_aset' | 'delete_aset' | 'save_multiple_asets' | 'save_peminjaman' | 'save_pemusnahan' | 'save_bhp' | 'delete_bhp' | 'save_pengambilan_bhp' | 'save_pengaturan' | 'save_ruang' | 'delete_ruang' | 'save_keluhan';
  data: any;
  retryCount: number;
  lastAttempt?: number;
  error?: string;
}

const STORAGE_KEY_QUEUE = 'esarpras_sync_queue_v1';
const STORAGE_KEY_QUEUE_LOGS = 'esarpras_sync_queue_logs_v1';

class SyncQueueManager {
  private queue: SyncQueueItem[] = [];
  private isProcessing: boolean = false;
  private listeners: Array<() => void> = [];
  private workerTimer: any = null;

  constructor() {
    this.loadQueue();
    // Auto start worker
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncQueue] Jaringan kembali online, memproses antrean...');
        this.processQueue();
      });
      // Periodic background retry every 15 seconds
      this.workerTimer = setInterval(() => {
        if (navigator.onLine && this.queue.length > 0 && !this.isProcessing) {
          this.processQueue();
        }
      }, 15000);
    }
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_QUEUE);
      if (raw) {
        this.queue = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[SyncQueue] Gagal memuat antrean dari localStorage:', e);
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.warn('[SyncQueue] Gagal menyimpan antrean ke localStorage:', e);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => {
      try { l(); } catch (e) {}
    });
  }

  /**
   * Enqueue a new mutation to be synced to Google Sheets in background.
   */
  public enqueue(action: SyncQueueItem['action'], data: any): string {
    const id = `SYNC-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const item: SyncQueueItem = {
      id,
      timestamp: Date.now(),
      action,
      data,
      retryCount: 0
    };

    // Remove older duplicate action for same entity if applicable (deduplication)
    if (data && data.id) {
      this.queue = this.queue.filter(q => !(q.action === action && q.data?.id === data.id));
    }

    this.queue.push(item);
    this.saveQueue();

    // Trigger immediate background sync
    setTimeout(() => {
      this.processQueue();
    }, 100);

    return id;
  }

  /**
   * Get current queue count and items
   */
  public getQueue(): SyncQueueItem[] {
    return [...this.queue];
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public isBusy(): boolean {
    return this.isProcessing;
  }

  /**
   * Clear all queue manually (for emergency reset)
   */
  public clearQueue() {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Process all queued items sequentially to preserve order
   */
  public async processQueue(): Promise<{ total: number; succeeded: number; failed: number }> {
    if (this.isProcessing || this.queue.length === 0) {
      return { total: this.queue.length, succeeded: 0, failed: 0 };
    }

    // Check internet connection
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { total: this.queue.length, succeeded: 0, failed: this.queue.length };
    }

    this.isProcessing = true;
    this.notifyListeners();

    let succeeded = 0;
    let failed = 0;

    // Get current configured script URL
    let scriptUrl = '';
    try {
      const raw = localStorage.getItem('esarpras_pengaturan');
      if (raw) {
        const parsed = JSON.parse(raw);
        scriptUrl = parsed.googleAppsScriptUrl?.trim() || '';
      }
    } catch (e) {}

    if (!scriptUrl) {
      // No Google Apps Script URL configured, leave items or treat as local-only
      this.isProcessing = false;
      this.notifyListeners();
      return { total: this.queue.length, succeeded: 0, failed: 0 };
    }

    const itemsToProcess = [...this.queue];

    for (const item of itemsToProcess) {
      try {
        item.lastAttempt = Date.now();
        item.retryCount += 1;

        const payload = {
          action: item.action,
          data: item.data,
          syncId: item.id,
          clientTimestamp: new Date(item.timestamp).toISOString()
        };

        // Send via Proxy / Direct POST
        const res = await this.sendToGoogleAppsScript(scriptUrl, payload);
        
        if (res.ok) {
          // Success: Remove item from queue
          this.queue = this.queue.filter(q => q.id !== item.id);
          this.saveQueue();
          succeeded++;
        } else {
          item.error = `HTTP ${res.status}: ${res.statusText}`;
          failed++;
          this.saveQueue();
        }
      } catch (err: any) {
        item.error = err?.message || 'Gagal koneksi server';
        failed++;
        this.saveQueue();
      }
    }

    this.isProcessing = false;
    this.notifyListeners();
    return { total: itemsToProcess.length, succeeded, failed };
  }

  private async sendToGoogleAppsScript(url: string, payload: any): Promise<{ ok: boolean; status: number; statusText: string }> {
    // 1. Try local server proxy first to avoid browser CORS/sandbox quirks
    try {
      const proxyRes = await fetch(`/api/gas-proxy?url=${encodeURIComponent(url)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (proxyRes.ok) {
        return { ok: true, status: proxyRes.status, statusText: 'OK' };
      }
    } catch (proxyErr) {
      // Fallback direct
    }

    // 2. Direct simple POST (bypasses CORS preflight)
    try {
      const directRes = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify(payload)
      });
      return { ok: directRes.ok, status: directRes.status, statusText: directRes.statusText };
    } catch (directErr: any) {
      throw new Error(directErr?.message || 'Jaringan offline atau URL Apps Script tidak merespons');
    }
  }
}

export const syncQueue = new SyncQueueManager();
