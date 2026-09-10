export default async function handler(req: any, res: any) {
  // CORS Headers untuk mendukung panggillan silang domain jika diperlukan
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Ambil URL Apps Script dari query parameter atau body
  const targetUrl = (req.query.url as string) || (req.body && req.body.url);
  
  if (!targetUrl) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'URL Google Apps Script tidak ditentukan.' 
    });
  }

  if (!targetUrl.startsWith('https://script.google.com/')) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Format URL salah. URL harus dimulai dengan https://script.google.com/' 
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

    const options: any = {
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

    const remoteRes = await fetch(fetchUrl, options);
    const contentType = remoteRes.headers.get('content-type') || '';
    const responseText = await remoteRes.text();

    // Deteksi jika respon adalah halaman login Google Accounts
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
}
