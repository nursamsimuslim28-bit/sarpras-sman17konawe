import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, RefreshCw, AlertCircle, Info, BookOpen, Upload, FileImage, Tag, Calendar, Layers, MapPin, Clipboard, Package, FolderOpen } from 'lucide-react';
import { Aset, Peminjaman } from '../types';

const parsePhotos = (fotoUrl: string | undefined): string[] => {
  if (!fotoUrl) return [];
  try {
    if (fotoUrl.startsWith('[')) {
      const parsed = JSON.parse(fotoUrl);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => p && p !== '');
      }
    }
  } catch (e) {}
  return [fotoUrl].filter(p => p && p !== '');
};

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  asets: Aset[];
  peminjamans: Peminjaman[];
  onQuickReturn: (loan: Peminjaman) => Promise<void>;
  onSuccessCallback?: (code: string) => void;
  // If scan is initiated from form, we can just close on success, otherwise show quick actions
  actionType: 'search' | 'loan_form' | 'aset_form';
}

export default function QRScanner({
  isOpen,
  onClose,
  asets,
  peminjamans,
  onQuickReturn,
  onSuccessCallback,
  actionType
}: QRScannerProps) {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [matchedAset, setMatchedAset] = useState<Aset | null>(null);
  const [activeLoan, setActiveLoan] = useState<Peminjaman | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isReturning, setIsReturning] = useState(false);
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  useEffect(() => {
    setActivePhotoIdx(0);
  }, [scannedCode]);

  useEffect(() => {
    let isMounted = true;

    if (isOpen && !scannedCode && activeTab === 'camera') {
      setScannerError(null);
      setIsCameraActive(false);
      
      const timer = setTimeout(async () => {
        if (!isMounted) return;

        const element = document.getElementById('reader-view');
        if (!element) {
          console.warn('reader-view element not found');
          return;
        }

        try {
          const html5QrCode = new Html5Qrcode('reader-view');
          qrCodeInstanceRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            { 
              fps: 15, 
              qrbox: { width: 260, height: 130 },
              aspectRatio: 1.777778
            },
            (decodedText) => {
              if (!isMounted) return;

              // Beep sound effect
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                const osc = audioCtx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.1);
              } catch (e) {
                // Ignore audio
              }

              // Handle callback
              if (onSuccessCallback) {
                onSuccessCallback(decodedText);
                try {
                  html5QrCode.stop().catch(err => console.error('Stop error:', err));
                } catch (e) {}
                onClose();
                return;
              }

              // Standard search action
              setScannedCode(decodedText);
              
              const aset = asets.find(a => a.id === decodedText);
              if (aset) {
                setMatchedAset(aset);
                const loan = peminjamans.find(p => p.asetId === decodedText && p.status === 'Dipinjam');
                if (loan) setActiveLoan(loan);
              }

              try {
                html5QrCode.stop().catch(err => console.error('Stop error:', err));
              } catch (e) {}
            },
            (error) => {
              // Quiet failures are expected during frame searching
            }
          ).catch((err) => {
            console.error('Start failed', err);
            if (isMounted) {
              setScannerError('Gagal mengakses kamera. Pastikan Anda telah memberikan izin kamera, situs menggunakan koneksi aman (HTTPS), dan tidak ada aplikasi lain yang sedang menggunakan kamera.');
            }
          });

          if (isMounted && html5QrCode.isScanning) {
            setIsCameraActive(true);
          }
        } catch (err: any) {
          console.error('Failed to instantiate Html5Qrcode', err);
          if (isMounted) {
            setScannerError('Inisialisasi pemindai gagal. Browser Anda mungkin tidak mendukung MediaDevices API.');
          }
        }
      }, 350);

      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (qrCodeInstanceRef.current) {
          const instance = qrCodeInstanceRef.current;
          qrCodeInstanceRef.current = null;
          try {
            if (instance.isScanning) {
              instance.stop().catch(err => console.error('Error stopping on cleanup:', err));
            }
          } catch (e) {}
        }
      };
    }
  }, [isOpen, scannedCode, activeTab]);

  const handleResetScanner = () => {
    setScannedCode(null);
    setMatchedAset(null);
    setActiveLoan(null);
    setUploadError(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    
    // Create a temporary element to run Html5Qrcode on, or use a hidden element
    const tempId = "temp-file-reader";
    let tempElem = document.getElementById(tempId);
    if (!tempElem) {
      tempElem = document.createElement('div');
      tempElem.id = tempId;
      tempElem.style.display = 'none';
      document.body.appendChild(tempElem);
    }

    try {
      const html5QrCode = new Html5Qrcode(tempId);
      const decodedText = await html5QrCode.scanFile(file, false);
      
      // Beep sound effect
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {
        // Ignore audio
      }

      if (onSuccessCallback) {
        onSuccessCallback(decodedText);
        onClose();
        return;
      }

      setScannedCode(decodedText);
      const aset = asets.find(a => a.id === decodedText);
      if (aset) {
        setMatchedAset(aset);
        const loan = peminjamans.find(p => p.asetId === decodedText && p.status === 'Dipinjam');
        if (loan) setActiveLoan(loan);
      }
    } catch (err) {
      console.error("File scan error", err);
      setUploadError("Gagal mendeteksi barcode dari gambar. Pastikan gambar barcode terlihat jelas, beresolusi baik, dan tidak buram.");
    }
  };

  const handleReturnAction = async () => {
    if (!activeLoan) return;
    setIsReturning(true);
    try {
      await onQuickReturn(activeLoan);
      setIsReturning(false);
      handleResetScanner();
      onClose();
      alert('Aset berhasil dikembalikan!');
    } catch (e) {
      setIsReturning(false);
      alert('Gagal mengembalikan aset.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden relative border border-slate-100 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-indigo-600 animate-pulse" />
                <span className="text-sm font-bold text-slate-800">
                  {onSuccessCallback ? 'Isi Form via Barcode' : 'Scanner Kamera E-Sarpras'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            {!scannedCode && (
              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => setActiveTab('camera')}
                  className={`flex-1 py-3 text-center text-xs font-bold transition-all relative cursor-pointer ${
                    activeTab === 'camera' 
                      ? 'text-indigo-600' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                  }`}
                >
                  Kamera Langsung
                  {activeTab === 'camera' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 py-3 text-center text-xs font-bold transition-all relative cursor-pointer ${
                    activeTab === 'upload' 
                      ? 'text-indigo-600' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50/80'
                  }`}
                >
                  Unggah Foto Barcode
                  {activeTab === 'upload' && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
                  )}
                </button>
              </div>
            )}

            {/* Content Area */}
            <div className="p-6 flex-1 flex flex-col justify-start overflow-y-auto max-h-[75vh]">
              {!scannedCode && activeTab === 'camera' && (
                <>
                  {scannerError ? (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-center space-y-3">
                      <AlertCircle size={36} className="text-rose-600 mx-auto animate-bounce" />
                      <p className="text-xs font-semibold text-rose-700 leading-relaxed">
                        {scannerError}
                      </p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Bila aplikasi berjalan di dalam panel pratinjau AI Studio, pembatasan keamanan browser (iFrame) menghalangi munculnya izin kamera. 
                        <strong> Silakan gunakan Tab "Unggah Foto Barcode" di atas</strong> atau buka di tab baru.
                      </p>
                      <div className="pt-2">
                        <a
                          href={window.location.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition whitespace-nowrap cursor-pointer"
                        >
                          <Camera size={14} />
                          Buka di Tab Baru & Aktifkan Kamera
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <style dangerouslySetInnerHTML={{__html: `
                        @keyframes laserScan {
                          0%, 100% { top: 5%; }
                          50% { top: 95%; }
                        }
                      `}} />
                      {/* Container for scanner */}
                      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner max-w-full">
                        <div id="reader-view" className="w-full overflow-hidden [&_video]:rounded-xl [&_video]:object-cover"></div>
                        
                        {/* Custom modern scanner overlay */}
                        {isCameraActive && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <div className="w-[260px] h-[130px] border border-indigo-400/50 rounded-xl relative bg-indigo-500/5">
                              {/* Corner brackets */}
                              <div className="absolute -top-[1.5px] -left-[1.5px] w-4 h-4 border-t-2 border-l-2 border-indigo-500 rounded-tl-sm"></div>
                              <div className="absolute -top-[1.5px] -right-[1.5px] w-4 h-4 border-t-2 border-r-2 border-indigo-500 rounded-tr-sm"></div>
                              <div className="absolute -bottom-[1.5px] -left-[1.5px] w-4 h-4 border-b-2 border-l-2 border-indigo-500 rounded-bl-sm"></div>
                              <div className="absolute -bottom-[1.5px] -right-[1.5px] w-4 h-4 border-b-2 border-r-2 border-indigo-500 rounded-br-sm"></div>
                              
                              {/* Red laser scanning line animation */}
                              <div 
                                className="absolute left-1 right-1 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                                style={{
                                  animation: 'laserScan 2.5s linear infinite',
                                  transform: 'translateY(-50%)'
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-center text-[10px] text-slate-400 font-medium">
                        Dekatkan barcode 1D (Code128) ke dalam kotak pemindai kamera untuk diidentifikasi secara otomatis.
                      </div>
                    </div>
                  )}
                </>
              )}

              {!scannedCode && activeTab === 'upload' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-slate-50 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] gap-2 bg-slate-50/50"
                    >
                      <FolderOpen size={28} className="text-slate-600" />
                      <div>
                        <p className="text-xs font-bold text-slate-800">Pilih dari Galeri</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Ambil file gambar dari folder HP/PC</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-300 hover:border-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] gap-2"
                    >
                      <Camera size={28} className="text-indigo-600" />
                      <div>
                        <p className="text-xs font-bold text-indigo-900">Foto Kamera</p>
                        <p className="text-[10px] text-indigo-500 mt-0.5">Potret barcode langsung via kamera</p>
                      </div>
                    </button>
                  </div>

                  {/* Native file input for local gallery selection */}
                  <input 
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {/* Native file input for direct camera capture */}
                  <input 
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileUpload}
                  />

                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[11px] font-semibold text-center leading-relaxed">
                      {uploadError}
                    </div>
                  )}
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-2 items-start text-indigo-800 text-[10px] leading-relaxed">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>
                      <strong>Saran Penggunaan:</strong> Anda dapat memilih foto dari galeri HP atau memfoto langsung barcode menggunakan kamera. Sistem akan membaca barcode secara instan.
                    </span>
                  </div>
                </div>
              )}

              {scannedCode && (
                <div className="space-y-5">
                  <div className="text-center p-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700">Barcode Berhasil Dipindai</span>
                    <h3 className="text-base font-extrabold text-slate-800 font-mono mt-1">{scannedCode}</h3>
                  </div>

                  {matchedAset ? (
                    <div className="space-y-4">
                      {/* Photo Viewer with Carousel for multiple photos */}
                      {(() => {
                        const photos = parsePhotos(matchedAset.fotoUrl);
                        if (photos.length > 0) {
                          const activePhoto = photos[activePhotoIdx] || photos[0];
                          return (
                            <div className="space-y-2">
                              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-950 shadow-inner flex items-center justify-center">
                                <img
                                  src={activePhoto}
                                  alt={matchedAset.nama}
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute bottom-2 right-2 bg-slate-900/80 text-[9px] text-white px-2 py-0.5 rounded-full font-bold">
                                  Foto {activePhotoIdx + 1} dari {photos.length}
                                </div>
                              </div>
                              {photos.length > 1 && (
                                <div className="flex gap-1.5 justify-center overflow-x-auto py-1">
                                  {photos.map((photo, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setActivePhotoIdx(idx)}
                                      className={`w-11 h-11 rounded-lg border overflow-hidden shrink-0 transition-all cursor-pointer ${
                                        activePhotoIdx === idx 
                                          ? 'border-indigo-600 ring-2 ring-indigo-600/30 scale-105' 
                                          : 'border-slate-200 opacity-60 hover:opacity-100'
                                      }`}
                                    >
                                      <img
                                        src={photo}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        referrerPolicy="no-referrer"
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <div className="aspect-video w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 gap-1.5">
                              <FileImage size={28} className="text-slate-300" />
                              <span className="text-[10px] font-bold">Tidak ada dokumentasi foto</span>
                            </div>
                          );
                        }
                      })()}

                      {/* Comprehensive Details Card */}
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[9px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={10} />
                              {matchedAset.ruangLokasi}
                            </span>
                            <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                              matchedAset.kondisi === 'Baik' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : matchedAset.kondisi.startsWith('Rusak Ringan') 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {matchedAset.kondisi}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-800 mt-2 leading-snug">{matchedAset.nama}</h4>
                          <p className="text-xs font-bold text-indigo-600 mt-0.5">{matchedAset.merek || 'Merek Tidak Tertera'}</p>
                        </div>

                        {/* Technical Specs box */}
                        {matchedAset.spesifikasi && (
                          <div className="text-[11px] bg-white border border-slate-100 rounded-xl p-3 text-slate-600 leading-relaxed shadow-xs">
                            <span className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                              <Clipboard size={12} className="text-slate-400" />
                              Spesifikasi Teknis
                            </span>
                            <div className="whitespace-pre-wrap">{matchedAset.spesifikasi}</div>
                          </div>
                        )}

                        {/* Grid Information */}
                        <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold pt-3 border-t border-slate-150">
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-normal text-[10px]">Stok Tersedia</span>
                            <span className="text-slate-800 font-bold flex items-center gap-1">
                              <Package size={12} className="text-slate-400" />
                              {matchedAset.jumlah} {matchedAset.satuan}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-normal text-[10px]">Kategori</span>
                            <span className="text-slate-800 font-bold truncate block flex items-center gap-1">
                              <Layers size={12} className="text-slate-400" />
                              {matchedAset.kategori}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-normal text-[10px]">Sumber Dana</span>
                            <span className="text-slate-800 font-bold flex items-center gap-1">
                              <Tag size={12} className="text-slate-400" />
                              {matchedAset.sumberDana || 'Pemerintah'}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-slate-400 block font-normal text-[10px]">Tahun Perolehan</span>
                            <span className="text-slate-800 font-bold flex items-center gap-1">
                              <Calendar size={12} className="text-slate-400" />
                              {matchedAset.tahunPerolehan || '2024'}
                            </span>
                          </div>
                        </div>

                        {/* Internal notes */}
                        {matchedAset.catatan && (
                          <div className="text-[10px] bg-indigo-50/50 rounded-xl p-2.5 text-slate-500 italic border border-indigo-50/80">
                            <strong>Catatan Internal:</strong> {matchedAset.catatan}
                          </div>
                        )}

                        {/* Active loan action */}
                        {activeLoan ? (
                          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-2 mt-2">
                            <div className="flex gap-2 items-start text-amber-800">
                              <BookOpen size={14} className="shrink-0 mt-0.5" />
                              <div className="text-[10px] leading-relaxed">
                                <span className="font-bold">Status Peminjaman</span>: Sedang dipinjam oleh <span className="font-bold">{activeLoan.namaPeminjam}</span> ({activeLoan.jabatanPeminjam}).
                              </div>
                            </div>
                            <button
                              onClick={handleReturnAction}
                              disabled={isReturning}
                              className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              {isReturning ? 'Memproses...' : 'Kembalikan Barang Sekarang'}
                            </button>
                          </div>
                        ) : (
                          <div className="p-2 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[10px] flex gap-2 items-center leading-relaxed">
                            <Info size={14} className="shrink-0 text-emerald-600" />
                            <span>Aset ini berada dalam lemari penyimpanan {matchedAset.ruangLokasi} dan siap dipinjamkan.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 text-xs rounded-2xl text-center space-y-2 leading-relaxed">
                      <AlertCircle size={24} className="mx-auto" />
                      <p className="font-bold">Item Tidak Ditemukan</p>
                      <p className="text-[11px] text-slate-500">
                        Kode barcode ini tidak terdaftar dalam database aset {asets.length > 0 ? asets[0].ruangLokasi : 'sekolah'}. Anda dapat mendaftarkan aset baru menggunakan ID ini di menu tambah aset.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleResetScanner}
                      className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer bg-white"
                    >
                      <RefreshCw size={12} />
                      Pindai Ulang
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                      Selesai
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
