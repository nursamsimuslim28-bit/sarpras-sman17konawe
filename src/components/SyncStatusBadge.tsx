import React, { useEffect, useRef, useState } from 'react';
import { CloudOff, Loader2, CheckCircle2, WifiOff } from 'lucide-react';
import { getPendingSyncCount, isSyncQueueFlushing, subscribeSyncQueue } from '../syncQueue';

// Indikator kecil di header: menampilkan berapa data yang masih tersimpan di perangkat ini dan
// belum sampai ke server (mis. karena koneksi terputus), lalu status "sedang mengirim" saat
// antrian itu dicoba dikirim ulang otomatis, dan tanda centang sesaat setelah berhasil. Juga
// menampilkan langsung "Anda sedang offline" begitu perangkat kehilangan koneksi - tidak perlu
// menunggu sampai ada percobaan simpan dulu supaya baru terlihat.
// Selalu terlihat di semua tab (bukan cuma Opname) karena bisa terjadi di data mana pun.
export default function SyncStatusBadge() {
  const [count, setCount] = useState(getPendingSyncCount());
  const [flushing, setFlushing] = useState(isSyncQueueFlushing());
  const [justSynced, setJustSynced] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const prevCountRef = useRef(count);
  const prevFlushingRef = useRef(flushing);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeSyncQueue(() => {
      const newCount = getPendingSyncCount();
      const newFlushing = isSyncQueueFlushing();

      // Baru selesai mengirim dan antrian jadi kosong -> tampilkan tanda centang beberapa detik
      if (prevFlushingRef.current && !newFlushing && newCount === 0 && prevCountRef.current > 0) {
        setJustSynced(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setJustSynced(false), 4000);
      }

      prevCountRef.current = newCount;
      prevFlushingRef.current = newFlushing;
      setCount(newCount);
      setFlushing(newFlushing);
    });
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      unsubscribe();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, []);

  if (isOffline) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-600 shrink-0"
        title="Tidak ada koneksi internet. Anda tetap bisa bekerja seperti biasa - semua perubahan tersimpan aman di perangkat ini dan akan otomatis terkirim ke server begitu koneksi kembali."
      >
        <WifiOff size={13} />
        <span className="text-[10px] font-bold whitespace-nowrap">Offline{count > 0 ? ` - ${count} data menunggu` : ' - data tersimpan di HP'}</span>
      </div>
    );
  }

  if (flushing) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 shrink-0">
        <Loader2 size={13} className="animate-spin" />
        <span className="text-[10px] font-bold whitespace-nowrap">Mengirim{count > 0 ? ` ${count}` : ''} data...</span>
      </div>
    );
  }

  if (count > 0) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 shrink-0"
        title="Data ini tersimpan aman di perangkat ini dan akan otomatis terkirim ke server saat koneksi internet kembali."
      >
        <CloudOff size={13} />
        <span className="text-[10px] font-bold whitespace-nowrap">{count} data menunggu sinkron</span>
      </div>
    );
  }

  if (justSynced) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
        <CheckCircle2 size={13} />
        <span className="text-[10px] font-bold whitespace-nowrap">Tersinkron ke server</span>
      </div>
    );
  }

  return null;
}
