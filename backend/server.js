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
let sessionRefreshPromise = null; // mutex: only one refresh at a time

// Rate-limit guard: queue all outbound assist.org fetches so they
// fire at most one every ASSIST_INTERVAL ms, preventing 429s.
const ASSIST_INTERVAL = 200;
let assistQueue = Promise.resolve();
function queuedFetch(url, options) {
    assistQueue = assistQueue.then(
        () => new Promise(r => setTimeout(r, ASSIST_INTERVAL)).then(() => fetch(url, options))
    );
    return assistQueue;
}

async function getAssistSession() {
    const now = Date.now();
    if (sessionCache.xsrfToken && (now - sessionCache.fetchedAt) < SESSION_TTL_MS) {
        return sessionCache;
    }
    if (!sessionRefreshPromise) {
        sessionRefreshPromise = _fetchNewSession().finally(() => {
            sessionRefreshPromise = null;
        });
    }
    return sessionRefreshPromise;
}

async function _fetchNewSession() {
    const response = await fetch(ASSIST_ORIGIN);
    const rawCookies = response.headers.getSetCookie();

    const cookieMap = {};
    for (const raw of rawCookies) {
        const [pair] = raw.split(';');
        const eqIdx = pair.indexOf('=');
        if (eqIdx === -1) continue;
        const name = pair.slice(0, eqIdx).trim();
        const value = pair.slice(eqIdx + 1).trim();
        cookieMap[name] = value;
    }

    const cookieHeader = Object.entries(cookieMap).map(([k, v]) => `${k}=${v}`).join('; ');
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

async function assistFetch(assistUrl, attempt = 0) {
    const session = await getAssistSession();
    const response = await queuedFetch(assistUrl, { headers: assistHeaders(session) });
    if (response.status === 429 && attempt < 3) {
        const delay = Math.min(parseInt(response.headers.get('Retry-After') || '2', 10) * 1000, 8000);
        await new Promise(r => setTimeout(r, delay));
        return assistFetch(assistUrl, attempt + 1);
    }
    if (response.status === 400 || response.status === 401) {
        sessionCache = { cookies: null, xsrfToken: null, fetchedAt: 0 };
        const fresh = await getAssistSession();
        return queuedFetch(assistUrl, { headers: assistHeaders(fresh) });
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

app.get('/api/courses', async (req, res) => {
    const { receivingInstitutionId, academicYearId } = req.query;
    if (!receivingInstitutionId || !academicYearId) {
        return res.status(400).json({ message: 'Missing required parameters' });
    }
    try {
        const instResponse = await assistFetch(`${ASSIST_API_BASE_URL}/institutions`);
        if (!instResponse.ok) return res.status(502).json({ message: 'Failed to fetch institutions' });
        const institutions = await instResponse.json();

        const cc = institutions.find(i => i.isCommunityCollege && String(i.id) !== String(receivingInstitutionId));
        if (!cc) return res.json([]);

        const agreeResponse = await assistFetch(
            `${ASSIST_API_BASE_URL}/agreements?receivingInstitutionId=${receivingInstitutionId}&sendingInstitutionId=${cc.id}&academicYearId=${academicYearId}&categoryCode=prefix`
        );
        if (!agreeResponse.ok) return res.json([]);
        const agreeData = await agreeResponse.json();
        if (!agreeData.reports?.length) return res.json([]);

        const subjects = agreeData.reports
            .filter(r => r.label)
            .map(r => ({ code: r.label.trim(), title: '' }))
            .sort((a, b) => a.code.localeCompare(b.code));
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching courses:', error.message);
        res.status(500).json({ message: 'Failed to fetch courses' });
    }
});

app.use((req, res) => {
    res.status(404).send("Backend couldn't find that route.");
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
