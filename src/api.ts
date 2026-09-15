import { Aset, Peminjaman, LogPemusnahan, LogPemeliharaan, PengaturanSekolah, SAMPLE_ASETS, SAMPLE_PEMINJAMANS, SAMPLE_PEMUSNAHANS, DEFAULT_PENGATURAN, BarangHabisPakai, PengambilanBHP, SAMPLE_BHP, SAMPLE_PENGAMBILAN_BHP, AuditLog, AUTHORIZED_USERS, MasterRuang, DEFAULT_MASTER_RUANGS, KeluhanSarpras } from './types';
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
const KEY_PEMELIHARAAN = 'esarpras_pemeliharaans';
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
  [KEY_ASETS, KEY_PEMINJAMANS, KEY_PEMUSNAHANS, KEY_PEMELIHARAAN, KEY_BHP, KEY_PENGAMBILAN_BHP, KEY_AUDIT_LOGS].forEach(key => {
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

// Cloud Firestore adalah satu-satunya sumber kebenaran (source of truth).
// Jika fetch ke server berhasil (remote adalah array), pakai remote apa adanya
// supaya item yang dihapus di Cloud ikut hilang di semua perangkat.
// Local storage hanya dipakai sebagai fallback ketika fetch ke server gagal (mode offline).
function mergeById<T extends { id: string }>(remote: T[] | undefined, local: T[]): T[] {
  const source = Array.isArray(remote) ? remote : local;
  return source.filter(item => item && item.id && !DUMMY_IDS.has(item.id));
}

const KEY_INITIALIZED = 'esarpras_app_initialized';

// Inisialisasi storage awal (bersih, tanpa data contoh/demo bawaan)
if (!localStorage.getItem(KEY_INITIALIZED)) {
  if (!localStorage.getItem(KEY_ASETS)) safeSetStorage(KEY_ASETS, []);
  if (!localStorage.getItem(KEY_PEMINJAMANS)) safeSetStorage(KEY_PEMINJAMANS, []);
  if (!localStorage.getItem(KEY_PEMUSNAHANS)) safeSetStorage(KEY_PEMUSNAHANS, []);
  if (!localStorage.getItem(KEY_PEMELIHARAAN)) safeSetStorage(KEY_PEMELIHARAAN, []);
  if (!localStorage.getItem(KEY_BHP)) safeSetStorage(KEY_BHP, []);
  if (!localStorage.getItem(KEY_PENGAMBILAN_BHP)) safeSetStorage(KEY_PENGAMBILAN_BHP, []);
  if (!localStorage.getItem(KEY_AUDIT_LOGS)) safeSetStorage(KEY_AUDIT_LOGS, []);
  if (!localStorage.getItem(KEY_MASTER_RUANGS)) safeSetStorage(KEY_MASTER_RUANGS, DEFAULT_MASTER_RUANGS);
  if (!localStorage.getItem(KEY_KELUHAN)) safeSetStorage(KEY_KELUHAN, []);
  localStorage.setItem(KEY_INITIALIZED, 'true');
} else {
  if (!localStorage.getItem(KEY_MASTER_RUANGS)) {
    safeSetStorage(KEY_MASTER_RUANGS, DEFAULT_MASTER_RUANGS);
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

    // Bersihkan sisa konfigurasi Google Sheets/Apps Script lama (fitur ini sudah dihapus,
    // Firebase Firestore adalah satu-satunya backend cloud) agar tidak salah terbaca di tempat lain
    merged.googleAppsScriptUrl = '';
    merged.googleSpreadsheetUrl = '';
    merged.googleDriveFolderId = '';

    // Pastikan nama sekolah resmi terformat SMA Negeri 17 Konawe jika ada nama lama atau typo
    // (mencakup varian lama "SMAN 1 Amonggedo" dalam berbagai huruf besar/kecil)
    if (!merged.namaSekolah || /amonggedo/i.test(merged.namaSekolah) || merged.namaSekolah === "SMAN 17 Konawe") {
      merged.namaSekolah = "SMA Negeri 17 Konawe";
    }

    localStorage.setItem(KEY_PENGATURAN, JSON.stringify(merged));
  } catch (e) {
    localStorage.setItem(KEY_PENGATURAN, JSON.stringify(DEFAULT_PENGATURAN));
  }
}


// Dynamic API client that handles syncs
export const api = {
  // Get all data
  async getAll(): Promise<{ asets: Aset[]; peminjamans: Peminjaman[]; pemusnahans: LogPemusnahan[]; pemeliharaans: LogPemeliharaan[]; pengaturan: PengaturanSekolah; bhp: BarangHabisPakai[]; pengambilanBhp: PengambilanBHP[]; keluhan: KeluhanSarpras[] }> {
    // Ambil data lokal saat ini
    const localAsets: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    const localPeminjamans: Peminjaman[] = JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]');
    const localPemusnahans: LogPemusnahan[] = JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]');
    const localPemeliharaans: LogPemeliharaan[] = JSON.parse(localStorage.getItem(KEY_PEMELIHARAAN) || '[]');
    const localBhp: BarangHabisPakai[] = JSON.parse(localStorage.getItem(KEY_BHP) || '[]');
    const localPengambilanBhp: PengambilanBHP[] = JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]');
    const localKeluhan: KeluhanSarpras[] = JSON.parse(localStorage.getItem(KEY_KELUHAN) || '[]');

    // 1. Cloud: Firebase Web Client SDK (satu-satunya sumber remote)
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
          const mergedPemeliharaans = mergeById(clientData.pemeliharaans, localPemeliharaans);
          const mergedBhp = mergeById(clientData.bhp, localBhp);
          const mergedPengambilanBhp = mergeById(clientData.pengambilanBhp, localPengambilanBhp);
          const mergedKeluhan = mergeById(clientData.keluhan, localKeluhan);

          safeSetStorage(KEY_ASETS, mergedAsets);
          safeSetStorage(KEY_PEMINJAMANS, mergedPeminjamans);
          safeSetStorage(KEY_PEMUSNAHANS, mergedPemusnahans);
          safeSetStorage(KEY_PEMELIHARAAN, mergedPemeliharaans);
          safeSetStorage(KEY_PENGATURAN, mergedPengaturan);
          safeSetStorage(KEY_BHP, mergedBhp);
          safeSetStorage(KEY_PENGAMBILAN_BHP, mergedPengambilanBhp);
          safeSetStorage(KEY_KELUHAN, mergedKeluhan);

          return {
            asets: mergedAsets,
            peminjamans: mergedPeminjamans,
            pemusnahans: mergedPemusnahans,
            pemeliharaans: mergedPemeliharaans,
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
    if (!offlinePengaturan.namaSekolah || /amonggedo/i.test(offlinePengaturan.namaSekolah) || offlinePengaturan.namaSekolah === "SMAN 17 Konawe") {
      offlinePengaturan.namaSekolah = "SMA Negeri 17 Konawe";
    }
    return {
      asets: JSON.parse(localStorage.getItem(KEY_ASETS) || '[]'),
      peminjamans: JSON.parse(localStorage.getItem(KEY_PEMINJAMANS) || '[]'),
      pemusnahans: JSON.parse(localStorage.getItem(KEY_PEMUSNAHANS) || '[]'),
      pemeliharaans: JSON.parse(localStorage.getItem(KEY_PEMELIHARAAN) || '[]'),
      pengaturan: offlinePengaturan,
      bhp: JSON.parse(localStorage.getItem(KEY_BHP) || '[]'),
      pengambilanBhp: JSON.parse(localStorage.getItem(KEY_PENGAMBILAN_BHP) || '[]'),
      keluhan: JSON.parse(localStorage.getItem(KEY_KELUHAN) || '[]')
    };
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

    // Google Apps Script batch or iterative sync

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



    return filtered;
  },

  // Split single bulk aset into individual 1-unit asets atomically
  async splitAset(oldId: string, newAsets: Aset[]): Promise<Aset[]> {
    const local: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
    
    // 1. Hapus aset lama (misal SAR-2025-0002)
    const filtered = local.filter(x => x && x.id !== oldId);
    
    // 2. Tambahkan unit-unit baru
    newAsets.forEach(a => {
      if (a && a.id) {
        filtered.push(a);
      }
    });

    // 3. Simpan state bersih ke localStorage secara langsung
    safeSetStorage(KEY_ASETS, filtered);

    // 4. Firebase Sync
    if (isFirebaseClientConfigured()) {
      try {
        await deleteDocumentClient('asets', oldId);
        for (const aset of newAsets) {
          await saveDocumentClient('asets', aset.id, aset);
        }
      } catch (e) {}
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


    }

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('pemusnahans', log.id, log);
      } catch (e) {
        console.error('[API] Gagal menyimpan pemusnahan ke Firebase Client:', e);
      }
    }



    return local;
  },

  // Save/Update Pemeliharaan (Perawatan/Perbaikan Aset)
  async savePemeliharaan(log: LogPemeliharaan): Promise<LogPemeliharaan[]> {
    const local: LogPemeliharaan[] = JSON.parse(localStorage.getItem(KEY_PEMELIHARAAN) || '[]');
    const index = local.findIndex(x => x.id === log.id);
    if (index >= 0) {
      local[index] = log;
    } else {
      local.push(log);
    }
    safeSetStorage(KEY_PEMELIHARAAN, local);

    // Jika kondisi aset berubah setelah perawatan, perbarui juga data aset terkait
    if (log.kondisiSesudah) {
      const asets: Aset[] = JSON.parse(localStorage.getItem(KEY_ASETS) || '[]');
      const asetIndex = asets.findIndex(x => x.id === log.asetId);
      if (asetIndex >= 0 && asets[asetIndex].kondisi !== log.kondisiSesudah) {
        asets[asetIndex].kondisi = log.kondisiSesudah;
        asets[asetIndex].updatedAt = new Date().toISOString();
        safeSetStorage(KEY_ASETS, asets);
        if (isFirebaseClientConfigured()) {
          try {
            await saveDocumentClient('asets', asets[asetIndex].id, asets[asetIndex]);
          } catch (e) {
            console.error('[API] Gagal memperbarui kondisi aset di Firebase Client:', e);
          }
        }
      }
    }

    if (isFirebaseClientConfigured()) {
      try {
        await saveDocumentClient('pemeliharaans', log.id, log);
      } catch (e) {
        console.error('[API] Gagal menyimpan pemeliharaan ke Firebase Client:', e);
      }
    }

    return local;
  },

  // Delete Pemeliharaan
  async deletePemeliharaan(id: string): Promise<LogPemeliharaan[]> {
    const local: LogPemeliharaan[] = JSON.parse(localStorage.getItem(KEY_PEMELIHARAAN) || '[]');
    const filtered = local.filter(x => x.id !== id);
    safeSetStorage(KEY_PEMELIHARAAN, filtered);

    if (isFirebaseClientConfigured()) {
      try {
        await deleteDocumentClient('pemeliharaans', id);
      } catch (e) {
        console.error('[API] Gagal menghapus pemeliharaan di Firebase Client:', e);
      }
    }

    return filtered;
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



    return cfg;
  },

  // Foto disimpan sebagai base64 langsung (Firebase Firestore), tidak lagi via Google Drive
  async uploadPhotoToDrive(base64Data: string, _filename: string): Promise<string> {
    return base64Data;
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
    const index = list.findIndex(r => r.id === ruang.id || (r.nama || '').toLowerCase().trim() === (ruang.nama || '').toLowerCase().trim());
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
  async syncAllLocalToCloud(
    onProgress?: (done: number, total: number, label: string) => void
  ): Promise<{ success: boolean; message: string; syncedCount: number }> {
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

    const totalItems = 1 + asets.length + peminjamans.length + pemusnahans.length
      + bhp.length + pengambilanBhp.length + masterRuangs.length;
    let doneItems = 0;
    const tick = (label: string) => {
      doneItems++;
      onProgress?.(doneItems, totalItems, label);
    };

    // 1. Simpan Pengaturan
    try {
      await this.savePengaturan(pengaturan);
    } catch (e: any) {
      errors.push(`Pengaturan: ${e?.message}`);
    }
    tick('Pengaturan Sekolah');

    // 2. Simpan Semua Aset
    for (const aset of asets) {
      try {
        await this.saveAset(aset);
        syncedCount++;
      } catch (e: any) {
        errors.push(`Aset ${aset.id}: ${e?.message}`);
      }
      tick(`Aset: ${aset.nama || aset.id}`);
    }

    // 3. Simpan Peminjaman
    for (const p of peminjamans) {
      try {
        await this.savePeminjaman(p);
      } catch (e: any) {
        errors.push(`Peminjaman ${p.id}: ${e?.message}`);
      }
      tick('Data Peminjaman');
    }

    // 4. Simpan Pemusnahan
    for (const log of pemusnahans) {
      try {
        await this.savePemusnahan(log);
      } catch (e: any) {
        errors.push(`Pemusnahan ${log.id}: ${e?.message}`);
      }
      tick('Log Pemusnahan');
    }

    // 5. Simpan BHP
    for (const item of bhp) {
      try {
        await this.saveBHP(item);
      } catch (e: any) {
        errors.push(`BHP ${item.id}: ${e?.message}`);
      }
      tick(`BHP: ${item.nama || item.id}`);
    }

    // 6. Simpan Pengambilan BHP
    for (const item of pengambilanBhp) {
      try {
        await this.savePengambilanBHP(item);
      } catch (e: any) {
        errors.push(`Pengambilan BHP ${item.id}: ${e?.message}`);
      }
      tick('Pengambilan BHP');
    }

    // 7. Simpan Master Ruangan
    for (const r of masterRuangs) {
      try {
        await this.saveMasterRuang(r);
        syncedCount++;
      } catch (e: any) {
        errors.push(`Ruang ${r.nama}: ${e?.message}`);
      }
      tick(`Ruang: ${r.nama}`);
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
      pemeliharaans: JSON.parse(localStorage.getItem(KEY_PEMELIHARAAN) || '[]'),
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
      if (Array.isArray(data.pemeliharaans)) {
        safeSetStorage(KEY_PEMELIHARAAN, data.pemeliharaans);
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


    return filtered;
  }
};
