import React, { useState } from 'react';
import { PengaturanSekolah, Aset } from '../../types';
import { 
  DEFAULT_PROGRAM_KERJA,
  DEFAULT_RAB,
  DEFAULT_JADWAL_PEMELIHARAAN,
  DEFAULT_RIWAYAT_PEMELIHARAAN,
  DEFAULT_LAPORAN_BERKALA,
  DEFAULT_BAP_PEMERIKSAAN,
  DEFAULT_SURAT_USULAN,
  DEFAULT_BA_PENGHAPUSAN,
  DEFAULT_ALAT_PERAGA,
  DEFAULT_BUKU_PERPUSTAKAAN,
  DEFAULT_JADWAL_LAB
} from '../../data/dokumenSarprasDefaults';

import ProgramKerjaDoc from './ProgramKerjaDoc';
import RabSarprasDoc from './RabSarprasDoc';
import PemeliharaanDoc from './PemeliharaanDoc';
import LaporanBerkalaDoc from './LaporanBerkalaDoc';
import PenghapusanBmdDoc from './PenghapusanBmdDoc';
import SarprasKhususDoc from './SarprasKhususDoc';
import KeluhanDoc from './KeluhanDoc';
import BlankoKibDoc from './BlankoKibDoc';

import { 
  FileText, 
  Calendar, 
  DollarSign, 
  Wrench, 
  FileSpreadsheet, 
  FileCheck2, 
  Microscope, 
  ShieldAlert, 
  BookOpen,
  Scale,
  Award,
  DownloadCloud,
  MessageSquareWarning,
  Printer
} from 'lucide-react';

import { KeluhanSarpras } from '../../types';

interface Props {
  pengaturan: PengaturanSekolah;
  asets: Aset[];
  keluhanList?: KeluhanSarpras[];
  onRefresh?: () => void;
}

type SubDocType = 'progja' | 'rab' | 'pemeliharaan' | 'laporan_berkala' | 'penghapusan' | 'sarpras_khusus' | 'keluhan' | 'blanko_kib';

