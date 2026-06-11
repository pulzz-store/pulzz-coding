import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req, res) {
  // Hanya menerima koneksi POST dari Lynk.id
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const event = body.event;
    const eventData = body.data || {};
    const messageData = eventData.message_data || {};

    // 1. VALIDASI EVENT (Wajib sesuai dokumentasi Lynk.id)
    if (event !== 'payment.received') {
      return res.status(200).json({ status: 'ignored', msg: 'Bukan event payment.received' });
    }

    // 2. VALIDASI KEAMANAN TANDA TANGAN (X-Lynk-Signature) - Opsional jika Env diisi
    const receivedSignature = req.headers['x-lynk-signature'];
    const merchantKey = process.env.LYNK_MERCHANT_KEY;
    
    if (merchantKey && receivedSignature) {
      const amount = String(messageData.totals?.grandTotal || '');
      const refId = messageData.refId || '';
      const messageId = eventData.message_id || '';
      
      const signatureString = amount + refId + messageId + merchantKey;
      const calculatedSignature = crypto
        .createHash('sha256')
        .update(signatureString)
        .digest('hex');

      if (calculatedSignature !== receivedSignature) {
        return res.status(401).json({ error: 'Unauthorized: Tanda tangan Lynk tidak valid!' });
      }
    }

    // 3. EKSTRAK DATA STRUKTUR LYNK.ID
    const customer = messageData.customer || {};
    const buyerEmail = customer.email;
    const buyerName = customer.name;
    
    const items = messageData.items || [];
    const firstItem = items[0] || {};
    const productName = firstItem.title; // Menggunakan 'title' sesuai JSON dokumentasi
    const invoiceId = messageData.refId;  // refId digunakan sebagai Nomor Invoice

    // Ekstrak target (Username/Link) dari string JSON kustom milik Lynk.id
    let target = '';
    if (firstItem.questions) {
      try {
        const parsedQuestions = JSON.parse(firstItem.questions);
        const answers = Object.values(parsedQuestions);
        target = answers[0] || ''; // Mengambil jawaban kolom pertama form pengisian pembeli
      } catch (e) {
        target = firstItem.questions; // Fallback jika bukan format JSON
      }
    }

    // 4. MAPPING NAMA PRODUK LYNK -> PROVIDER + KODE SERVICE + JUMLAH PAKET
    const MAP_BY_NAME = {
        // PENGIKUT SALURAN WA - Provider Medanpedia, Service 5519
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

        // VIEWS INSTAGRAM - Provider Indosmm, Service 6035
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
      return res.status(200).json({ status: 'ignored', msg: `Produk "${productName}" tidak di-mapping otomatis.` });
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const quantity = mapData.qty;

    if (!target || !quantity) {
      return res.status(400).json({ status: 'error', msg: 'Data target akun pengiriman kosong' });
    }

    let apiEndpoint;
    let form = new URLSearchParams();

    // 5. HUBUNGKAN KE API SMM PANEL MASING-MASING
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

    // Tembak data pesanan ke SMM Panel
    const panelResponse = await fetch(apiEndpoint, { method: 'POST', body: form });
    const panelResult = await panelResponse.json();

    // 6. KIRIM NOTA KE EMAIL PEMBELI VIA GMAIL NODEMAILER
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;

    if (GMAIL_USER && GMAIL_PASS && buyerEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS }
      });

      const isSuccess = panelResult?.status === 'success' || panelResult?.success === true || panelResult?.status === true;
      const statusMsg = isSuccess
        ? `Sedang diproses sistem. ID Pesanan SMM: ${panelResult.data?.id || panelResult.id || 'N/A'}`
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
          <p><b>Status Akses SMM Panel:</b> <br> <code style="background:#f4f4f4; padding:5px; display:inline-block;">${statusMsg}</code></p>
          <br>
          <p>Terima kasih telah berbelanja layanan premium di PulzzStore!</p>
        `
      });
    }

    return res.status(200).json({ status: 'ok', provider, panel: panelResult });

  } catch (e) {
    console.error('Error Callback:', e);
    return res.status(500).json({ error: e.message });
  }
                               }
      
