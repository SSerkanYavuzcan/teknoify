const MAX_PAYLOAD_BYTES = 10 * 1024;
const MAX_TEXT_PREVIEW_LENGTH = 160;
const ALLOWED_EVENT_TYPES = new Set([
    'chat_message_sent',
    'chat_response_received',
    'chat_feedback_submitted',
    'chat_error'
]);
const ALLOWED_RESPONSE_STATUSES = new Set(['mock', 'fallback', 'error']);
const ALLOWED_MODEL_TIERS = new Set(['mock', 'local-mock']);
const SUCCESS_MESSAGE = 'Chat log event validated but not stored in Stage 5.';

function sendJson(response, statusCode, payload) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify(payload));
}

function getByteLength(value) {
    return Buffer.byteLength(String(value ?? ''), 'utf8');
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';

        request.on('data', (chunk) => {
            body += chunk;

            if (getByteLength(body) > MAX_PAYLOAD_BYTES) {
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

function assertPayloadSize(rawBody) {
    if (getByteLength(rawBody) > MAX_PAYLOAD_BYTES) {
        throw new Error('request-body-too-large');
    }
}

async function parseJsonBody(request) {
    if (request.body && typeof request.body === 'object') {
        const serializedBody = JSON.stringify(request.body);
        assertPayloadSize(serializedBody);
        return request.body;
    }

    if (typeof request.body === 'string') {
        assertPayloadSize(request.body);
        return request.body.trim() ? JSON.parse(request.body) : {};
    }

    const rawBody = await readRequestBody(request);
    assertPayloadSize(rawBody);

    if (!rawBody.trim()) {
        return {};
    }

    return JSON.parse(rawBody);
}

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getValidationError(payload) {
    if (!isPlainObject(payload)) {
        return 'Payload must be a JSON object.';
    }

    if (!ALLOWED_EVENT_TYPES.has(payload.eventType)) {
        return 'eventType is required and must be an allowed chat log event type.';
    }

    if (typeof payload.sessionId !== 'string' || !payload.sessionId.trim()) {
        return 'sessionId is required.';
    }

    if (payload.page !== 'investment-analytics') {
        return 'page must be "investment-analytics".';
    }

    if (typeof payload.timestamp !== 'string' || !payload.timestamp.trim()) {
        return 'timestamp must be a string.';
    }

    if (!isPlainObject(payload.query)) {
        return 'query must be an object.';
    }

    if (typeof payload.query.textPreview !== 'string') {
        return 'query.textPreview must be a string.';
    }

    if (payload.query.textPreview.length > MAX_TEXT_PREVIEW_LENGTH) {
        payload.query.textPreview = payload.query.textPreview.slice(0, MAX_TEXT_PREVIEW_LENGTH);
    }

    if (typeof payload.query.textLength !== 'number' || payload.query.textLength < 0) {
        return 'query.textLength must be a non-negative number.';
    }

    if (typeof payload.query.normalizedIntent !== 'string') {
        return 'query.normalizedIntent must be a string.';
    }

    if (payload.query.detectedCompany !== null && typeof payload.query.detectedCompany !== 'string') {
        return 'query.detectedCompany must be null or a string.';
    }

    if (payload.query.detectedPeriod !== null && typeof payload.query.detectedPeriod !== 'string') {
        return 'query.detectedPeriod must be null or a string.';
    }

    if (!isPlainObject(payload.response)) {
        return 'response must be an object.';
    }

    if (!ALLOWED_RESPONSE_STATUSES.has(payload.response.status)) {
        return 'response.status must be mock, fallback, or error.';
    }

    if (!ALLOWED_MODEL_TIERS.has(payload.response.modelTier)) {
        return 'response.modelTier must be mock or local-mock.';
    }

    if (typeof payload.response.usedCache !== 'boolean') {
        return 'response.usedCache must be a boolean.';
    }

    if (typeof payload.response.sourceCount !== 'number' || payload.response.sourceCount < 0) {
        return 'response.sourceCount must be a non-negative number.';
    }

    if (typeof payload.response.latencyMs !== 'number' || payload.response.latencyMs < 0) {
        return 'response.latencyMs must be a non-negative number.';
    }

    if (!isPlainObject(payload.privacy)) {
        return 'privacy must be an object.';
    }

    if (payload.privacy.containsPersonalData !== false) {
        return 'privacy.containsPersonalData must be false.';
    }

    if (payload.privacy.loggingMode !== 'metadata_only') {
        return 'privacy.loggingMode must be metadata_only.';
    }

    return null;
}

module.exports = async function chatLogHandler(request, response) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        sendJson(response, 405, { ok: false, error: 'Method not allowed' });
        return;
    }

    let payload;

    try {
        payload = await parseJsonBody(request);
    } catch (error) {
        const statusCode = error?.message === 'request-body-too-large' ? 413 : 400;
        const message = statusCode === 413 ? 'Payload is too large.' : 'Invalid JSON body.';
        sendJson(response, statusCode, { ok: false, error: message });
        return;
    }

    const validationError = getValidationError(payload);

    if (validationError) {
        sendJson(response, 400, { ok: false, error: validationError });
        return;
    }

    sendJson(response, 200, {
        ok: true,
        status: 'accepted_noop',
        message: SUCCESS_MESSAGE
    });
};
