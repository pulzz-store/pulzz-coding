import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const event = body.event;
    const eventData = body.data || {};
    const messageData = eventData.message_data || {};

    // 1. Filter hanya memproses jika status lunas
    if (event !== 'payment.received') {
      return res.status(200).json({ status: 'ignored', msg: 'Bukan event payment.received' });
    }

    const customer = messageData.customer || {};
    const buyerEmail = customer.email;
    const buyerName = customer.name;
    
    const items = messageData.items || [];
    const firstItem = items[0] || {};
    const productName = firstItem.title; 
    const invoiceId = messageData.refId;

    // Ekstrak target akun (Username/Link) dari form Lynk
    let target = '';
    if (firstItem.questions) {
      try {
        const parsedQuestions = JSON.parse(firstItem.questions);
        const answers = Object.values(parsedQuestions);
        target = answers[0] || '';
      } catch (e) {
        target = firstItem.questions;
      }
    }

    // 2. MAPPING LAYANAN PULZZ STORE (Sesuai ID Whitelist di Panel Lu)
    const MAP_BY_NAME = {
        '100 Pengikut Saluran WA': {provider: 'medan', service: '5519', qty: 100},
        '200 Pengikut Saluran WA': {provider: 'medan', service: '5519', qty: 200},
        '300 Pengikut Saluran WA': {provider: 'medan', service: '5519', qty: 300},
        '400 Pengikut Saluran WA': {provider: 'medan', service: '5519', qty: 400},
        '500 Pengikut Saluran WA': {provider: 'medan', service: '5519', qty: 500},
        '1000 Pengikut Saluran WA': {provider: 'medan', service: '5519', qty: 1000},

        '200 Like Instagram': {provider: 'indosmm', service: '5792', qty: 200}, // Sesuai ID Whitelist Panel: 5792
        '300 Like Instagram': {provider: 'indosmm', service: '5792', qty: 300},
        '400 Like Instagram': {provider: 'indosmm', service: '5792', qty: 400},
        '500 Like Instagram': {provider: 'indosmm', service: '5792', qty: 500},
        '1000 Like Instagram': {provider: 'indosmm', service: '5792', qty: 1000},

        '100 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 100},
        '200 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 200},
        '500 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 500},
        '1000 Followers IG Indo': {provider: 'indosmm', service: '574', qty: 1000},

        '100 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 100},
        '500 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 500},
        '1000 Followers Instagram': {provider: 'indosmm', service: '8303', qty: 1000},

        '5000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 5000},
        '10000 Views Instagram': {provider: 'indosmm', service: '6035', qty: 10000},
    };
    
    const mapData = MAP_BY_NAME[productName];
    if (!mapData) {
      return res.status(200).json({ status: 'ignored_error', msg: `Produk "${productName}" belum di-mapping di Vercel.` });
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const quantity = mapData.qty;

    if (!target || !quantity) {
      return res.status(200).json({ status: 'ignored_error', msg: 'Target akun atau quantity kosong!' });
    }

    let apiEndpoint;
    let form = new URLSearchParams();

    // 3. MENYUSUN PARAMETER API ASLI SMM PANEL (Meniru Struktur Perintah Form Panel Lu)
    if (provider === 'indosmm') {
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      if (!INDOSMM_KEY) throw new Error('INDOSMM_KEY belum diisi di Env Vercel');

      apiEndpoint = 'https://indosmm.com/api/v2';
      form.append('key', INDOSMM_KEY);
      form.append('action', 'add'); // Menggunakan 'add' sesuai instruksi panel
      form.append('service', serviceId);
      form.append('link', target);   // Indosmm menggunakan parameter 'link'
      form.append('quantity', String(quantity));

    } else if (provider === 'medan') {
      const MEDAN_API_ID = process.env.MEDAN_API_ID;
      const MEDAN_API_KEY = process.env.MEDAN_API_KEY;
      if (!MEDAN_API_ID || !MEDAN_API_KEY) throw new Error('MEDAN_API_ID/KEY belum diisi di Env Vercel');

      apiEndpoint = 'https://api.medanpedia.co.id/order';
      form.append('api_id', MEDAN_API_ID);
      form.append('api_key', MEDAN_API_KEY);
      form.append('action', 'add'); // Menggunakan 'add' sesuai instruksi panel
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', String(quantity));
      form.append('username', target); // Parameter wajib tambahan dari panel lu
    }

    // 4. Eksekusi Tembak Langsung ke Pusat Server SMM tanpa Jembatan PHP
    const panelResponse = await fetch(apiEndpoint, { 
      method: 'POST', 
      body: form.toString(), 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const textResponse = await panelResponse.text();
    let panelResult;
    try {
      panelResult = JSON.parse(textResponse);
    } catch(errJson) {
      throw new Error(`SMM Panel merespon teks buntu. Isi: ${textResponse.substring(0, 100)}`);
    }

    // 5. Fitur Kirim Email Nota Bukti Lunas otomatis ke Pembeli
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;

    if (GMAIL_USER && GMAIL_PASS && buyerEmail) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: GMAIL_USER, pass: GMAIL_PASS }
      });

      await transporter.sendMail({
        from: `"PulzzStore" <${GMAIL_USER}>`,
        to: buyerEmail,
        subject: `[LUNAS] Nota Pesanan Anda - ${invoiceId}`,
        html: `<h3>Halo ${buyerName}! Orderan ${productName} sedang diproses oleh server SMM.</h3>`
      });
    }

    return res.status(200).json({ status: 'ok', provider, panel: panelResult });

  } catch (e) {
    return res.status(200).json({ 
      status: 'error_debug', 
      pesan_paling_akurat: e.message 
    });
  }
      }
      
