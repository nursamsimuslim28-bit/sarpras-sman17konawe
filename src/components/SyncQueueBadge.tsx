import React, { useState, useEffect } from 'react';
import { syncQueue, SyncQueueItem } from '../syncQueue';
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface SyncQueueBadgeProps {
  compact?: boolean;
}

export const SyncQueueBadge: React.FC<SyncQueueBadgeProps> = ({ compact = false }) => {
  const [queue, setQueue] = useState<SyncQueueItem[]>(syncQueue.getQueue());
  const [isProcessing, setIsProcessing] = useState<boolean>(syncQueue.isBusy());
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isOpenModal, setIsOpenModal] = useState<boolean>(false);

  useEffect(() => {
    // Listen to network status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to queue changes
    const unsubscribe = syncQueue.subscribe(() => {
      setQueue(syncQueue.getQueue());
      setIsProcessing(syncQueue.isBusy());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const pendingCount = queue.length;

  const handleManualSync = async () => {
    await syncQueue.processQueue();
  };

  if (compact) {
    return (
      <button
        onClick={() => setIsOpenModal(true)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
          pendingCount > 0
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
            : isOnline
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }`}
        title="Klik untuk melihat status antrean sinkronisasi offline/cloud"
      >
        {isProcessing ? (
          <RefreshCw size={12} className="animate-spin text-amber-400" />
        ) : pendingCount > 0 ? (
          <Clock size={12} className="text-amber-400 animate-pulse" />
        ) : isOnline ? (
          <CheckCircle2 size={12} className="text-emerald-400" />
        ) : (
          <WifiOff size={12} className="text-rose-400" />
        )}

        <span>
          {pendingCount > 0
            ? `${pendingCount} Antrean`
            : isOnline
            ? 'Tersinkron'
            : 'Mode Offline'}
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
            <span className="font-bold text-slate-200">
              {isOnline ? 'Koneksi Online' : 'Koneksi Terputus'}
            </span>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isProcessing || pendingCount === 0 || !isOnline}
            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={10} className={isProcessing ? 'animate-spin' : ''} />
            {isProcessing ? 'Sinkron...' : 'Proses Antrean'}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-slate-400">
          <span className="text-[11px]">Antrean Latar Belakang:</span>
          {pendingCount > 0 ? (
            <button
              onClick={() => setIsOpenModal(true)}
              className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold tracking-wide hover:bg-amber-500/30 transition cursor-pointer flex items-center gap-1"
            >
              <Clock size={10} />
              {pendingCount} Pending
            </button>
          ) : (
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 size={10} />
              Semua Tersimpan
            </span>
          )}
        </div>
      </div>

      {/* Modal Detail Antrean */}
      {isOpenModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Antrean Sinkronisasi Latar Belakang</h3>
                  <p className="text-xs text-slate-500">Sistem Sync Queue menjamin data tersimpan aman secara offline</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpenModal(false)}
                className="text-slate-400 hover:text-slate-600 transition text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-1">
              {queue.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Antrean Kosong!</p>
                  <p className="text-xs text-slate-400 mt-1">Seluruh data perubahan telah tersinkronkan sepenuhnya ke server cloud.</p>
                </div>
              ) : (
                queue.map((item, idx) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-700 uppercase tracking-wide">
                        #{idx + 1} {item.action.replace('_', ' ')}
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {item.data?.nama || item.data?.id || 'Data Perubahan'} • {new Date(item.timestamp).toLocaleTimeString('id-ID')}
                      </p>
                      {item.error && (
                        <p className="text-[10px] text-rose-500 mt-1 font-mono">
                          {item.error}
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold shrink-0">
                      Retries: {item.retryCount}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                onClick={() => syncQueue.clearQueue()}
                className="text-xs text-rose-500 hover:text-rose-600 font-semibold cursor-pointer"
              >
                Reset Antrean
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  onClick={handleManualSync}
                  disabled={isProcessing || pendingCount === 0 || !isOnline}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-600/20"
                >
                  <RefreshCw size={12} className={isProcessing ? 'animate-spin' : ''} />
                  Proses Sekarang
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
