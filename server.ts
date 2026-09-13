import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";

async function startServer() {
  const app = express();
  // Support dynamic PORT assigned by Cloud Run / container environment, defaulting to 3000
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('[Server] SIGTERM received, shutting down gracefully...');
    server.close(() => {
      console.log('[Server] Closed successfully.');
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error("Gagal memulai server:", err);
});
