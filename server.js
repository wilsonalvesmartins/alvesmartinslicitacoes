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

console.log(`[Painel] Iniciando Servidor...`);

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Aumentado para suportar PDFs em Base64
app.use(express.static(path.join(__dirname, 'dist'))); // Serve o React

// --- BANCO DE DADOS ---
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) console.error('[Painel] Erro banco:', err.message);
  else console.log('[Painel] Banco conectado com sucesso.');
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

  // Tabela para configurações do sistema
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY, value TEXT
  )`);

  // Migração de Segurança
  db.all("PRAGMA table_info(bids)", (err, rows) => {
    if (!err && rows) {
      if (!rows.some(r => r.name === 'plataforma')) db.run("ALTER TABLE bids ADD COLUMN plataforma TEXT");
    }
  });
});

// --- FUNÇÃO AUXILIAR DE CONFIGURAÇÕES ---
const getSetting = (key) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM settings WHERE id = ?", [key], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.value : null);
    });
  });
};

// --- UPLOADS ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `${Date.now()}-${cleanName}`);
  }
});
const upload = multer({ storage });

// --- ROTAS DA IA (GEMINI API) ---

// Chave da API Hardcoded (Inserida diretamente como pedido)
const DEFAULT_API_KEY = "AIzaSyCeFj1wLpyZqvUKGyTJhY2Z3h6WbuzS2Kg";

app.post('/api/ai/extract', async (req, res) => {
  try {
    // Tenta pegar a chave do banco, se não existir, usa a chave hardcoded
    let dbKey = await getSetting('gemini_api_key');
    let apiKey = (dbKey && dbKey.trim() !== '') ? dbKey : DEFAULT_API_KEY;
    
    // Remove espaços vazios que causam erro 404 na Google API
    apiKey = apiKey.trim();

    const { base64Data, mimeType, prompt } = req.body;
    
    // Atualizado para o modelo flash-latest para evitar erros de versão
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data: base64Data } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    
    if (!response.ok) {
      // Captura o erro exato da Google para mostrar no balão vermelho
      const errorData = await response.json().catch(() => ({}));
      const googleErrorMsg = errorData?.error?.message || response.statusText;
      console.error(`[Painel] Erro Google API (${response.status}):`, googleErrorMsg);
      throw new Error(`Google API (${response.status}): ${googleErrorMsg}`);
    }
    
    const data = await response.json();
    res.json({ text: data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error("[Painel] Erro Extração IA:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  try {
    let dbKey = await getSetting('gemini_api_key');
    let apiKey = (dbKey && dbKey.trim() !== '') ? dbKey : DEFAULT_API_KEY;
    apiKey = apiKey.trim();

    const { prompt } = req.body;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const googleErrorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`Google API (${response.status}): ${googleErrorMsg}`);
    }
    
    const data = await response.json();
    res.json({ text: data.candidates[0].content.parts[0].text });
  } catch (error) {
    console.error("[Painel] Erro Geração IA:", error);
    res.status(500).json({ error: error.message });
  }
});

// --- API REGULAR ---

// Rotas de Configuração
app.get('/api/settings', (req, res) => {
  db.all("SELECT * FROM settings", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const settingsObj = {};
    rows.forEach(r => settingsObj[r.id] = r.value);
    res.json(settingsObj);
  });
});

app.post('/api/settings', (req, res) => {
  const { id, value } = req.body;
  db.run(`INSERT OR REPLACE INTO settings (id, value) VALUES (?, ?)`, [id, value], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// Rotas de Bids
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

// Rotas de Upload
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
