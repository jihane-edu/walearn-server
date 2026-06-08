const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// مسار ترحيبي باش نتأكدو أن السيرفر شغال أونلاين
app.get('/', (req, res) => {
    res.json({ status: "ONLINE", message: "Serveur Multi-Enseignants de Jihane est opérationnel!" });
});

// تخزين جلسات وحالات الأساتذة بشكل منفصل
let clients = {};
let clientsStatus = {};

function initClient(phone) {
    if (clients[phone]) return; // إذا كان الأستاذ متصل ديجا متقيسوش

    clientsStatus[phone] = 'INITIALIZING';

    // إنشاء جلسة معزولة وخاصة برقم هاتف الأستاذ
    clients[phone] = new Client({
        authStrategy: new LocalAuth({ clientId: `session-${phone}` }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        }
    });

    clients[phone].on('qr', (qr) => {
        clientsStatus[phone] = 'QR_READY';
        console.log(`[QR] Code disponible pour l'enseignant: ${phone}`);
    });

    clients[phone].on('ready', () => {
        clientsStatus[phone] = 'READY';
        console.log(`✅ [READY] WhatsApp connecté pour l'enseignant: ${phone}`);
    });

    clients[phone].on('disconnected', () => {
        clientsStatus[phone] = 'DISCONNECTED';
        delete clients[phone];
    });

    clients[phone].initialize().catch(err => console.error(`Erreur pour ${phone}:`, err));
}

// استقبال طلبات كود الربط من الأساتذة بشكل ديناميكي
app.post('/pairing-code', async (req, res) => {
    let phone = req.body.phone || req.body.number || req.body.phoneNumber;

    if (!phone) {
        return res.status(400).json({ error: 'Missing phone number' });
    }

    // تنظيف رقم الهاتف ليصبح أرقام فقط (مثال: 212611223344)
    phone = phone.replace(/[^0-9]/g, '');

    console.log(`🚀 طلب كود ربط جديد للأستاذ: ${phone}`);

    // تشغيل جلسة خاصة بهاد الأستاذ إذا لم تكن موجودة
    if (!clients[phone]) {
        initClient(phone);
    }

    // انتطار السيرفر يجهز (حد أقصى 15 ثانية)
    let checkCount = 0;
    while (clientsStatus[phone] === 'INITIALIZING' && checkCount < 30) {
        await new Promise(r => setTimeout(r, 500));
        checkCount++;
    }

    try {
        const code = await clients[phone].requestPairingCode(phone);
        console.log(`🎯 [CODE] الأستاذ ${phone} -> الكود هو: ${code}`);
        res.json({ code: code, pairingCode: code, status: "SUCCESS" });
    } catch (err) {
        console.error("Erreur pairing:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ السيرفر الاحترافي شغال على البورت ${PORT}`);
});
