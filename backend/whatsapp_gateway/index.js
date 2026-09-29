const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const app = express();
const PORT = process.env.PORT || 8005;
const FASTAPI_WEBHOOK_URL = process.env.FASTAPI_WEBHOOK_URL || 'http://127.0.0.1:8000/api/v1/whatsapp-automation/webhook';

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const SESSIONS_FILE = path.join(__dirname, 'sessions.json');
const AUTH_DIR = path.join(__dirname, '.wwebjs_auth');

if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function loadSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error loading sessions.json:', e);
  }
  return [];
}

function saveSessions(list) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(list, null, 2));
  } catch (e) {
    console.error('Error saving sessions.json:', e);
  }
}

const clients = {};

function startClient(id) {
  const cleanId = id.replace(/\D/g, '');
  if (!cleanId) return null;

  if (clients[cleanId]) {
    return clients[cleanId];
  }

  console.log(`[WhatsApp Gateway] Initializing client for session ${cleanId}...`);

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: cleanId,
      dataPath: AUTH_DIR,
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-zygote',
        '--disable-gpu',
      ],
    },
  });

  client._status = 'INITIALIZING';
  client._latestQr = null;
  client._info = null;

  client.on('qr', async (qr) => {
    console.log(`[WhatsApp Gateway] QR Code generated for session ${cleanId}`);
    try {
      const qrDataUrl = await qrcode.toDataURL(qr);
      client._latestQr = qrDataUrl;
      client._status = 'QR_READY';
    } catch (err) {
      console.error('Error generating QR data URL:', err);
    }
  });

  client.on('authenticated', () => {
    console.log(`[WhatsApp Gateway] Session ${cleanId} authenticated!`);
    client._status = 'AUTHENTICATED';
    client._latestQr = null;
  });

  client.on('ready', async () => {
    console.log(`[WhatsApp Gateway] Session ${cleanId} is READY & CONNECTED!`);
    client._status = 'CONNECTED';
    client._latestQr = null;
    try {
      client._info = client.info;
    } catch (e) {}

    const sessions = loadSessions();
    if (!sessions.includes(cleanId)) {
      sessions.push(cleanId);
      saveSessions(sessions);
    }
  });

  client.on('auth_failure', (msg) => {
    console.warn(`[WhatsApp Gateway] Auth failure on session ${cleanId}:`, msg);
    client._status = 'DISCONNECTED';
  });

  client.on('disconnected', (reason) => {
    console.log(`[WhatsApp Gateway] Session ${cleanId} disconnected:`, reason);
    client._status = 'DISCONNECTED';
    delete clients[cleanId];
    const sessions = loadSessions().filter((s) => s !== cleanId);
    saveSessions(sessions);
  });

  client.on('message', async (msg) => {
    let fromNumber = msg.from.split('@')[0];
    let profileName = msg._data?.notifyName || '';

    try {
      const contact = await msg.getContact();
      if (contact?.id?.server === 'c.us') {
        fromNumber = contact.id.user;
      } else if (contact?.number) {
        fromNumber = contact.number;
      }
      profileName = contact?.name || contact?.pushname || profileName;
    } catch (e) {}

    try {
      await axios.post(FASTAPI_WEBHOOK_URL, {
        message_id: msg.id?.id,
        from: fromNumber,
        body: msg.body || '',
        timestamp: msg.timestamp,
        profile_name: profileName,
        session_id: cleanId,
      });
    } catch (err) {
      console.error('[WhatsApp Gateway] Failed to post webhook to backend:', err.message);
    }
  });

  clients[cleanId] = client;
  client.initialize().catch((err) => {
    console.error(`[WhatsApp Gateway] Initialization error for ${cleanId}:`, err);
    client._status = 'DISCONNECTED';
  });

  return client;
}

// REST Endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', active_sessions_count: Object.keys(clients).length });
});

app.get('/sessions', (req, res) => {
  const result = {};
  const activeIds = Object.keys(clients);
  const persisted = loadSessions();
  const allIds = Array.from(new Set([...activeIds, ...persisted]));

  for (const id of allIds) {
    const client = clients[id];
    if (client) {
      result[id] = {
        status: client._status || 'INITIALIZING',
        qr: client._latestQr || null,
        info: client._info || (client.info ? { phone: client.info.wid?.user, pushname: client.info.pushname } : null),
      };
    } else {
      result[id] = {
        status: 'DISCONNECTED',
        qr: null,
        info: null,
      };
    }
  }
  res.json(result);
});

app.post('/sessions/:id/start', (req, res) => {
  const cleanId = req.params.id.replace(/\D/g, '');
  const client = startClient(cleanId);
  res.json({
    success: true,
    session_id: cleanId,
    status: client ? client._status : 'INITIALIZING',
    qr: client ? client._latestQr : null,
  });
});

app.post('/sessions/:id/logout', async (req, res) => {
  const cleanId = req.params.id.replace(/\D/g, '');
  const client = clients[cleanId];
  if (client) {
    try {
      await client.logout();
    } catch (e) {}
    try {
      await client.destroy();
    } catch (e) {}
    delete clients[cleanId];
  }
  const sessions = loadSessions().filter((s) => s !== cleanId);
  saveSessions(sessions);
  res.json({ success: true, message: `Session ${cleanId} logged out and destroyed.` });
});

app.get('/sessions/:id/chats/:phone/messages', async (req, res) => {
  const cleanId = req.params.id.replace(/\D/g, '');
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const client = clients[cleanId];

  if (!client || client._status !== 'CONNECTED') {
    return res.json({ success: false, messages: [] });
  }

  try {
    const jid = `${cleanPhone}@c.us`;
    const chat = await client.getChatById(jid);
    const msgs = await chat.fetchMessages({ limit: 50 });
    const formatted = msgs.map((m) => ({
      id: m.id?.id,
      body: m.body,
      fromMe: m.fromMe,
      timestamp: m.timestamp,
    }));
    res.json({ success: true, messages: formatted });
  } catch (err) {
    res.json({ success: false, error: err.message, messages: [] });
  }
});

app.post('/sessions/:id/chats/:phone/send', async (req, res) => {
  const cleanId = req.params.id.replace(/\D/g, '');
  const cleanPhone = req.params.phone.replace(/\D/g, '');
  const { message } = req.body;
  const client = clients[cleanId];

  if (!client || client._status !== 'CONNECTED') {
    return res.status(400).json({
      success: false,
      error: `Session ${cleanId} is not CONNECTED to WhatsApp Web. Please scan the QR code first.`,
    });
  }

  try {
    const jid = `${cleanPhone}@c.us`;
    const sent = await client.sendMessage(jid, message);
    res.json({
      success: true,
      message_id: sent.id?.id,
      timestamp: sent.timestamp,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 [WhatsApp Gateway] Running on port ${PORT}`);
  const active = loadSessions();
  active.forEach((id) => startClient(id));
});
