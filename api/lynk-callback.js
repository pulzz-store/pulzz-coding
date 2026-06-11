import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // AMAN: Mencegah crash jika req.body kosong saat di-test oleh Lynk
    const body = req.body || {};
    const event = body.event;
    const data = body.data || {};

    if (event !== 'order.paid') {
      return res.status(200).json({ status: 'ignored', msg: 'Bukan order.paid (Berhasil melewati tes)' });
    }

    // 1. Ambil data dasar dari webhook Lynk dengan aman
    const answers = data.answers || [];
    const target = answers[0]?.answer; 

    const buyerEmail = data.customer?.email;
    const buyerName = data.customer?.name;
    const productName = data.product?.name;
    const invoiceId = data.id;

    // 2. MAPPING NAMA PRODUK LYNK -> PROVIDER + KODE SERVICE + JUMLAH PAKET
    const MAP_BY_NAME = {
        '100 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 100},
        '200 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 200},
        '300 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 300},
        '400 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 400},
        '500 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 500},
        '600 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 600},
        '700 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 700},
        '800 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 800},
        '900 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 900},
        '1000 Pengikut Saluran WA': {provider: 'medanpedia', service: '5519', qty: 1000},

        '5000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 5000},
        '6500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 6500},
        '8000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 8000},
        '9500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 9500},
        '11000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 11000},
        '12500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 12500},
        '14000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 14000},
        '15500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 15500},
        '17000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 17000},
        '20000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 20000},

        '200 Like Instagram': {provider: 'indosmm', service: '7242', qty: 200},
        '300 Like Instagram': {provider: 'indosmm', service: '7242', qty: 300},
        '400 Like Instagram': {provider: 'indosmm', service: '7242', qty: 400},
        '500 Like Instagram': {provider: 'indosmm', service: '7242', qty: 500},
        '600 Like Instagram': {provider: 'indosmm', service: '7242', qty: 600},
        '700 Like Instagram': {provider: 'indosmm', service: '7242', qty: 700},
        '800 Like Instagram': {provider: 'indosmm', service: '7242', qty: 800},
        '900 Like Instagram': {provider: 'indosmm', service: '7242', qty: 900},
        '1000 Like Instagram': {provider: 'indosmm', service: '7242', qty: 1000},
        '1200 Like Instagram': {provider: 'indosmm', service: '7242', qty: 1200},

        '100 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 100},
        '200 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 200},
        '300 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 300},
        '400 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 400},
        '500 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 500},
        '600 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 600},
        '700 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 700},
        '800 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 800},
        '900 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 900},
        '1000 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 1000},

        '100 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 100},
        '200 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 200},
        '300 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 300},
        '400 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 400},
        '500 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 500},
        '600 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 600},
        '700 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 700},
        '800 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 800},
        '900 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 900},
        '1000 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 1000},
    };
    
    const mapData = MAP_BY_NAME[productName];
    if (!mapData) {
      throw new Error(`Nama produk Lynk "${productName}" belum terdaftar.`);
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const quantity = mapData.qty;

    if (!target || !quantity) {
      return res.status(400).json({ status: 'error', msg: 'Data target pengiriman kosong' });
    }

    let apiEndpoint;
    let form = new URLSearchParams();

    // 3. Tembak API Utama SMM
    if (provider === 'indosmm') {
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      if (!INDOSMM_KEY) throw new Error('INDOSMM_KEY belum diisi di Environment Variables Vercel');

      apiEndpoint = 'https://indosmm.com/api/v2';
      form.append('key', INDOSMM_KEY);
      form.append('action', 'order');
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);

    } else if (provider === 'medanpedia') {
      const MEDAN_API_ID = process.env.MEDAN_API_ID;
      const MEDAN_API_KEY = process.env.MEDAN_API_KEY;
      if (!MEDAN_API_ID || !MEDAN_API_KEY) throw new Error('Variabel MEDAN_API belum diisi di Vercel');

      apiEndpoint = 'https://api.medanpedia.co.id/order';
      form.append('action', 'order');
      form.append('api_id', MEDAN_API_ID);
      form.append('api_key', MEDAN_API_KEY);
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);
    }

    const panelResponse = await fetch(apiEndpoint, { method: 'POST', body: form });
    const panelResult = await panelResponse.json();

    // 4. Kirim email bukti lunas menggunakan Gmail
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;
    if (!GMAIL_USER || !GMAIL_PASS) throw new Error('GMAIL_USER/PASS belum diatur di Vercel');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    const isSuccess = panelResult?.status === 'success' || panelResult?.success === true || panelResult?.status === true;
    const statusMsg = isSuccess
      ? `Sedang diproses sistem. ID Pesanan: ${panelResult.data?.id || panelResult.id || 'N/A'}`
      : `Gagal mengirim otomatis: ${panelResult?.msg || panelResult?.error || 'Silakan hubungi admin'}`;

    await transporter.sendMail({
      from: `"PulzzStore" <${GMAIL_USER}>`,
      to: buyerEmail,
      subject: `[LUNAS] Nota Pesanan Anda - ${invoiceId}`,
      html: `
        <h3>Halo ${buyerName}!</h3>
        <p>Pembayaran untuk order <b>${invoiceId}</b> telah kami terima dan dikonfirmasi lunas ✅</p>
        <hr/>
        <p><b>Rincian Pesanan:</b></p>
        <ul>
          <li><b>Produk Layanan:</b> ${productName}</li>
          <li><b>Target Akun:</b> ${target}</li>
          <li><b>Kuantitas/Jumlah:</b> ${quantity}</li>
          <li><b>Rute Server:</b> ${provider.toUpperCase()}</li>
        </ul>
        <p><b>Status Sistem SMM:</b> <br> <code style="background:#f4f4f4; padding:5px; display:inline-block;">${statusMsg}</code></p>
        <br>
        <p>Terima kasih telah berbelanja layanan premium di PulzzStore!</p>
      `
    });

    return res.status(200).json({ status: 'ok', provider, panel: panelResult, email_sent: buyerEmail });

  } catch (e) {
    console.error('Error Callback:', e);
    return res.status(500).json({ error: e.message });
  }
}
        '5000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 5000},
        '6500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 6500},
        '8000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 8000},
        '9500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 9500},
        '11000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 11000},
        '12500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 12500},
        '14000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 14000},
        '15500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 15500},
        '17000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 17000},
        '20000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 20000},

        // LIKE INSTAGRAM - Provider Indosmm, Service 7242
        '200 Like Instagram': {provider: 'indosmm', service: '7242', qty: 200},
        '300 Like Instagram': {provider: 'indosmm', service: '7242', qty: 300},
        '400 Like Instagram': {provider: 'indosmm', service: '7242', qty: 400},
        '500 Like Instagram': {provider: 'indosmm', service: '7242', qty: 500},
        '600 Like Instagram': {provider: 'indosmm', service: '7242', qty: 600},
        '700 Like Instagram': {provider: 'indosmm', service: '7242', qty: 700},
        '800 Like Instagram': {provider: 'indosmm', service: '7242', qty: 800},
        '900 Like Instagram': {provider: 'indosmm', service: '7242', qty: 900},
        '1000 Like Instagram': {provider: 'indosmm', service: '7242', qty: 1000},
        '1200 Like Instagram': {provider: 'indosmm', service: '7242', qty: 1200},

        // FOLLOWERS IG INDO - Provider Indosmm, Service 574
        '100 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 100},
        '200 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 200},
        '300 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 300},
        '400 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 400},
        '500 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 500},
        '600 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 600},
        '700 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 700},
        '800 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 800},
        '900 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 900},
        '1000 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 1000},

        // FOLLOWERS INSTAGRAM - Provider Indosmm, Service 8303
        '100 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 100},
        '200 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 200},
        '300 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 300},
        '400 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 400},
        '500 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 500},
        '600 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 600},
        '700 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 700},
        '800 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 800},
        '900 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 900},
        '1000 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 1000},
    };
    
    const mapData = MAP_BY_NAME[productName];
    if (!mapData) {
      throw new Error(`Nama produk Lynk "${productName}" belum terdaftar di MAP_BY_NAME.`);
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const quantity = mapData.qty;

    if (!target || !quantity) {
      return res.status(400).json({ status: 'error', msg: 'Data target pengiriman kosong' });
    }

    let apiEndpoint;
    let form = new URLSearchParams();

    // 3. Langsung Tembak API Utama SMM (Bypass File PHP Internal)
    if (provider === 'indosmm') {
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      if (!INDOSMM_KEY) throw new Error('INDOSMM_KEY belum diisi di Environment Variables Vercel');

      apiEndpoint = 'https://indosmm.com/api/v2'; // Endpoint resmi Indosmm
      form.append('key', INDOSMM_KEY);
      form.append('action', 'order');
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);

    } else if (provider === 'medanpedia') {
      const MEDAN_API_ID = process.env.MEDAN_API_ID;
      const MEDAN_API_KEY = process.env.MEDAN_API_KEY;
      if (!MEDAN_API_ID || !MEDAN_API_KEY) throw new Error('Variabel MEDAN_API belum diisi di Vercel');

      apiEndpoint = 'https://api.medanpedia.co.id/order'; // Endpoint resmi Medanpedia
      form.append('action', 'order');
      form.append('api_id', MEDAN_API_ID);
      form.append('api_key', MEDAN_API_KEY);
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);
    } else {
      throw new Error('Sistem mendeteksi nama provider yang tidak valid');
    }

    // Kirim data ke SMM Panel secara asinkron
    const panelResponse = await fetch(apiEndpoint, { method: 'POST', body: form });
    const panelResult = await panelResponse.json();

    // 4. Kirim email bukti lunas menggunakan Gmail
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;
    if (!GMAIL_USER || !GMAIL_PASS) throw new Error('GMAIL_USER/PASS belum diatur di Vercel');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    const isSuccess = panelResult?.status === 'success' || panelResult?.success === true || panelResult?.status === true;
    const statusMsg = isSuccess
      ? `Sedang diproses sistem. ID Pesanan: ${panelResult.data?.id || panelResult.id || 'N/A'}`
      : `Gagal mengirim otomatis: ${panelResult?.msg || panelResult?.error || 'Silakan hubungi admin'}`;

    await transporter.sendMail({
      from: `"PulzzStore" <${GMAIL_USER}>`,
      to: buyerEmail,
      subject: `[LUNAS] Nota Pesanan Anda - ${invoiceId}`,
      html: `
        <h3>Halo ${buyerName}!</h3>
        <p>Pembayaran untuk order <b>${invoiceId}</b> telah kami terima dan dikonfirmasi lunas ✅</p>
        <hr/>
        <p><b>Rincian Pesanan:</b></p>
        <ul>
          <li><b>Produk Layanan:</b> ${productName}</li>
          <li><b>Target Akun:</b> ${target}</li>
          <li><b>Kuantitas/Jumlah:</b> ${quantity}</li>
          <li><b>Rute Server:</b> ${provider.toUpperCase()}</li>
        </ul>
        <p><b>Status Sistem SMM:</b> <br> <code style="background:#f4f4f4; padding:5px; display:inline-block;">${statusMsg}</code></p>
        <br>
        <p>Terima kasih telah berbelanja layanan premium di PulzzStore!</p>
      `
    });

    return res.status(200).json({ status: 'ok', provider, panel: panelResult, email_sent: buyerEmail });

  } catch (e) {
    console.error('Error Callback:', e);
    return res.status(500).json({ error: e.message });
  }
}
        '5000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 5000},
        '6500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 6500},
        '8000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 8000},
        '9500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 9500},
        '11000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 11000},
        '12500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 12500},
        '14000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 14000},
        '15500 Views Instagram': {provider: 'indosmm', service: '6035', qty: 15500},
        '17000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 17000},
        '20000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 20000},

        // LIKE INSTAGRAM - Provider Indosmm, Service 7242
        '200 Like Instagram': {provider: 'indosmm', service: '7242', qty: 200},
        '300 Like Instagram': {provider: 'indosmm', service: '7242', qty: 300},
        '400 Like Instagram': {provider: 'indosmm', service: '7242', qty: 400},
        '500 Like Instagram': {provider: 'indosmm', service: '7242', qty: 500},
        '600 Like Instagram': {provider: 'indosmm', service: '7242', qty: 600},
        '700 Like Instagram': {provider: 'indosmm', service: '7242', qty: 700},
        '800 Like Instagram': {provider: 'indosmm', service: '7242', qty: 800},
        '900 Like Instagram': {provider: 'indosmm', service: '7242', qty: 900},
        '1000 Like Instagram': {provider: 'indosmm', service: '7242', qty: 1000},
        '1200 Like Instagram': {provider: 'indosmm', service: '7242', qty: 1200},

        // FOLLOWERS IG INDO - Provider Indosmm, Service 574
        '100 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 100},
        '200 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 200},
        '300 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 300},
        '400 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 400},
        '500 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 500},
        '600 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 600},
        '700 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 700},
        '800 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 800},
        '900 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 900},
        '1000 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 1000},

        // FOLLOWERS INSTAGRAM - Provider Indosmm, Service 8303
        '100 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 100},
        '200 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 200},
        '300 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 300},
        '400 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 400},
        '500 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 500},
        '600 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 600},
        '700 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 700},
        '800 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 800},
        '900 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 900},
        '1000 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 1000},
    };
    
    // Cari kecocokan data berdasarkan nama produk di Lynk
    const mapData = MAP_BY_NAME[productName];
    if (!mapData) {
      throw new Error(`Nama produk Lynk "${productName}" belum terdaftar di MAP_BY_NAME.`);
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const quantity = mapData.qty;

    if (!target || !quantity) {
      console.log('Gagal: Target atau quantity kosong', { target, quantity });
      return res.status(400).json({ status: 'error', msg: 'Data target pengiriman kosong' });
    }

    const domain = `https://${req.headers.host}`;
    let apiEndpoint, form = new URLSearchParams();
    let panelResult;

    // 3. Teruskan data order ke endpoint API internal PHP
    if (provider === 'indosmm') {
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      if (!INDOSMM_KEY) throw new Error('INDOSMM_KEY belum diisi di Environment Variables Vercel');

      apiEndpoint = `${domain}/api/api.php`;
      form.append('key', INDOSMM_KEY);
      form.append('action', 'order');
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);

    } else if (provider === 'medanpedia') {
      const MEDAN_API_ID = process.env.MEDAN_API_ID;
      const MEDAN_API_KEY = process.env.MEDAN_API_KEY;
      if (!MEDAN_API_ID || !MEDAN_API_KEY) throw new Error('Variabel MEDAN_API belum diisi di Vercel');

      apiEndpoint = `${domain}/api/api-medan.php`;
      form.append('action', 'order');
      form.append('api_id', MEDAN_API_ID);
      form.append('api_key', MEDAN_API_KEY);
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);
    } else {
      throw new Error('Sistem mendeteksi nama provider yang tidak valid');
    }

    // Eksekusi post data ke server php
    panelResult = await fetch(apiEndpoint, { method: 'POST', body: form }).then(r => r.json());

    // 4. Kirim email bukti lunas otomatis ke pembeli menggunakan Gmail
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;
    if (!GMAIL_USER || !GMAIL_PASS) throw new Error('GMAIL_USER/PASS belum diatur di Vercel');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    const isSuccess = panelResult?.status === 'success' || panelResult?.success === true || panelResult?.status === true;
    const statusMsg = isSuccess
      ? `Sedang diproses sistem. ID Pesanan: ${panelResult.data?.id || panelResult.id || 'N/A'}`
      : `Gagal mengirim otomatis: ${panelResult?.msg || panelResult?.error || 'Silakan hubungi admin'}`;

    await transporter.sendMail({
      from: `"PulzzStore" <${GMAIL_USER}>`,
      to: buyerEmail,
      subject: `[LUNAS] Nota Pesanan Anda - ${invoiceId}`,
      html: `
        <h3>Halo ${buyerName}!</h3>
        <p>Pembayaran untuk order <b>${invoiceId}</b> telah kami terima dan dikonfirmasi lunas ✅</p>
        <hr/>
        <p><b>Rincian Pesanan:</b></p>
        <ul>
          <li><b>Produk Layanan:</b> ${productName}</li>
          <li><b>Target Akun:</b> ${target}</li>
          <li><b>Kuantitas/Jumlah:</b> ${quantity}</li>
          <li><b>Rute Server:</b> ${provider.toUpperCase()}</li>
        </ul>
        <p><b>Status Sistem SMM:</b> <br> <code style="background:#f4f4f4; padding:5px; display:inline-block;">${statusMsg}</code></p>
        <br>
        <p>Terima kasih telah berbelanja layanan premium di PulzzStore!</p>
      `
    });

    return res.status(200).json({ status: 'ok', provider, panel: panelResult, email_sent: buyerEmail });

  } catch (e) {
    console.error('Error Callback:', e);
    return res.status(500).json({ error: e.message });
  }
}
      
