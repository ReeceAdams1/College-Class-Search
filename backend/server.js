const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const ASSIST_API_BASE_URL = 'https://assist.org/api';
const ASSIST_ORIGIN = 'https://assist.org';

// Cached session tokens from assist.org
let sessionCache = { cookies: null, xsrfToken: null, fetchedAt: 0 };
const SESSION_TTL_MS = 20 * 60 * 1000; // 20 minutes

async function getAssistSession() {
    const now = Date.now();
    if (sessionCache.xsrfToken && (now - sessionCache.fetchedAt) < SESSION_TTL_MS) {
        return sessionCache;
    }

    const response = await fetch(ASSIST_ORIGIN);
    const rawCookies = response.headers.getSetCookie();

    // Parse cookies into a single Cookie header string
    const cookieMap = {};
    for (const raw of rawCookies) {
        const [pair] = raw.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) continue;
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        cookieMap[name] = value;
    }

    const cookieHeader = Object.entries(cookieMap)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');

    const xsrfToken = cookieMap['X-XSRF-TOKEN'];
    if (!xsrfToken) throw new Error('Could not obtain XSRF token from assist.org');

    sessionCache = { cookies: cookieHeader, xsrfToken, fetchedAt: Date.now() };
    return sessionCache;
}

function assistHeaders(session) {
    return {
        'Accept': 'application/json, text/plain, */*',
        'Referer': `${ASSIST_ORIGIN}/`,
        'Origin': ASSIST_ORIGIN,
        'Cookie': session.cookies,
        'X-XSRF-TOKEN': session.xsrfToken,
    };
}

async function assistFetch(assistUrl) {
    const session = await getAssistSession();
    const response = await fetch(assistUrl, { headers: assistHeaders(session) });
    if (response.status === 400 || response.status === 401) {
        // Session may have expired — refresh once and retry
        sessionCache = { cookies: null, xsrfToken: null, fetchedAt: 0 };
        const fresh = await getAssistSession();
        return fetch(assistUrl, { headers: assistHeaders(fresh) });
    }
    return response;
}

async function proxyGet(assistUrl, res) {
    try {
        const response = await assistFetch(assistUrl);
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            return res.status(response.status).json(body);
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Assist API error:', error.message);
        res.status(500).json({ message: 'Failed to contact Assist API' });
    }
}

app.get('/', (req, res) => {
    res.redirect('/Website.html');
});

app.get('/api/institutions', (req, res) => {
    console.log('Proxying: /api/institutions');
    proxyGet(`${ASSIST_API_BASE_URL}/institutions`, res);
});

app.get('/api/agreements', (req, res) => {
    const { receivingInstitutionId, sendingInstitutionId, academicYearId, categoryCode } = req.query;
    if (!receivingInstitutionId || !sendingInstitutionId || !academicYearId || !categoryCode) {
        return res.status(400).json({ message: 'Missing required query parameters for agreements' });
    }
    const url = `${ASSIST_API_BASE_URL}/agreements?receivingInstitutionId=${receivingInstitutionId}&sendingInstitutionId=${sendingInstitutionId}&academicYearId=${academicYearId}&categoryCode=${categoryCode}`;
    console.log('Proxying: /api/agreements');
    proxyGet(url, res);
});

app.get('/api/articulation/Agreements', (req, res) => {
    const { Key } = req.query;
    if (!Key) {
        return res.status(400).json({ message: 'Missing required query parameter: Key' });
    }
    console.log('Proxying: /api/articulation/Agreements');
    proxyGet(`${ASSIST_API_BASE_URL}/articulation/Agreements?Key=${Key}`, res);
});

app.use((req, res) => {
    res.status(404).send("Backend couldn't find that route.");
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
