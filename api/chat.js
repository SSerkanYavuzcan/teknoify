const DISCLAIMER =
    'Bu yanıt yatırım tavsiyesi değildir; kaynaklı finansal asistan altyapısı geliştirme aşamasındadır.';
const MAX_MESSAGE_LENGTH = 1000;
const GENERIC_ANSWER =
    'Bu özellik yakında kaynaklı finansal raporlar, şirket dokümanları ve sektör verileriyle çalışacak.';

function sendJson(response, statusCode, payload) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
}

function normalizeMessageText(text) {
    return String(text ?? '')
        .toLocaleLowerCase('tr-TR')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ı/g, 'i');
}

function getMockAnswer(message) {
    const normalizedMessage = normalizeMessageText(message);

    if (normalizedMessage.includes('magaza basi kar')) {
        return 'Mağaza başı kâr hesaplaması ileride FAVÖK, mağaza sayısı ve çeyrek ortalama USDTRY verileriyle kaynaklı şekilde açıklanacak.';
    }

    if (normalizedMessage.includes('migros')) {
        return 'Migros için gelecek yanıtlar Migros faaliyet raporları, yatırımcı sunumları ve yapılandırılmış veri setleri üzerinden kaynaklı hazırlanacak.';
    }

    if (normalizedMessage.includes('tupras')) {
        return 'Tüpraş için gelecek yanıtlar Tüpraş raporları ve finansal tabloları üzerinden kaynaklı hazırlanacak.';
    }

    return GENERIC_ANSWER;
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';

        request.on('data', (chunk) => {
            body += chunk;

            if (body.length > MAX_MESSAGE_LENGTH * 4) {
                reject(new Error('request-body-too-large'));
                request.destroy();
            }
        });

        request.on('end', () => {
            resolve(body);
        });

        request.on('error', reject);
    });
}

async function parseJsonBody(request) {
    if (request.body && typeof request.body === 'object') {
        return request.body;
    }

    if (typeof request.body === 'string') {
        return JSON.parse(request.body);
    }

    const rawBody = await readRequestBody(request);

    if (!rawBody.trim()) {
        return {};
    }

    return JSON.parse(rawBody);
}

module.exports = async function chatHandler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        sendJson(response, 405, { error: 'Method not allowed' });
        return;
    }

    let body;

    try {
        body = await parseJsonBody(request);
    } catch (error) {
        const statusCode = error?.message === 'request-body-too-large' ? 413 : 400;
        sendJson(response, statusCode, { error: 'Invalid JSON body' });
        return;
    }

    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!message) {
        sendJson(response, 400, { error: 'Message is required' });
        return;
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
        sendJson(response, 413, { error: 'Message is too long' });
        return;
    }

    sendJson(response, 200, {
        answer: getMockAnswer(message),
        sources: [],
        usedCache: false,
        modelTier: 'mock',
        status: 'mock',
        disclaimer: DISCLAIMER
    });
};
