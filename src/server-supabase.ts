import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return supabaseClient;
  } catch (err) {
    console.error('[Supabase Init Error]:', err);
    return null;
  }
}

// 1. MAPPING HELPER FUNCTIONS

export function mapAsetToDb(aset: any) {
  return {
    id: aset.id,
    nama: aset.nama,
    merek: aset.merek,
    spesifikasi: aset.spesifikasi,
    kategori: aset.kategori,
    ruang_lokasi: aset.ruangLokasi,
    jumlah: parseInt(aset.jumlah) || 0,
    satuan: aset.satuan,
    kondisi: aset.kondisi,
    sumber_dana: aset.sumberDana,
    tahun_perolehan: parseInt(aset.tahunPerolehan) || 0,
    foto_url: aset.fotoUrl || '',
    catatan: aset.catatan || '',
    tanggal_register: aset.tanggalRegister,
    serial_number: aset.serialNumber || ''
  };
}

export function mapDbToAset(db: any) {
  return {
    id: db.id,
    nama: db.nama,
    merek: db.merek,
    spesifikasi: db.spesifikasi,
    kategori: db.kategori,
    ruangLokasi: db.ruang_lokasi,
    jumlah: db.jumlah,
    satuan: db.satuan,
    kondisi: db.kondisi,
    sumberDana: db.sumber_dana,
    tahunPerolehan: db.tahun_perolehan,
    fotoUrl: db.foto_url,
    catatan: db.catatan,
    tanggalRegister: db.tanggal_register,
    serialNumber: db.serial_number
  };
}

export function mapPeminjamanToDb(pinjam: any) {
  return {
    id: pinjam.id,
    aset_id: pinjam.asetId,
    nama_aset: pinjam.namaAset,
    nama_peminjam: pinjam.namaPeminjam,
    jabatan_peminjam: pinjam.jabatanPeminjam,
    tanggal_pinjam: pinjam.tanggalPinjam,
    tanggal_target_kembali: pinjam.tanggalTargetKembali,
    tanggal_kembali_aktual: pinjam.tanggalKembaliAktual || null,
    jumlah_pinjam: parseInt(pinjam.jumlahPinjam) || 1,
    status: pinjam.status,
    keterangan: pinjam.keterangan || ''
  };
}

export function mapDbToPeminjaman(db: any) {
  return {
    id: db.id,
    asetId: db.aset_id,
    namaAset: db.nama_aset,
    namaPeminjam: db.nama_peminjam,
    jabatanPeminjam: db.jabatan_peminjam,
    tanggalPinjam: db.tanggal_pinjam,
    tanggalTargetKembali: db.tanggal_target_kembali,
    tanggalKembaliAktual: db.tanggal_kembali_aktual,
    jumlahPinjam: db.jumlah_pinjam,
    status: db.status,
    keterangan: db.keterangan
  };
}

export function mapPemusnahanToDb(log: any) {
  return {
    id: log.id,
    aset_id: log.asetId,
    nama_aset: log.namaAset,
    jumlah: parseInt(log.jumlah) || 1,
    tanggal_pemusnahan: log.tanggalPemusnahan,
    metode: log.metode,
    alasan: log.alasan,
    no_sk_penghapusan: log.noSkPenghapusan,
    petugas_eksekusi: log.petugasEksekusi,
    catatan: log.catatan || ''
  };
}

export function mapDbToPemusnahan(db: any) {
  return {
    id: db.id,
    asetId: db.aset_id,
    namaAset: db.nama_aset,
    jumlah: db.jumlah,
    tanggalPemusnahan: db.tanggal_pemusnahan,
    metode: db.metode,
    alasan: db.alasan,
    noSkPenghapusan: db.no_sk_penghapusan,
    petugasEksekusi: db.petugas_eksekusi,
    catatan: db.catatan
  };
}

export function mapPengaturanToDb(cfg: any) {
  return {
    id: 'default',
    nama_sekolah: cfg.namaSekolah,
    npsn: cfg.npsn || '',
    alamat: cfg.alamat || '',
    kepala_sekolah: cfg.kepalaSekolah || '',
    nip_kepala_sekolah: cfg.nipKepalaSekolah || '',
    nama_petugas_sarpras: cfg.namaPetugasSarpras || '',
    nip_petugas_sarpras: cfg.nipPetugasSarpras || '',
    target_kapasitas_siswa: parseInt(cfg.targetKapasitasSiswa) || 596,
    jumlah_rombel: parseInt(cfg.jumlahRombel) || 16,
    jumlah_siswa_aktif: parseInt(cfg.jumlahSiswaAktif) || 400,
    google_apps_script_url: cfg.googleAppsScriptUrl || '',
    google_drive_folder_id: cfg.googleDriveFolderId || '',
    admin_password: cfg.adminPassword || 'admin123'
  };
}

export function mapDbToPengaturan(db: any) {
  return {
    namaSekolah: db.nama_sekolah,
    npsn: db.npsn,
    alamat: db.alamat,
    kepalaSekolah: db.kepala_sekolah,
    nipKepalaSekolah: db.nip_kepala_sekolah,
    namaPetugasSarpras: db.nama_petugas_sarpras,
    nipPetugasSarpras: db.nip_petugas_sarpras,
    targetKapasitasSiswa: db.target_kapasitas_siswa,
    jumlahRombel: db.jumlah_rombel,
    jumlahSiswaAktif: db.jumlah_siswa_aktif,
    googleAppsScriptUrl: db.google_apps_script_url,
    googleDriveFolderId: db.google_drive_folder_id,
    adminPassword: db.admin_password
  };
}

export function mapBhpToDb(item: any) {
  return {
    id: item.id,
    nama: item.nama,
    merek: item.merek || '',
    kategori: item.kategori,
    stok_awal: parseInt(item.stokAwal) || 0,
    stok_sekarang: parseInt(item.stokSekarang) || 0,
    satuan: item.satuan,
    lokasi_penyimpanan: item.lokasiPenyimpanan || '',
    catatan: item.catatan || '',
    foto_url: item.fotoUrl || ''
  };
}

export function mapDbToBhp(db: any) {
  return {
    id: db.id,
    nama: db.nama,
    merek: db.merek,
    kategori: db.kategori,
    stokAwal: db.stok_awal,
    stokSekarang: db.stok_sekarang,
    satuan: db.satuan,
    lokasiPenyimpanan: db.lokasi_penyimpanan,
    catatan: db.catatan,
    fotoUrl: db.foto_url
  };
}

export function mapPengambilanToDb(item: any) {
  return {
    id: item.id,
    bhp_id: item.bhpId,
    nama_bhp: item.namaBhp,
    nama_penerima: item.namaPenerima,
    jabatan_penerima: item.jabatanPenerima,
    tanggal_ambil: item.tanggalAmbil,
    jumlah_diambil: parseInt(item.jumlahDiambil) || 1,
    satuan: item.satuan,
    keterangan: item.keterangan || '',
    bukti_fisik: item.buktiFisik || ''
  };
}

export function mapDbToPengambilan(db: any) {
  return {
    id: db.id,
    bhpId: db.bhp_id,
    namaBhp: db.nama_bhp,
    namaPenerima: db.nama_penerima,
    jabatanPenerima: db.jabatan_penerima,
    tanggalAmbil: db.tanggal_ambil,
    jumlahDiambil: db.jumlah_diambil,
    satuan: db.satuan,
    keterangan: db.keterangan,
    buktiFisik: db.bukti_fisik
  };
}
