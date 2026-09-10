import React, { useEffect, useRef, useState } from 'react';
import { Aset } from '../types';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Barcode, Printer, Check, Copy, X, Tag, Info, Sparkles, SlidersHorizontal, FileText } from 'lucide-react';
import { SCHOOL_LOGO_BASE64 } from '../assets/logoBase64';

interface BarcodeTabProps {
  asets: Aset[];
  logoUrl?: string;
  namaSekolah?: string;
}

export type LabelSizePreset = 'mini' | 'compact' | 'medium' | 'standard';
export type PaperType = 'F4' | 'A4';

interface SizeConfig {
  label: string;
  desc: string;
  cardWidth: string; // e.g. '38mm'
  cardHeight: string; // e.g. '26mm'
  qrSizeMm: string; // e.g. '15mm'
  headerFont: string;
  titleFont: string;
  metaFont: string;
  codeFont: string;
  approxF4: string;
  approxA4: string;
}

const SIZE_CONFIGS: Record<LabelSizePreset, SizeConfig> = {
  mini: {
    label: 'Mini (32 x 22 mm)',
    desc: 'Sangat Hemat',
    cardWidth: '32mm',
    cardHeight: '22mm',
    qrSizeMm: '12mm',
    headerFont: '4pt',
    titleFont: '5.5pt',
    metaFont: '4.5pt',
    codeFont: '5pt',
    approxF4: '~60 stiker / lembar F4',
    approxA4: '~54 stiker / lembar A4',
  },
  compact: {
    label: 'Ringkas (38 x 26 mm)',
    desc: 'Rekomendasi Utama',
    cardWidth: '38mm',
    cardHeight: '26mm',
    qrSizeMm: '15mm',
    headerFont: '4.5pt',
    titleFont: '6.5pt',
    metaFont: '5pt',
    codeFont: '5.5pt',
    approxF4: '~48 stiker / lembar F4',
    approxA4: '~40 stiker / lembar A4',
  },
  medium: {
    label: 'Sedang (45 x 32 mm)',
    desc: 'Mudah Dibaca',
    cardWidth: '45mm',
    cardHeight: '32mm',
    qrSizeMm: '19mm',
    headerFont: '5.5pt',
    titleFont: '7.5pt',
    metaFont: '6pt',
    codeFont: '6.5pt',
    approxF4: '~28 stiker / lembar F4',
    approxA4: '~24 stiker / lembar A4',
  },
  standard: {
    label: 'Besar (55 x 38 mm)',
    desc: 'Ukuran Besar',
    cardWidth: '55mm',
    cardHeight: '38mm',
    qrSizeMm: '24mm',
    headerFont: '6.5pt',
    titleFont: '8.5pt',
    metaFont: '6.5pt',
    codeFont: '7.5pt',
    approxF4: '~18 stiker / lembar F4',
    approxA4: '~15 stiker / lembar A4',
  },
};

// Single QR Code Canvas with Center Logo
function QRCodeItem({ value, label, size = 120, logoUrl }: { value: string; label?: string; size?: number; logoUrl?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    QRCode.toCanvas(
      canvas,
      value,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'H', // High error correction ensures QR is readable with central logo
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err) => {
        if (err) {
          console.error('Error rendering QR Code:', err);
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const logoSize = Math.floor(size * 0.24);
          const x = Math.floor((size - logoSize) / 2);
          const y = Math.floor((size - logoSize) / 2);

          const padding = 2;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, logoSize / 2 + padding, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.drawImage(img, x, y, logoSize, logoSize);
        };
        img.src = logoUrl || SCHOOL_LOGO_BASE64;
      }
    );
  }, [value, size, logoUrl]);

  return (
    <div className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col items-center shadow-2xs">
      {label && (
        <span className="text-[10px] font-bold text-slate-700 mb-1 max-w-[130px] truncate text-center" title={label}>
          {label}
        </span>
      )}
      <canvas ref={canvasRef} className="max-w-full h-auto rounded-md shadow-2xs" />
    </div>
  );
}

// Single Barcode Renderer using SVG (Code128 Fallback option)
function BarcodeItem({ value, label, size = 'small' }: { value: string; label?: string; size?: 'small' | 'large' }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: size === 'large' ? 2 : 1.2,
          height: size === 'large' ? 55 : 30,
          displayValue: true,
          fontSize: size === 'large' ? 11 : 8,
          font: 'monospace',
          background: '#ffffff',
          lineColor: '#000000',
          margin: 4
        });
      } catch (e) {
        console.error('Error drawing barcode', e);
      }
    }
  }, [value, size]);

  return (
    <div className="bg-white p-2 rounded-xl border border-slate-100 flex flex-col items-center shadow-2xs">
      {label && (
        <span className="text-[10px] font-bold text-slate-700 mb-1 max-w-[130px] truncate text-center" title={label}>
          {label}
        </span>
      )}
      <svg ref={svgRef} className="max-w-full h-auto" />
    </div>
  );
}

