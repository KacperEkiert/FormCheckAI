import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serwowanie plików statycznych z folderu 'dist' (wygenerowanego przez vite build)
app.use(express.static(path.join(__dirname, 'dist')));

// Endpoint pomocniczy do sprawdzania statusu serwera
app.get('/api/health', (req, res) => {
  res.json({ status: 'active', timestamp: new Date() });
});

// Obsługa SPA - wszystkie inne zapytania zwracają index.html
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serwer produkcyjny FormCheckAI działa na porcie ${PORT}`);
  console.log(`Ścieżka statyczna: ${path.join(__dirname, 'dist')}`);
});
