import React, { useState, useRef } from 'react';
import { Aset, PengaturanSekolah, MasterRuang } from '../types';
import { 
  KibType, 
  KIB_CONFIGS, 
  generateKibCsvTemplate, 
  exportExistingAsetsToCsv, 
  downloadCsvFile, 
  parseCsvString, 
  processImportedKibRows 
} from '../utils/kibCsvHelper';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  FileText, 
  ArrowRight, 
  Layers, 
  Sparkles, 
  Database, 
  RefreshCw, 
  FileDown, 
  HelpCircle,
  Hash,
  MapPin,
  Building,
  Check
} from 'lucide-react';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  asets: Aset[];
  pengaturan: PengaturanSekolah;
  masterRuangs: MasterRuang[];
  onImportAsets: (newAsets: Aset[]) => Promise<void>;
}

export default function ImportExportModal({
  isOpen,
  onClose,
  asets,
  pengaturan,
  masterRuangs,
  onImportAsets
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'export'>('download');
  const [selectedKib, setSelectedKib] = useState<KibType>('B');
  const [includeSampleData, setIncludeSampleData] = useState<boolean>(true);

  // File Upload & Preview states
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [parsedPreviewAsets, setParsedPreviewAsets] = useState<Aset[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState<number>(0);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableSpaces = masterRuangs && masterRuangs.length > 0 
    ? masterRuangs.map(r => r.nama) 
    : ['Ruang Kelas', 'Ruang Guru', 'Laboratorium Komputer', 'Ruang Perpustakaan'];

  const kibList: { id: KibType; name: string; title: string; desc: string; badge: string }[] = [
    { id: 'A', name: 'KIB A', title: 'Tanah', desc: 'Lahan / bidang tanah sekolah', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'B', name: 'KIB B', title: 'Peralatan & Mesin', desc: 'Komputer, printer, alat lab, mebel, kendaraan dinas', badge: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'C', name: 'KIB C', title: 'Gedung & Bangunan', desc: 'Gedung sekolah, laboratorium, ruang kelas, aula', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'D', name: 'KIB D', title: 'Jalan, Irigasi & Jaringan', desc: 'Paving jalan, drainase, instalasi pipa/listrik/LAN', badge: 'bg-violet-100 text-violet-800 border-violet-300' },
    { id: 'E', name: 'KIB E', title: 'Aset Tetap Lainnya', desc: 'Buku perpustakaan, alat peraga, olahraga, kesenian', badge: 'bg-rose-100 text-rose-800 border-rose-300' },
    { id: 'F', name: 'KIB F', title: 'KDP / Konstruksi', desc: 'Proyek fisik yang sedang berlangsung', badge: 'bg-orange-100 text-orange-800 border-orange-300' },
  ];

  const handleDownloadTemplate = (kibId: KibType) => {
    const csv = generateKibCsvTemplate(kibId, includeSampleData);
    const fileName = `TEMPLATE_IMPORT_${KIB_CONFIGS[kibId].name.replace(/\s+/g, '_')}_${pengaturan.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
    downloadCsvFile(csv, fileName);
  };

  const handleExportData = (kibId?: KibType) => {
    const csv = exportExistingAsetsToCsv(asets, kibId);
    const prefix = kibId ? `DATA_${KIB_CONFIGS[kibId].name.replace(/\s+/g, '_')}` : 'DATA_SELURUH_SARPRAS';
    const fileName = `${prefix}_${pengaturan.namaSekolah.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    downloadCsvFile(csv, fileName);
  };

  const handleFileChange = (file: File) => {
    if (!file) return;
    setSelectedFileName(file.name);
    setIsProcessingFile(true);
    setImportSuccessMessage(null);
    setImportWarnings([]);
    setSkippedCount(0);
    setParsedPreviewAsets([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string || '';
        const rawRows = parseCsvString(text);
        
        if (rawRows.length < 2) {
          setImportWarnings(['File CSV tidak memiliki baris data yang valid atau kosong.']);
          setIsProcessingFile(false);
          return;
        }

        const result = processImportedKibRows(
          selectedKib,
          rawRows,
          asets,
          pengaturan,
          availableSpaces
        );

        setParsedPreviewAsets(result.validAsets);
        setSkippedCount(result.skippedCount);
        setImportWarnings(result.warnings);
      } catch (err: any) {
        console.error('Error parsing uploaded CSV:', err);
        setImportWarnings(['Gagal membaca file CSV: ' + (err.message || 'Format tidak dikenali')]);
      } finally {
        setIsProcessingFile(false);
      }
    };
    reader.onerror = () => {
      setImportWarnings(['Gagal membaca file dari disk komputer/HP.']);
      setIsProcessingFile(false);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = async () => {
    if (parsedPreviewAsets.length === 0) return;
    setIsImporting(true);
    try {
      await onImportAsets(parsedPreviewAsets);
      setImportSuccessMessage(`Berhasil mengimpor ${parsedPreviewAsets.length} data aset ${KIB_CONFIGS[selectedKib].name} ke dalam database!`);
      setParsedPreviewAsets([]);
      setSelectedFileName('');
    } catch (err: any) {
      alert('Gagal menyimpan hasil import: ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-5 md:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-bold tracking-tight">Export & Import Massal Sarpras (CSV / Excel)</h3>
              <p className="text-xs text-indigo-100 mt-0.5">
                Input ribuan data KIB A s/d F secara cepat menggunakan spreadsheet Microsoft Excel atau Google Sheets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-3 shrink-0">
          <button
            onClick={() => { setActiveTab('download'); setImportSuccessMessage(null); }}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'download'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Download size={16} />
            <span>1. Unduh Template CSV KIB</span>
          </button>
          <button
            onClick={() => { setActiveTab('upload'); setImportSuccessMessage(null); }}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'upload'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload size={16} />
            <span>2. Upload / Import CSV</span>
            {parsedPreviewAsets.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">
                {parsedPreviewAsets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setActiveTab('export'); setImportSuccessMessage(null); }}
            className={`pb-3 px-4 text-xs md:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileDown size={16} />
            <span>3. Export Data Eksisting ({asets.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-sm">
          
          {/* TAB 1: DOWNLOAD TEMPLATE */}
          {activeTab === 'download' && (
            <div className="space-y-6">
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3 text-xs text-indigo-950">
                <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-indigo-900 text-sm">Petunjuk Penggunaan Template CSV:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-1.5 text-indigo-800">
                    <li>Pilih KIB yang ingin Anda isi (misal: <strong>KIB B</strong> untuk Peralatan/Mesin/Mebel).</li>
                    <li>Klik tombol <strong>"Unduh Template CSV"</strong>, lalu buka file tersebut di <strong>Microsoft Excel</strong> atau <strong>Google Sheets</strong>.</li>
                    <li>Isi data sarpras sekolah Anda sesuai kolom yang tersedia. Kolom <em>ID Barcode</em> dan <em>Nomor Register</em> bisa <strong>dikosongkan</strong> jika ingin dibuatkan otomatis oleh sistem.</li>
                    <li>Setelah selesai, simpan file (Save as CSV) lalu buka tab <strong>"2. Upload / Import CSV"</strong> untuk mengunggahnya.</li>
                  </ol>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <Layers size={18} className="text-indigo-600" />
                  <span>Pilih Klasifikasi KIB untuk Mengunduh Template:</span>
                </h4>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeSampleData}
                    onChange={(e) => setIncludeSampleData(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Sertakan Contoh Data Pengisian</span>
                </label>
              </div>

              {/* Grid Pilihan KIB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {kibList.map((kib) => {
                  const config = KIB_CONFIGS[kib.id];
                  return (
                    <div
                      key={kib.id}
                      className="border border-slate-200 hover:border-indigo-300 rounded-2xl p-4.5 bg-white hover:bg-slate-50/50 transition-all flex flex-col justify-between shadow-xs"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${kib.badge}`}>
                            {config.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {config.columns.length} Kolom
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-900 text-sm">{kib.title}</h5>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {kib.desc}
                        </p>
                        <div className="mt-3 text-[11px] text-slate-600 bg-slate-100/70 p-2 rounded-xl">
                          <span className="font-medium text-slate-700">Kodefikasi BMD:</span> <code className="text-indigo-600 font-mono font-semibold">{config.kodeBarangBmd}</code> | <span className="font-medium">Prefix ID:</span> <code className="text-emerald-700 font-mono font-semibold">{config.prefixId}</code>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => {
                            setSelectedKib(kib.id);
                            handleDownloadTemplate(kib.id);
                          }}
                          className="w-full py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Download size={14} />
                          <span>Unduh Template CSV {kib.name}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD & PREVIEW */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              {importSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{importSuccessMessage}</span>
                </div>
              )}

              {/* Pilih Target KIB sebelum Upload */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                  1. Pilih Jenis KIB yang Sedang Diimpor:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {kibList.map(kib => (
                    <button
                      key={kib.id}
                      type="button"
                      onClick={() => {
                        setSelectedKib(kib.id);
                        if (selectedFileName && fileInputRef.current?.files?.[0]) {
                          handleFileChange(fileInputRef.current.files[0]);
                        }
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        selectedKib === kib.id
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>{kib.name}</span>
                      <span className={`text-[10px] font-normal truncate max-w-full ${selectedKib === kib.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {kib.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Area Drag and Drop File */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                  dragActive 
                    ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]' 
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div className="max-w-md mx-auto flex flex-col items-center">
                  <div className="p-4 bg-indigo-100 text-indigo-700 rounded-2xl mb-3 shadow-xs">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">
                    {selectedFileName ? selectedFileName : 'Tarik & Letakkan File CSV di Sini'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    atau <span className="text-indigo-600 font-semibold underline">klik untuk memilih file</span> dari komputer / HP Anda
                  </p>
                  <p className="text-[11px] text-slate-400 mt-2">
                    Format yang didukung: file <strong>.csv</strong> yang telah disesuaikan dengan template <strong>{KIB_CONFIGS[selectedKib].name}</strong>
                  </p>
                </div>
              </div>

              {/* Peringatan / Catatan Parse jika ada */}
              {importWarnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl space-y-1 text-xs text-amber-900">
                  <div className="font-bold flex items-center gap-1.5 text-amber-950">
                    <AlertTriangle size={16} className="text-amber-600" />
                    <span>Catatan Pembacaan File ({importWarnings.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                    {importWarnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabel Pratinjau Data yang Siap Diimpor */}
              {parsedPreviewAsets.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600" />
                        <span>Pratinjau Data Siap Diimpor ({parsedPreviewAsets.length} Baris):</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Periksa kembali data di bawah ini sebelum menyimpannya ke database sistem.
                      </p>
                    </div>
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs md:text-sm rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          <span>Simpan & Masukkan {parsedPreviewAsets.length} Aset</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden overflow-x-auto shadow-xs max-h-72">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2.5">No</th>
                          <th className="p-2.5">ID Barcode</th>
                          <th className="p-2.5">Nama Aset</th>
                          <th className="p-2.5">Merek / Spesifikasi</th>
                          <th className="p-2.5">Ruang Lokasi</th>
                          <th className="p-2.5">Jml</th>
                          <th className="p-2.5">Thn</th>
                          <th className="p-2.5">Kondisi</th>
                          <th className="p-2.5">Kode BMD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {parsedPreviewAsets.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/70 transition">
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-semibold text-indigo-600">{item.id}</td>
                            <td className="p-2.5 font-bold text-slate-900">{item.nama}</td>
                            <td className="p-2.5 text-slate-600">{item.merek || item.spesifikasi || '-'}</td>
                            <td className="p-2.5 text-slate-700">{item.ruangLokasi}</td>
                            <td className="p-2.5 text-slate-800 font-semibold">{item.jumlah} {item.satuan}</td>
                            <td className="p-2.5 text-slate-600">{item.tahunPerolehan}</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                item.kondisi === 'Baik' 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : item.kondisi === 'Rusak Ringan' 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {item.kondisi}
                              </span>
                            </td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">{item.kodeBarangBmd || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXPORT EXISTING */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-700 flex items-start gap-3">
                <Database className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-slate-900 text-sm">Export Data Sarpras ke Format CSV / Excel</p>
                  <p className="text-slate-600 mt-1">
                    Gunakan fitur ini untuk membuat cadangan (backup) data fisik sekolah atau untuk keperluan pelaporan resmi kepada Dinas Pendidikan dan pihak terkait.
                  </p>
                </div>
              </div>

              <div className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-indigo-950 text-sm">Export Seluruh Data Sarpras ({asets.length} Aset)</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">Gabungan semua KIB A, B, C, D, E, dan F dalam satu file CSV lengkap.</p>
                </div>
                <button
                  onClick={() => handleExportData()}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileDown size={16} />
                  <span>Download Semua Data ({asets.length})</span>
                </button>
              </div>

              <div className="space-y-3">
                <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Atau Export Per KIB:</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {kibList.map(kib => {
                    const count = asets.filter(a => {
                      const cat = (a.kategori || '').toUpperCase();
                      if (kib.id === 'A') return cat.includes('KIB A') || cat.includes('TANAH');
                      if (kib.id === 'B') return cat.includes('KIB B') || cat.includes('PERALATAN');
                      if (kib.id === 'C') return cat.includes('KIB C') || cat.includes('GEDUNG');
                      if (kib.id === 'D') return cat.includes('KIB D') || cat.includes('JALAN');
                      if (kib.id === 'E') return cat.includes('KIB E') || cat.includes('LAINNYA');
                      if (kib.id === 'F') return cat.includes('KIB F') || cat.includes('KONSTRUKSI');
                      return false;
                    }).length;

                    return (
                      <div key={kib.id} className="p-3.5 border border-slate-200 rounded-2xl bg-white flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${kib.badge}`}>{kib.name}</span>
                            <span className="font-bold text-slate-800 text-xs">{kib.title}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">Tersedia: <strong>{count}</strong> data</p>
                        </div>
                        <button
                          onClick={() => handleExportData(kib.id)}
                          disabled={count === 0}
                          className="py-1.5 px-3 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Download size={13} />
                          <span>Export</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 px-6 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Standar Format: <strong>Permendagri No. 47 Tahun 2021</strong>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
