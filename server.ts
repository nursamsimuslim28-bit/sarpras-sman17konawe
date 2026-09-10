import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { 
  isFirebaseConfigured, 
  getAllData, 
  saveDocument, 
  deleteDocument 
} from "./src/server-firebase";

// Zod Validation Schemas
const AsetSchema = z.object({
  id: z.string().min(1, "ID Aset wajib diisi"),
  nama: z.string().min(1, "Nama Aset wajib diisi")
}).passthrough();

const PeminjamanSchema = z.object({
  id: z.string().min(1, "ID Peminjaman wajib diisi")
}).passthrough();

const PemusnahanSchema = z.object({
  id: z.string().min(1, "ID Pemusnahan wajib diisi")
}).passthrough();

const BhpSchema = z.object({
  id: z.string().min(1, "ID Barang Habis Pakai wajib diisi")
}).passthrough();

const PengambilanBhpSchema = z.object({
  id: z.string().min(1, "ID Pengambilan BHP wajib diisi")
}).passthrough();

const PengaturanSchema = z.object({
  namaSekolah: z.string().min(1, "Nama Sekolah wajib diisi")
}).passthrough();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust first proxy (Cloud Run / Nginx) to handle X-Forwarded-For headers safely
  app.set('trust proxy', 1);

  // Cloud Run & Nginx Health Check endpoint (BEBAS rate-limiting agar tidak memicu kegagalan rollout/health check probe)
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });

  // Meningkatkan limit ukuran body untuk mendukung upload foto aset berbasis base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Rate Limiter untuk melindungi endpoint API selain health check dari spamming/DDoS
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 300, // Limit 300 request per 15 menit per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Terlalu banyak permintaan ke server. Silakan coba beberapa saat lagi.'
    }
  });

  app.use('/api/', apiLimiter);

  // API Proxy untuk Google Apps Script guna menghindari masalah CORS / Sandboxing iframe di browser
  app.all("/api/gas-proxy", async (req, res) => {
    // Ambil URL Apps Script dari query parameter atau body
    const targetUrl = (req.query.url as string) || (req.body && req.body.url);
    
    if (!targetUrl) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'URL Google Apps Script tidak ditentukan.' 
      });
    }

    try {
      const parsedUrl = new URL(targetUrl);
      if (parsedUrl.hostname !== 'script.google.com' && parsedUrl.hostname !== 'script.googleusercontent.com') {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Akses Ditolak: Proxy hanya diizinkan untuk domain Google Apps Script (script.google.com).' 
        });
      }
    } catch {
      return res.status(400).json({
        status: 'error',
        message: 'Format URL Google Apps Script tidak valid.'
      });
    }

    try {
      let fetchUrl = targetUrl;
      const method = req.method;

      // Teruskan query parameters dari request asli ke targetUrl
      const queryParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (key !== 'url') {
          queryParams.append(key, value as string);
        }
      }
      const queryString = queryParams.toString();
      if (queryString) {
        fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + queryString;
      }

      const options: RequestInit = {
        method: method,
        redirect: 'follow', // Penting agar Node.js fetch otomatis mengikuti redirect 302 dari Google
      };

      if (method === 'POST') {
        options.headers = {
          'Content-Type': 'application/json',
        };
        // Kirim body yang sama (tanpa parameter 'url')
        const bodyPayload = { ...req.body };
        delete bodyPayload.url;
        options.body = JSON.stringify(bodyPayload);
      }

      console.log(`[GAS Proxy] Forwarding ${method} request to: ${fetchUrl}`);
      
      const remoteRes = await fetch(fetchUrl, options);
      const contentType = remoteRes.headers.get('content-type') || '';
      const responseText = await remoteRes.text();

      // Deteksi jika respon adalah halaman login Google Accounts (biasanya karena akses dibatasi / link /dev)
      if (responseText.includes('Google Accounts') || responseText.includes('Sign in') || responseText.includes('Service Login')) {
        return res.status(403).json({
          status: 'error',
          message: 'Akses Google Apps Script Ditolak. Tampaknya script Anda dikonfigurasi sebagai "Only myself" (Hanya saya) atau Anda menggunakan link developer (/dev). Harap Deploy Ulang (Deploy -> New deployment), atur "Who has access" menjadi "Anyone" (Siapa saja), dan pastikan Anda menggunakan URL dari "Web app" yang berakhir dengan "/exec" (bukan "/dev").'
        });
      }

      // Jika respon berformat JSON, kirim langsung
      if (contentType.includes('application/json')) {
        try {
          const json = JSON.parse(responseText);
          return res.status(remoteRes.status).json(json);
        } catch {
          // Fallback jika gagal parse
        }
      }

      // Coba lakukan parsing manual jika bertipe text/plain tetapi isinya JSON
      try {
        const json = JSON.parse(responseText);
        return res.status(remoteRes.status).json(json);
      } catch {
        // Jika benar-benar teks murni
        return res.status(remoteRes.status).send(responseText);
      }

    } catch (error: any) {
      console.error("[GAS Proxy Error]:", error);
      return res.status(500).json({
        status: 'error',
        message: `Gagal menghubungi Google Apps Script melalui proxy server: ${error.message || 'Koneksi terputus atau timeout.'}`
      });
    }
  });

  // === AUTHENTICATION API ROUTES ===
  // Verifikasi kredensial Admin di sisi server dengan token sementara
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body || {};
    const expectedPassword = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123";
    
    if (typeof password === 'string' && password.trim() === expectedPassword.trim()) {
      // Buat token sederhana berbasis timestamp dan secret
      const token = Buffer.from(`admin_${Date.now()}_${expectedPassword}`).toString('base64');
      return res.json({
        status: 'success',
        role: 'admin',
        token
      });
    }

    return res.status(401).json({
      status: 'error',
      message: 'Kata sandi salah. Akses administrator ditolak.'
    });
  });

  app.post("/api/auth/verify", (req, res) => {
    const { token } = req.body || {};
    const expectedPassword = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "admin123";
    if (typeof token === 'string') {
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        if (decoded.startsWith('admin_') && decoded.endsWith(`_${expectedPassword}`)) {
          return res.json({ status: 'success', role: 'admin' });
        }
      } catch (e) {}
    }
    return res.status(401).json({ status: 'error', role: 'guest' });
  });

  // === DATABASE API ROUTES (FIREBASE) ===

  // 1. Check if Database connection is configured
  app.get("/api/supabase/status", (req, res) => {
    const configured = isFirebaseConfigured();
    if (configured) {
      res.json({ 
        configured: true, 
        type: 'firebase',
        url: 'Firebase Firestore (Durable Cloud Storage)'
      });
    } else {
      res.json({ configured: false });
    }
  });

  // 2. Get all data from Database
  app.get("/api/supabase/get_all", async (req, res) => {
    if (!isFirebaseConfigured()) {
      return res.status(400).json({ status: 'not_configured', message: 'Firebase belum dikonfigurasi di server.' });
    }

    try {
      console.log('[Firebase API] Fetching all data...');
      const data = await getAllData();
      
      res.json({
        status: 'success',
        data: data || {
          pengaturan: null,
          asets: [],
          peminjamans: [],
          pemusnahans: [],
          bhp: [],
          pengambilanBhp: []
        }
      });
    } catch (error: any) {
      console.error('[Firebase GET ALL Error]:', error);
      res.status(500).json({ status: 'error', message: error.message || 'Gagal mengambil data dari Firebase.' });
    }
  });

  // 3. Save/Update Aset
  app.post("/api/supabase/save_aset", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const asset = AsetSchema.parse(req.body);
      console.log(`[Firebase API] Saving asset: ${asset.id}`);
      await saveDocument('asets', asset.id, asset);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Save Aset Error]:', error);
      res.status(400).json({ status: 'error', message: error?.errors?.[0]?.message || error.message });
    }
  });

  // 4. Delete Aset
  app.post("/api/supabase/delete_aset", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ status: 'error', message: 'ID Aset diperlukan' });
      console.log(`[Firebase API] Deleting asset: ${id}`);
      await deleteDocument('asets', id);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Delete Aset Error]:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 5. Save/Update Peminjaman
  app.post("/api/supabase/save_peminjaman", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const peminjaman = PeminjamanSchema.parse(req.body);
      console.log(`[Firebase API] Saving peminjaman: ${peminjaman.id}`);
      await saveDocument('peminjamans', peminjaman.id, peminjaman);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Save Peminjaman Error]:', error);
      res.status(400).json({ status: 'error', message: error?.errors?.[0]?.message || error.message });
    }
  });

  // 5b. Delete Peminjaman
  app.post("/api/supabase/delete_peminjaman", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ status: 'error', message: 'ID Peminjaman diperlukan' });
      console.log(`[Firebase API] Deleting peminjaman: ${id}`);
      await deleteDocument('peminjamans', id);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Delete Peminjaman Error]:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 6. Save Pemusnahan
  app.post("/api/supabase/save_pemusnahan", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const log = PemusnahanSchema.parse(req.body);
      console.log(`[Firebase API] Saving pemusnahan: ${log.id}`);
      await saveDocument('pemusnahans', log.id, log);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Save Pemusnahan Error]:', error);
      res.status(400).json({ status: 'error', message: error?.errors?.[0]?.message || error.message });
    }
  });

  // 7. Save Pengaturan
  app.post("/api/supabase/save_pengaturan", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const cfg = PengaturanSchema.parse(req.body);
      console.log(`[Firebase API] Saving pengaturan`);
      await saveDocument('pengaturan', 'default', cfg);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Save Pengaturan Error]:', error);
      res.status(400).json({ status: 'error', message: error?.errors?.[0]?.message || error.message });
    }
  });

  // 8. Save BHP
  app.post("/api/supabase/save_bhp", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const item = BhpSchema.parse(req.body);
      console.log(`[Firebase API] Saving BHP: ${item.id}`);
      await saveDocument('bhp', item.id, item);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Save BHP Error]:', error);
      res.status(400).json({ status: 'error', message: error?.errors?.[0]?.message || error.message });
    }
  });

  // 9. Delete BHP
  app.post("/api/supabase/delete_bhp", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ status: 'error', message: 'ID BHP diperlukan' });
      console.log(`[Firebase API] Deleting BHP: ${id}`);
      await deleteDocument('bhp', id);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Delete BHP Error]:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  // 10. Save Pengambilan BHP
  app.post("/api/supabase/save_pengambilan_bhp", async (req, res) => {
    if (!isFirebaseConfigured()) return res.status(400).json({ status: 'not_configured' });

    try {
      const pengambilan = PengambilanBhpSchema.parse(req.body);
      console.log(`[Firebase API] Saving pengambilan BHP: ${pengambilan.id}`);
      await saveDocument('pengambilan_bhp', pengambilan.id, pengambilan);
      res.json({ status: 'success' });
    } catch (error: any) {
      console.error('[Firebase Save Pengambilan BHP Error]:', error);
      res.status(400).json({ status: 'error', message: error?.errors?.[0]?.message || error.message });
    }
  });

  // Integrasi Frontend React: Vite middleware di development, static file server di production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Gagal memulai server:", err);
});
