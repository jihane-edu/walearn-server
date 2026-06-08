const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const sessions = new Map();

app.post('/pairing-code', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Numéro requis' });

    // تفعيل خاصية البث (Streaming) باش Vercel ما يقطعش الخط د الـ Timeout
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (sessions.has(phone)) {
        try { await sessions.get(phone).destroy(); } catch(e) {}
        sessions.delete(phone);
    }

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: `session-${phone}` }),
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        },
        puppeteer: {
            handleSIGINT: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process', '--disable-gpu']
        }
    });

    client.initialize().catch(err => {
        console.error(`Erreur init ${phone}:`, err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    });

    client.on('qr', async () => {
        try {
            const code = await client.requestPairingCode(phone);
            sessions.set(phone, client);
            // إرسال الكود فوراً قبل ما يسالي الوقت د السيرفر
            if (!res.headersSent) {
                res.write(JSON.stringify({ code: code, pairingCode: code }));
                res.end();
            }
        } catch (err) {
            if (!res.headersSent) {
                res.write(JSON.stringify({ error: err.message }));
                res.end();
            }
        }
    });

    client.on('ready', () => console.log(`✅ WhatsApp connecté pour ${phone}`));
    client.on('disconnected', () => sessions.delete(phone));
});

app.get('/status', (req, res) => res.json({ status: 'READY', sessions: sessions.size }));

app.listen(port, () => console.log(`[WaLearn] Multi-sessions Vercel actif sur port ${port}`));