// Helper to generate high-resolution QR Data URL with center logo for print
const generateQrDataUrl = (value: string, logoUrl?: string): Promise<string> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const size = 300;
    QRCode.toCanvas(
      canvas,
      value,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err) => {
        if (err) {
          resolve('');
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(canvas.toDataURL('image/png'));
          return;
        }

        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const logoSize = Math.floor(size * 0.24);
          const x = Math.floor((size - logoSize) / 2);
          const y = Math.floor((size - logoSize) / 2);

          const padding = 5;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, logoSize / 2 + padding, 0, 2 * Math.PI);
          ctx.fill();

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.drawImage(img, x, y, logoSize, logoSize);
          resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = logoUrl || SCHOOL_LOGO_BASE64;
      }
    );
  });
};

export default function BarcodeTab({ asets, logoUrl, namaSekolah = "SMA Negeri 17 Konawe" }: BarcodeTabProps) {
  const [kibFilter, setKibFilter] = useState<'PHYSICAL_ONLY' | 'ALL' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F'>('PHYSICAL_ONLY');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAset, setSelectedAset] = useState<Aset | null>(null);
  const [codeType, setCodeType] = useState<'qr' | 'barcode'>('qr');
  const [labelPreset, setLabelPreset] = useState<LabelSizePreset>('compact');
  const [paperType, setPaperType] = useState<PaperType>('F4'); // Default to F4 / Folio (215 x 330 mm)
  const [isGeneratingPrint, setIsGeneratingPrint] = useState(false);

  // Helper untuk mengecek apakah aset merupakan barang bergerak yang bisa ditempeli stiker label
  const isPhysicalLabelAset = (a: Aset) => {
    const cat = (a.kategori || '').toUpperCase();
    // Pengecualian otomatis untuk Tanah (KIB A), Gedung (KIB C), Jaringan (KIB D), dan KDP (KIB F)
    if (cat.includes('KIB A') || cat.includes('TANAH')) return false;
    if (cat.includes('KIB C') || cat.includes('GEDUNG') || cat.includes('BANGUNAN') || cat.includes('PRASARANA')) return false;
    if (cat.includes('KIB D') || cat.includes('JALAN') || cat.includes('JARINGAN') || cat.includes('IRIGASI')) return false;
    if (cat.includes('KIB F') || cat.includes('KONSTRUKSI') || cat.includes('KDP')) return false;
    return true;
  };

  const activeAsets = asets.filter((a) => {
    if (a.kondisi === 'Dihapuskan') return false;
    const cat = (a.kategori || '').toUpperCase();

    if (kibFilter === 'PHYSICAL_ONLY') {
      return isPhysicalLabelAset(a);
    } else if (kibFilter === 'A') {
      return cat.includes('KIB A') || cat.includes('TANAH');
    } else if (kibFilter === 'B') {
      return cat.includes('KIB B') || cat.includes('PERALATAN') || cat.includes('SARANA');
    } else if (kibFilter === 'C') {
      return cat.includes('KIB C') || cat.includes('GEDUNG') || cat.includes('BANGUNAN') || cat.includes('PRASARANA');
    } else if (kibFilter === 'D') {
      return cat.includes('KIB D') || cat.includes('JALAN') || cat.includes('JARINGAN');
    } else if (kibFilter === 'E') {
      return cat.includes('KIB E') || cat.includes('PERLENGKAPAN') || cat.includes('LAINNYA');
    } else if (kibFilter === 'F') {
      return cat.includes('KIB F') || cat.includes('KONSTRUKSI') || cat.includes('KDP');
    }
    return true; // 'ALL'
  });

  const effectiveLogoUrl = logoUrl || SCHOOL_LOGO_BASE64;
  const currentSizeCfg = SIZE_CONFIGS[labelPreset];
  const approxText = paperType === 'F4' ? currentSizeCfg.approxF4 : currentSizeCfg.approxA4;
  const pageCssSize = paperType === 'F4' ? '215mm 330mm' : 'A4 portrait';

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintLabels = async () => {
    setIsGeneratingPrint(true);

    try {
      if (codeType === 'qr') {
        const qrImagePromises = activeAsets.map((aset) => generateQrDataUrl(aset.id, effectiveLogoUrl));
        const qrImages = await Promise.all(qrImagePromises);

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.');
          setIsGeneratingPrint(false);
          return;
        }

        const labelsHtml = activeAsets
          .map((aset, idx) => {
            const qrDataUrl = qrImages[idx];
            return `
              <div class="label-card">
                <div class="label-header">${(namaSekolah || 'SMA Negeri 17 Konawe').toUpperCase()}</div>
                <div class="label-title" title="${aset.nama}">${aset.nama}</div>
                <div class="label-meta">${aset.ruangLokasi}</div>
                <img src="${qrDataUrl}" class="qr-image" alt="QR Code" />
                <div class="label-code">${aset.id}</div>
              </div>
            `;
          })
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Cetak Stiker QR Code Logo (${paperType}) - E-Sarpras</title>
              <style>
                @page {
                  size: ${pageCssSize};
                  margin: 6mm 4mm;
                }
                @media print {
                  body { margin: 0; padding: 0; background: white; }
                  .no-print { display: none !important; }
                }
                body {
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  flex-wrap: wrap;
                  gap: 1.5mm 1.5mm;
                  justify-content: flex-start;
                  align-content: flex-start;
                  background: white;
                  padding: 2mm;
                  box-sizing: border-box;
                }
                .label-card {
                  width: ${currentSizeCfg.cardWidth};
                  height: ${currentSizeCfg.cardHeight};
                  background: white;
                  border: 1px solid #cbd5e1;
                  border-radius: 4px;
                  padding: 1.5mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  box-sizing: border-box;
                  page-break-inside: avoid;
                  text-align: center;
                  overflow: hidden;
                }
                .label-header {
                  font-size: ${currentSizeCfg.headerFont};
                  font-weight: 800;
                  color: #0284c7;
                  letter-spacing: 0.3px;
                  text-transform: uppercase;
                  border-bottom: 0.5px solid #e2e8f0;
                  padding-bottom: 0.5px;
                  width: 100%;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .label-title {
                  font-size: ${currentSizeCfg.titleFont};
                  font-weight: 700;
                  color: #0f172a;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  width: 100%;
                  margin-top: 0.5px;
                  line-height: 1.1;
                }
                .label-meta {
                  font-size: ${currentSizeCfg.metaFont};
                  color: #64748b;
                  font-weight: 600;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  width: 100%;
                }
                .qr-image {
                  width: ${currentSizeCfg.qrSizeMm};
                  height: ${currentSizeCfg.qrSizeMm};
                  object-fit: contain;
                  margin: 0.5mm 0;
                }
                .label-code {
                  font-size: ${currentSizeCfg.codeFont};
                  font-family: monospace;
                  font-weight: 700;
                  background: #f1f5f9;
                  padding: 0.5px 3px;
                  border-radius: 2px;
                  color: #334155;
                  letter-spacing: 0.3px;
                  white-space: nowrap;
                }
                .print-btn {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  background: #0284c7;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 10px;
                  font-size: 11pt;
                  font-weight: bold;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
                  z-index: 9999;
                }
              </style>
            </head>
            <body>
              <button class="print-btn no-print" onclick="window.print()">Cetak Label QR Code Sekarang (${paperType})</button>
              ${labelsHtml}
              <script>
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 400);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // Barcode Code128 print
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Gagal membuka jendela cetak. Pastikan pop-up diizinkan.');
          setIsGeneratingPrint(false);
          return;
        }

        const labelsHtml = activeAsets
          .map((aset) => {
            return `
              <div class="label-card">
                <div class="label-title">${aset.nama}</div>
                <div class="label-meta">${aset.ruangLokasi}</div>
                <svg class="barcode" data-value="${aset.id}"></svg>
              </div>
            `;
          })
          .join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Cetak Label Barcode (${paperType}) - E-Sarpras</title>
              <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
              <style>
                @page {
                  size: ${pageCssSize};
                  margin: 6mm 4mm;
                }
                @media print {
                  body { margin: 0; padding: 0; background: white; }
                  .no-print { display: none !important; }
                }
                body {
                  font-family: system-ui, sans-serif;
                  display: flex;
                  flex-wrap: wrap;
                  gap: 2mm 2mm;
                  justify-content: flex-start;
                  align-content: flex-start;
                  background: white;
                  padding: 2mm;
                  box-sizing: border-box;
                }
                .label-card {
                  width: ${currentSizeCfg.cardWidth};
                  height: ${currentSizeCfg.cardHeight};
                  background: white;
                  border: 1px solid #cbd5e1;
                  border-radius: 4px;
                  padding: 1.5mm;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: space-between;
                  box-sizing: border-box;
                  page-break-inside: avoid;
                }
                .label-title {
                  font-size: ${currentSizeCfg.titleFont};
                  font-weight: bold;
                  text-align: center;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  width: 100%;
                  color: #1e293b;
                }
                .label-meta {
                  font-size: ${currentSizeCfg.metaFont};
                  color: #64748b;
                }
                .barcode {
                  max-width: 100%;
                  height: auto;
                }
                .print-btn {
                  position: fixed;
                  bottom: 20px;
                  right: 20px;
                  background: #0284c7;
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 10px;
                  font-size: 11pt;
                  font-weight: bold;
                  cursor: pointer;
                  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
                }
              </style>
            </head>
            <body>
              <button class="print-btn no-print" onclick="window.print()">Cetak Label Sekarang (${paperType})</button>
              ${labelsHtml}
              <script>
                document.querySelectorAll(".barcode").forEach(function(el) {
                  JsBarcode(el, el.getAttribute("data-value"), {
                    format: "CODE128",
                    width: 1,
                    height: 25,
                    displayValue: true,
                    fontSize: 7,
                    margin: 2
                  });
                });
                window.onload = function() {
                  setTimeout(function() {
                    window.print();
                  }, 500);
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (e) {
      console.error('Print generation failed:', e);
      alert('Terjadi kesalahan saat menyiapkan label cetak.');
    } finally {
      setIsGeneratingPrint(false);
    }
  };

  return (
    <div className="space-y-6" id="barcode-tab">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <QrCode size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800">Label QR Code (dengan Logo Sekolah)</h2>
              <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                Kotak 2D + Logo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Label stiker presisi tinggi berlogo sekolah untuk penempelan pada sarana & prasarana fisik
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
          {/* Format Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setCodeType('qr')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                codeType === 'qr' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <QrCode size={14} />
              QR Code Logo
            </button>
            <button
              onClick={() => setCodeType('barcode')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                codeType === 'barcode' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Barcode size={14} />
              Code128
            </button>
          </div>

          <button
            onClick={handlePrintLabels}
            disabled={isGeneratingPrint || activeAsets.length === 0}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-sky-600/10"
          >
            <Printer size={16} />
            {isGeneratingPrint ? 'Menyiapkan...' : `Cetak Batch (${paperType})`}
          </button>
        </div>
      </div>

      {/* Control Bar: Paper Size, KIB Category Filter & Label Dimensions */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col gap-4 shadow-2xs">
        {/* Top Row: Filter Categories & Paper Type */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
              <Tag size={15} className="text-sky-600" />
              Kategori KIB:
            </span>
            <div className="flex bg-slate-100 p-1 rounded-xl flex-wrap gap-1">
              <button
                onClick={() => setKibFilter('PHYSICAL_ONLY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  kibFilter === 'PHYSICAL_ONLY' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                }`}
                title="Hanya barang bergerak / sarana fisik (KIB B Peralatan/Mesin & KIB E Perlengkapan)"
              >
                <span>📦 Barang Bergerak / Fisik</span>
                <span className="text-[9px] bg-white/20 px-1.5 py-0.2 rounded font-extrabold">Rekomendasi</span>
              </button>
              <button
                onClick={() => setKibFilter('B')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  kibFilter === 'B' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                KIB B (Peralatan & Mesin)
              </button>
              <button
                onClick={() => setKibFilter('E')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  kibFilter === 'E' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                KIB E (Lainnya/Perlengkapan)
              </button>
              <button
                onClick={() => setKibFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  kibFilter === 'ALL' ? 'bg-sky-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                Semua KIB
              </button>
            </div>
          </div>

          {/* Paper Size Selector */}
          <div className="flex items-center gap-2">
            <FileText size={15} className="text-sky-600 shrink-0" />
            <span className="text-xs font-bold text-slate-700">Kertas:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setPaperType('F4')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                  paperType === 'F4' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                F4 / Folio
                <span className="text-[9px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-extrabold">Utama</span>
              </button>
              <button
                onClick={() => setPaperType('A4')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  paperType === 'A4' ? 'bg-white text-sky-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                A4
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Row: Size Preset Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold shrink-0">
            <SlidersHorizontal size={15} className="text-sky-600" />
            <span>Dimensi Stiker Label:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            {(Object.keys(SIZE_CONFIGS) as LabelSizePreset[]).map((presetKey) => {
              const cfg = SIZE_CONFIGS[presetKey];
              const isSelected = labelPreset === presetKey;
              return (
                <button
                  key={presetKey}
                  onClick={() => setLabelPreset(presetKey)}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs text-left transition cursor-pointer flex flex-col ${
                    isSelected
                      ? 'bg-sky-50 border-sky-300 text-sky-900 ring-2 ring-sky-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-[10.5px]">{cfg.label}</span>
                  <span className="text-[9px] text-slate-400">{cfg.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 bg-sky-50/80 border border-sky-100 text-sky-800 text-xs rounded-2xl leading-relaxed flex gap-2.5 items-start">
        <Info size={16} className="text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sky-950">
            Pengecualian Otomatis Label Stiker (Permendagri No. 47/2021):
          </p>
          <p className="text-[11px] text-slate-600">
            Aset seperti <strong>Tanah (KIB A)</strong>, <strong>Gedung/Bangunan (KIB C)</strong>, <strong>Jalan/Irigasi/Jaringan (KIB D)</strong>, dan <strong>Konstruksi KDP (KIB F)</strong> secara otomatis dikecualikan dari cetak label stiker QR Code karena tidak ditempeli stiker fisik kecil. Sistem secara otomatis menyaring hanya barang bergerak (peralatan, mesin, meja, laptop, & perlengkapan) untuk di-generate label kodenya.
          </p>
        </div>
      </div>

      {/* Grid of QR Codes (Compact Display) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {activeAsets.length > 0 ? (
          activeAsets.map((aset) => (
            <motion.div
              layoutId={`barcode-${aset.id}`}
              key={aset.id}
              onClick={() => setSelectedAset(aset)}
              className="bg-white p-3 rounded-2xl border border-slate-100 hover:border-sky-200 hover:shadow-md transition cursor-pointer flex flex-col items-center justify-between min-h-[170px]"
            >
              <div className="w-full">
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[8.5px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase truncate max-w-[90px]">
                    {aset.ruangLokasi}
                  </span>
                  <button
                    onClick={(e) => handleCopyId(aset.id, e)}
                    className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded cursor-pointer"
                    title="Copy Code ID"
                  >
                    {copiedId === aset.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
                <h3 className="text-[11px] font-bold text-slate-800 mt-1.5 truncate text-center" title={aset.nama}>
                  {aset.nama}
                </h3>
              </div>

              <div className="my-2 flex justify-center w-full">
                {codeType === 'qr' ? (
                  <QRCodeItem value={aset.id} label="" size={105} logoUrl={effectiveLogoUrl} />
                ) : (
                  <BarcodeItem value={aset.id} label="" />
                )}
              </div>

              <span className="text-[9.5px] font-mono text-slate-500 font-bold bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                {aset.id}
              </span>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-100 shadow-xs text-center">
            <Tag size={40} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-500">Tidak ada aset terdaftar untuk pembuatan label.</p>
          </div>
        )}
      </div>

      {/* Barcode / QR Zoom Modal */}
      <AnimatePresence>
        {selectedAset && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              layoutId={`barcode-${selectedAset.id}`}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl p-6 relative border border-slate-100 text-center"
            >
              <button
                onClick={() => setSelectedAset(null)}
                className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X size={18} />
              </button>

              <span className="text-[10px] bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full font-bold">
                {selectedAset.ruangLokasi}
              </span>
              <h2 className="text-sm font-bold text-slate-800 mt-3">{selectedAset.nama}</h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{selectedAset.merek || '-'}</p>

              <div className="my-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-center">
                {codeType === 'qr' ? (
                  <QRCodeItem value={selectedAset.id} label="" size={180} logoUrl={effectiveLogoUrl} />
                ) : (
                  <BarcodeItem value={selectedAset.id} label="" size="large" />
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedAset.id);
                    setCopiedId(selectedAset.id);
                    setTimeout(() => setCopiedId(null), 2000);
                  }}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition"
                >
                  {copiedId === selectedAset.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  {copiedId === selectedAset.id ? 'Tersalin' : 'Salin ID'}
                </button>
                <button
                  onClick={() => {
                    setSelectedAset(null);
                    handlePrintLabels();
                  }}
                  className="flex-1 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition shadow-sm shadow-sky-600/10"
                >
                  <Printer size={14} />
                  Cetak Label
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
