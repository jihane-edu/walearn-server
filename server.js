const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// إعداد السيرفر مع نسخة واتساب أونلاين خفيفة ومضمونة بلا كروم وبلا مشاكل لينوكس
const client = new Client({
    authStrategy: new LocalAuth({ clientId: "walearn-session" }),
    webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    },
    puppeteer: {
        handleSIGINT: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ],
    }
});

let serverStatus = 'INITIALIZING';

client.on('loading_screen', (percent, message) => {
    console.log('Chargement WhatsApp :', percent, '% -', message);
    serverStatus = 'INITIALIZING';
});

client.on('qr', () => {
    console.log('QR Code disponible (Non utilisé pour le flow Pairing Code)');
    serverStatus = 'QR_READY';
});

client.on('authenticated', () => {
    console.log('WhatsApp Authentifié !');
});

client.on('ready', () => {
    console.log('السيرفر واجد ومستعد والواتساب متصل بنجاح! ✅');
    serverStatus = 'READY';
});

client.on('disconnected', () => {
    console.log('تم فصل الواتساب ❌');
    serverStatus = 'DISCONNECTED';
});

// تشغيل الواتساب ف الكواليس
client.initialize().catch(err => {
    console.error('Erreur initialisation client:', err);
});

// ── Endpoints ديال السيرفر ──────────────────────────────────────────────────

// 1. معرفة حالة السيرفر
app.get('/status', (req, res) => {
    res.json({ status: serverStatus });
});

// 2. طلب كود الربط السحري (Pairing Code)
app.post('/pairing-code', async (req, res) => {
    const { phone } = req.body;
    console.log(`طلب كود ربط جديد للأستاذ: ${phone} 🚀`);

    if (!phone) {
        return res.status(400).json({ error: 'Veuillez fournir un numéro de téléphone' });
    }

    try {
        // طلب الكود من الواتساب ديريكت
        const code = await client.requestPairingCode(phone);
        console.log(`✅ الكود تخرج بنجاح وهو: ${code}`);
        res.json({ code: code, pairingCode: code });
    } catch (err) {
        console.error('خطأ أثناء طلب كود الربط:', err.message);
        res.status(500).json({ error: 'Erreur pairing: ' + err.message });
    }
});

// تشغيل سيرفر Express
app.listen(port, () => {
    console.log(`السيرفر شغال ناضي ف البورت: ${port} 🚀`);
});