export default function DokumenSarprasHub({ pengaturan, asets, keluhanList = [], onRefresh = () => {} }: Props) {
  const [activeSubDoc, setActiveSubDoc] = useState<SubDocType>('progja');

  const navItems: { id: SubDocType; title: string; subtitle: string; icon: React.ReactNode; tag: string }[] = [
    {
      id: 'progja',
      title: 'Program Kerja Tahunan',
      subtitle: 'Matriks 12 Bulan & 4 Dimensi Sasaran',
      icon: <Calendar size={18} />,
      tag: 'Perencanaan'
    },
    {
      id: 'rab',
      title: 'RAB & ARKAS Sarpras',
      subtitle: 'Validasi Cap 20% BOS Reguler No. 8/2026',
      icon: <DollarSign size={18} />,
      tag: 'Penganggaran'
    },
    {
      id: 'keluhan',
      title: 'Register Keluhan Sarpras',
      subtitle: 'Pengaduan Warga Sekolah & Lembar Penanganan',
      icon: <MessageSquareWarning size={18} />,
      tag: 'Layanan Warga'
    },
    {
      id: 'pemeliharaan',
      title: 'Jadwal & Riwayat Servis',
      subtitle: 'Pemeliharaan Berkala & Log Perbaikan',
      icon: <Wrench size={18} />,
      tag: 'Operasional'
    },
    {
      id: 'laporan_berkala',
      title: 'Laporan Berkala Sarpras',
      subtitle: 'Format 5 Bagian Resmi Sesuai Regulasi',
      icon: <FileSpreadsheet size={18} />,
      tag: 'Evaluasi'
    },
    {
      id: 'penghapusan',
      title: 'Penghapusan BMD 3-Tahap',
      subtitle: 'BAP Fisik, Surat Usulan Kadis, & BA Eksekusi',
      icon: <ShieldAlert size={18} />,
      tag: 'Permendagri 47/21'
    },
    {
      id: 'sarpras_khusus',
      title: 'Sarpras Khusus & Lab',
      subtitle: 'Alat Peraga Mapel, Buku, & Jadwal Lab',
      icon: <Microscope size={18} />,
      tag: 'Pembelajaran'
    },
    {
      id: 'blanko_kib',
      title: 'Blanko Kosong KIB (A - F)',
      subtitle: 'Formulir Standar Siap Cetak & Tulis Manual',
      icon: <Printer size={18} />,
      tag: 'Formulir BMD'
    }
  ];

  return (
    <div className="space-y-6" id="dokumen-sarpras-hub">
      {/* Top Banner & Legal Notice */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                <Scale size={12} />
                Regulasi Resmi BMD & Sarpras Sekolah
              </span>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-extrabold tracking-wider uppercase">
                Permendagri No. 47 Thn 2021 & Permendikdasmen No. 8 Thn 2026
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Dokumen Standar Sarana & Prasarana Sekolah
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl mt-1 leading-relaxed">
              Seluruh dokumen dan tabel disusun secara presisi mengikuti format baku kedinasan: kop surat Pemerintah Provinsi Sulawesi Tenggara, penomoran resmi, kolom tabel standar, dan lembar legalitas Kepala Sekolah & Wakasek Sarpras.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/10 text-xs">
            <Award size={24} className="text-amber-400 shrink-0" />
            <div>
              <p className="font-bold text-white">{pengaturan.namaSekolah || 'SMA Negeri 17 Konawe'}</p>
              <p className="text-slate-300 text-[11px]">NPSN: {pengaturan.npsn} | Kab. Konawe</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigasi Modul Dokumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {navItems.map((item) => {
          const isActive = activeSubDoc === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubDoc(item.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/25 scale-[1.02]'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-xl ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {item.icon}
                  </div>
                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-xs font-bold leading-tight line-clamp-1">{item.title}</h3>
                <p className={`text-[10px] mt-0.5 line-clamp-2 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                  {item.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Render Current Active Document Module */}
      <div className="transition-all duration-300">
        {activeSubDoc === 'progja' && (
          <ProgramKerjaDoc 
            pengaturan={pengaturan} 
            initialData={DEFAULT_PROGRAM_KERJA} 
          />
        )}

        {activeSubDoc === 'rab' && (
          <RabSarprasDoc 
            pengaturan={pengaturan} 
            initialData={DEFAULT_RAB} 
          />
        )}

        {activeSubDoc === 'keluhan' && (
          <KeluhanDoc 
            pengaturan={pengaturan} 
            keluhanList={keluhanList} 
            onRefresh={onRefresh} 
          />
        )}

        {activeSubDoc === 'pemeliharaan' && (
          <PemeliharaanDoc 
            pengaturan={pengaturan} 
            initialJadwal={DEFAULT_JADWAL_PEMELIHARAAN} 
            initialRiwayat={DEFAULT_RIWAYAT_PEMELIHARAAN} 
          />
        )}

        {activeSubDoc === 'laporan_berkala' && (
          <LaporanBerkalaDoc 
            pengaturan={pengaturan} 
            initialData={DEFAULT_LAPORAN_BERKALA} 
            asets={asets} 
          />
        )}

        {activeSubDoc === 'penghapusan' && (
          <PenghapusanBmdDoc 
            pengaturan={pengaturan} 
            initialBap={DEFAULT_BAP_PEMERIKSAAN} 
            initialSurat={DEFAULT_SURAT_USULAN} 
            initialBaHapus={DEFAULT_BA_PENGHAPUSAN} 
          />
        )}

        {activeSubDoc === 'sarpras_khusus' && (
          <SarprasKhususDoc 
            pengaturan={pengaturan} 
            initialAlatPeraga={DEFAULT_ALAT_PERAGA} 
            initialBuku={DEFAULT_BUKU_PERPUSTAKAAN} 
            initialJadwalLab={DEFAULT_JADWAL_LAB} 
          />
        )}

        {activeSubDoc === 'blanko_kib' && (
          <BlankoKibDoc 
            pengaturan={pengaturan} 
          />
        )}
      </div>
    </div>
  );
}
