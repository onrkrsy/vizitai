import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import chatRouter from './routes/chat.js';
import { loadAppConfig } from './config/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Static assets: serve folders explicitly to avoid exposing backend files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.use('/styles', express.static(path.join(__dirname, 'styles')));
app.use('/scripts', express.static(path.join(__dirname, 'scripts')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// API routes
app.use('/api/chat', chatRouter);

// Config endpoint for frontend
app.get('/api/config', (req, res) => {
  const config = loadAppConfig();
  res.json({
    audioEnabled: config.AUDIO_ENABLED
  });
});

// Vercel deployment için export
export default app;

// Local development için
// if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
// }


