import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method!== 'POST') return res.status(405).end();

  try {
    const { event, data } = req.body;

    if (event === 'order.paid') {
      // 1. Ambil data dari Additional Question Lynk
      // Urutan: 1=Username, 2=Service ID, 3=Jumlah
      const answers = data.answers;
      const target = answers[0]?.answer;
      const serviceId = answers[1]?.answer;
      const quantity = answers[2]?.answer;

      const buyerEmail = data.customer.email;
      const buyerName = data.customer.name;
      const productName = data.product.name;
      const invoiceId = data.id;

      if (!serviceId ||!target ||!quantity) {
        console.log('Gagal: Data kosong', answers);
        return res.status(400).json({status: 'error', msg: 'Data checkout kosong'});
      }

      // 2. Kirim order ke Indosmm lewat api.php
      const INDOSMM_KEY = process.env.INDOSMM_KEY;
      const domain = `https://${req.headers.host}`;

      const form = new URLSearchParams();
      form.append('key', INDOSMM_KEY);
      form.append('action', 'order');
      form.append('service', serviceId);
      form.append('target', target);
      form.append('quantity', quantity);

      const panelResult = await fetch(`${domain}/api/api.php`, { method: 'POST', body: form }).then(r => r.json());

      // 3. Kirim Email ke Buyer pake Gmail - INI PENGGANTI FONNTE
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASS
        }
      });

      const statusMsg = panelResult?.status === 'success'? 'Sedang diproses' : 'Gagal: ' + (panelResult?.msg || 'Cek manual');

      await transporter.sendMail({
        from: `"PulzzStore" <${process.env.GMAIL_USER}>`,
        to: buyerEmail,
        subject: `Order Lunas - ${invoiceId}`,
        html: `
          <h3>Halo ${buyerName}!</h3>
          <p>Pembayaran order <b>${invoiceId}</b> sudah lunas ✅</p>
          <p><b>Produk:</b> ${productName}</p>
          <p><b>Target:</b> ${target}</p>
          <p><b>Jumlah:</b> ${quantity}</p>
          <p><b>Status:</b> ${statusMsg}</p>
          <br>
          <p>Terima kasih sudah order di PulzzStore 🙏</p>
        `
      });

      return res.status(200).json({ status: 'ok', panel: panelResult, email_sent: buyerEmail });
    }

    return res.status(200).json({ status: 'ignored' });

  } catch (e) {
    console.error('Error Callback:', e);
    return res.status(500).json({ error: e.message });
  }
}        form.append('quantity', quantity);

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
