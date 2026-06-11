import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { event, data } = req.body;

    if (event!== 'order.paid') {
      return res.status(200).json({ status: 'ignored', msg: 'Bukan order.paid' });
    }

    // 1. Ambil data dari Lynk
    const product_sku = data.product.sku; // INI KUNCINYA, BUKAN DARI ANSWERS[1]
    const answers = data.answers || [];
    const target = answers[0]?.answer; // Urutan 1=Username/ID
    const quantity = answers[2]?.answer || 1; // Urutan 3=Jumlah

    const buyerEmail = data.customer.email;
    const buyerName = data.customer.name;
    const productName = data.product.name;
    const invoiceId = data.id;

    if (!product_sku ||!target ||!quantity) {
      console.log('Gagal: Data kosong', { product_sku, target, quantity, answers });
      return res.status(400).json({ status: 'error', msg: 'Data checkout kosong' });
    }

    // 3. MAPPING NAMA PRODUK LYNK -> PROVIDER + KODE
// Format: 'NAMA PRODUK DI LYNK LU': {provider: 'indosmm'/'medan', service: 'KODE_PROVIDER'}
const MAP_BY_NAME = {
    // ISI SESUAI NAMA PRODUK DI DASHBOARD LYNK LU, HARUS SAMA PERSIS
    'Follower Ig Indo':       {provider: 'indosmm', service: '574'},     // Kode Indosmm
    'Follower Instagram':     {provider: 'indosmm', service: '8303'},    // Kode Indosmm 
    'Like Instagram':         {provider: 'indosmm', service: '7242'},    // Kode Indosmm
    'View Instagram':         {provider: 'indosmm', service: '6035'},    // Kode Indosmm
    'Pengikut Saluran WA':    {provider: 'medan',   service: '5519'},    // Kode Medanpedia

    // TAMBAHIN LAGI SESUAI NAMA PRODUK LU DI LYNK
};
    
    const mapData = MAP_SERVICE[product_sku];
    if (!mapData) {
      throw new Error(`SKU Lynk "${product_sku}" belum ada di MAP_SERVICE. Tambahin dulu.`);
    }

    const provider = mapData.provider;
    const serviceId = mapData.service;
    const domain = `https://${req.headers.host}`;
    let apiEndpoint, form = new URLSearchParams();
    let panelResult;

    // 3. Kirim order ke Provider yg bener
    if (provider === 'indosmm') {
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      if (!INDOSMM_KEY) throw new Error('INDOSMM_KEY kosong di Vercel Env');

      apiEndpoint = `${domain}/api/api.php`;
      form.append('key', INDOSMM_KEY);
      form.append('action', 'order');
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);

    } else if (provider === 'medanpedia') {
      const MEDAN_API_ID = process.env.MEDAN_API_ID;
      const MEDAN_API_KEY = process.env.MEDAN_API_KEY;
      if (!MEDAN_API_ID ||!MEDAN_API_KEY) throw new Error('MEDAN_API_ID/KEY kosong di Vercel Env');

      apiEndpoint = `${domain}/api/api-medan.php`;
      form.append('action', 'order');
      form.append('api_id', MEDAN_API_ID);
      form.append('api_key', MEDAN_API_KEY);
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);
      form.append('username', target); // Medan wajib username
    } else {
      throw new Error('Provider tidak dikenal');
    }

    panelResult = await fetch(apiEndpoint, { method: 'POST', body: form }).then(r => r.json());

    // 4. Kirim Email ke Buyer pake Gmail - PENGGANTI FONNTE
    const GMAIL_USER = process.env.GMAIL_USER;
    const GMAIL_PASS = process.env.GMAIL_PASS;
    if (!GMAIL_USER ||!GMAIL_PASS) throw new Error('GMAIL_USER/PASS kosong di Vercel Env');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: GMAIL_USER, pass: GMAIL_PASS }
    });

    const statusMsg = panelResult?.status === 'success' || panelResult?.success === true
     ? `Sedang diproses. ID Provider: ${panelResult.data?.order_id || panelResult.order_id || 'N/A'}`
      : `Gagal: ${panelResult?.msg || panelResult?.error || 'Cek manual'}`;

    await transporter.sendMail({
      from: `"PulzzStore" <${GMAIL_USER}>`,
      to: buyerEmail,
      subject: `Order Lunas - ${invoiceId}`,
      html: `
        <h3>Halo ${buyerName}!</h3>
        <p>Pembayaran order <b>${invoiceId}</b> sudah lunas ✅</p>
        <p><b>Produk:</b> ${productName}</p>
        <p><b>Target:</b> ${target}</p>
        <p><b>Jumlah:</b> ${quantity}</p>
        <p><b>Provider:</b> ${provider}</p>
        <p><b>Status:</b> ${statusMsg}</p>
        <br>
        <p>Terima kasih sudah order di PulzzStore 🙏</p>
      `
    });

    return res.status(200).json({ status: 'ok', provider, panel: panelResult, email_sent: buyerEmail });

  } catch (e) {
    console.error('Error Callback:', e);
    // Kirim email error ke admin juga boleh
    return res.status(500).json({ error: e.message });
  }
}
