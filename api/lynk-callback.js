import nodemailer from 'nodemailer';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const body = req.body || {};
    const event = body.event;
    const eventData = body.data || {};
    const messageData = eventData.message_data || {};

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

    // LIST PRODUK PULZZ STORE
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
      return res.status(200).json({ status: 'ignored_error', msg: `Nama produk "${productName}" belum terdaftar di kode.` });
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const quantity = mapData.qty;

    if (!target || !quantity) {
      return res.status(200).json({ status: 'ignored_error', msg: 'Kolom input target akun kosong!' });
    }

    let apiEndpoint;
    let form = new URLSearchParams();

    if (provider === 'indosmm') {
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      if (!INDOSMM_KEY) throw new Error('INDOSMM_KEY kosong di Env Vercel!');

      apiEndpoint = 'https://pulzzstorepanel.infinityfreeapp.com/api.php';
      form.append('key', INDOSMM_KEY);
      form.append('action', 'order');
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);

    } else if (provider === 'medanpedia') {
      const MEDAN_API_ID = process.env.MEDAN_API_ID;
      const MEDAN_API_KEY = process.env.MEDAN_API_KEY;
      if (!MEDAN_API_ID || !MEDAN_API_KEY) throw new Error('MEDAN_API_ID/KEY kosong di Env Vercel!');

      apiEndpoint = 'https://pulzzstorepanel.infinityfreeapp.com/api-medan.php';
      form.append('action', 'order');
      form.append('api_id', MEDAN_API_ID);
      form.append('api_key', MEDAN_API_KEY);
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);
    }

    // Tembak ke Jembatan PHP InfinityFree
    const panelResponse = await fetch(apiEndpoint, { 
      method: 'POST', 
      body: form.toString(), 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    // PERBAIKAN SAKTI: Baca teks mentahnya dulu biar gak crash body consumed!
    const textResponse = await panelResponse.text();
    
    let panelResult;
    try {
      panelResult = JSON.parse(textResponse);
    } catch(errJson) {
      // Jika InfinityFree lo ngeluarin eror HTML/teks, dia bakal dipaksa ngaku di sini!
      throw new Error(`Balasan InfinityFree bukan JSON. Isi respon asli: ${textResponse.substring(0, 150)}`);
    }

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
        html: `<h3>Halo ${buyerName}! Orderan ${productName} diproses.</h3>`
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
    
