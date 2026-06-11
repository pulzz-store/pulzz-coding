import express from 'express';
import handler from './api/lynk-callback.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mengalihkan jalur pintu Render ke kodingan utama kita kemarin
app.post('/api/lynk-callback', handler);

// Menghidupkan mesin server di Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server PulzzStore aktif di port ${PORT}`);
});
