import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 80;

// Diretórios Persistentes (Volume Docker)
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'grapaz.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist'))); // Serve o React

// --- BANCO DE DADOS ---
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('[Painel] Erro banco:', err.message);
  else console.log('[Painel] Banco conectado.');
});

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bids (
    id TEXT PRIMARY KEY, orgao TEXT, cidade TEXT, plataforma TEXT, numeroPregao TEXT, processo TEXT,
    data TEXT, horario TEXT, modalidade TEXT, status TEXT, value REAL,
    items TEXT, deadlines TEXT, paymentDeadline TEXT, isPaid INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT, originalName TEXT, type TEXT, createdAt TEXT
  )`);

  // Migração de Segurança
  db.all("PRAGMA table_info(bids)", (err, rows) => {
    if (!err && rows) {
      if (!rows.some(r => r.name === 'plataforma')) db.run("ALTER TABLE bids ADD COLUMN plataforma TEXT");
    }
  });
});

// --- UPLOADS ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  }
});
const upload = multer({ storage });

// --- API ---
app.get('/api/bids', (req, res) => {
  db.all("SELECT * FROM bids", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({ ...r, deadlines: JSON.parse(r.deadlines || '{}'), isPaid: !!r.isPaid })));
  });
});

app.post('/api/bids', (req, res) => {
  const bid = req.body;
  const stmt = db.prepare(`INSERT OR REPLACE INTO bids VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  stmt.run([
    bid.id, bid.orgao, bid.cidade, bid.plataforma || '', bid.numeroPregao, bid.processo,
    bid.data, bid.horario, bid.modalidade, bid.status, bid.value || 0, bid.items || '',
    JSON.stringify(bid.deadlines || {}), bid.paymentDeadline || '', bid.isPaid ? 1 : 0
  ], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(bid);
  });
});

app.put('/api/bids/:id', (req, res) => {
  const updates = req.body;
  const fields = [], values = [];
  Object.keys(updates).forEach(key => {
    if (key === 'id') return;
    fields.push(`${key} = ?`);
    if (key === 'deadlines') values.push(JSON.stringify(updates[key]));
    else if (key === 'isPaid') values.push(updates[key] ? 1 : 0);
    else values.push(updates[key]);
  });
  if (fields.length === 0) return res.json({ success: true });
  db.run(`UPDATE bids SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id], err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.delete('/api/bids/:id', (req, res) => {
  db.run("DELETE FROM bids WHERE id = ?", req.params.id, err => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).send('Arquivo não recebido.');
  db.run(`INSERT INTO files (filename, originalName, type, createdAt) VALUES (?, ?, ?, ?)`, 
    [req.file.filename, req.file.originalname, req.body.type, new Date().toISOString()], err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, filename: req.file.filename });
  });
});

app.get('/api/files', (req, res) => {
  db.all("SELECT * FROM files ORDER BY createdAt DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.delete('/api/files/:id', (req, res) => {
  db.get("SELECT filename FROM files WHERE id = ?", req.params.id, (err, row) => {
    if (err || !row) return res.status(404).json({ error: "Não encontrado" });
    db.run("DELETE FROM files WHERE id = ?", req.params.id, () => {
      try { fs.unlinkSync(path.join(UPLOAD_DIR, row.filename)); } catch (e) {}
      res.json({ success: true });
    });
  });
});

app.get('/api/download/:filename', (req, res) => {
  const filepath = path.join(UPLOAD_DIR, req.params.filename);
  if (fs.existsSync(filepath)) res.download(filepath);
  else res.status(404).send("Arquivo não encontrado.");
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
app.listen(PORT, () => console.log(`[Painel] Servidor rodando na porta ${PORT}`));
