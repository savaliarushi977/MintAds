import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve generated media files
app.use('/data', express.static(path.resolve(__dirname, '../../data')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Routes (wired in later chunks)
// app.use('/api', generateRouter);
// app.use('/api', statusRouter);
// app.use('/api', configRouter);
// app.use('/api', runsRouter);

app.listen(PORT, () => {
  console.log(`MintAds backend running on http://localhost:${PORT}`);
});
