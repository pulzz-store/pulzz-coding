export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();

  try {
    const { event, data } = req.body; // Data dari Lynk

    if (event === 'order.paid') { // Cuma jalan kalo status Lunas
      // 1. Ambil data dari Lynk. Kita pake Custom Fields
      const serviceId = data.custom_fields?.service_id;
      const target = data.custom_fields?.target;
      const quantity = data.quantity || 1;
      const buyerPhone = data.customer.phone;
      const buyerName = data.customer.name;
      const productName = data.product.name;
      const invoiceId = data.id;

      if (!serviceId ||!target) {
        console.log('Gagal: service_id atau target kosong');
        return res.status(400).json({status: 'error', msg: 'Isi service_id & target'});
      }

      // 2. Ambil API Key dari Vercel - AMAN
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      const MEDAN_KEY = process.env.MEDAN_KEY;
      const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
      const domain = `https://${req.headers.host}`; // Auto jadi pulzzstore.vercel.app

      let panelResult;

      // 3. Order ke Indosmm lewat proxy api.php
      if (productName.toLowerCase().includes('indosmm')) {
        const form = new URLSearchParams();
        form.append('key', INDOSMM_KEY);
        form.append('action', 'order');
        form.append('service', serviceId);
        form.append('target', target);
        form.append('quantity', quantity);

        panelResult = await fetch(`${domain}/api/api.php`, { method: 'POST', body: form }).then(r => r.json());
      }
      // 4. Order ke Medanpedia lewat proxy api-medan.php
      else if (productName.toLowerCase().includes('medanpedia')) {
        const form = new URLSearchParams();
        form.append('action', 'order');
        form.append('api_key', MEDAN_KEY);
        form.append('service', serviceId);
        form.append('target', target);
        form.append('quantity', quantity);

        panelResult = await fetch(`${domain}/api/api-medan.php`, { method: 'POST', body: form }).then(r => r.json());
      }

      // 5. Kirim WA ke buyer pake Fonnte
      const statusMsg = panelResult?.status === 'success' || panelResult?.success === true? 'Sedang diproses' : 'Gagal: ' + (panelResult?.msg || 'Cek manual');
      const pesan = `Halo ${buyerName}!\n\nOrder ${invoiceId} lunas ✅\nProduk: ${productName}\nStatus: ${statusMsg}`;

      await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': FONNTE_TOKEN },
        body: JSON.stringify({ target: buyerPhone, message: pesan })
      });

      return res.status(200).json({ status: 'ok', panel: panelResult });
    }

    return res.status(200).json({ status: 'ignored' }); // Kalo bukan event paid, abaikan

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
        }
